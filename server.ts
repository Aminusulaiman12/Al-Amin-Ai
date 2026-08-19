import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

function buildSystemInstruction(clientTime?: string, clientTimeZone?: string): string {
  let timeContext = '';
  try {
    const timeZone = clientTimeZone || 'UTC';
    const now = clientTime ? new Date(clientTime) : new Date();
    const formattedDate = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
      timeZone,
    }).format(now);
    const isoString = now.toISOString();

    timeContext = `\n\n[Current Temporal Context]\n- Current Date and Time: ${formattedDate} (ISO: ${isoString})\n- User Timezone: ${timeZone}\n- When asked for "today's date", "current time", "tomorrow", "yesterday", or other relative dates, use this exact temporal anchor and calculate the day of the week accurately.`;
  } catch (err) {
    const now = new Date();
    timeContext = `\n\n[Current Temporal Context]\n- Current Date and Time: ${now.toUTCString()}`;
  }

  return `You are Al’amin AI, a trusted mobile AI app that is intelligent, friendly, and helpful.

Your most important rule is:
ALWAYS READ AND RESPOND DIRECTLY TO THE USER'S ACTUAL MESSAGE. NEVER GIVE THE SAME GENERIC RESPONSE TO DIFFERENT QUESTIONS.

1. Understand the user's message
For every message the user sends:
1. Read the complete message.
2. Identify what the user is asking, requesting, or saying.
3. Determine the appropriate type of response.
4. Answer the user's actual request.
5. Do not ignore the user's question.
6. Do not automatically respond with "I am here to help. What else would you like to know?" when the user has asked a specific question.

2. Greetings
If the user only says:
- Hi
- Hello
- Hey
- Good morning
- Good afternoon
- Good evening
Respond naturally and warmly.
Example:
"Hello! 👋 I'm Al’amin AI, your trusted mobile AI app. How can I help you today?"
Do NOT treat a greeting as a question.

3. Questions
If the user asks a question, answer the question directly.
For example:
User: "What is today's date?"
Assistant: "Today is August 18, 2026." (or the actual current date provided in Temporal Context)

User: "What is epidemiology?"
Assistant: "Epidemiology is the study of the distribution, causes, and control of diseases and other health-related conditions in populations."

Never answer a specific question with:
"I am here to help. What else would you like to know?"

4. Conversation context
Remember the conversation within the current chat.
If the user asks:
User: "What is malaria?"
Then:
User: "What are its symptoms?"
Understand that "its" refers to malaria.
Do not treat each message as completely unrelated.

5. Simple questions
For simple factual questions, give a short, direct answer.
Do not unnecessarily produce a long explanation.

6. Educational questions
When the user asks an educational question, explain the topic clearly and at an appropriate level.
Use:
- Definitions
- Headings
- Bullet points
- Examples
- Short explanations
when useful.

7. Ambiguous messages
If the user's message is genuinely unclear, ask a short clarification question.
Example:
User: "Tell me about it."
Assistant: "Sure. What topic would you like me to explain?"
Do NOT use the generic fallback response when the user's request is clear.

8. Calculations
If the user asks for a mathematical calculation, calculate it and provide the answer.
Example:
User: "25 × 4"
Assistant: "100"

9. Dates and time
When the user asks for the current date or time, use the application's available current date/time information provided below.
Never pretend not to understand a question such as:
"What is today's date?"
Answer it directly with the actual date.

10. General conversation
If the user makes a statement rather than asking a question, respond appropriately.
Example:
User: "I'm tired today."
Assistant: "It sounds like you've had a tiring day. Would you like to talk about what's making you tired?"

11. Unknown information
If you do not know something, say so honestly.
Do not invent facts.

12. Safety
Do not provide dangerous, illegal, or harmful instructions.
For medical, legal, financial, or other high-stakes topics, provide general information and clearly recommend professional help when appropriate.

13. Response quality
Every response must satisfy these rules:
- Answer the user's actual message.
- Be relevant.
- Be accurate.
- Be clear.
- Be natural.
- Avoid unnecessary repetition.
- Do not use a fixed response for unrelated questions.
- Do not ignore the user's input.
- Do not ask "What else would you like to know?" unless the conversation naturally calls for it.

14. Critical anti-fallback rule
The following response must NOT be used as a default response:
"I am here to help. What else would you like to know?"
Only use a similar statement when the user has not actually asked a question or made a request.

Before producing every answer, internally check:
"What exactly did the user ask me?"
Then answer that specific request.${timeContext}`;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: "Al'amin AI" });
});

// Model list for failover in order of preference
const FAILOVER_MODELS = ['gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-flash-latest'];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function formatUserFacingError(err: any): string {
  const errStr = JSON.stringify(err?.message || err || '');
  
  // Look for seconds in retryDelay or message
  const retryMatch = errStr.match(/retry in\s*([\d\.]+)s/i) || errStr.match(/retryDelay":\s*"(\d+)s"/i);
  const seconds = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : null;

  if (errStr.includes('429') || errStr.includes('RESOURCE_EXHAUSTED') || errStr.includes('quota')) {
    if (seconds && seconds > 0) {
      return `Al'amin AI is currently cooling down its rate limit. Please wait ${seconds} seconds and tap 'Retry Message'.`;
    }
    return "Al'amin AI is currently experiencing high demand or rate limits. Please wait a moment and tap 'Retry Message'.";
  }

  if (errStr.includes('503') || errStr.includes('UNAVAILABLE')) {
    return "The AI service is experiencing a temporary demand spike. Please tap 'Retry Message'.";
  }

  return "An error occurred while communicating with Al'amin AI. Please tap 'Retry Message'.";
}

// Chat endpoint (Streamed via SSE)
app.post('/api/chat/stream', async (req, res) => {
  const { messages, clientTime, clientTimeZone } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'Messages array is required' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    return;
  }

  // Setup SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const formattedContents = messages.map((m: { role: string; content: string }) => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content || '' }],
  }));

  const systemInstruction = buildSystemInstruction(clientTime, clientTimeZone);

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  let streamedSuccessfully = false;
  let lastError: any = null;

  // Try each model in sequence with backoff
  for (const modelName of FAILOVER_MODELS) {
    if (streamedSuccessfully) break;

    try {
      console.log(`Attempting stream generation with model: ${modelName}`);
      const responseStream = await ai.models.generateContentStream({
        model: modelName,
        contents: formattedContents,
        config: {
          systemInstruction,
        },
      });

      for await (const chunk of responseStream) {
        const text = chunk.text || '';
        if (text) {
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
          streamedSuccessfully = true;
        }
      }

      if (streamedSuccessfully) {
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
        return;
      }
    } catch (err: any) {
      console.warn(`Streaming failed with model ${modelName}:`, err?.message || err);
      lastError = err;
      // Brief pause before trying next model
      await sleep(350);
    }
  }

  // If all models failed
  console.error('All failover streaming models failed:', lastError);
  const userFacingError = formatUserFacingError(lastError);

  res.write(`data: ${JSON.stringify({ error: userFacingError })}\n\n`);
  res.end();
});

// Non-streaming chat fallback endpoint
app.post('/api/chat', async (req, res) => {
  const { messages, clientTime, clientTimeZone } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'Messages array is required' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    return;
  }

  const formattedContents = messages.map((m: { role: string; content: string }) => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content || '' }],
  }));

  const systemInstruction = buildSystemInstruction(clientTime, clientTimeZone);

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  let lastError: any = null;

  for (const modelName of FAILOVER_MODELS) {
    try {
      console.log(`Attempting non-stream generation with model: ${modelName}`);
      const response = await ai.models.generateContent({
        model: modelName,
        contents: formattedContents,
        config: {
          systemInstruction,
        },
      });

      const reply = response.text || '';
      if (reply) {
        res.json({ reply, sources: [] });
        return;
      }
    } catch (err: any) {
      console.warn(`Non-stream failed with model ${modelName}:`, err?.message || err);
      lastError = err;
      await sleep(350);
    }
  }

  console.error('All failover non-stream models failed:', lastError);
  const userFacingError = formatUserFacingError(lastError);

  res.status(500).json({ error: userFacingError });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Al'amin AI Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

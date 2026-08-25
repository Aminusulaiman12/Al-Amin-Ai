import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

function buildSystemInstruction(
  clientTime?: string,
  clientTimeZone?: string
): string {
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

    timeContext = `

[Current Temporal Context]
- Current Date and Time: ${formattedDate} (ISO: ${isoString})
- User Timezone: ${timeZone}
- When asked for "today's date", "current time", "tomorrow", "yesterday", or other relative dates, use this exact temporal anchor and calculate the day of the week accurately.`;
  } catch {
    const now = new Date();

    timeContext = `

[Current Temporal Context]
- Current Date and Time: ${now.toUTCString()}`;
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
Assistant: "Today is August 25, 2026." or the actual date provided in Temporal Context.

User: "What is epidemiology?"
Assistant: "Epidemiology is the study of the distribution, causes, and control of diseases and other health-related conditions in populations."

Never answer a specific question with:
"I am here to help. What else would you like to know?"

4. Conversation context
Remember the conversation within the current chat.

If the user asks:
"What is malaria?"

Then:
"What are its symptoms?"

Understand that "its" refers to malaria.

5. Simple questions
For simple factual questions, give a short, direct answer.

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
"Sure. What topic would you like me to explain?"

8. Calculations
If the user asks for a mathematical calculation, calculate it and provide the answer.

9. Dates and time
When the user asks for the current date or time, use the application's available current date/time information provided below.

10. General conversation
If the user makes a statement rather than asking a question, respond appropriately.

11. Unknown information
If you do not know something, say so honestly. Do not invent facts.

12. Safety
Do not provide dangerous, illegal, or harmful instructions.

For medical, legal, financial, or other high-stakes topics, provide general information and recommend professional help when appropriate.

13. Response quality
Every response must:
- Answer the user's actual message.
- Be relevant.
- Be accurate.
- Be clear.
- Be natural.
- Avoid unnecessary repetition.
- Not use a fixed response for unrelated questions.
- Not ignore the user's input.

14. Critical anti-fallback rule
Do not use:
"I am here to help. What else would you like to know?"

as a default response.

Before producing every answer, internally check:

"What exactly did the user ask me?"

Then answer that specific request.${timeContext}`;
}

function formatUserFacingError(err: any): string {
  const errStr = String(err?.message || err || '');

  if (
    errStr.includes('429') ||
    errStr.toLowerCase().includes('rate limit') ||
    errStr.toLowerCase().includes('quota')
  ) {
    return "Al'amin AI is currently experiencing high demand or a rate limit. Please wait a moment and tap 'Retry Message'.";
  }

  if (
    errStr.includes('503') ||
    errStr.toLowerCase().includes('unavailable')
  ) {
    return "The AI service is temporarily unavailable. Please tap 'Retry Message'.";
  }

  if (
    errStr.includes('401') ||
    errStr.toLowerCase().includes('authentication')
  ) {
    return "The AI service authentication is not configured correctly on the server.";
  }

  return "An error occurred while communicating with Al'amin AI. Please tap 'Retry Message'.";
}

const ANTHROPIC_MODEL = 'claude-sonnet-4-6';

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: "Al'amin AI",
  });
});

// Streaming chat endpoint
app.post('/api/chat/stream', async (req, res) => {
  const { messages, clientTime, clientTimeZone } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({
      error: 'Messages array is required',
    });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    res.status(500).json({
      error: 'ANTHROPIC_API_KEY is not configured on the server.',
    });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  try {
    const ai = new Anthropic({
      apiKey,
    });

    const systemInstruction = buildSystemInstruction(
      clientTime,
      clientTimeZone
    );

    const anthropicMessages = messages.map(
      (m: { role: string; content: string }) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content || '',
      })
    );

    console.log(
      `Attempting Anthropic stream generation with model: ${ANTHROPIC_MODEL}`
    );

    const stream = ai.messages.stream({
      model: ANTHROPIC_MODEL,
      max_tokens: 4096,
      system: systemInstruction,
      messages: anthropicMessages,
    });

    let streamedSuccessfully = false;

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        const text = event.delta.text;

        if (text) {
          res.write(
            `data: ${JSON.stringify({
              text,
            })}\n\n`
          );

          streamedSuccessfully = true;
        }
      }
    }

    if (streamedSuccessfully) {
      res.write(
        `data: ${JSON.stringify({
          done: true,
        })}\n\n`
      );

      res.end();
      return;
    }

    res.write(
      `data: ${JSON.stringify({
        error: 'The AI returned an empty response.',
      })}\n\n`
    );

    res.end();
  } catch (err: any) {
    console.error('Anthropic streaming error:', err);

    const userFacingError = formatUserFacingError(err);

    if (!res.writableEnded) {
      res.write(
        `data: ${JSON.stringify({
          error: userFacingError,
        })}\n\n`
      );

      res.end();
    }
  }
});

// Non-streaming chat endpoint
app.post('/api/chat', async (req, res) => {
  const { messages, clientTime, clientTimeZone } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({
      error: 'Messages array is required',
    });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    res.status(500).json({
      error: 'ANTHROPIC_API_KEY is not configured on the server.',
    });
    return;
  }

  try {
    const ai = new Anthropic({
      apiKey,
    });

    const systemInstruction = buildSystemInstruction(
      clientTime,
      clientTimeZone
    );

    const anthropicMessages = messages.map(
      (m: { role: string; content: string }) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content || '',
      })
    );

    console.log(
      `Attempting Anthropic non-stream generation with model: ${ANTHROPIC_MODEL}`
    );

    const response = await ai.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 4096,
      system: systemInstruction,
      messages: anthropicMessages,
    });

    const reply = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');

    if (reply) {
      res.json({
        reply,
        sources: [],
      });

      return;
    }

    res.status(500).json({
      error: 'The AI returned an empty response.',
    });
  } catch (err: any) {
    console.error('Anthropic non-stream error:', err);

    const userFacingError = formatUserFacingError(err);

    res.status(500).json({
      error: userFacingError,
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
      },
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
    console.log(
      `Al'amin AI Server running on http://0.0.0.0:${PORT}`
    );
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
        

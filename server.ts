import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

const PORT = Number(process.env.PORT ?? 3000);
const isProd = process.env.NODE_ENV === 'production';

async function createServer() {
  const app = express();
  app.use(express.json({ limit: '512kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'petalnodes-calagopus-preview',
      aiConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()),
    });
  });

  app.get('/api/download/c7s', (_req, res) => {
    const archivePath = path.resolve(process.cwd(), 'cloud_petalnodes_sanctuary.c7s.zip');
    if (!fs.existsSync(archivePath)) {
      res.status(404).json({ error: 'Extension archive not found.' });
      return;
    }
    res.download(archivePath, 'cloud_petalnodes_sanctuary.c7s.zip');
  });

  app.post('/api/ai/assist', async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      res.status(503).json({
        configured: false,
        error:
          'GEMINI_API_KEY is not configured in server environment variables. Deterministic local crash diagnostics remain active.',
      });
      return;
    }

    const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim().slice(0, 2000) : '';
    const context = req.body?.context ?? {};
    if (!prompt) {
      res.status(400).json({ error: 'Provide a diagnostic prompt.' });
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `You are a concise Minecraft and Calagopus/Wings infrastructure engineer assisting a panel administrator. Analyze the redacted diagnostic JSON below and answer the question accurately without inventing metrics.\n\nRedacted Context:\n${JSON.stringify(context, null, 2)}\n\nQuestion:\n${prompt}`,
              },
            ],
          },
        ],
      });
      res.json({
        configured: true,
        answer: response.text ?? 'No diagnostic output generated.',
      });
    } catch (err) {
      res.status(502).json({
        configured: true,
        error: err instanceof Error ? err.message : 'Gemini diagnostic request failed.',
      });
    }
  });

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, port: PORT, host: '0.0.0.0' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found. Run npm run build.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Petalnodes panel server running on http://0.0.0.0:${PORT}`);
  });
}

void createServer();

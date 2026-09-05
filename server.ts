import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

// Top-Level Request Deserialization (Ordering Guarantee)
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// Lazy Google GenAI Client
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing.");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// Perbarui ladder fallback dengan model terbaru
const MODEL_FALLBACK_LADDER = [
  "gemini-3.6-flash",      // 1. Model terbaru (sesuai rekomendasi error API)
  "gemini-2.0-flash",      // 2. Fallback kedua
  "gemini-2.0-flash-lite", // 3. Fallback ketiga (lebih ringan/cepat)
];

interface ChatMessage {
  role: "user" | "model";
  content: string;
}

interface GenerateOptions {
  mode?: "reflect" | "summarize" | "brainstorm" | "chat";
  title?: string;
  tags?: string[];
}

/**
 * Standard Helper: generateContentWithFallback
 * Wraps Gemini calls in an automated fallback ladder with exponential backoff for resilience.
 */
async function generateContentWithFallback(
  prompt: string,
  history: ChatMessage[] = [],
  options: GenerateOptions = {}
): Promise<{ text: string; modelUsed: string }> {
  const client = getAiClient();
  let lastError: unknown = null;

  const mode = options.mode || "reflect";

  let systemInstruction = `You are a supportive, insightful, and empathetic AI Journal & Reflection Companion powered by Google Gemini.
Your role is to help the user unpack their thoughts, gain clarity, organize ideas, and reflect deeply on their personal experiences, goals, and daily emotions.

Guidelines:
1. Provide thoughtful, constructive, and warm responses.
2. If the user is reflecting, validate their feelings and ask 1-2 open-ended coaching questions to spark deeper thinking.
3. If brainstorming, provide creative, organized bullet points with action steps.
4. If summarizing, craft a clear, inspiring executive summary of key takeaways and actionable insights.
5. Format your output cleanly with markdown formatting (headings, lists, bold highlights).
6. Never output toxic, harmful, or judgmental text. Be encouraging and grounded.`;

  if (mode === "summarize") {
    systemInstruction += `\nMode: SUMMARY. Generate a concise, inspiring summary of the journal reflection with 3 sections:
- 💡 **Core Theme & Insight**
- 🌟 **Key Takeaways**
- 🚀 **Next Steps / Reflection Prompt**`;
  } else if (mode === "brainstorm") {
    systemInstruction += `\nMode: BRAINSTORM. Generate creative, structured ideas and perspectives based on the user's reflection with concrete action pathways.`;
  }

  // Construct contents array from history and current prompt
  const contents = [
    ...history.map((msg) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    })),
    {
      role: "user",
      parts: [{ text: prompt }],
    },
  ];

  for (const modelName of MODEL_FALLBACK_LADDER) {
    try {
      const response = await client.models.generateContent({
        model: modelName,
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        },
      });

      const responseText = response.text || "";
      if (responseText.trim().length > 0) {
        return { text: responseText, modelUsed: modelName };
      }
    } catch (err: any) {
      console.warn(`[Gemini Fallback] Model ${modelName} failed:`, err?.message || err);
      lastError = err;
      continue;
    }
  }

  throw new Error(
    `All Gemini fallback models exhausted. Last error: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    hasApiKey: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// AI Chat & Reflection Generation API
app.post("/api/journal/chat", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const history: ChatMessage[] = Array.isArray(body.history)
      ? body.history
          .filter(
            (h: any) =>
              h &&
              typeof h.content === "string" &&
              (h.role === "user" || h.role === "model")
          )
          .map((h: any) => ({
            role: h.role,
            content: String(h.content).slice(0, 10000),
          }))
      : [];
    const mode = ["reflect", "summarize", "brainstorm", "chat"].includes(body.mode)
      ? body.mode
      : "reflect";

    if (!prompt) {
      return res.status(400).json({
        error: "Prompt cannot be empty.",
      });
    }

    if (prompt.length > 15000) {
      return res.status(400).json({
        error: "Prompt exceeds maximum allowed length (15,000 characters).",
      });
    }

    const { text, modelUsed } = await generateContentWithFallback(prompt, history, { mode });

    return res.json({
      success: true,
      response: text,
      modelUsed,
      mode,
    });
  } catch (error: any) {
    console.error("Error in /api/journal/chat:", error);
    return res.status(500).json({
      error: error?.message || "Failed to generate AI reflection with Gemini.",
    });
  }
});

// Title & Tag Suggestion Endpoint for Journal Entries
app.post("/api/journal/suggest-title", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const text = typeof body.text === "string" ? body.text.trim() : "";

    if (!text) {
      return res.status(400).json({ error: "Text content is required." });
    }

    const client = getAiClient();
    let title = "Journal Entry";
    let tags: string[] = ["Reflection"];

    try {
      const response = await client.models.generateContent({
        model: "gemini-2.0-flash", // Ubah dari gemini-2.5-flash / gemini-1.5-flash ke gemini-2.0-flash
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Read this journal reflection entry and suggest:
1. A concise, thoughtful 3-6 word title.
2. 2-4 short mood/topic tags.

Respond ONLY with valid JSON in this format:
{"title": "Title Here", "tags": ["Tag1", "Tag2"]}

Journal text:
"${text.slice(0, 3000)}"`,
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          temperature: 0.3,
        },
      });

      const rawJson = response.text?.trim() || "";
      if (rawJson) {
        const parsed = JSON.parse(rawJson);
        if (parsed.title) title = String(parsed.title).slice(0, 100);
        if (Array.isArray(parsed.tags)) tags = parsed.tags.map(String).slice(0, 5);
      }
    } catch {
      const firstLine = text.split("\n")[0].slice(0, 50);
      title = firstLine.length > 5 ? firstLine : "Daily Reflection";
    }

    return res.json({ success: true, title, tags });
  } catch (error: any) {
    console.error("Error in /api/journal/suggest-title:", error);
    return res.status(500).json({ error: error?.message || "Failed to suggest title" });
  }
});

// Vite Middleware for Dev and Static Serving for Production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Gemini Reflection Journal server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
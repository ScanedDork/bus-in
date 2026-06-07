// Unified AI client. Calls providers directly from the browser when keys are
// stored locally. All providers are normalized to a chat() API.

import { store } from "@/lib/store";

export type AIProvider =
  | "openai"
  | "anthropic"
  | "gemini"
  | "ollama"
  | "lmstudio"
  | "openai-compat";

export type AIProviderConfig = {
  provider: AIProvider;
  apiKey?: string;
  baseUrl?: string;
  model: string;
};

export type AISettings = {
  default: AIProvider;
  providers: Partial<Record<AIProvider, AIProviderConfig>>;
};

export const AI_SETTINGS_KEY = "ai-settings";

export const DEFAULT_MODELS: Record<AIProvider, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-sonnet-latest",
  gemini: "gemini-2.0-flash",
  ollama: "llama3.2",
  lmstudio: "local-model",
  "openai-compat": "gpt-4o-mini",
};

export const DEFAULT_BASE_URLS: Partial<Record<AIProvider, string>> = {
  ollama: "http://localhost:11434",
  lmstudio: "http://localhost:1234/v1",
};

export const PROVIDER_LABELS: Record<AIProvider, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic (Claude)",
  gemini: "Google Gemini",
  ollama: "Ollama (local)",
  lmstudio: "LM Studio (local)",
  "openai-compat": "Custom (OpenAI-compatible)",
};

export function getAISettings(): AISettings {
  return store.get<AISettings>(AI_SETTINGS_KEY, { default: "ollama", providers: {} });
}

export function getActiveConfig(): AIProviderConfig | null {
  const s = getAISettings();
  const cfg = s.providers[s.default];
  if (!cfg) return null;
  return {
    ...cfg,
    model: cfg.model || DEFAULT_MODELS[s.default],
    baseUrl: cfg.baseUrl || DEFAULT_BASE_URLS[s.default],
  };
}

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type ChatOptions = {
  messages: ChatMessage[];
  json?: boolean;
  temperature?: number;
  config?: AIProviderConfig;
};

export async function chat({ messages, json, temperature = 0.4, config }: ChatOptions): Promise<string> {
  const cfg = config ?? getActiveConfig();
  if (!cfg) throw new Error("No AI provider configured. Open Settings → AI.");

  switch (cfg.provider) {
    case "openai":
    case "openai-compat":
      return chatOpenAI(cfg, messages, json, temperature, "https://api.openai.com/v1");
    case "lmstudio":
      return chatOpenAI(cfg, messages, json, temperature, cfg.baseUrl ?? "http://localhost:1234/v1");
    case "ollama":
      return chatOllama(cfg, messages, json, temperature);
    case "anthropic":
      return chatAnthropic(cfg, messages, json, temperature);
    case "gemini":
      return chatGemini(cfg, messages, json, temperature);
  }
}

async function chatOpenAI(
  cfg: AIProviderConfig,
  messages: ChatMessage[],
  json: boolean | undefined,
  temperature: number,
  defaultBase: string,
): Promise<string> {
  const base = cfg.baseUrl || defaultBase;
  const res = await fetch(`${base.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: cfg.model,
      messages,
      temperature,
      ...(json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) throw new Error(`AI error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function chatOllama(
  cfg: AIProviderConfig,
  messages: ChatMessage[],
  json: boolean | undefined,
  temperature: number,
): Promise<string> {
  const base = cfg.baseUrl || "http://localhost:11434";
  const res = await fetch(`${base.replace(/\/$/, "")}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: cfg.model,
      messages,
      stream: false,
      options: { temperature },
      ...(json ? { format: "json" } : {}),
    }),
  });
  if (!res.ok) throw new Error(`Ollama error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.message?.content ?? "";
}

async function chatAnthropic(
  cfg: AIProviderConfig,
  messages: ChatMessage[],
  json: boolean | undefined,
  temperature: number,
): Promise<string> {
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const conv = messages.filter((m) => m.role !== "system");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": cfg.apiKey ?? "",
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: cfg.model,
      max_tokens: 2048,
      temperature,
      system: json ? `${system}\n\nRespond with valid JSON only.` : system || undefined,
      messages: conv.map((m) => ({ role: m.role, content: m.content })),
    }),
  });
  if (!res.ok) throw new Error(`Anthropic error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.content?.[0]?.text ?? "";
}

async function chatGemini(
  cfg: AIProviderConfig,
  messages: ChatMessage[],
  json: boolean | undefined,
  temperature: number,
): Promise<string> {
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${cfg.model}:generateContent?key=${cfg.apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      systemInstruction: system ? { parts: [{ text: system }] } : undefined,
      generationConfig: {
        temperature,
        ...(json ? { responseMimeType: "application/json" } : {}),
      },
    }),
  });
  if (!res.ok) throw new Error(`Gemini error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

export async function testConnection(cfg: AIProviderConfig): Promise<string> {
  const reply = await chat({
    config: cfg,
    messages: [{ role: "user", content: "Reply with exactly: OK" }],
    temperature: 0,
  });
  return reply.slice(0, 100);
}

export function safeParseJSON<T = unknown>(text: string): T | null {
  if (!text) return null;
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // try to find first JSON object/array
    const m = cleaned.match(/[{[][\s\S]*[}\]]/);
    if (m) {
      try {
        return JSON.parse(m[0]) as T;
      } catch {}
    }
    return null;
  }
}

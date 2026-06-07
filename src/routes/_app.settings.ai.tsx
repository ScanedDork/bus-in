import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { Surface, FilledButton, OutlinedButton, Chip } from "@/components/app-shell";
import {
  AI_SETTINGS_KEY,
  type AISettings,
  type AIProvider,
  type AIProviderConfig,
  PROVIDER_LABELS,
  DEFAULT_MODELS,
  DEFAULT_BASE_URLS,
  testConnection,
} from "@/lib/ai/client";
import { toast } from "sonner";
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Cloud,
  HardDrive,
  Star,
  Trash2,
} from "lucide-react";

export const Route = createFileRoute("/_app/settings/ai")({ component: AISettingsPage });

const PROVIDERS: AIProvider[] = ["openai", "anthropic", "gemini", "ollama", "lmstudio", "openai-compat"];

const NEEDS_KEY: Record<AIProvider, boolean> = {
  openai: true, anthropic: true, gemini: true, "openai-compat": true,
  ollama: false, lmstudio: false,
};
const NEEDS_URL: Record<AIProvider, boolean> = {
  openai: false, anthropic: false, gemini: false, "openai-compat": true,
  ollama: true, lmstudio: true,
};

const KIND: Record<AIProvider, "cloud" | "local"> = {
  openai: "cloud", anthropic: "cloud", gemini: "cloud", "openai-compat": "cloud",
  ollama: "local", lmstudio: "local",
};

function AISettingsPage() {
  const [settings, setSettings] = useStore<AISettings>(AI_SETTINGS_KEY, { default: "ollama", providers: {} });
  const [selected, setSelected] = useState<AIProvider>(settings.default);

  const draftSource: AIProviderConfig = useMemo(
    () =>
      settings.providers[selected] ?? {
        provider: selected,
        model: DEFAULT_MODELS[selected],
        baseUrl: DEFAULT_BASE_URLS[selected],
        apiKey: "",
      },
    [selected, settings.providers],
  );
  const [draft, setDraft] = useState<AIProviderConfig>(draftSource);
  const [draftKey, setDraftKey] = useState<AIProvider>(selected);
  if (draftKey !== selected) {
    setDraftKey(selected);
    setDraft(draftSource);
  }
  const [testing, setTesting] = useState(false);

  const save = (asDefault = false) => {
    const next: AISettings = {
      default: asDefault ? selected : settings.default,
      providers: { ...settings.providers, [selected]: { ...draft, provider: selected } },
    };
    setSettings(next);
    toast.success(`${PROVIDER_LABELS[selected]} saved${asDefault ? " · set as default" : ""}`);
  };

  const remove = () => {
    if (!confirm(`Remove ${PROVIDER_LABELS[selected]} configuration?`)) return;
    const providers = { ...settings.providers };
    delete providers[selected];
    const nextDefault =
      settings.default === selected
        ? ((Object.keys(providers)[0] as AIProvider | undefined) ?? "ollama")
        : settings.default;
    setSettings({ default: nextDefault, providers });
    setDraft({ provider: selected, model: DEFAULT_MODELS[selected], baseUrl: DEFAULT_BASE_URLS[selected], apiKey: "" });
    toast.success("Removed");
  };

  const setDefault = () => {
    setSettings({ ...settings, default: selected });
    toast.success(`${PROVIDER_LABELS[selected]} set as default`);
  };

  const test = async () => {
    setTesting(true);
    try {
      const reply = await testConnection({ ...draft, provider: selected, model: draft.model || DEFAULT_MODELS[selected] });
      toast.success(`Connected · "${reply}"`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Surface className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold">Choose a provider</h3>
            <p className="text-xs text-on-surface-variant mt-0.5">Keys are stored in your browser and sent directly to the provider.</p>
          </div>
          <Chip tone="info">Default: {PROVIDER_LABELS[settings.default]}</Chip>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {PROVIDERS.map((p) => {
            const configured = !!settings.providers[p];
            const isDefault = settings.default === p;
            const isSelected = selected === p;
            const Icon = KIND[p] === "local" ? HardDrive : KIND[p] === "cloud" ? Cloud : Cpu;
            return (
              <button
                key={p}
                onClick={() => setSelected(p)}
                className={`relative text-left p-4 rounded-2xl border transition-all ${
                  isSelected
                    ? "border-primary bg-primary-container/40 ring-2 ring-primary"
                    : "border-outline-variant bg-surface-container hover:bg-surface-container-high"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className={`size-9 rounded-xl grid place-items-center ${isSelected ? "bg-primary text-primary-foreground" : "bg-surface-container-high text-on-surface-variant"}`}>
                    <Icon className="size-4" />
                  </div>
                  <div className="flex items-center gap-1">
                    {isDefault && <Star className="size-4 text-primary fill-primary" />}
                    {configured && <CheckCircle2 className="size-4 text-primary" />}
                  </div>
                </div>
                <div className="mt-3 font-medium text-sm">{PROVIDER_LABELS[p]}</div>
                <div className="text-xs text-on-surface-variant mt-0.5 capitalize">{KIND[p]}</div>
              </button>
            );
          })}
        </div>
      </Surface>

      <Surface className="p-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-primary-container text-on-primary-container grid place-items-center">
              <Sparkles className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{PROVIDER_LABELS[selected]}</h2>
              <p className="text-xs text-on-surface-variant">{descFor(selected)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {settings.providers[selected] && settings.default !== selected && (
              <OutlinedButton onClick={setDefault}><Star className="size-4" /> Set as default</OutlinedButton>
            )}
            {settings.providers[selected] && (
              <OutlinedButton onClick={remove}><Trash2 className="size-4" /> Remove</OutlinedButton>
            )}
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {NEEDS_KEY[selected] ? (
            <Field label="API key" hint={hintFor(selected)}>
              <input
                type="password"
                placeholder={selected === "anthropic" ? "sk-ant-..." : selected === "gemini" ? "AIza..." : "sk-..."}
                className="w-full h-11 px-3 rounded-xl bg-surface-container border border-outline-variant"
                value={draft.apiKey ?? ""}
                onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })}
              />
            </Field>
          ) : null}
          {NEEDS_URL[selected] ? (
            <Field label="Base URL" hint={`Default: ${DEFAULT_BASE_URLS[selected] ?? ""}`}>
              <input
                placeholder={DEFAULT_BASE_URLS[selected]}
                className="w-full h-11 px-3 rounded-xl bg-surface-container border border-outline-variant"
                value={draft.baseUrl ?? ""}
                onChange={(e) => setDraft({ ...draft, baseUrl: e.target.value })}
              />
            </Field>
          ) : null}
          <Field label="Model" hint={`Default: ${DEFAULT_MODELS[selected]}`}>
            <input
              placeholder={DEFAULT_MODELS[selected]}
              className="w-full h-11 px-3 rounded-xl bg-surface-container border border-outline-variant"
              value={draft.model}
              onChange={(e) => setDraft({ ...draft, model: e.target.value })}
            />
          </Field>

          {selected === "anthropic" ? (
            <div className="flex gap-2 p-3 rounded-2xl bg-tertiary-container text-on-tertiary-container text-xs">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <div>Anthropic requires <code>anthropic-dangerous-direct-browser-access</code> for browser calls. Use Ollama or a server proxy for stricter security.</div>
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <FilledButton onClick={() => save(false)}>Save</FilledButton>
          <OutlinedButton onClick={() => save(true)}>Save & set as default</OutlinedButton>
          <OutlinedButton onClick={test} disabled={testing}>{testing ? "Testing…" : "Test connection"}</OutlinedButton>
        </div>
      </Surface>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium">{label}</span>
        {hint ? <span className="text-xs text-on-surface-variant">{hint}</span> : null}
      </div>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function descFor(p: AIProvider): string {
  switch (p) {
    case "openai": return "GPT models. Requires an OpenAI API key.";
    case "anthropic": return "Claude models. Calls Anthropic directly from the browser.";
    case "gemini": return "Google Gemini API. Get a key from Google AI Studio.";
    case "ollama": return "Run open models locally. Default URL http://localhost:11434.";
    case "lmstudio": return "Run open models locally with LM Studio's OpenAI-compatible server.";
    case "openai-compat": return "Any OpenAI-compatible endpoint (Together, Groq, Fireworks, OpenRouter…).";
  }
}
function hintFor(p: AIProvider): string {
  if (p === "openai") return "platform.openai.com/api-keys";
  if (p === "anthropic") return "console.anthropic.com/settings/keys";
  if (p === "gemini") return "aistudio.google.com/apikey";
  return "";
}

import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { rangeSearchSchema } from "@/lib/range";
import { useDateRange } from "@/components/date-range-picker";
import { useMetrics, pickSeries, latest, deltaPct, byDimension } from "@/hooks/use-metrics";
import { PageHeader, Surface, FilledButton } from "@/components/app-shell";
import { METRIC_LABELS, FUNNEL_STAGES, formatMetric } from "@/lib/metrics-catalog";
import { chat, getActiveConfig, type ChatMessage } from "@/lib/ai/client";
import { Send, Sparkles, User } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/ask")({
  validateSearch: rangeSearchSchema,
  component: AskAI,
});

type Turn = { role: "user" | "assistant"; content: string };

function buildContext(rows: any[]): string {
  const numeric = Object.keys(METRIC_LABELS);
  const summary = numeric.map((k) => {
    const v = latest(rows, k);
    const d = deltaPct(rows, k);
    return `- ${k}: latest ${v.toFixed(2)}, change ${d}% over range`;
  }).join("\n");
  const funnel = FUNNEL_STAGES.map((s) => `${s}=${byDimension(rows, "funnel").find((r) => r.name === s)?.value ?? 0}`).join(", ");
  const channels = byDimension(rows, "channel_signups").map((c) => `${c.name}=${c.value}`).join(", ");
  return `Current metrics summary:\n${summary}\n\nFunnel: ${funnel}\nChannels: ${channels}`;
}

function AskAI() {
  const range = useDateRange();
  const { data } = useMetrics(range);
  const rows = data.rows;

  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [turns]);

  const send = async () => {
    if (!input.trim()) return;
    if (!getActiveConfig()) { toast.error("Configure an AI provider in Settings → AI"); return; }
    const userMsg = input.trim();
    setInput("");
    const next: Turn[] = [...turns, { role: "user", content: userMsg }];
    setTurns(next);
    setBusy(true);
    try {
      const messages: ChatMessage[] = [
        {
          role: "system",
          content: `You are Bus In, a startup metrics analyst. Date range: ${range.from} to ${range.to}.\n\n${buildContext(rows)}\n\nAnswer concisely. Use the metric values above; never invent numbers. When useful, format figures clearly.`,
        },
        ...next.map((t) => ({ role: t.role, content: t.content }) as ChatMessage),
      ];
      const reply = await chat({ messages, temperature: 0.3 });
      setTurns((t) => [...t, { role: "assistant", content: reply }]);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const suggestions = [
    "What's our MRR growth?",
    "How is our runway trending?",
    "Where is the biggest drop in our funnel?",
    "Compare NDR and CAC payback.",
  ];

  return (
    <>
      <PageHeader title="Ask AI" subtitle="Chat with your metrics. Natural-language Q&A across the live data." />
      <Surface className="p-0 flex flex-col h-[calc(100vh-220px)]">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {turns.length === 0 ? (
            <div className="text-center max-w-md mx-auto mt-8">
              <div className="size-14 rounded-2xl mx-auto bg-primary-container text-on-primary-container grid place-items-center">
                <Sparkles className="size-7" />
              </div>
              <h3 className="mt-4 font-semibold text-lg">Ask anything about your numbers</h3>
              <p className="text-sm text-on-surface-variant mt-1">Your AI provider sees a summary of the current date range.</p>
              <div className="mt-5 grid gap-2">
                {suggestions.map((s) => (
                  <button key={s} onClick={() => setInput(s)} className="text-left text-sm px-4 py-2.5 rounded-2xl bg-surface-container-high hover:bg-surface-container-highest">{s}</button>
                ))}
              </div>
            </div>
          ) : (
            turns.map((t, i) => (
              <div key={i} className={`flex gap-3 ${t.role === "user" ? "justify-end" : ""}`}>
                {t.role === "assistant" ? <div className="size-8 rounded-xl bg-primary-container text-on-primary-container grid place-items-center shrink-0"><Sparkles className="size-4" /></div> : null}
                <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap ${t.role === "user" ? "bg-primary text-primary-foreground" : "bg-surface-container-high"}`}>{t.content}</div>
                {t.role === "user" ? <div className="size-8 rounded-xl bg-surface-container-high grid place-items-center shrink-0"><User className="size-4" /></div> : null}
              </div>
            ))
          )}
          {busy ? <div className="text-xs text-on-surface-variant ml-11">Thinking…</div> : null}
          <div ref={endRef} />
        </div>
        <div className="border-t border-outline-variant p-3 flex gap-2">
          <input
            className="flex-1 h-11 px-4 rounded-full bg-surface-container border border-outline-variant text-sm"
            placeholder="Ask about your metrics…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            disabled={busy}
          />
          <FilledButton onClick={send} disabled={busy || !input.trim()}><Send className="size-4" /></FilledButton>
        </div>
      </Surface>
    </>
  );
}

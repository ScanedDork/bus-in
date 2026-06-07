# Bus In

Open-source, local-first **business intelligence for startups & scaleups**.
Track revenue, growth, retention, runway, funnels and cohorts — and ask
questions in natural language using any AI provider you bring.

> No SaaS lock-in. No accounts. Your data stays where you put it.

**🔗 Live demo:** https://scaneddork.github.io/bus-in/

---

## Highlights

- **100% open source** (MIT) and **runs entirely on your machine**.
- **Flexible storage** — pick one in **Settings → Workspace**:
  - **Browser memory** — ephemeral, perfect for demos.
  - **Browser localStorage** — default; persists in your browser.
  - **Dedicated server** — point Bus In at any KV server speaking
    `GET /kv` and `PUT /kv`. A reference Node.js server lives in [`server/`](./server).
- **Bring-your-own AI** — OpenAI, Anthropic (Claude), Google Gemini,
  **Ollama** and **LM Studio** for fully local inference, or any
  OpenAI-compatible endpoint. Keys are stored locally.
- **Smart features powered by your chosen model**:
  - Auto-generated insights & anomaly detection on the Overview.
  - **Ask AI** — natural-language Q&A over your metrics.
  - **AI Report Builder** — describe the dashboard, get widgets.
  - **Forecasting & what-if** scenarios with AI commentary.
- **Real data ingestion** via CSV upload or HTTP/JSON fetch.
- Built with **TanStack Start**, React 19, Vite 7, Tailwind v4.

---

## Quick start

```bash
bun install        # or: npm install / pnpm install
bun dev            # or: npm run dev
```

Open <http://localhost:5173>.

### Optional: run the dedicated storage server

```bash
cd server
bun install
bun start          # listens on :8787
```

Then in the app open **Settings → Workspace → Storage backend → Dedicated server**
and set the URL.

### Optional: run a local AI

- [Ollama](https://ollama.com): `ollama serve` then pull a model
  (`ollama pull llama3.2`). In **Settings → AI providers**, pick Ollama.
- [LM Studio](https://lmstudio.ai): enable the local server and point
  Bus In at `http://localhost:1234/v1`.

---

## Project structure

```
src/
  lib/
    storage/backends.ts   # memory / localStorage / remote KV adapters
    store.ts              # reactive store, hooks, domain types, seed
    ai/client.ts          # unified AI client (OpenAI, Anthropic, Gemini, Ollama, …)
  routes/                 # file-based TanStack Router pages
server/                   # tiny Node KV server for "dedicated server" mode
```

---

## Contributing

Issues and PRs are very welcome. Please run `bun lint` and keep changes
focused.

## License

[MIT](./LICENSE) © Ramar Ranjeet Skanda

## Author

**Ramar Ranjeet Skanda**
- Portfolio: <https://ranjeetskanda.com>
- GitHub: <https://github.com/ScanedDork>

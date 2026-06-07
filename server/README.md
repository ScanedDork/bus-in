# Bus In — reference KV server

Tiny Node HTTP server (no dependencies) that backs the **Dedicated server**
storage mode in Bus In.

```bash
node server.mjs                      # listens on :8787
BUSIN_TOKEN=secret node server.mjs   # require Authorization: Bearer secret
PORT=9000 node server.mjs            # custom port
```

### Endpoints

- `GET /kv` → `{ [key]: stringValue }` snapshot of all keys.
- `PUT /kv` with body `{ "items": [{ "key": "...", "value": "..." | null }] }`
  upserts (or deletes when value is `null`).

Data is persisted to `data.json` next to the script. Swap in Postgres,
Redis, S3, etc. by re-implementing those two endpoints — the client only
cares about the contract.

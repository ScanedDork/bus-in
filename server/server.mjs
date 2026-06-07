// Minimal reference KV server for Bus In's "Dedicated server" storage mode.
// Run with: `bun start` (or `node server.mjs` on Node >= 20).
// Data is persisted to ./data.json. Set BUSIN_TOKEN to require a bearer token.

import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const PORT = Number(process.env.PORT ?? 8787);
const TOKEN = process.env.BUSIN_TOKEN ?? "";
const FILE = new URL("./data.json", import.meta.url);

/** @type {Record<string,string>} */
let data = {};
if (existsSync(FILE)) {
  try { data = JSON.parse(await readFile(FILE, "utf8")); } catch {}
}

let saveTimer = null;
function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(async () => {
    saveTimer = null;
    try { await writeFile(FILE, JSON.stringify(data, null, 2)); }
    catch (e) { console.error("save failed", e); }
  }, 200);
}

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, PUT, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function unauthorized(req) {
  if (!TOKEN) return false;
  const h = req.headers["authorization"] ?? "";
  return h !== `Bearer ${TOKEN}`;
}

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return Buffer.concat(chunks).toString("utf8");
}

const server = createServer(async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") { res.writeHead(204).end(); return; }
  if (!req.url?.startsWith("/kv")) { res.writeHead(404).end(); return; }
  if (unauthorized(req)) { res.writeHead(401).end("unauthorized"); return; }

  if (req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
    return;
  }
  if (req.method === "PUT") {
    try {
      const body = JSON.parse(await readBody(req));
      const items = Array.isArray(body.items) ? body.items : [];
      for (const { key, value } of items) {
        if (typeof key !== "string") continue;
        if (value === null) delete data[key];
        else data[key] = String(value);
      }
      scheduleSave();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, count: items.length }));
    } catch (e) {
      res.writeHead(400).end(String(e));
    }
    return;
  }
  res.writeHead(405).end();
});

server.listen(PORT, () => {
  console.log(`Bus In KV server listening on http://localhost:${PORT}`);
  if (!TOKEN) console.log("(no BUSIN_TOKEN set — server is open)");
});

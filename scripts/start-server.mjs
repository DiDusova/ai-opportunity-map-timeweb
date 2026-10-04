import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { Readable } from "node:stream";

import handler from "../dist/server/server.js";

const port = Number(process.env.PORT ?? "3000");
const host = process.env.HOST ?? "0.0.0.0";
const clientDir = resolve("dist/client");

const types = new Map([
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".webmanifest", "application/manifest+json"],
]);

function staticPath(url) {
  const pathname = decodeURIComponent(new URL(url, "http://localhost").pathname);
  const candidate = normalize(join(clientDir, pathname));
  if (!candidate.startsWith(clientDir)) return null;
  if (!existsSync(candidate) || !statSync(candidate).isFile()) return null;
  return candidate;
}

function sendStatic(file, res) {
  res.statusCode = 200;
  res.setHeader("content-type", types.get(extname(file)) ?? "application/octet-stream");
  res.setHeader(
    "cache-control",
    file.includes("/assets/") ? "public, max-age=31536000, immutable" : "public, max-age=300",
  );
  createReadStream(file).pipe(res);
}

async function sendFetchResponse(response, res) {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  if (!response.body) {
    res.end();
    return;
  }
  Readable.fromWeb(response.body).pipe(res);
}

function bodyFor(req) {
  return req.method === "GET" || req.method === "HEAD" ? undefined : Readable.toWeb(req);
}

function headersFor(req) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) headers.set(key, value.join(", "));
    else if (value != null) headers.set(key, value);
  }
  return headers;
}

createServer(async (req, res) => {
  try {
    const file = staticPath(req.url ?? "/");
    if (file) {
      sendStatic(file, res);
      return;
    }

    const origin = `http://${req.headers.host ?? `localhost:${port}`}`;
    const request = new Request(new URL(req.url ?? "/", origin), {
      method: req.method,
      headers: headersFor(req),
      body: bodyFor(req),
      duplex: "half",
    });
    await sendFetchResponse(await handler.fetch(request, process.env, {}), res);
  } catch (error) {
    console.error(error);
    res.statusCode = 500;
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.end("Internal Server Error");
  }
}).listen(port, host, () => {
  console.log(`AI Opportunity Map is running on http://${host}:${port}`);
});

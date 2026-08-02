const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const port = Number(process.env.PORT || 5173);
const defaultUpstream = "http://localhost:11434";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml"
};

function addCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-API-Key");
  res.setHeader("Access-Control-Allow-Private-Network", "true");
}

function writeJson(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function isLocalHost(hostname) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    /^127\./.test(hostname)
  );
}

function ollamaOrigin(raw) {
  if (!raw) {
    return defaultUpstream;
  }
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return defaultUpstream;
    }
    if (u.protocol === "https:") {
      return u.origin;
    }
    if (!isLocalHost(u.hostname)) {
      return defaultUpstream;
    }
    return u.origin;
  } catch (err) {
    return defaultUpstream;
  }
}

async function proxyToOllama(req, res, targetPath, baseOverride) {
  addCors(res);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  let upstream = baseOverride || defaultUpstream;
  const init = { method: req.method, headers: {} };
  if (req.method === "POST") {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const rawBody = Buffer.concat(chunks).toString("utf8");
    let body = {};
    try {
      body = JSON.parse(rawBody || "{}");
    } catch (err) {
      body = {};
    }
    upstream = ollamaOrigin(body.ollama_base || baseOverride);
    const apiKey = typeof body.api_key === "string" && body.api_key ? body.api_key : "";
    delete body.ollama_base;
    delete body.api_key;
    init.body = JSON.stringify(body);
    init.headers["Content-Type"] = "application/json";
    if (apiKey) {
      init.headers.Authorization = "Bearer " + apiKey;
    }
  } else {
    const headerKey = typeof req.headers["x-api-key"] === "string" ? req.headers["x-api-key"] : "";
    if (headerKey) {
      init.headers.Authorization = "Bearer " + headerKey;
    }
  }

  try {
    const upstreamRes = await fetch(upstream + targetPath, init);
    const text = await upstreamRes.text();
    addCors(res);
    res.writeHead(upstreamRes.status, { "Content-Type": "application/json; charset=utf-8" });
    res.end(text);
  } catch (err) {
    writeJson(res, 502, { error: { message: "无法连接模型服务：" + err.message } });
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://" + req.headers.host);
  const pathname = decodeURIComponent(url.pathname);

  if (pathname === "/v1/models") {
    await proxyToOllama(req, res, pathname, ollamaOrigin(url.searchParams.get("base")));
    return;
  }
  if (pathname === "/v1/chat/completions") {
    await proxyToOllama(req, res, pathname);
    return;
  }

  addCors(res);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const requested = path.join(root, pathname === "/" ? "index.html" : pathname);
  const resolved = path.resolve(requested);
  if (!resolved.startsWith(path.resolve(root))) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("forbidden");
    return;
  }

  fs.readFile(resolved, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("not found");
      return;
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(resolved).toLowerCase()] || "application/octet-stream" });
    res.end(data);
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log("serving on http://127.0.0.1:" + port);
});

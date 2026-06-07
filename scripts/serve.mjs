import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DIST_DIR = path.join(ROOT, "dist");
const PORT = Number(process.env.PORT || 4173);

spawnSync(process.execPath, [path.join(ROOT, "scripts", "build.mjs")], {
  stdio: "inherit",
  cwd: ROOT,
});

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://localhost:${PORT}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.endsWith("/")) pathname += "index.html";
  let file = path.join(DIST_DIR, pathname);
  if (!file.startsWith(DIST_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  if (!fs.existsSync(file)) {
    const fallback = path.join(DIST_DIR, pathname, "index.html");
    if (fs.existsSync(fallback)) file = fallback;
  }
  if (!fs.existsSync(file)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});

server.listen(PORT, () => {
  console.log(`Preview: http://localhost:${PORT}`);
});

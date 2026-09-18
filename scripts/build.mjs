import { readFile, readdir, mkdir, rm, writeFile, copyFile } from "node:fs/promises";
import { resolve, extname } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const publicDir = resolve(root, "public");
const distDir = resolve(root, "dist");
const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml" };

await rm(distDir, { recursive: true, force: true });
await mkdir(resolve(distDir, "server"), { recursive: true });
await mkdir(resolve(distDir, ".openai"), { recursive: true });

const assets = {};
for (const name of await readdir(publicDir)) {
  const bytes = await readFile(resolve(publicDir, name));
  assets[name === "index.html" ? "/" : `/${name}`] = {
    body: bytes.toString("base64"),
    type: mime[extname(name)] || "application/octet-stream",
  };
}

const template = await readFile(resolve(root, "worker/index.js"), "utf8");
const output = template.replace("/*__ASSET_MAP__*/", JSON.stringify(assets));
await writeFile(resolve(distDir, "server/index.js"), output);
await copyFile(resolve(root, ".openai/hosting.json"), resolve(distDir, ".openai/hosting.json"));
console.log(`Built ${distDir}`);

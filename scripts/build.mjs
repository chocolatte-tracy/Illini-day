import { readFile, readdir, mkdir, rm, writeFile, access, cp } from "node:fs/promises";
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
await writeFile(resolve(distDir, "server/package.json"), JSON.stringify({ type: "module" }, null, 2));
// The GitHub Pages site is published directly from public/.  The generated
// Worker artifact is still used by the live integration tests, but this repo
// intentionally does not carry a Sites hosting manifest.  Keep the artifact
// self-contained so a clean checkout can run the documented checks.
const manifestPath = resolve(root, ".openai/hosting.json");
let manifest = "{}";
try {
  await access(manifestPath);
  manifest = await readFile(manifestPath, "utf8");
} catch {
  // No Sites manifest is expected for the GitHub Pages deployment.
}
await writeFile(resolve(distDir, ".openai/hosting.json"), manifest);
await cp(resolve(root, "drizzle"), resolve(distDir, ".openai/drizzle"), { recursive: true });
console.log(`Built ${distDir}`);

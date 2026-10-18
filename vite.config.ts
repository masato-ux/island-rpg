import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import { createHash } from "node:crypto";
export default defineConfig({
  base: "./",
  build: { rollupOptions: { input: ["index.html", "island.html"] } },
  server: { host: "0.0.0.0", port: 5173, strictPort: true },
  plugins: [
    {
      name: "offline-shell",
      generateBundle(_, bundle) {
        const assets = Object.keys(bundle),
          version = createHash("sha256")
            .update(assets.join("|"))
            .update(readFileSync("index.html"))
            .update(readFileSync("island.html"))
            .digest("hex")
            .slice(0, 12);
        const source = `const CACHE='silent-castaway-${version}';const FILES=${JSON.stringify([...new Set(["./", "./index.html", "./island.html", ...assets.map((a) => "./" + a)])])};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('silent-castaway-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
 if(event.request.mode==='navigate'){event.respondWith(fetch(event.request).catch(()=>caches.open(CACHE).then(cache=>cache.match(new URL(new URL(event.request.url).pathname.endsWith('/island.html')?'./island.html':'./index.html',self.registration.scope)))));return;}
 event.respondWith(caches.open(CACHE).then(cache=>cache.match(event.request)).then(hit=>hit||fetch(event.request)));});`;
        this.emitFile({ type: "asset", fileName: "sw.js", source });
      },
    },
  ],
});

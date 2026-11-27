// MapLibre's web worker must be served as a plain static file (bundlers rewrite its URL and break it).
import { copyFileSync, existsSync, mkdirSync } from "node:fs";

const from = "node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs";
if (!existsSync(from)) {
  console.warn("copy-map-worker: maplibre-gl is not installed yet, skipping");
  process.exit(0);
}
mkdirSync("public/vendor", { recursive: true });
copyFileSync(from, "public/vendor/maplibre-gl-worker.mjs");
console.log("copied MapLibre worker to public/vendor");

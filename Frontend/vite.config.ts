// @lovable.dev/vite-tanstack-config already includes tanstackStart, viteReact,
// tailwindcss, tsConfigPaths, cloudflare (build-only), etc. — don't re-add them.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import path from "node:path";
import fs from "node:fs";
import type { Plugin } from "vite";

/**
 * Serves /figures/* from the sibling `images/` folder of the monorepo:
 *   TCC/
 *     backend/
 *     frontend/   <- vite root
 *     images/     <- PNGs gerados pelo pipeline Python
 *
 * Dev: middleware streams files from ../images.
 * Build: copies ../images into dist/figures so a static deploy works too.
 */
function externalImagesPlugin(): Plugin {
  const imagesDir = path.resolve(process.cwd(), "../images");

  const mimeFor = (ext: string) =>
    ext === ".png"
      ? "image/png"
      : ext === ".jpg" || ext === ".jpeg"
        ? "image/jpeg"
        : ext === ".svg"
          ? "image/svg+xml"
          : ext === ".webp"
            ? "image/webp"
            : "application/octet-stream";

  const copyTree = (src: string, dst: string) => {
    if (!fs.existsSync(src)) return;
    fs.mkdirSync(dst, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
      const s = path.join(src, entry.name);
      const d = path.join(dst, entry.name);
      if (entry.isDirectory()) copyTree(s, d);
      else fs.copyFileSync(s, d);
    }
  };

  return {
    name: "tcc-external-images",
    configureServer(server) {
      server.middlewares.use("/figures", (req, res, next) => {
        try {
          const url = decodeURIComponent((req.url || "/").split("?")[0]);
          const filePath = path.join(imagesDir, url);
          if (!filePath.startsWith(imagesDir)) return next();
          if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return next();
          res.setHeader("Content-Type", mimeFor(path.extname(filePath).toLowerCase()));
          res.setHeader("Cache-Control", "no-cache");
          fs.createReadStream(filePath).pipe(res);
        } catch {
          next();
        }
      });
    },
    closeBundle() {
      try {
        copyTree(imagesDir, path.resolve(process.cwd(), "dist/figures"));
      } catch {
        // Silent — pasta opcional.
      }
    },
  };
}

export default defineConfig({
  vite: {
    plugins: [externalImagesPlugin()],
  },
});

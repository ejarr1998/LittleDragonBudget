import fs from "node:fs"
import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin, type ResolvedConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

/**
 * Replace the __BUILD__ placeholder in the service worker with a per-build stamp.
 * Without this the cache name never changes, so old entries are never evicted.
 */
function stampServiceWorker(): Plugin {
  const build = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)
  let config: ResolvedConfig
  return {
    name: 'stamp-service-worker',
    apply: 'build',
    configResolved(c) { config = c },
    closeBundle() {
      // public/ assets bypass rollup, so patch the emitted file directly.
      const out = path.resolve(config.root, config.build.outDir, 'sw.js')
      if (!fs.existsSync(out)) return
      fs.writeFileSync(out, fs.readFileSync(out, 'utf8').replace(/__BUILD__/g, build))
      config.logger.info(`  service worker cache stamped: ldb-${build}`)
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: './',
  // The inspector plugin is a dev-time authoring aid; keep it out of production.
  plugins: [...(mode === 'development' ? [inspectAttr()] : []), react(), stampServiceWorker()],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));

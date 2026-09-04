import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // apps/web/.env holds VITE_* only, and Vite inlines those into the bundle — so
  // everything readable here is public by design. Server secrets live in
  // apps/api/.env and this app has no way to reach them.
  const { VITE_API_URL = 'http://localhost:3001' } = loadEnv(mode, __dirname, 'VITE_');

  return {
    plugins: [react()],
    build: {
      rollupOptions: {
        output: {
          // The screens are lazy, so each is already its own chunk; this names the
          // libraries they share so a screen switch re-uses them from cache. Matched on
          // the installed path rather than by package name: naming "react-dom" alone
          // chunks its entry module and leaves the ~130 kB of internals behind in the
          // entry chunk, because pnpm resolves them through a different directory.
          manualChunks(id) {
            if (!id.includes('/node_modules/')) return undefined;
            if (id.includes('/node_modules/lightweight-charts/')) return 'charts';
            if (/\/node_modules\/(socket\.io|engine\.io)/.test(id)) return 'channel';
            if (/\/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id))
              return 'react';
            return undefined;
          },
        },
      },
    },
    server: {
      port: 5173,
      // The browser only ever talks to the web origin; the API is reached through
      // this proxy in development. Keeps the frontend from knowing where the
      // backend lives, and mirrors how it will sit behind one origin in a demo.
      proxy: {
        '/api': { target: VITE_API_URL, changeOrigin: true },
        // CHANNEL.path in @csl/contracts. Written out rather than imported because a
        // Vite config is loaded by Node, which cannot read that package's ESM build.
        '/channel': { target: VITE_API_URL, changeOrigin: true, ws: true },
      },
    },
  };
});

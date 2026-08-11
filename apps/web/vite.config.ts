import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // apps/web/.env holds VITE_* only, and Vite inlines those into the bundle — so
  // everything readable here is public by design. Server secrets live in
  // apps/api/.env and this app has no way to reach them.
  const { VITE_API_URL = 'http://localhost:3001' } = loadEnv(mode, __dirname, 'VITE_');

  return {
    plugins: [react()],
    server: {
      port: 5173,
      // The browser only ever talks to the web origin; the API is reached through
      // this proxy in development. Keeps the frontend from knowing where the
      // backend lives, and mirrors how it will sit behind one origin in a demo.
      proxy: {
        '/api': { target: VITE_API_URL, changeOrigin: true },
      },
    },
  };
});

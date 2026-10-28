import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: './',
  plugins: [{
    name: 'serve-development-entry',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url === '/' || req.url?.startsWith('/?')) req.url = `/app.html${req.url.slice(1)}`;
        next();
      });
    }
  }],
  build: { rollupOptions: { input: resolve(import.meta.dirname, 'app.html') } }
});

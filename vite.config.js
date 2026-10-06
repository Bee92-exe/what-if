import { defineConfig } from 'vite';

// base './' so the built index.html uses relative paths: works on GitHub Pages,
// itch.io, Netlify, or any subfolder static host without configuration.
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    sourcemap: false,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});

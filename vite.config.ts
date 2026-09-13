import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5174,
    strictPort: true,   // fail rather than silently sliding to 5175+
  },
  build: { target: 'es2020', sourcemap: false },
});
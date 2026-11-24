import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  // The 3D graph chunk is lazy-loaded only when Graph mode opens.
  build: { target: 'es2022', chunkSizeWarningLimit: 1700 },
  optimizeDeps: {
    include: ['react-force-graph-3d', 'three', 'three-spritetext', 'motion/react', 'thinking-orbs'],
  },
});

import { defineConfig } from 'vite';

// GitHub Pages: https://caritasfsc-anthony.github.io/power-save/
// Override with VITE_BASE=/other-repo/ npm run build
export default defineConfig(({ command }) => ({
  base: process.env.VITE_BASE || (command === 'build' ? '/power-save/' : '/'),
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    open: false,
  },
}));

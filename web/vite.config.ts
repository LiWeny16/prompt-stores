import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// base 与 GitHub Pages 仓库名一致（<user>.github.io/prompt-stores）
export default defineConfig({
  base: '/prompt-stores/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': '/src' },
  },
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// base 与 GitHub Pages 仓库名一致（<user>.github.io/prompt-stores）
export default defineConfig({
  base: '/prompt-stores/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // Preact 作为 React 兼容运行时：代码零改动，包体从 ~60KB gzip 降到 ~12KB
      react: 'preact/compat',
      'react-dom': 'preact/compat',
      'react-dom/client': 'preact/compat/client',
      'react/jsx-runtime': 'preact/jsx-runtime',
      '@': '/src',
    },
  },
});

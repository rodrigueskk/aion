import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    // Mantém a compatibilidade com o AI Studio
    hmr: process.env.DISABLE_HMR !== 'true',
  },
  // Removemos o bloco "define" manual para usar o padrão do Vite (VITE_)
});

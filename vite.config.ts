/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Relative base so the production build in dist/ can be served from any static path.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});

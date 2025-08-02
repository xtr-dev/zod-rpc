import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [basicSsl()],
  root: '.',
  server: {
    port: 8080,
    host: true, // Allow external connections
  },
  build: {
    outDir: 'build',
    rollupOptions: {
      input: {
        main: 'index.html',
        offerer: 'offerer.html',
        answerer: 'answerer.html'
      }
    }
  },
  // No need for alias since Vite will resolve from node_modules
});
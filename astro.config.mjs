import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  integrations: [react()],
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('three')) {
                return 'three';
              }
              if (id.includes('gsap')) {
                return 'gsap';
              }
              return 'vendor';
            }
          }
        }
      }
    }
  }
});

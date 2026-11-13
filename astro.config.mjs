import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  site: 'https://abioladeyeye.com',
  vite: {
    build: {
      // three.js alone is about 600 kB minified; the room page needs all of it up front.
      chunkSizeWarningLimit: 800,
    },
  },
});

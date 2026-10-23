
// import { defineConfig } from 'vite';
// import react from '@vitejs/plugin-react';

// export default defineConfig({
//   plugins: [react()],
//   base: '/',
//   server: {

//     // proxy: {
//     //   '/api': { target: 'https://spiderprojects.co.in', changeOrigin: true },
//     //   '/uploads': { target: 'https://spiderprojects.co.in', changeOrigin: true },
//     // },

//     proxy: {
//       '/api': { target: 'http://localhost:5000', changeOrigin: true },
//       '/uploads': { target: 'http://localhost:5000', changeOrigin: true },
//     },
//   },
// });

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/japam108/',
  server: {
    proxy: {
      '/japam108/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        rewrite: p => p.replace(/^\/japam108/, ''),
      },
      '/japam108/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        rewrite: p => p.replace(/^\/japam108/, ''),
      },
    },
  },
});

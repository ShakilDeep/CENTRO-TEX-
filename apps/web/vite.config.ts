import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        configure: (proxy, options) => {
          proxy.on('error', (err, _req, res) => {
            // Mute verbose ECONNREFUSED errors, reply with valid syntax temporarily 
            if (!res.headersSent) {
               res.writeHead(502, { 'Content-Type': 'application/json' });
               res.end(JSON.stringify({ success: false, error: 'API Server Offline' }));
            }
          });
        }
      },
      '/auth': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, res) => {
            if (!res.headersSent) {
               res.writeHead(502, { 'Content-Type': 'application/json' });
               res.end(JSON.stringify({ success: false, error: 'API Server Offline' }));
            }
          });
        }
      },
      '/health': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true
      },
      '/sso': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true
      },
    },
  },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"

export default defineConfig({
  // Serve the client/fonts directory as public static assets
  publicDir: 'fonts',
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@/lib/utils": path.resolve(__dirname, "./src/lib/utils"),
    },
  },
  server: {
    port: 5173,
    allowedHosts: ['0e22b5b2d556.ngrok.app', '280c1e97fec6.ngrok.app', 'bb2b151abe3d.ngrok.app','64d5ebc818df.ngrok.app', '64d5ebc818df.ngrok.app','03a5f6ad56ec.ngrok.app', '51a175a051aa.ngrok.app' ], 
    proxy: {
      '/api': {
        target: 'https://a88769ca175c.ngrok.app',
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy, options) => {
          // Logging pour le debugging
          proxy.on('error', (err, req, res) => {
            console.error('Erreur de proxy:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Requête proxifiée vers:', proxyReq.path);
          });
        }
      }
    }
  },
  
  build: {
    sourcemap: true
  }
})
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    host: '0.0.0.0', // 允许通过IP访问
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // 转发真实的访问地址给后端
            const realHost = req.headers.host || 'localhost:5173';
            proxyReq.setHeader('X-Forwarded-Host', realHost);
            proxyReq.setHeader('X-Real-Host', realHost);
          });
        }
      },
      '/videos': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // 转发真实的访问地址给后端
            const realHost = req.headers.host || 'localhost:5173';
            proxyReq.setHeader('X-Forwarded-Host', realHost);
            proxyReq.setHeader('X-Real-Host', realHost);
          });
        }
      }
    }
  }
})
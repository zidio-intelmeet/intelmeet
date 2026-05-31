import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  
  return {
    plugins: [
      tailwindcss(),
      react(),
      nodePolyfills({
        include: ['util', 'buffer', 'process'],
        globals: {
          Buffer: true,
          global: true,
          process: true,
        },
        protocolImports: true,
      }),
    ],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://127.0.0.1:3001',
          changeOrigin: true,
          secure: false,
          // Remove unused variables to solve unused vars linting error
          configure: (proxy) => {
            proxy.on('error', (err) => {
              console.log('Proxy Error:', err);
            });
          }
        }
      }
    }
  }
})
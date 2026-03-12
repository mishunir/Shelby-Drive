import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import path from 'path'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vitejs.dev/config/
export default defineConfig({
  envPrefix: ['REACT_APP_', 'VITE_'],
  assetsInclude: ['**/*.wasm'],
  plugins: [
    react(),
    basicSsl(),
    nodePolyfills({
      // To add only specific polyfills
      include: ['buffer'],
      // Or to exclude specific polyfills
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    // Avoid pre-bundling Shelby SDK to keep its WASM loader intact
    exclude: ['@shelby-protocol/sdk', '@shelby-protocol/clay-codes'],
    esbuildOptions: {
      target: 'esnext',
      loader: {
        // Use binary to avoid file-loader outdir requirement during optimizeDeps scan
        '.wasm': 'binary',
      },
    },
  },
  ssr: {
    noExternal: ['@shelby-protocol/player'],
  },
  define: {
    global: 'globalThis',
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.wasm')) {
            return 'assets/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
  },
  server: {
    host: true,
    port: 5173,
    https: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
    fs: {
      strict: false,
    },
  }
})

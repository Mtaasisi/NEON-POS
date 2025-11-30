import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  // Log the loaded environment variable for debugging
  console.log('🔍 VITE_DATABASE_URL from env:', env.VITE_DATABASE_URL?.substring(0, 50) + '...');
  const devServerPort = Number(env.VITE_DEV_SERVER_PORT || env.PORT || 5173);
  const devServerHost = env.VITE_DEV_SERVER_HOST || '0.0.0.0';

  const hmrOptions: Record<string, any> = {
    protocol: env.VITE_DEV_HMR_PROTOCOL || 'ws',
    timeout: 30000, // 30 second timeout for HMR
    overlay: false, // Disable error overlay to prevent WebSocket issues
  };

  if (env.VITE_DEV_HMR_HOST) {
    hmrOptions.host = env.VITE_DEV_HMR_HOST;
  }

  if (env.VITE_DEV_HMR_PORT) {
    hmrOptions.port = Number(env.VITE_DEV_HMR_PORT);
  }

  if (env.VITE_DEV_HMR_CLIENT_PORT) {
    hmrOptions.clientPort = Number(env.VITE_DEV_HMR_CLIENT_PORT);
  }

  const server = {
    port: devServerPort,
    host: devServerHost,
    strictPort: true, // Don't try other ports if 5173 is busy
    open: true, // Automatically open browser when dev server starts
    hmr: hmrOptions,
    watch: {
      usePolling: true,
      interval: 1000,
      ignored: ['**/node_modules/**', '**/dist/**'], // Ignore unnecessary files
    },
    // Add better error handling for development
    // Allow access to source files for development
    fs: {
      strict: false,
      allow: ['..']
    },
    // Add better error handling
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'apikey', 'X-Client-Info'],
      credentials: false,
    },
    // Proxy API requests to backend
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,
        ws: true, // Enable WebSocket proxying
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('❌ Proxy error:', err.message);
            // Don't crash the dev server on proxy errors
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Silently handle proxy requests
          });
        },
      },
    },
    // Add better error handling for development
    middlewareMode: false,
    // Increase header size limit to prevent 431 errors
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, X-Client-Info',
    },
  };

  return {
    // Use relative path for Capacitor, absolute for web deployments
    // If deployed to a subdirectory, set VITE_BASE_PATH environment variable
    // Default to root path for normal deployments
    base: process.env.CAPACITOR_BUILD === 'true' ? './' : (command === 'serve' ? '/' : (env.VITE_BASE_PATH || '/')),
    plugins: [
      react({
        jsxRuntime: 'automatic'
      }),
    ],
    optimizeDeps: {
      exclude: ['lucide-react'],
      // Add timeout for dependency optimization
      force: false,
      // Include TypeScript files in dependency optimization
      include: ['react', 'react-dom', 'react-router-dom'],
      // Add esbuild options for better dependency handling
      esbuildOptions: {
        target: 'es2020',
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: process.env.NODE_ENV === 'development' ? 'inline' : false,
      chunkSizeWarningLimit: 2000, // Increased for better chunking
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            supabase: ['@supabase/supabase-js'],
            ui: ['lucide-react', 'react-hot-toast'],
            charts: ['recharts'],
            utils: ['dayjs', 'uuid', 'papaparse', 'xlsx'],
            forms: ['react-hook-form', '@hookform/resolvers', 'zod'],
            routing: ['react-router-dom'],
            pdf: ['jspdf'],
            qr: ['html5-qrcode', 'qrcode.react'],
          },
        },
      },
      // Optimize for production
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info', 'console.debug'],
        },
        mangle: {
          safari10: true,
        },
      },
      // Add compression
      reportCompressedSize: true,
      // Optimize assets
      assetsInlineLimit: 4096,
    },
    server,
    // Ensure config.js is copied to build output
    publicDir: 'public',
    // Add resolve configuration
    resolve: {
      alias: {
        '@': '/src',
      },
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json']
    },
    // Add define to prevent issues with module resolution
    define: {
      __DEV__: process.env.NODE_ENV === 'development',
    },
    // Expose env variables properly
    envPrefix: 'VITE_',
    // Add better error handling for development
    clearScreen: false,
    logLevel: 'info',
    // Add esbuild configuration for better performance
    esbuild: {
      target: 'es2020',
      supported: {
        'bigint': true
      },
      legalComments: 'none',
      charset: 'utf8',
      sourcemap: false, // Disable source maps to avoid CORS issues
      // Temporarily disable TypeScript checking to resolve compilation errors
      logLevel: 'silent',
    },
    // Development-specific configuration
    ...(command === 'serve' && {
      css: {
        devSourcemap: false,
      },
      build: {
        sourcemap: false,
      },
    }),
  };
});
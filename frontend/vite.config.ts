import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Explicitly load env vars - Vite should do this automatically, but being explicit
  // Use 'production' mode explicitly for builds
  const buildMode = mode || 'production';
  const env = loadEnv(buildMode, process.cwd(), '');
  
  // Log to verify env var is available (will show in build logs)
  const apiKey = env.VITE_GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
  console.log('Vite config - Mode:', buildMode);
  console.log('Vite config - VITE_GEMINI_API_KEY available:', !!apiKey);
  console.log('Vite config - VITE_GEMINI_API_KEY length:', apiKey.length);
  console.log('Vite config - VITE_GEMINI_API_KEY first 10:', apiKey.substring(0, 10));
  console.log('Vite config - loadEnv result keys:', Object.keys(env).filter(k => k.includes('VITE')));
  console.log('Vite config - process.env keys:', Object.keys(process.env).filter(k => k.includes('VITE')));
  
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    // Use a simple identifier that Vite can definitely replace
    // This is more reliable than process.env or import.meta.env
    define: {
      '__GEMINI_API_KEY__': JSON.stringify(apiKey),
      'process.env.VITE_GEMINI_API_KEY': JSON.stringify(apiKey),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      // Explicitly set the HTML entry point
      outDir: 'dist',
      rollupOptions: {
        input: path.resolve(__dirname, 'index.html'),
        output: {
          // Ensure @google/generative-ai is bundled, not externalized
          manualChunks: undefined,
        },
      },
      // Don't externalize any dependencies - bundle everything
      commonjsOptions: {
        include: [/node_modules/],
        transformMixedEsModules: true,
      },
    },
    optimizeDeps: {
      include: ['@google/generative-ai'],
      exclude: [],
    },
  };
});

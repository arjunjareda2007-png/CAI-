import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { defineConfig } from 'vite';
import { handleApiRequest } from './src/server/apiMiddleware';

export default defineConfig(() => {
  if (fs.existsSync('.env.local')) {
    const localEnv = dotenv.parse(fs.readFileSync('.env.local'));
    for (const [key, value] of Object.entries(localEnv)) {
      if (value) {
        process.env[key] = value;
      }
    }
  }

  return {
    envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
    define: process.env.VITE_CLERK_PUBLISHABLE_KEY
      ? {
          'import.meta.env.VITE_CLERK_PUBLISHABLE_KEY': JSON.stringify(
            process.env.VITE_CLERK_PUBLISHABLE_KEY
          ),
          'import.meta.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY': JSON.stringify(
            process.env.VITE_CLERK_PUBLISHABLE_KEY
          ),
        }
      : undefined,
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'career-alert-india-api',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            try {
              const handled = await handleApiRequest(req, res);
              if (!handled) {
                next();
              }
            } catch (err) {
              console.error('API Middleware Error:', err);
              next(err);
            }
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

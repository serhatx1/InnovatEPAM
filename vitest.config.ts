import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./tests/setup.ts'],
      include: ['tests/**/*.test.{ts,tsx}'],
      env,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'text-summary', 'json-summary'],
        include: ['src/**/*.{ts,tsx}'],
        exclude: [
          'src/**/*.test.{ts,tsx}',
          'src/**/ui/**',
          'src/app/layout.tsx',
          'src/app/globals.css',
          'src/types/**',
          'src/lib/queries/index.ts',
          'src/lib/supabase/client.ts',
          'src/lib/supabase/server.ts',
          'src/lib/supabase/middleware.ts',
          'src/app/page.tsx',
          'src/app/ideas/page.tsx',
          'src/app/ideas/\\[id\\]/page.tsx',
          'src/app/ideas/drafts/page.tsx',
          'src/app/admin/review/page.tsx',
          'src/components/app-shell.tsx',
        ],
        // thresholds applied after achieving target
        // thresholds: {
        //   statements: 80,
        //   branches: 80,
        //   functions: 80,
        //   lines: 80,
        // },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  };
});

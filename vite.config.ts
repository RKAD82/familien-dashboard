import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'

const readGitCommit = () => {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()
  } catch {
    return 'dev'
  }
}

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/familien-dashboard/',
  define: {
    __APP_COMMIT__: JSON.stringify(process.env.VITE_APP_COMMIT ?? readGitCommit()),
    __APP_BUILD_DATE__: JSON.stringify(process.env.VITE_APP_BUILD_DATE ?? new Date().toISOString()),
  },
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'icons/family-dashboard.svg'],
      manifest: {
        id: '/familien-dashboard/',
        name: 'Familien-Dashboard',
        short_name: 'Familie',
        description: 'Privates Familien-Dashboard für Kalender, Aufgaben, Einkauf, Abfall und Benachrichtigungen.',
        start_url: '/familien-dashboard/#/',
        scope: '/familien-dashboard/',
        display: 'standalone',
        background_color: '#f7f5ef',
        theme_color: '#345c52',
        icons: [
          {
            src: 'icons/family-dashboard.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json}'],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
})

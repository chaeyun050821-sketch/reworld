import { defineConfig } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id: string) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
    {
      name: 'gemini-convert-dev-api',
      configureServer(server) {
        server.middlewares.use('/api/gemini-convert', async (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405
            res.setHeader('Allow', 'POST')
            res.end(JSON.stringify({ error: 'Method not allowed' }))
            return
          }

          let body = ''
          req.on('data', (chunk) => {
            body += chunk
          })
          req.on('end', async () => {
            let payload: { imageBase64?: string; customPrompt?: string; isCustomRefine?: boolean }
            try {
              payload = JSON.parse(body) as typeof payload
            } catch {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Invalid JSON body' }))
              return
            }

            try {
              const { convertDrawingWithGemini } = await import('./src/lib/gemini-convert-server')
              const svg = await convertDrawingWithGemini({
                imageBase64: payload.imageBase64 ?? '',
                customPrompt: payload.customPrompt,
                isCustomRefine: payload.isCustomRefine,
              })
              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ svg }))
            } catch (err) {
              const message = err instanceof Error ? err.message : '변환에 실패했어요.'
              res.statusCode = 502
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: message }))
            }
          })
        })
      },
    },
    {
      name: 'bgm-search-dev-api',
      configureServer(server) {
        server.middlewares.use('/api/bgm-search', async (req, res) => {
          if (req.method !== 'GET') {
            res.statusCode = 405
            res.setHeader('Allow', 'GET')
            res.end(JSON.stringify({ error: 'Method not allowed' }))
            return
          }

          const url = new URL(req.url ?? '/', 'http://localhost')
          const query = url.searchParams.get('q') ?? ''
          if (!query.trim()) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Missing search query' }))
            return
          }

          try {
            const { searchBgmOnServer } = await import('./src/lib/bgm-search-server')
            const results = await searchBgmOnServer(query)
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ results }))
          } catch (err) {
            const message = err instanceof Error ? err.message : '검색에 실패했습니다.'
            res.statusCode = 502
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: message }))
          }
        })
      },
    },
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/bgm-proxy/deezer': {
        target: 'https://api.deezer.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/bgm-proxy\/deezer/, ''),
      },
    },
  },

  build: {
    chunkSizeWarningLimit: 1200,
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})

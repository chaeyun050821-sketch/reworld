import { defineConfig, loadEnv } from 'vite'
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

export default defineConfig(({ mode }) => {
  // Vite는 VITE_ 접두사만 클라이언트에 노출함.
  // 서버 미들웨어용 GEMINI_API_KEY는 loadEnv로 직접 process.env에 넣어야 함.
  const env = loadEnv(mode, __dirname, '')
  if (env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY) {
    process.env.GEMINI_API_KEY = env.GEMINI_API_KEY
  }

  return {
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
            let payload: {
              imageBase64?: string
              svgMarkup?: string
              customPrompt?: string
              isCustomRefine?: boolean
              refineFromSketch?: boolean
            }
            try {
              payload = JSON.parse(body) as typeof payload
            } catch {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Invalid JSON body' }))
              return
            }

            try {
              // .env가 hot-reload 전에 안 잡힌 경우 재주입
              if (!process.env.GEMINI_API_KEY && env.GEMINI_API_KEY) {
                process.env.GEMINI_API_KEY = env.GEMINI_API_KEY
              }
              const { convertDrawingWithGemini } = await import('./src/lib/gemini-convert-server')
              const svg = await convertDrawingWithGemini({
                imageBase64: payload.imageBase64,
                svgMarkup: payload.svgMarkup,
                customPrompt: payload.customPrompt,
                isCustomRefine: payload.isCustomRefine,
                refineFromSketch: payload.refineFromSketch,
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
  }
})

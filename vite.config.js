import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import JavaScriptObfuscator from 'javascript-obfuscator'

// Plugin de Ofuscación Avanzada de JavaScript para Código Propietario (Producción)
function advancedObfuscatorPlugin() {
  return {
    name: 'vite-plugin-advanced-obfuscator',
    apply: 'build',
    enforce: 'post',
    renderChunk(code, chunk) {
      // Ignorar chunks de librerías de terceros (React, Chart.js, ExcelJS) para mantener máxima velocidad y estabilidad
      if (!chunk.fileName.endsWith('.js') || chunk.name.startsWith('vendor')) {
        return null
      }

      try {
        // Ofuscación profunda de toda la lógica comercial, fórmulas, modelos y vistas de la aplicación
        const obfuscationResult = JavaScriptObfuscator.obfuscate(code, {
          compact: true,
          controlFlowFlattening: false,
          deadCodeInjection: false,
          debugProtection: false,
          disableConsoleOutput: false,
          identifierNamesGenerator: 'hexadecimal',
          log: false,
          numbersToExpressions: true,
          renameGlobals: false,
          selfDefending: false,
          simplify: true,
          splitStrings: true,
          splitStringsChunkLength: 8,
          stringArray: true,
          stringArrayCallsTransform: true,
          stringArrayEncoding: ['base64'],
          stringArrayIndexShift: true,
          stringArrayRotate: true,
          stringArrayShuffle: true,
          stringArrayWrappersCount: 2,
          stringArrayWrappersChainedCalls: true,
          stringArrayThreshold: 0.8,
          transformObjectKeys: true,
          unicodeEscapeSequence: false
        })

        return {
          code: obfuscationResult.getObfuscatedCode(),
          map: null
        }
      } catch (err) {
        console.warn('Obfuscation warning for ' + chunk.fileName + ':', err)
        return null
      }
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    advancedObfuscatorPlugin()
  ],
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('exceljs') || id.includes('xlsx')) {
              return 'vendor-excel'
            }
            if (id.includes('chart.js') || id.includes('react-chartjs-2')) {
              return 'vendor-chart'
            }
            if (id.includes('react') || id.includes('react-dom') || id.includes('lucide-react')) {
              return 'vendor-core'
            }
            return 'vendor-libs'
          }
        }
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
})

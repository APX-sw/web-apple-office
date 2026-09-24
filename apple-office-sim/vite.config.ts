import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // Un build de producción con la API apuntando a localhost deja el sitio sin datos ni fotos para
  // todos los clientes. Es un error fácil de cometer (el .env de desarrollo apunta a localhost), así
  // que se corta el build en vez de publicarlo roto.
  if (mode === 'production') {
    const api = env.VITE_API_URL || ''
    if (!api || /localhost|127\.0\.0\.1/.test(api)) {
      throw new Error(
        `\n❌ VITE_API_URL no es válida para producción (valor: "${api || 'vacío'}").\n` +
        `   Definila con la dirección pública de la API (ej. en .env.production o al ejecutar el build).\n`
      )
    }
  }

  return {
    plugins: [react()],
  }
})

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  // Cambiado de '/' a './' para que funcione correctamente con el protocolo file:// en Electron
  // cuando se carga el index.html directamente desde el sistema de archivos (ej. en producción).
  base: './', 
  plugins: [react()],
  resolve: {
    alias: {
      // Permite importar desde '@/...' como si fuera 'src/...'
      '@': path.resolve(__dirname, 'src'),
    },
  },
  // Opcional: Configuración específica para la compilación (build)
  build: {
    // Puedes ajustar el directorio de salida si no es 'dist'
    // outDir: 'dist', 
    // Opciones adicionales si son necesarias para Electron,
    // pero 'base: "./"' es el cambio principal para los 404.
  }
});

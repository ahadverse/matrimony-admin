import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    watch: {
      // VS Code writes/removes files under .vscode while the server runs; on
      // Windows the fs.watch backend throws UNKNOWN for a file that vanishes
      // mid-watch and takes the whole dev server down with it.
      ignored: ['**/.vscode/**'],
    },
  },
})

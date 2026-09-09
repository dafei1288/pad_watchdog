import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api': 'http://localhost:5273',
    },
  },
  test: {
    environment: 'node',
    server: {
      deps: {
        // node:sqlite 不在 Vitest 2 的内建模块清单里，显式交给 Node 原生加载
        external: ['node:sqlite', 'sqlite'],
      },
    },
  },
})

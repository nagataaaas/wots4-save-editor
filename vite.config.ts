import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { licensesPlugin } from './scripts/vite-plugin-licenses.ts'

// 静的ファイルのみを出力する（サーバー不要・ブラウザ完結）。
// base を相対にして、任意のディレクトリや file:// 以外の静的ホスティングに置けるようにする。
export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    // サイドバーの「LICENCE」に出す一覧。@tailwindcss/vite はビルドにだけ使う。shadcn と tw-animate-css は CSS だけが入る
    licensesPlugin({ buildOnly: ['@tailwindcss/vite'], extra: ['shadcn', 'tw-animate-css'] }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
})

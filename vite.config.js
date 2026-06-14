import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    // Honor a PORT env var so a second (preview) instance can run alongside a
    // manually-started `npm run dev` on 3000 instead of colliding with it.
    port: Number(process.env.PORT) || 3000,
  },
  resolve: {
    dedupe: ['three'],
  },
})

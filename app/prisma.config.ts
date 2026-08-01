import { defineConfig } from 'prisma/config'

export default defineConfig({
  migrations: {
    seed: 'node node_modules/tsx/dist/cli.mjs prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? 'postgresql://posuser:pospassword@localhost:5432/posdb',
  },
})

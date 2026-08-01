import { defineConfig } from 'prisma/config'

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL ?? 'postgresql://posuser:pospassword@localhost:5432/posdb',
  },
})

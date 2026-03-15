import { defineConfig } from '@prisma/client';

export default defineConfig({
  migrations: {
    seed: 'tsx ./prisma/seed.ts'
  }
});

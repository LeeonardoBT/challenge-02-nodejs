import { defineConfig } from 'vite'

export default defineConfig({
  test: {
    globals: true,
    reporters: 'verbose',

    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
})
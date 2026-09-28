import { defineConfig } from 'vitest/config'
import path from 'node:path'

// Unit tests for pure logic (image/region maths, customization rules). UI is checked in the browser.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
  },
  resolve: { alias: { '@': path.resolve(__dirname) } },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ command }) => ({
    base: command === 'build' ? '/keyboard/' : '/',
    plugins: [react()],
    resolve: {
        alias: {
            '@app': path.resolve(__dirname, './app'),
            '@pages': path.resolve(__dirname, './pages'),
            '@widgets': path.resolve(__dirname, './widgets'),
            '@features': path.resolve(__dirname, './features'),
            '@shared': path.resolve(__dirname, './shared'),
        },
    },
    server: {
        fs: {
            allow: [path.resolve(__dirname)],
        },
    },
}))

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url))

export default defineConfig({
    root: '.',
    publicDir: 'assets',
    plugins: [react({ babel: { plugins: ['babel-plugin-react-compiler'] } }), tailwindcss()],
    resolve: {
        alias: {
            '@': r('./src'),
            '@app': r('./src/app'),
            '@widgets': r('./src/widgets'),
            '@features': r('./src/features'),
            '@entities': r('./src/entities'),
            '@shared': r('./src/shared'),
            '@renderer': r('./src/shared/renderer'),
            '@65': r('./65'),
            '@keypad': r('./keypad'),
        },
    },
    server: { open: true, port: 5173 },
    build: { outDir: 'dist', emptyOutDir: true },
})

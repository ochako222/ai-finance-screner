import react from '@vitejs/plugin-react-swc';
import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [react()],
    root: 'src/client',
    build: {
        outDir: '../../dist/client',
        emptyOutDir: true
    },
    server: {
        port: 5173,
        proxy: {
            '/api': 'http://localhost:7788'
        }
    },
    resolve: {
        alias: {
            src: resolve(__dirname, 'src/client')
        }
    },
    css: {
        preprocessorOptions: {
            scss: { api: 'modern-compiler' }
        }
    }
});

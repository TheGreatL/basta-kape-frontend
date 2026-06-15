import { defineConfig } from 'vite';
import { devtools } from '@tanstack/devtools-vite';

import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { nitro } from 'nitro/vite';

import viteReact from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const config = defineConfig(({ command }) => {
    const isDev = command === 'serve';

    return {
        resolve: { tsconfigPaths: true },
        plugins: [
            isDev &&
                devtools({
                    removeDevtoolsOnBuild: true
                }),
            tailwindcss(),
            tanstackStart(),
            command === 'build' &&
                nitro({
                    preset: 'vercel'
                }),
            viteReact()
        ].filter(Boolean) as any
    };
});

export default config;

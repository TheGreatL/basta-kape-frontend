import { z } from 'zod';
import { createEnv } from '@t3-oss/env-core';

export const env = createEnv({
    server: {
        NODE_ENV: z.enum(['development', 'test', 'production']).default('development')
    },
    clientPrefix: 'VITE_',
    client: {
        VITE_API_URL: z.string().url().default('http://localhost:8000/api')
    },
    runtimeEnv: import.meta.env,
    emptyStringAsUndefined: true
});

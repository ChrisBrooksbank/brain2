import withSerwist from '@serwist/next';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    output: 'export',
    turbopack: {},
};

const isDev = process.env.NODE_ENV !== 'production';

export default withSerwist({
    swSrc: 'app/sw.ts',
    swDest: 'public/sw.js',
    disable: isDev,
    // Serwist's defaults, plus .wasm: webpack emits ONNX Runtime's ~27 MB WASM (referenced
    // by Transformers.js) but it is never loaded. Transformers.js fetches its runtime from
    // the CDN and stores it with the model in its own Cache Storage, which is what makes
    // semantic search work offline.
    exclude: [/\.map$/, /^manifest.*\.js$/, /\.wasm$/],
})(nextConfig);

import withSerwist from '@serwist/next';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    /* config options here */
};

const isDev = process.env.NODE_ENV !== 'production';

export default withSerwist({
    swSrc: 'app/sw.ts',
    swDest: 'public/sw.js',
    disable: isDev,
})(nextConfig);

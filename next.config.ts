import withSerwist from '@serwist/next';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    /* config options here */
};

export default withSerwist({
    swSrc: 'app/sw.ts',
    swDest: 'public/sw.js',
})(nextConfig);

import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';
const nextConfig = {
    reactStrictMode: false,
    turbopack: {
        root: __dirname,
    },
    images: { unoptimized: true },
    // Base path for assets (empty in dev, /flowmanager in prod) so images work in both
    env: {
        NEXT_PUBLIC_BASE_PATH: isProd ? '/flowmanager' : '',
        // NextAuth client needs this to call the auth API (same as NEXTAUTH_URL)
        NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000'
    },
    // Only use basePath/assetPrefix in production (e.g. when deployed under /flowmanager)
    ...(isProd && {
        basePath: "/flowmanager",
        assetPrefix: "/flowmanager",
        trailingSlash: true
    })
};

export default nextConfig;

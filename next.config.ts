import type { NextConfig } from 'next';
const config: NextConfig = {
  async rewrites() {
    return (process.env.BACKEND_URL || process.env.NODE_ENV === 'development') ? [{source:'/api/:path*',destination:`${process.env.BACKEND_URL || 'http://127.0.0.1:8000'}/api/:path*`}] : [];
  },
};
export default config;

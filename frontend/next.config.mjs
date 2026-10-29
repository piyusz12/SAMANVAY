/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-tabs',
      '@radix-ui/react-tooltip',
      'clsx',
      'tailwind-merge',
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL;
    // On Vercel cloud environments without an explicit public backend, avoid proxying to unreachable private 127.0.0.1
    if (!backendUrl && process.env.VERCEL) {
      return [];
    }
    return [
      {
        source: '/health',
        destination: `${backendUrl || 'http://127.0.0.1:8000'}/health`,
      },
      {
        source: '/api/v1/:path*',
        destination: `${backendUrl || 'http://127.0.0.1:8000'}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;

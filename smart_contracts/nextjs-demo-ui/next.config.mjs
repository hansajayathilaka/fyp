/** @type {import('next').NextConfig} */
const nextConfig = {
    // Improve initial loading performance
    experimental: {
        optimizePackageImports: ['wagmi', '@tanstack/react-query'],
    },
    
    // Reduce hydration issues
    reactStrictMode: true,
    
    // Disable ESLint during build for Docker
    eslint: {
        ignoreDuringBuilds: true,
    },
    
    // Disable TypeScript checking during build for Docker
    typescript: {
        ignoreBuildErrors: true,
    },
    
    async headers() {
        return [
            {
                source: '/api/(.*)',
                headers: [
                    {
                        key: 'Access-Control-Allow-Origin',
                        value: '*',
                    },
                    {
                        key: 'Access-Control-Allow-Methods',
                        value: 'GET, POST, PUT, DELETE, OPTIONS',
                    },
                    {
                        key: 'Access-Control-Allow-Headers',
                        value: 'Content-Type, Authorization',
                    },
                ],
            },
        ];
    },
};

export default nextConfig;

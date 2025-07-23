/** @type {import('next').NextConfig} */
const nextConfig = {
    // Improve initial loading performance
    experimental: {
        optimizePackageImports: ['wagmi', '@tanstack/react-query', 'connectkit'],
    },
    
    // Reduce hydration issues
    reactStrictMode: true,
    
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

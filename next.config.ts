import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
	output: 'standalone',
	images: {
		remotePatterns: [
			{
				protocol: 'https',
				hostname: '**',
			},
		],
	},
	experimental: {
		reactCompiler: true,
	},
}

export default nextConfig

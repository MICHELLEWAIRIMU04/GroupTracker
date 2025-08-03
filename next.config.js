/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Make sure environment variables are available
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    JWT_SECRET: process.env.JWT_SECRET,
  },
  
  // Webpack configuration for better bundle handling
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Ignore node_modules that cause issues in serverless
    if (isServer) {
      config.externals.push('_http_common')
    }
    
    return config
  },

  // Experimental features for better performance
  experimental: {
    // Improve cold start performance
    serverComponentsExternalPackages: ['@prisma/client'],
  },
}

module.exports = nextConfig
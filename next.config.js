/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Environment variables configuration
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // Ensure environment variables are available during build
  serverRuntimeConfig: {
    // Will only be available on the server side
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
  },
  
  publicRuntimeConfig: {
    // Will be available on both server and client
    // Only put non-sensitive data here
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

  // Output configuration for Vercel
  output: 'standalone',
}

module.exports = nextConfig
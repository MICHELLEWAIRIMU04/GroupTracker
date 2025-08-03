// pages/api/debug-env.js
export default function handler(req, res) {
  // Only allow in development or if a secret is provided
  const debugSecret = req.query.secret
  const isDev = process.env.NODE_ENV === 'development'
  const isAuthorized = debugSecret === 'debug123' || isDev
  
  if (!isAuthorized) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const envInfo = {
    nodeEnv: process.env.NODE_ENV,
    platform: process.platform,
    timestamp: new Date().toISOString(),
    vercelEnv: process.env.VERCEL_ENV,
    vercelUrl: process.env.VERCEL_URL,
    
    // Check for database URL
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    databaseUrlPrefix: process.env.DATABASE_URL?.substring(0, 20),
    databaseUrlLength: process.env.DATABASE_URL?.length,
    databaseUrlStartsCorrectly: process.env.DATABASE_URL?.startsWith('postgresql://'),
    
    // Check for auth variables
    hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
    hasJwtSecret: !!process.env.JWT_SECRET,
    
    // List all env vars that contain key terms (without values for security)
    envVarsWithDatabase: Object.keys(process.env).filter(key => 
      key.includes('DATABASE') || key.includes('DB')
    ),
    envVarsWithAuth: Object.keys(process.env).filter(key => 
      key.includes('AUTH') || key.includes('JWT')
    ),
    
    // Total env vars count
    totalEnvVars: Object.keys(process.env).length,
  }

  // In development, show more details
  if (isDev) {
    envInfo.fullDatabaseUrl = process.env.DATABASE_URL
    envInfo.allEnvVars = Object.keys(process.env)
  }

  res.json(envInfo)
}
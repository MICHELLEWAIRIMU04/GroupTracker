import { checkDatabaseConnection } from '../../lib/prisma'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const startTime = Date.now()
    
    // Check environment variables
    const envCheck = {
      DATABASE_URL: !!process.env.DATABASE_URL,
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
      NEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
      JWT_SECRET: !!process.env.JWT_SECRET,
      NODE_ENV: process.env.NODE_ENV,
    }

    // Check database connection
    const dbHealth = await checkDatabaseConnection()
    const responseTime = Date.now() - startTime

    const isHealthy = dbHealth.connected && envCheck.DATABASE_URL && envCheck.NEXTAUTH_SECRET && envCheck.JWT_SECRET

    const response = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      checks: {
        database: {
          connected: dbHealth.connected,
          error: dbHealth.error,
          responseTime: `${responseTime}ms`
        },
        environment: envCheck
      }
    }

    res.status(isHealthy ? 200 : 503).json(response)
  } catch (error) {
    console.error('Health check failed:', error)
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
}
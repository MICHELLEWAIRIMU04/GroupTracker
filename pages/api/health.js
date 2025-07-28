import { checkDatabaseConnection } from '../../lib/prisma'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const startTime = Date.now()
    const dbHealth = await checkDatabaseConnection()
    const responseTime = Date.now() - startTime

    if (dbHealth.connected) {
      res.status(200).json({
        status: 'healthy',
        database: {
          connected: true,
          responseTime: `${responseTime}ms`
        },
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
      })
    } else {
      res.status(503).json({
        status: 'unhealthy',
        database: {
          connected: false,
          error: dbHealth.error,
          code: dbHealth.code,
          responseTime: `${responseTime}ms`
        },
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
      })
    }
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
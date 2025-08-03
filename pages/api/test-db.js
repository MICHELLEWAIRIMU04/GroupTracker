// pages/api/test-db.js
import { prisma } from '../../lib/prisma'

export default async function handler(req, res) {
  const startTime = Date.now()
  
  try {
    console.log('🔍 Testing database connection from Vercel...')
    
    // Environment check
    const envCheck = {
      DATABASE_URL: !!process.env.DATABASE_URL,
      DATABASE_URL_preview: process.env.DATABASE_URL?.substring(0, 50),
      DATABASE_URL_length: process.env.DATABASE_URL?.length,
      DATABASE_URL_starts_correctly: process.env.DATABASE_URL?.startsWith('postgresql://'),
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
      timestamp: new Date().toISOString(),
    }
    
    console.log('Environment check:', envCheck)
    
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({
        success: false,
        error: 'DATABASE_URL not found',
        envCheck
      })
    }
    
    if (!process.env.DATABASE_URL.startsWith('postgresql://')) {
      return res.status(500).json({
        success: false,
        error: 'DATABASE_URL invalid format',
        envCheck
      })
    }
    
    // Test Prisma connection
    console.log('🔌 Testing Prisma query...')
    const result = await prisma.$queryRaw`SELECT version() as version, now() as current_time`
    const responseTime = Date.now() - startTime
    
    console.log('✅ Database connection successful!')
    
    // Test user table access
    const userCount = await prisma.user.count()
    console.log(`📊 User count: ${userCount}`)
    
    res.json({
      success: true,
      responseTime: `${responseTime}ms`,
      database: {
        version: result[0]?.version?.split(' ')[0],
        currentTime: result[0]?.current_time,
        userCount
      },
      envCheck
    })
    
  } catch (error) {
    const responseTime = Date.now() - startTime
    
    console.error('❌ Database test failed:', error.message)
    console.error('Error code:', error.code)
    console.error('Error name:', error.name)
    
    res.status(500).json({
      success: false,
      error: error.message,
      errorCode: error.code,
      errorName: error.name,
      responseTime: `${responseTime}ms`,
      envCheck: {
        DATABASE_URL: !!process.env.DATABASE_URL,
        DATABASE_URL_preview: process.env.DATABASE_URL?.substring(0, 50),
        DATABASE_URL_starts_correctly: process.env.DATABASE_URL?.startsWith('postgresql://'),
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_ENV: process.env.VERCEL_ENV,
      }
    })
  }
}
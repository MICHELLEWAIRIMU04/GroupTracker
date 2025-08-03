import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis

// Validate DATABASE_URL before creating client
function validateDatabaseUrl() {
  const dbUrl = process.env.DATABASE_URL
  
  if (!dbUrl) {
    throw new Error('DATABASE_URL environment variable is not set')
  }
  
  if (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://')) {
    console.error('Invalid DATABASE_URL format. Expected format: postgresql://...')
    console.error('Current value starts with:', dbUrl.substring(0, 20))
    throw new Error('DATABASE_URL must start with postgresql:// or postgres://')
  }
  
  return dbUrl
}

// Enhanced Prisma client with connection pooling and error handling
const createPrismaClient = () => {
  try {
    // Validate URL before creating client
    validateDatabaseUrl()
    
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      // Connection pool settings for better stability
      __internal: {
        engine: {
          connectTimeout: 60000, // 60 seconds
          pool_timeout: 60000,   // 60 seconds
          schema_cache_size: 100,
        },
      },
    })
  } catch (error) {
    console.error('Failed to create Prisma client:', error.message)
    console.error('Environment check:')
    console.error('- NODE_ENV:', process.env.NODE_ENV)
    console.error('- DATABASE_URL exists:', !!process.env.DATABASE_URL)
    console.error('- DATABASE_URL preview:', process.env.DATABASE_URL?.substring(0, 50))
    console.error('- DATABASE_URL starts correctly:', process.env.DATABASE_URL?.startsWith('postgres'))
    
    // Log all environment variables for debugging
    console.error('- All env vars containing DATABASE:', 
      Object.keys(process.env).filter(key => key.includes('DATABASE'))
    )
    
    // In production, we must fail hard with more detail
    if (process.env.NODE_ENV === 'production') {
      console.error('🚨 Production database connection failed - this will cause authentication errors')
      throw new Error(`Database connection failed: ${error.message}`)
    }
    
    // In development, create a dummy client to prevent crashes
    console.warn('Creating dummy Prisma client for development')
    return new PrismaClient()
  }
}

export const prisma = globalForPrisma.prisma || createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Connection health check function
export async function checkDatabaseConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return { connected: true, error: null }
  } catch (error) {
    console.error('Database connection check failed:', error)
    return { 
      connected: false, 
      error: error.message,
      code: error.code 
    }
  }
}

// Retry wrapper for database operations
export async function withRetry(operation, retries = 3, delay = 1000) {
  let lastError
  
  for (let i = 0; i < retries; i++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      console.error(`Database operation failed (attempt ${i + 1}/${retries}):`, error.message)
      
      // Don't retry on certain errors
      if (error.code === 'P2002' || error.code === 'P2025') {
        throw error
      }
      
      // Wait before retrying
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)))
      }
    }
  }
  
  throw lastError
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect()
})
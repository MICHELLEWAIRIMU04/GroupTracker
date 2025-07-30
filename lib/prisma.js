import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis

// Enhanced Prisma client with connection pooling and error handling
const createPrismaClient = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })
}

export const prisma = globalForPrisma.prisma || createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Connection health check function
export async function checkDatabaseConnection() {
  try {
    // Use a simple query to check connection
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

// Graceful shutdown - important for serverless environments
if (typeof window === 'undefined') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect()
  })

  process.on('SIGINT', async () => {
    await prisma.$disconnect()
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
}
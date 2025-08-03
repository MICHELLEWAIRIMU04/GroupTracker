// lib/env-validation.js
export function validateEnvironmentVariables() {
  const requiredVars = {
    DATABASE_URL: process.env.DATABASE_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    JWT_SECRET: process.env.JWT_SECRET,
  }

  // Only validate NEXTAUTH_URL in production
  if (process.env.NODE_ENV === 'production') {
    requiredVars.NEXTAUTH_URL = process.env.NEXTAUTH_URL
  }

  const missing = Object.entries(requiredVars)
    .filter(([key, value]) => !value)
    .map(([key]) => key)

  if (missing.length > 0) {
    console.error('❌ Missing environment variables:', missing)
    console.error('Current environment:', process.env.NODE_ENV)
    console.error('Available env vars:', Object.keys(process.env).filter(key => 
      key.includes('DATABASE') || key.includes('NEXTAUTH') || key.includes('JWT')
    ))
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }

  // Validate DATABASE_URL format
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://')) {
    console.error('❌ Invalid DATABASE_URL format:', dbUrl?.substring(0, 30) + '...')
    throw new Error('DATABASE_URL must start with postgresql:// or postgres://')
  }

  console.log('✅ Environment variables validated successfully')
  return true
}

// Validate on server-side only
if (typeof window === 'undefined') {
  try {
    validateEnvironmentVariables()
  } catch (error) {
    console.error('Environment validation failed:', error.message)
    // Don't throw in development to allow the app to start
    if (process.env.NODE_ENV === 'production') {
      throw error
    }
  }
}
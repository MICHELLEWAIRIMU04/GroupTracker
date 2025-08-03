import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from '../../../lib/prisma'
import { comparePasswords } from '../../../lib/auth'

// Validate environment variables before starting
function validateEnvironment() {
  const requiredVars = {
    DATABASE_URL: process.env.DATABASE_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  }

  const missing = Object.entries(requiredVars)
    .filter(([key, value]) => !value)
    .map(([key]) => key)

  if (missing.length > 0) {
    console.error('❌ Missing NextAuth environment variables:', missing)
    console.error('Available env vars:', Object.keys(process.env).filter(key => 
      key.includes('DATABASE') || key.includes('NEXTAUTH') || key.includes('AUTH')
    ))
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }

  if (!process.env.DATABASE_URL.startsWith('postgresql://')) {
    console.error('❌ Invalid DATABASE_URL format')
    console.error('DATABASE_URL preview:', process.env.DATABASE_URL?.substring(0, 30))
    throw new Error('DATABASE_URL must start with postgresql://')
  }

  console.log('✅ NextAuth environment variables validated')
}

// Validate environment on startup
try {
  validateEnvironment()
} catch (error) {
  console.error('NextAuth configuration error:', error.message)
  if (process.env.NODE_ENV === 'production') {
    // In production, we need to handle this gracefully
    console.error('🚨 Production NextAuth startup failed - authentication will not work')
  }
}

export default NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    // Google Provider (will be disabled if credentials not provided)
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      })
    ] : []),
    
    // Credentials Provider with enhanced error handling
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          console.log('Missing credentials')
          return null
        }

        try {
          // Add debug logging
          console.log('🔍 Attempting to authenticate user:', credentials.username)
          console.log('🔍 Database URL available:', !!process.env.DATABASE_URL)
          console.log('🔍 Database URL starts correctly:', process.env.DATABASE_URL?.startsWith('postgresql://'))
          
          const user = await prisma.user.findUnique({
            where: { username: credentials.username }
          })

          if (!user || !user.password) {
            console.log('❌ User not found or no password set:', credentials.username)
            return null
          }

          const isValidPassword = await comparePasswords(credentials.password, user.password)
          
          if (!isValidPassword) {
            console.log('❌ Invalid password for user:', credentials.username)
            return null
          }

          // For development, skip email verification check
          // In production, uncomment this:
          // if (!user.emailVerified) {
          //   throw new Error('Please verify your email before logging in')
          // }

          console.log('✅ User authenticated successfully:', credentials.username)
          return {
            id: user.id,
            email: user.email,
            username: user.username,
            isAdmin: user.isAdmin,
            image: user.image,
          }
        } catch (error) {
          console.error('❌ Auth error during user lookup:', error.message)
          console.error('Error details:', {
            code: error.code,
            name: error.name,
            stack: error.stack?.split('\n')[0]
          })
          
          // Check if it's a Prisma/database error
          if (error.name === 'PrismaClientInitializationError') {
            console.error('🚨 Database connection failed during authentication')
            console.error('DATABASE_URL preview:', process.env.DATABASE_URL?.substring(0, 30))
          }
          
          return null
        }
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.isAdmin = user.isAdmin
        token.username = user.username
      }
      
      // For Google sign-in, mark email as verified
      if (account?.provider === 'google' && user) {
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: { emailVerified: new Date() }
          })
        } catch (error) {
          console.error('Error updating email verification:', error)
        }
      }
      
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub
        session.user.isAdmin = token.isAdmin
        session.user.username = token.username
      }
      return session
    },
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        try {
          // Generate username from email if not exists
          if (!user.username) {
            const baseUsername = user.email.split('@')[0]
            let username = baseUsername
            let counter = 1
            
            // Ensure unique username
            while (await prisma.user.findUnique({ where: { username } })) {
              username = `${baseUsername}${counter}`
              counter++
            }
            
            await prisma.user.update({
              where: { id: user.id },
              data: { 
                username,
                emailVerified: new Date()
              }
            })
          }
        } catch (error) {
          console.error('Error in Google sign-in:', error)
        }
      }
      return true
    }
  },
  pages: {
    signIn: '/login',
    error: '/auth/error',
  },
  events: {
    async createUser({ user }) {
      console.log('New user created:', user.email)
    }
  },
  debug: process.env.NODE_ENV === 'development',
  
  // Enhanced error handling
  logger: {
    error(code, metadata) {
      console.error('NextAuth Error:', code, metadata)
      if (code === 'SIGNIN_OAUTH_ERROR' || code === 'OAUTH_CALLBACK_ERROR') {
        console.error('OAuth configuration issue - check your providers')
      }
    },
    warn(code) {
      console.warn('NextAuth Warning:', code)
    },
    debug(code, metadata) {
      if (process.env.NODE_ENV === 'development') {
        console.log('NextAuth Debug:', code, metadata)
      }
    }
  }
})
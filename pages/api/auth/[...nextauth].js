import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from '../../../lib/prisma'
import { comparePasswords } from '../../../lib/auth'

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
    
    // Credentials Provider
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null
        }

        try {
          const user = await prisma.user.findUnique({
            where: { username: credentials.username }
          })

          if (!user || !user.password) {
            return null
          }

          const isValidPassword = await comparePasswords(credentials.password, user.password)
          
          if (!isValidPassword) {
            return null
          }

          // For development, skip email verification check
          // In production, uncomment this:
          // if (!user.emailVerified) {
          //   throw new Error('Please verify your email before logging in')
          // }

          return {
            id: user.id,
            email: user.email,
            username: user.username,
            image: user.image,
          }
        } catch (error) {
          console.error('Auth error:', error)
          return null
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
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
  debug: process.env.NODE_ENV === 'development'
})
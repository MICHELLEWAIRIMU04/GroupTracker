import { prisma } from '../../../lib/prisma'
import { comparePasswords, createToken } from '../../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' })
    }

    // Find user by username
    const user = await prisma.user.findUnique({
      where: { username }
    })

    if (!user || !user.password) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    // Check password
    const isValidPassword = await comparePasswords(password, user.password)
    
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    // For development, skip email verification check
    // In production, uncomment this:
    // if (!user.emailVerified) {
    //   return res.status(401).json({ message: 'Please verify your email before logging in' })
    // }

    // Create JWT token
    const token = createToken(user)

    console.log(`User logged in: ${user.username}`)

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}
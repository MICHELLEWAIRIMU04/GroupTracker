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

    // Check if user exists, password is correct, and user is admin
    if (!user || !(await comparePasswords(password, user.password)) || !user.isAdmin) {
      return res.status(401).json({ message: 'Invalid credentials or not admin' })
    }

    // Create JWT token with admin privileges
    const token = createToken(user)

    console.log(`Admin logged in: ${user.username}, ID: ${user.id}`)

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
    console.error('Admin login error:', error)
    res.status(500).json({ message: 'Admin login failed', error: error.message })
  }
}
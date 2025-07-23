import { prisma } from '../../../lib/prisma'
import { requireAuth, requireAdmin, hashPassword } from '../../../lib/auth'

async function getHandler(req, res) {
  try {
    const members = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        isAdmin: true,
        createdAt: true
      }
    })

    res.json(members)
  } catch (error) {
    console.error('Get members error:', error)
    res.status(500).json({ message: 'Failed to retrieve members' })
  }
}

async function postHandler(req, res) {
  try {
    const { username, email, password, isAdmin } = req.body

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' })
    }

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email }
        ]
      }
    })

    if (existingUser) {
      return res.status(400).json({ 
        message: existingUser.username === username ? 'Username already exists' : 'Email already exists' 
      })
    }

    const hashedPassword = await hashPassword(password)
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        isAdmin: Boolean(isAdmin)
      },
      select: {
        id: true,
        username: true,
        email: true,
        isAdmin: true
      }
    })

    res.status(201).json({
      message: 'Member added successfully',
      user
    })
  } catch (error) {
    console.error('Add member error:', error)
    res.status(500).json({ message: 'Failed to add member' })
  }
}

export default requireAuth(async (req, res) => {
  if (req.method === 'GET') {
    return getHandler(req, res)
  } else if (req.method === 'POST') {
    return requireAdmin(postHandler)(req, res)
  } else {
    res.status(405).json({ message: 'Method not allowed' })
  }
})
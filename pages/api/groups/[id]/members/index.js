import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { getToken } from 'next-auth/jwt'

export default async function handler(req, res) {
  const { id: groupId } = req.query
  let userId = null

  // Try NextAuth JWT token first
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (token) {
      userId = token.sub
    }
  } catch (error) {
    console.log('NextAuth token not found, trying legacy JWT...')
  }

  // Fallback to legacy JWT
  if (!userId) {
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const jwtToken = authHeader.replace('Bearer ', '')
      const decoded = verifyToken(jwtToken)
      if (decoded) {
        userId = decoded.userId
      }
    }
  }

  if (!userId) {
    return res.status(401).json({ message: 'Authentication required' })
  }

  if (req.method === 'POST') {
    try {
      // Check if current user is admin of the group
      const currentMember = await prisma.groupMember.findUnique({
        where: {
          userId_groupId: {
            userId,
            groupId: parseInt(groupId)
          }
        }
      })

      if (!currentMember || !currentMember.isAdmin) {
        return res.status(403).json({ message: 'Admin privileges required to add members' })
      }

      const { email, is_admin } = req.body

      if (!email) {
        return res.status(400).json({ message: 'Email is required' })
      }

      // Find user by email
      const userToAdd = await prisma.user.findUnique({
        where: { email }
      })

      if (!userToAdd) {
        return res.status(404).json({ message: 'User with this email not found' })
      }

      // Check if user is already a member
      const existingMember = await prisma.groupMember.findUnique({
        where: {
          userId_groupId: {
            userId: userToAdd.id,
            groupId: parseInt(groupId)
          }
        }
      })

      if (existingMember) {
        return res.status(400).json({ message: 'User is already a member of this group' })
      }

      // Add user to group
      await prisma.groupMember.create({
        data: {
          userId: userToAdd.id,
          groupId: parseInt(groupId),
          isAdmin: Boolean(is_admin)
        }
      })

      res.json({ 
        message: 'Member added successfully',
        member: {
          id: userToAdd.id,
          username: userToAdd.username,
          email: userToAdd.email,
          isAdmin: Boolean(is_admin)
        }
      })
    } catch (error) {
      console.error('Add group member error:', error)
      res.status(500).json({ message: 'Failed to add member to group' })
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' })
  }
}
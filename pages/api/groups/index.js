import { prisma } from '../../../lib/prisma'
import { verifyToken } from '../../../lib/auth'
import { getToken } from 'next-auth/jwt'

export default async function handler(req, res) {
  let userId = null
  let isAdmin = false

  // Try NextAuth JWT token first
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (token) {
      userId = token.sub // This is the user ID from NextAuth
      isAdmin = token.isAdmin || false
      console.log('NextAuth user authenticated:', { userId, isAdmin })
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
        isAdmin = decoded.isAdmin || false
        console.log('Legacy JWT user authenticated:', { userId, isAdmin })
      }
    }
  }

  if (!userId) {
    console.log('No authentication found')
    return res.status(401).json({ message: 'Authentication required' })
  }

  if (req.method === 'GET') {
    try {
      const userGroups = await prisma.group.findMany({
        where: {
          members: {
            some: {
              userId: userId
            }
          }
        },
        include: {
          owner: {
            select: { id: true, username: true }
          },
          members: {
            include: {
              user: {
                select: { id: true, username: true, email: true }
              }
            }
          },
          _count: {
            select: { activities: true, members: true }
          }
        }
      })

      res.json(userGroups.map(group => ({
        id: group.id,
        name: group.name,
        description: group.description,
        ownerId: group.ownerId,
        owner: group.owner?.username || 'Unknown',
        createdAt: group.createdAt,
        memberCount: group._count.members,
        activityCount: group._count.activities
      })))
    } catch (error) {
      console.error('Get groups error:', error)
      res.status(500).json({ message: 'Failed to retrieve groups' })
    }
  } else if (req.method === 'POST') {
    try {
      const { name, description } = req.body

      if (!name) {
        return res.status(400).json({ message: 'Group name is required' })
      }

      console.log('Creating group for user:', userId)

      const group = await prisma.group.create({
        data: {
          name,
          description: description || '',
          ownerId: userId,
          members: {
            create: {
              userId: userId,
              isAdmin: true
            }
          }
        },
        include: {
          owner: {
            select: { id: true, username: true }
          },
          members: {
            include: {
              user: {
                select: { id: true, username: true, email: true }
              }
            }
          }
        }
      })

      console.log('Group created successfully:', group.id)

      res.status(201).json({
        message: 'Group created successfully',
        group: {
          id: group.id,
          name: group.name,
          description: group.description,
          ownerId: group.ownerId,
          owner: group.owner?.username || 'Unknown',
          createdAt: group.createdAt,
          members: group.members.map(member => ({
            id: member.user.id,
            username: member.user.username,
            email: member.user.email,
            isAdmin: member.isAdmin
          }))
        }
      })
    } catch (error) {
      console.error('Create group error:', error)
      res.status(500).json({ message: 'Failed to create group' })
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' })
  }
}
import { prisma } from '../../../lib/prisma'
import { requireAuth } from '../../../lib/auth'

async function handler(req, res) {
  const userId = parseInt(req.user.userId)

  if (req.method === 'GET') {
    try {
      const userGroups = await prisma.group.findMany({
        where: {
          members: {
            some: {
              userId
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
        owner: group.owner.username,
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

      const group = await prisma.group.create({
        data: {
          name,
          description: description || '',
          ownerId: userId,
          members: {
            create: {
              userId,
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

      res.status(201).json({
        message: 'Group created successfully',
        group: {
          id: group.id,
          name: group.name,
          description: group.description,
          ownerId: group.ownerId,
          owner: group.owner.username,
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

export default requireAuth(handler)
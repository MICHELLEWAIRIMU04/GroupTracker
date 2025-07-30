import { prisma } from '../../../lib/prisma'
import { verifyToken } from '../../../lib/auth'
import { getToken } from 'next-auth/jwt'

export default async function handler(req, res) {
  const { id } = req.query
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

  if (req.method === 'GET') {
    try {
      const contribution = await prisma.contribution.findUnique({
        where: { id: parseInt(id) },
        include: {
          user: {
            select: { id: true, username: true }
          },
          activity: {
            include: {
              group: {
                include: {
                  members: {
                    where: { userId }
                  }
                }
              }
            }
          }
        }
      })

      if (!contribution) {
        return res.status(404).json({ message: 'Contribution not found' })
      }

      // Check if user has access (member of the group)
      const groupMember = contribution.activity.group.members[0]
      if (!groupMember) {
        return res.status(403).json({ message: 'Access denied' })
      }

      res.json({
        id: contribution.id,
        userId: contribution.userId,
        user: contribution.user.username,
        activityId: contribution.activityId,
        activity: contribution.activity.name,
        contributionType: contribution.contributionType,
        amount: contribution.amount,
        currency: contribution.currency,
        description: contribution.description,
        date: contribution.date,
        createdAt: contribution.createdAt
      })
    } catch (error) {
      console.error('Get contribution error:', error)
      res.status(500).json({ message: 'Failed to retrieve contribution' })
    }
  } else if (req.method === 'PUT') {
    try {
      const { amount, description, currency } = req.body

      // Get contribution with group info
      const contribution = await prisma.contribution.findUnique({
        where: { id: parseInt(id) },
        include: {
          activity: {
            include: {
              group: {
                include: {
                  members: {
                    where: { userId }
                  }
                }
              }
            }
          }
        }
      })

      if (!contribution) {
        return res.status(404).json({ message: 'Contribution not found' })
      }

      // Check if user is group admin
      const groupMember = contribution.activity.group.members[0]
      if (!groupMember || !groupMember.isAdmin) {
        return res.status(403).json({ message: 'Only group admins can edit contributions' })
      }

      // Update the contribution
      const updatedContribution = await prisma.contribution.update({
        where: { id: parseInt(id) },
        data: {
          ...(amount !== undefined && { amount: parseFloat(amount) }),
          ...(description !== undefined && { description }),
          ...(currency !== undefined && { currency })
        },
        include: {
          user: {
            select: { id: true, username: true }
          },
          activity: {
            select: { id: true, name: true }
          }
        }
      })

      res.json({
        message: 'Contribution updated successfully',
        contribution: {
          id: updatedContribution.id,
          userId: updatedContribution.userId,
          user: updatedContribution.user.username,
          activityId: updatedContribution.activityId,
          activity: updatedContribution.activity.name,
          contributionType: updatedContribution.contributionType,
          amount: updatedContribution.amount,
          currency: updatedContribution.currency,
          description: updatedContribution.description,
          date: updatedContribution.date
        }
      })
    } catch (error) {
      console.error('Update contribution error:', error)
      res.status(500).json({ message: 'Failed to update contribution' })
    }
  } else if (req.method === 'DELETE') {
    try {
      // Get contribution with group info
      const contribution = await prisma.contribution.findUnique({
        where: { id: parseInt(id) },
        include: {
          activity: {
            include: {
              group: {
                include: {
                  members: {
                    where: { userId }
                  }
                }
              }
            }
          }
        }
      })

      if (!contribution) {
        return res.status(404).json({ message: 'Contribution not found' })
      }

      // Check if user is group admin
      const groupMember = contribution.activity.group.members[0]
      if (!groupMember || !groupMember.isAdmin) {
        return res.status(403).json({ message: 'Only group admins can delete contributions' })
      }

      await prisma.contribution.delete({
        where: { id: parseInt(id) }
      })

      res.json({ message: 'Contribution deleted successfully' })
    } catch (error) {
      console.error('Delete contribution error:', error)
      res.status(500).json({ message: 'Failed to delete contribution' })
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' })
  }
}
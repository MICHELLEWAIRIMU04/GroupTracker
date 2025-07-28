import { prisma } from '../../../lib/prisma'
import { verifyToken } from '../../../lib/auth'
import { getToken } from 'next-auth/jwt'

export default async function handler(req, res) {
  const { id: activityId } = req.query
  let userId = null
  let isAdmin = false

  // Try NextAuth JWT token first
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (token) {
      userId = token.sub
      isAdmin = token.isAdmin || false
      console.log('NextAuth user authenticated for activity:', { userId, isAdmin })
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
        console.log('Legacy JWT user authenticated for activity:', { userId, isAdmin })
      }
    }
  }

  if (!userId) {
    console.log('No authentication found for activity')
    return res.status(401).json({ message: 'Authentication required' })
  }

  if (req.method === 'GET') {
    try {
      // Get activity with all related data
      const activity = await prisma.activity.findUnique({
        where: { id: parseInt(activityId) },
        include: {
          group: {
            select: { 
              id: true, 
              name: true, 
              ownerId: true,
              members: {
                include: {
                  user: {
                    select: { id: true, username: true, email: true }
                  }
                }
              }
            }
          },
          contributions: {
            include: {
              user: {
                select: { id: true, username: true }
              }
            },
            orderBy: { date: 'desc' }
          }
        }
      })

      if (!activity) {
        return res.status(404).json({ message: 'Activity not found' })
      }

      // Check if user is member of the group
      const groupMember = activity.group.members.find(member => member.userId === userId)
      if (!groupMember) {
        return res.status(403).json({ message: 'You are not a member of this group' })
      }

      // Calculate contribution statistics
      const moneyContributions = activity.contributions.filter(c => c.contributionType === 'money')
      const timeContributions = activity.contributions.filter(c => c.contributionType === 'time')
      
      const currencyTotals = {}
      moneyContributions.forEach(contrib => {
        if (!currencyTotals[contrib.currency]) {
          currencyTotals[contrib.currency] = 0
        }
        currencyTotals[contrib.currency] += contrib.amount
      })

      const totalTimeMinutes = timeContributions.reduce((sum, contrib) => sum + contrib.amount, 0)
      const hours = Math.floor(totalTimeMinutes / 60)
      const minutes = Math.floor(totalTimeMinutes % 60)

      res.json({
        id: activity.id,
        name: activity.name,
        description: activity.description,
        createdAt: activity.createdAt,
        group: {
          id: activity.group.id,
          name: activity.group.name,
          members: activity.group.members.map(member => ({
            id: member.user.id,
            username: member.user.username,
            email: member.user.email,
            isAdmin: member.isAdmin
          }))
        },
        contributions: activity.contributions.map(contrib => ({
          id: contrib.id,
          userId: contrib.userId,
          user: contrib.user.username,
          contributionType: contrib.contributionType,
          amount: contrib.amount,
          currency: contrib.currency,
          description: contrib.description,
          date: contrib.date,
          createdAt: contrib.createdAt
        })),
        statistics: {
          contributionCounts: {
            money: moneyContributions.length,
            time: timeContributions.length,
            total: activity.contributions.length
          },
          totals: {
            money: currencyTotals,
            time: {
              minutes: totalTimeMinutes,
              formatted: totalTimeMinutes > 0 ? `${hours}h ${minutes}m` : '0m'
            }
          },
          contributorCount: new Set(activity.contributions.map(c => c.userId)).size
        },
        userPermissions: {
          canAddContributions: groupMember.isAdmin || isAdmin,
          isGroupAdmin: groupMember.isAdmin,
          isSystemAdmin: isAdmin
        }
      })
    } catch (error) {
      console.error('Get activity error:', error)
      
      // Handle different types of database errors
      if (error.code === 'P1001') {
        return res.status(503).json({ 
          message: 'Database temporarily unavailable. Please try again in a moment.',
          error: 'DATABASE_CONNECTION_ERROR'
        })
      }
      
      res.status(500).json({ message: 'Failed to retrieve activity' })
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' })
  }
}
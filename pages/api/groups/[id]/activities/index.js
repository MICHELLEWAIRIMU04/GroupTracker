import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { getToken } from 'next-auth/jwt'

export default async function handler(req, res) {
  const { id: groupId } = req.query
  let userId = null
  let isAdmin = false

  // Try NextAuth JWT token first
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (token) {
      userId = token.sub
      isAdmin = token.isAdmin || false
      console.log('NextAuth user authenticated for activities:', { userId, isAdmin })
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
        console.log('Legacy JWT user authenticated for activities:', { userId, isAdmin })
      }
    }
  }

  if (!userId) {
    console.log('No authentication found for activities')
    return res.status(401).json({ message: 'Authentication required' })
  }

  if (req.method === 'GET') {
    try {
      // Check if user is member of group
      const groupMember = await prisma.groupMember.findUnique({
        where: {
          userId_groupId: {
            userId: userId,
            groupId: parseInt(groupId)
          }
        }
      })

      if (!groupMember) {
        return res.status(403).json({ message: 'You are not a member of this group' })
      }

      const activities = await prisma.activity.findMany({
        where: { groupId: parseInt(groupId) },
        include: {
          contributions: {
            include: {
              user: {
                select: { id: true, username: true }
              }
            }
          },
          _count: {
            select: { contributions: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      const processedActivities = activities.map(activity => {
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

        return {
          id: activity.id,
          name: activity.name,
          description: activity.description,
          groupId: activity.groupId,
          createdAt: activity.createdAt,
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
        }
      })

      res.json(processedActivities)
    } catch (error) {
      console.error('Get activities error:', error)
      res.status(500).json({ message: 'Failed to retrieve activities' })
    }
  } else if (req.method === 'POST') {
    try {
      // Check if user is admin of group
      const groupMember = await prisma.groupMember.findUnique({
        where: {
          userId_groupId: {
            userId: userId,
            groupId: parseInt(groupId)
          }
        }
      })

      if (!groupMember || !groupMember.isAdmin) {
        return res.status(403).json({ message: 'Admin privileges required to create activities' })
      }

      const { name, description } = req.body

      if (!name) {
        return res.status(400).json({ message: 'Activity name is required' })
      }

      const activity = await prisma.activity.create({
        data: {
          name,
          description: description || '',
          groupId: parseInt(groupId)
        }
      })

      console.log('Activity created successfully:', activity.id)

      res.status(201).json({
        message: 'Activity created successfully',
        activity: {
          id: activity.id,
          name: activity.name,
          description: activity.description,
          groupId: activity.groupId,
          createdAt: activity.createdAt,
          contributionCounts: {
            money: 0,
            time: 0,
            total: 0
          },
          totals: {
            money: {},
            time: {
              minutes: 0,
              formatted: '0m'
            }
          },
          contributorCount: 0
        }
      })
    } catch (error) {
      console.error('Create activity error:', error)
      res.status(500).json({ message: 'Failed to create activity' })
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' })
  }
}
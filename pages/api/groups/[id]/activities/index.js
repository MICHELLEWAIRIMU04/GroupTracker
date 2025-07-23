import { prisma } from '../../../../../lib/prisma'
import { requireAuth } from '../../../../../lib/auth'

async function handler(req, res) {
  const { id: groupId } = req.query
  const userId = parseInt(req.user.userId)

  if (req.method === 'GET') {
    try {
      // Check if user is member of group
      const groupMember = await prisma.groupMember.findUnique({
        where: {
          userId_groupId: {
            userId,
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
        }
      })

      res.json(activities.map(activity => {
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
              formatted: `${hours}h ${minutes}m`
            }
          },
          contributorCount: new Set(activity.contributions.map(c => c.userId)).size
        }
      }))
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
            userId,
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

      res.status(201).json({
        message: 'Activity created successfully',
        activity: {
          id: activity.id,
          name: activity.name,
          description: activity.description,
          groupId: activity.groupId,
          createdAt: activity.createdAt
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

export default requireAuth(handler)
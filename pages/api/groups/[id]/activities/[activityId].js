import { prisma } from '../../../../../lib/prisma'
import { requireAuth } from '../../../../../lib/auth'

async function handler(req, res) {
  const { id: groupId, activityId } = req.query
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

      const activity = await prisma.activity.findUnique({
        where: { 
          id: parseInt(activityId),
        },
        include: {
          contributions: {
            include: {
              user: {
                select: { id: true, username: true }
              }
            }
          }
        }
      })

      if (!activity || activity.groupId !== parseInt(groupId)) {
        return res.status(404).json({ message: 'Activity not found' })
      }

      // Calculate totals
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
        groupId: activity.groupId,
        createdAt: activity.createdAt,
        contributions: activity.contributions.map(contrib => ({
          id: contrib.id,
          userId: contrib.userId,
          user: contrib.user.username,
          contribution_type: contrib.contributionType,
          amount: contrib.amount,
          currency: contrib.currency,
          description: contrib.description,
          date: contrib.date
        })),
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
      })
    } catch (error) {
      console.error('Get activity error:', error)
      res.status(500).json({ message: 'Failed to retrieve activity' })
    }
  } else if (req.method === 'DELETE') {
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
        return res.status(403).json({ message: 'Admin privileges required to delete activities' })
      }

      const activity = await prisma.activity.findUnique({
        where: { id: parseInt(activityId) }
      })

      if (!activity || activity.groupId !== parseInt(groupId)) {
        return res.status(404).json({ message: 'Activity not found' })
      }

      await prisma.activity.delete({
        where: { id: parseInt(activityId) }
      })

      res.json({ message: 'Activity deleted successfully' })
    } catch (error) {
      console.error('Delete activity error:', error)
      res.status(500).json({ message: 'Failed to delete activity' })
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' })
  }
}

export default requireAuth(handler)
import { prisma } from '../../../lib/prisma'
import { requireAuth } from '../../../lib/auth'

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

      const group = await prisma.group.findUnique({
        where: { id: parseInt(groupId) },
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
          activities: {
            include: {
              contributions: true
            }
          }
        }
      })

      if (!group) {
        return res.status(404).json({ message: 'Group not found' })
      }

      res.json({
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
        })),
        activities: group.activities.map(activity => {
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
        })
      })
    } catch (error) {
      console.error('Get group error:', error)
      res.status(500).json({ message: 'Failed to retrieve group' })
    }
  } else if (req.method === 'DELETE') {
    try {
      const group = await prisma.group.findUnique({
        where: { id: parseInt(groupId) }
      })

      if (!group) {
        return res.status(404).json({ message: 'Group not found' })
      }

      // Only owner can delete group
      if (group.ownerId !== userId) {
        return res.status(403).json({ message: 'Only the group owner can delete the group' })
      }

      await prisma.group.delete({
        where: { id: parseInt(groupId) }
      })

      res.json({ message: 'Group deleted successfully' })
    } catch (error) {
      console.error('Delete group error:', error)
      res.status(500).json({ message: 'Failed to delete group' })
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' })
  }
}

export default requireAuth(handler)
import { prisma } from '../../../lib/prisma'
import { verifyToken } from '../../../lib/auth'
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
      console.log('NextAuth user authenticated for group details:', { userId, isAdmin })
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
        console.log('Legacy JWT user authenticated for group details:', { userId, isAdmin })
      }
    }
  }

  if (!userId) {
    console.log('No authentication found for group details')
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
              contributions: {
                include: {
                  user: {
                    select: { id: true, username: true }
                  }
                }
              }
            }
          }
        }
      })

      if (!group) {
        return res.status(404).json({ message: 'Group not found' })
      }

      // Process activities with contribution summaries
      const processedActivities = group.activities.map(activity => {
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
              formatted: totalTimeMinutes > 0 ? `${hours}h ${minutes}m` : '0m'
            }
          },
          contributorCount: new Set(activity.contributions.map(c => c.userId)).size,
          recentContributions: activity.contributions
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 3)
            .map(contrib => ({
              id: contrib.id,
              user: contrib.user.username,
              type: contrib.contributionType,
              amount: contrib.amount,
              currency: contrib.currency,
              description: contrib.description,
              date: contrib.date
            }))
        }
      })

      res.json({
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
          isAdmin: member.isAdmin,
          joinedAt: member.joinedAt
        })),
        activities: processedActivities,
        userIsAdmin: groupMember.isAdmin,
        userIsOwner: group.ownerId === userId
      })
    } catch (error) {
      console.error('Get group details error:', error)
      res.status(500).json({ message: 'Failed to retrieve group details' })
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
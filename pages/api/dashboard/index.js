import { prisma } from '../../../lib/prisma'
import { requireAuth } from '../../../lib/auth'

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const userId = parseInt(req.user.userId)
    const isAdmin = req.user.isAdmin

    // Get recent activities
    const recentActivities = await prisma.activity.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        group: {
          select: { id: true, name: true }
        }
      }
    })

    // Get recent contributions
    const recentContributions = await prisma.contribution.findMany({
      orderBy: { date: 'desc' },
      take: 5,
      include: {
        user: {
          select: { id: true, username: true }
        },
        activity: {
          select: { id: true, name: true }
        }
      }
    })

    // Get member stats
    const members = await prisma.user.findMany({
      include: {
        contributions: true
      }
    })

    const memberStats = members.map(member => {
      const totalContribution = member.contributions.reduce((sum, contrib) => sum + contrib.amount, 0)
      return {
        id: member.id,
        username: member.username,
        totalContribution,
        contributionCount: member.contributions.length
      }
    })

    // Get activity stats
    const activities = await prisma.activity.findMany({
      include: {
        contributions: {
          include: {
            user: {
              select: { id: true }
            }
          }
        }
      }
    })

    const activityStats = activities.map(activity => {
      const totalContribution = activity.contributions.reduce((sum, contrib) => sum + contrib.amount, 0)
      const uniqueContributors = new Set(activity.contributions.map(contrib => contrib.userId))
      
      return {
        id: activity.id,
        name: activity.name,
        totalContribution,
        contributorCount: uniqueContributors.size
      }
    })

    res.json({
      recent_activities: recentActivities.map(activity => ({
        id: activity.id,
        name: activity.name,
        description: activity.description,
        created_at: activity.createdAt,
        group: activity.group
      })),
      recent_contributions: recentContributions.map(contrib => ({
        id: contrib.id,
        user: contrib.user.username,
        activity: contrib.activity.name,
        contribution_type: contrib.contributionType,
        amount: contrib.amount,
        currency: contrib.currency,
        date: contrib.date
      })),
      member_stats: memberStats,
      activity_stats: activityStats
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    res.status(500).json({ message: 'Failed to load dashboard data' })
  }
}

export default requireAuth(handler)
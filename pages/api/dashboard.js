import { prisma } from '../../lib/prisma'
import { verifyToken } from '../../lib/auth'
import { getToken } from 'next-auth/jwt'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

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

  try {
    // Get user's groups with admin status
    const userGroups = await prisma.groupMember.findMany({
      where: { userId },
      include: {
        group: {
          include: {
            _count: {
              select: { members: true, activities: true }
            }
          }
        }
      },
      orderBy: {
        joinedAt: 'desc'
      }
    })

    // Get user's contributions
    const userContributions = await prisma.contribution.findMany({
      where: { userId },
      include: {
        activity: {
          select: { 
            id: true, 
            name: true,
            group: {
              select: { id: true, name: true }
            }
          }
        }
      },
      orderBy: { date: 'desc' },
      take: 10
    })

    // Calculate user stats
    const userStats = {
      groupCount: userGroups.length,
      adminGroupCount: userGroups.filter(ug => ug.isAdmin).length,
      contributionCount: userContributions.length,
      activityCount: new Set(userContributions.map(c => c.activityId)).size
    }

    // Format recent groups for display
    const recentGroups = userGroups.slice(0, 5).map(ug => ({
      id: ug.group.id,
      name: ug.group.name,
      description: ug.group.description,
      memberCount: ug.group._count.members,
      activityCount: ug.group._count.activities,
      isAdmin: ug.isAdmin,
      joinedAt: ug.joinedAt
    }))

    // Format recent contributions for display
    const recentContributions = userContributions.slice(0, 5).map(contrib => ({
      id: contrib.id,
      activity: contrib.activity.name,
      group: contrib.activity.group.name,
      contributionType: contrib.contributionType,
      amount: contrib.amount,
      currency: contrib.currency,
      description: contrib.description,
      date: contrib.date
    }))

    res.json({
      user_stats: userStats,
      recent_groups: recentGroups,
      recent_contributions: recentContributions
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    
    // Handle different types of database errors
    if (error.code === 'P1001') {
      return res.status(503).json({ 
        message: 'Database temporarily unavailable. Please try again in a moment.',
        error: 'DATABASE_CONNECTION_ERROR'
      })
    }
    
    res.status(500).json({ message: 'Failed to load dashboard data' })
  }
}
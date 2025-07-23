import { prisma } from '../../../lib/prisma'
import { requireAuth, requireAdmin } from '../../../lib/auth'

async function getHandler(req, res) {
  const userId = parseInt(req.user.userId)
  const isAdmin = req.user.isAdmin

  try {
    let contributions

    if (isAdmin) {
      // Admins can see all contributions
      contributions = await prisma.contribution.findMany({
        include: {
          user: {
            select: { id: true, username: true }
          },
          activity: {
            select: { id: true, name: true, groupId: true }
          }
        }
      })
    } else {
      // Regular users can only see contributions in their groups
      const userGroups = await prisma.groupMember.findMany({
        where: { userId },
        select: { groupId: true }
      })

      const groupIds = userGroups.map(g => g.groupId)

      contributions = await prisma.contribution.findMany({
        where: {
          activity: {
            groupId: {
              in: groupIds
            }
          }
        },
        include: {
          user: {
            select: { id: true, username: true }
          },
          activity: {
            select: { id: true, name: true, groupId: true }
          }
        }
      })
    }

    res.json(contributions.map(contrib => ({
      id: contrib.id,
      userId: contrib.userId,
      user: contrib.user.username,
      activityId: contrib.activityId,
      activity: contrib.activity.name,
      contributionType: contrib.contributionType,
      amount: contrib.amount,
      currency: contrib.contributionType === 'money' ? contrib.currency : undefined,
      description: contrib.description,
      date: contrib.date,
      createdAt: contrib.createdAt
    })))
  } catch (error) {
    console.error('Get contributions error:', error)
    res.status(500).json({ message: 'Failed to retrieve contributions' })
  }
}

async function postHandler(req, res) {
  try {
    const { userId, activityId, contributionType, amount, currency, description } = req.body

    if (!userId || !activityId || !contributionType || amount === undefined) {
      return res.status(400).json({ message: 'Missing required fields' })
    }

    if (!['money', 'time'].includes(contributionType)) {
      return res.status(400).json({ message: 'Invalid contribution type' })
    }

    if (contributionType === 'money' && !currency) {
      return res.status(400).json({ message: 'Currency is required for money contributions' })
    }

    // Verify activity exists
    const activity = await prisma.activity.findUnique({
      where: { id: parseInt(activityId) }
    })

    if (!activity) {
      return res.status(404).json({ message: 'Activity not found' })
    }

    // Verify user is member of the group
    const groupMember = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: parseInt(userId),
          groupId: activity.groupId
        }
      }
    })

    if (!groupMember) {
      return res.status(400).json({ message: 'User is not a member of the group' })
    }

    const contribution = await prisma.contribution.create({
      data: {
        userId: parseInt(userId),
        activityId: parseInt(activityId),
        contributionType,
        amount: parseFloat(amount),
        currency: contributionType === 'money' ? currency : null,
        description: description || ''
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

    res.status(201).json({
      message: 'Contribution created successfully',
      contribution: {
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
      }
    })
  } catch (error) {
    console.error('Create contribution error:', error)
    res.status(500).json({ message: 'Failed to create contribution' })
  }
}

export default requireAuth(async (req, res) => {
  if (req.method === 'GET') {
    return getHandler(req, res)
  } else if (req.method === 'POST') {
    return requireAdmin(postHandler)(req, res)
  } else {
    res.status(405).json({ message: 'Method not allowed' })
  }
})
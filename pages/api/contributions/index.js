import { prisma } from '../../../lib/prisma'
import { verifyToken } from '../../../lib/auth'
import { getToken } from 'next-auth/jwt'

export default async function handler(req, res) {
  let userId = null
  let isAdmin = false

  // Try NextAuth JWT token first
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (token) {
      userId = token.sub
      isAdmin = token.isAdmin || false
      console.log('NextAuth user authenticated for contributions:', { userId, isAdmin })
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
        console.log('Legacy JWT user authenticated for contributions:', { userId, isAdmin })
      }
    }
  }

  if (!userId) {
    console.log('No authentication found for contributions')
    return res.status(401).json({ message: 'Authentication required' })
  }

  if (req.method === 'GET') {
    try {
      let contributions

      if (isAdmin) {
        // System admins can see all contributions
        contributions = await prisma.contribution.findMany({
          include: {
            user: {
              select: { id: true, username: true }
            },
            activity: {
              select: { id: true, name: true, groupId: true }
            }
          },
          orderBy: { date: 'desc' }
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
          },
          orderBy: { date: 'desc' }
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
  } else if (req.method === 'POST') {
    try {
      const { contributorId, activityId, contributionType, amount, currency, description } = req.body

      if (!contributorId || !activityId || !contributionType || amount === undefined) {
        return res.status(400).json({ message: 'Missing required fields: contributorId, activityId, contributionType, amount' })
      }

      if (!['money', 'time'].includes(contributionType)) {
        return res.status(400).json({ message: 'Invalid contribution type. Must be "money" or "time"' })
      }

      if (contributionType === 'money' && !currency) {
        return res.status(400).json({ message: 'Currency is required for money contributions' })
      }

      // Verify activity exists and get group info
      const activity = await prisma.activity.findUnique({
        where: { id: parseInt(activityId) },
        include: {
          group: {
            include: {
              members: true
            }
          }
        }
      })

      if (!activity) {
        return res.status(404).json({ message: 'Activity not found' })
      }

      // Check if current user has permission to add contributions
      const currentUserMember = activity.group.members.find(member => member.userId === userId)
      
      if (!currentUserMember) {
        return res.status(403).json({ message: 'You are not a member of this group' })
      }

      // Only group admins or system admins can add contributions for others
      if (!currentUserMember.isAdmin && !isAdmin) {
        return res.status(403).json({ message: 'Only group admins can add contributions' })
      }

      // Verify the contributor is a member of the group
      const contributorMember = activity.group.members.find(member => member.userId === contributorId)

      if (!contributorMember) {
        return res.status(400).json({ message: 'Contributor is not a member of this group' })
      }

      const contribution = await prisma.contribution.create({
        data: {
          userId: contributorId,
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

      console.log('Contribution created successfully:', contribution.id)

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
  } else {
    res.status(405).json({ message: 'Method not allowed' })
  }
}
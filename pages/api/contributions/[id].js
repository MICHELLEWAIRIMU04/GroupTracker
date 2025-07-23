import { prisma } from '../../../lib/prisma'
import { requireAuth, requireAdmin } from '../../../lib/auth'

async function getHandler(req, res) {
  const { id } = req.query
  const userId = parseInt(req.user.userId)
  const isAdmin = req.user.isAdmin

  try {
    const contribution = await prisma.contribution.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: {
          select: { id: true, username: true }
        },
        activity: {
          select: { id: true, name: true, groupId: true }
        }
      }
    })

    if (!contribution) {
      return res.status(404).json({ message: 'Contribution not found' })
    }

    // Check if user has access (admin or member of the group)
    if (!isAdmin) {
      const groupMember = await prisma.groupMember.findUnique({
        where: {
          userId_groupId: {
            userId,
            groupId: contribution.activity.groupId
          }
        }
      })

      if (!groupMember) {
        return res.status(403).json({ message: 'Access denied' })
      }
    }

    res.json({
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
    })
  } catch (error) {
    console.error('Get contribution error:', error)
    res.status(500).json({ message: 'Failed to retrieve contribution' })
  }
}

async function updateHandler(req, res) {
  const { id } = req.query
  const { amount, description, contributionType, currency } = req.body

  try {
    const contribution = await prisma.contribution.findUnique({
      where: { id: parseInt(id) }
    })

    if (!contribution) {
      return res.status(404).json({ message: 'Contribution not found' })
    }

    const updatedContribution = await prisma.contribution.update({
      where: { id: parseInt(id) },
      data: {
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(description !== undefined && { description }),
        ...(contributionType !== undefined && { contributionType }),
        ...(currency !== undefined && { currency })
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

    res.json({
      message: 'Contribution updated successfully',
      contribution: {
        id: updatedContribution.id,
        userId: updatedContribution.userId,
        user: updatedContribution.user.username,
        activityId: updatedContribution.activityId,
        activity: updatedContribution.activity.name,
        contributionType: updatedContribution.contributionType,
        amount: updatedContribution.amount,
        currency: updatedContribution.currency,
        description: updatedContribution.description,
        date: updatedContribution.date
      }
    })
  } catch (error) {
    console.error('Update contribution error:', error)
    res.status(500).json({ message: 'Failed to update contribution' })
  }
}

async function deleteHandler(req, res) {
  const { id } = req.query

  try {
    const contribution = await prisma.contribution.findUnique({
      where: { id: parseInt(id) }
    })

    if (!contribution) {
      return res.status(404).json({ message: 'Contribution not found' })
    }

    await prisma.contribution.delete({
      where: { id: parseInt(id) }
    })

    res.json({ message: 'Contribution deleted successfully' })
  } catch (error) {
    console.error('Delete contribution error:', error)
    res.status(500).json({ message: 'Failed to delete contribution' })
  }
}

export default requireAuth(async (req, res) => {
  if (req.method === 'GET') {
    return getHandler(req, res)
  } else if (req.method === 'PUT') {
    return requireAdmin(updateHandler)(req, res)
  } else if (req.method === 'DELETE') {
    return requireAdmin(deleteHandler)(req, res)
  } else {
    res.status(405).json({ message: 'Method not allowed' })
  }
})
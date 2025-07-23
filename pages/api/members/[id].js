import { prisma } from '../../../lib/prisma'
import { requireAuth, requireAdmin } from '../../../lib/auth'

async function getHandler(req, res) {
  const { id } = req.query

  try {
    const member = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      include: {
        contributions: {
          include: {
            activity: {
              select: { id: true, name: true }
            }
          }
        }
      }
    })

    if (!member) {
      return res.status(404).json({ message: 'Member not found' })
    }

    const totalContribution = member.contributions.reduce((sum, contrib) => sum + contrib.amount, 0)

    res.json({
      id: member.id,
      username: member.username,
      email: member.email,
      isAdmin: member.isAdmin,
      contributions: member.contributions.map(contrib => ({
        id: contrib.id,
        activityId: contrib.activityId,
        activity: contrib.activity.name,
        contributionType: contrib.contributionType,
        amount: contrib.amount,
        currency: contrib.currency,
        description: contrib.description,
        date: contrib.date
      })),
      totalContribution
    })
  } catch (error) {
    console.error('Get member error:', error)
    res.status(500).json({ message: 'Failed to retrieve member' })
  }
}

async function deleteHandler(req, res) {
  const { id } = req.query

  try {
    const member = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      include: { contributions: true }
    })

    if (!member) {
      return res.status(404).json({ message: 'Member not found' })
    }

    const contributionCount = member.contributions.length

    await prisma.user.delete({
      where: { id: parseInt(id) }
    })

    res.json({
      message: 'Member deleted successfully',
      contributionsDeleted: contributionCount
    })
  } catch (error) {
    console.error('Delete member error:', error)
    res.status(500).json({ message: 'Failed to delete member' })
  }
}

export default requireAuth(async (req, res) => {
  if (req.method === 'GET') {
    return getHandler(req, res)
  } else if (req.method === 'DELETE') {
    return requireAdmin(deleteHandler)(req, res)
  } else {
    res.status(405).json({ message: 'Method not allowed' })
  }
})
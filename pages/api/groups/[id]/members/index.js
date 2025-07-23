import { prisma } from '../../../../../lib/prisma'
import { requireAuth } from '../../../../../lib/auth'

async function handler(req, res) {
  const { id: groupId } = req.query
  const userId = parseInt(req.user.userId)

  if (req.method === 'POST') {
    try {
      // Check if current user is admin of the group
      const currentMember = await prisma.groupMember.findUnique({
        where: {
          userId_groupId: {
            userId,
            groupId: parseInt(groupId)
          }
        }
      })

      if (!currentMember || !currentMember.isAdmin) {
        return res.status(403).json({ message: 'Admin privileges required to add members' })
      }

      const { user_id, is_admin } = req.body

      if (!user_id) {
        return res.status(400).json({ message: 'User ID is required' })
      }

      // Check if user exists
      const userToAdd = await prisma.user.findUnique({
        where: { id: parseInt(user_id) }
      })

      if (!userToAdd) {
        return res.status(404).json({ message: 'User not found' })
      }

      // Check if user is already a member
      const existingMember = await prisma.groupMember.findUnique({
        where: {
          userId_groupId: {
            userId: parseInt(user_id),
            groupId: parseInt(groupId)
          }
        }
      })

      if (existingMember) {
        return res.status(400).json({ message: 'User is already a member of this group' })
      }

      // Add user to group
      await prisma.groupMember.create({
        data: {
          userId: parseInt(user_id),
          groupId: parseInt(groupId),
          isAdmin: Boolean(is_admin)
        }
      })

      res.json({ message: 'Member added successfully' })
    } catch (error) {
      console.error('Add group member error:', error)
      res.status(500).json({ message: 'Failed to add member to group' })
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' })
  }
}

export default requireAuth(handler)
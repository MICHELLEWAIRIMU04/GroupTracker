import { prisma } from '../../../../../lib/prisma'
import { requireAuth } from '../../../../../lib/auth'

async function handler(req, res) {
  const { id: groupId, userId: targetUserId } = req.query
  const currentUserId = parseInt(req.user.userId)

  if (req.method === 'DELETE') {
    try {
      // Check if current user is admin of the group
      const currentMember = await prisma.groupMember.findUnique({
        where: {
          userId_groupId: {
            userId: currentUserId,
            groupId: parseInt(groupId)
          }
        }
      })

      // Users can remove themselves, or admins can remove others
      const canRemove = currentMember?.isAdmin || currentUserId === parseInt(targetUserId)

      if (!canRemove) {
        return res.status(403).json({ message: 'Admin privileges required to remove other members' })
      }

      // Check if target user is a member
      const targetMember = await prisma.groupMember.findUnique({
        where: {
          userId_groupId: {
            userId: parseInt(targetUserId),
            groupId: parseInt(groupId)
          }
        }
      })

      if (!targetMember) {
        return res.status(400).json({ message: 'User is not a member of this group' })
      }

      // Check if trying to remove the group owner
      const group = await prisma.group.findUnique({
        where: { id: parseInt(groupId) }
      })

      if (group?.ownerId === parseInt(targetUserId)) {
        return res.status(400).json({ message: 'Cannot remove the group owner' })
      }

      // Remove user from group
      await prisma.groupMember.delete({
        where: {
          userId_groupId: {
            userId: parseInt(targetUserId),
            groupId: parseInt(groupId)
          }
        }
      })

      res.json({ message: 'Member removed successfully' })
    } catch (error) {
      console.error('Remove group member error:', error)
      res.status(500).json({ message: 'Failed to remove member from group' })
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' })
  }
}

export default requireAuth(handler)
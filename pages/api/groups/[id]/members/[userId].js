import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { getToken } from 'next-auth/jwt'

export default async function handler(req, res) {
  const { id: groupId, userId: targetUserId } = req.query
  let currentUserId = null

  // Try NextAuth JWT token first
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (token) {
      currentUserId = token.sub
    }
  } catch (error) {
    console.log('NextAuth token not found, trying legacy JWT...')
  }

  // Fallback to legacy JWT
  if (!currentUserId) {
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const jwtToken = authHeader.replace('Bearer ', '')
      const decoded = verifyToken(jwtToken)
      if (decoded) {
        currentUserId = decoded.userId
      }
    }
  }

  if (!currentUserId) {
    return res.status(401).json({ message: 'Authentication required' })
  }

  if (req.method === 'PUT') {
    // Update member role (promote/demote admin)
    try {
      const { isAdmin } = req.body

      // Get group details to check ownership
      const group = await prisma.group.findUnique({
        where: { id: parseInt(groupId) },
        include: {
          members: {
            where: {
              OR: [
                { userId: currentUserId },
                { userId: targetUserId }
              ]
            }
          }
        }
      })

      if (!group) {
        return res.status(404).json({ message: 'Group not found' })
      }

      const currentMember = group.members.find(m => m.userId === currentUserId)
      const targetMember = group.members.find(m => m.userId === targetUserId)

      if (!currentMember) {
        return res.status(403).json({ message: 'You are not a member of this group' })
      }

      if (!targetMember) {
        return res.status(404).json({ message: 'Target user is not a member of this group' })
      }

      // Only group owner can change admin status
      if (group.ownerId !== currentUserId) {
        return res.status(403).json({ message: 'Only the group owner can change admin privileges' })
      }

      // Cannot change owner's admin status
      if (group.ownerId === targetUserId) {
        return res.status(400).json({ message: 'Cannot change the owner\'s admin status' })
      }

      // Cannot change own admin status
      if (currentUserId === targetUserId) {
        return res.status(400).json({ message: 'Cannot change your own admin status' })
      }

      // Update the member's admin status
      await prisma.groupMember.update({
        where: {
          userId_groupId: {
            userId: targetUserId,
            groupId: parseInt(groupId)
          }
        },
        data: {
          isAdmin: Boolean(isAdmin)
        }
      })

      res.json({ 
        message: `Member ${isAdmin ? 'promoted to admin' : 'demoted from admin'} successfully` 
      })
    } catch (error) {
      console.error('Update member role error:', error)
      res.status(500).json({ message: 'Failed to update member role' })
    }
  } else if (req.method === 'DELETE') {
    // Remove member from group
    try {
      // Check if current user is admin of the group or trying to remove themselves
      const currentMember = await prisma.groupMember.findUnique({
        where: {
          userId_groupId: {
            userId: currentUserId,
            groupId: parseInt(groupId)
          }
        }
      })

      // Users can remove themselves, or admins can remove others
      const canRemove = currentMember?.isAdmin || currentUserId === targetUserId

      if (!canRemove) {
        return res.status(403).json({ message: 'Admin privileges required to remove other members' })
      }

      // Check if target user is a member
      const targetMember = await prisma.groupMember.findUnique({
        where: {
          userId_groupId: {
            userId: targetUserId,
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

      if (group?.ownerId === targetUserId) {
        return res.status(400).json({ message: 'Cannot remove the group owner' })
      }

      // Remove user from group
      await prisma.groupMember.delete({
        where: {
          userId_groupId: {
            userId: targetUserId,
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
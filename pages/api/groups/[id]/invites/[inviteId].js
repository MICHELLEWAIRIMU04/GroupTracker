import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { getToken } from 'next-auth/jwt'

export default async function handler(req, res) {
  const { id: groupId, inviteId } = req.query
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

  if (req.method === 'DELETE') {
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
        return res.status(403).json({ message: 'Admin privileges required to cancel invitations' })
      }

      // Check if invitation exists and belongs to this group
      const invite = await prisma.groupInvite.findUnique({
        where: { id: parseInt(inviteId) }
      })

      if (!invite) {
        return res.status(404).json({ message: 'Invitation not found' })
      }

      if (invite.groupId !== parseInt(groupId)) {
        return res.status(403).json({ message: 'Invitation does not belong to this group' })
      }

      if (invite.acceptedAt) {
        return res.status(400).json({ message: 'Cannot cancel an already accepted invitation' })
      }

      // Delete the invitation
      await prisma.groupInvite.delete({
        where: { id: parseInt(inviteId) }
      })

      res.json({ message: 'Invitation cancelled successfully' })
    } catch (error) {
      console.error('Cancel group invite error:', error)
      res.status(500).json({ message: 'Failed to cancel invitation' })
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' })
  }
}
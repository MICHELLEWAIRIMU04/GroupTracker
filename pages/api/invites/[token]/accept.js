import { prisma } from '../../../../lib/prisma'
import { verifyToken } from '../../../../lib/auth'
import { getToken } from 'next-auth/jwt'

export default async function handler(req, res) {
  const { token: inviteToken } = req.query
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

  if (req.method === 'POST') {
    try {
      // Find the invitation
      const invite = await prisma.groupInvite.findUnique({
        where: { token: inviteToken },
        include: {
          group: {
            select: { id: true, name: true }
          }
        }
      })

      if (!invite) {
        return res.status(404).json({ message: 'Invitation not found' })
      }

      if (invite.acceptedAt) {
        return res.status(400).json({ message: 'Invitation has already been accepted' })
      }

      if (new Date() > invite.expiresAt) {
        return res.status(400).json({ message: 'Invitation has expired' })
      }

      // Get user details
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user) {
        return res.status(404).json({ message: 'User not found' })
      }

      // Check if the invitation email matches the user's email
      if (user.email !== invite.email) {
        return res.status(403).json({ message: 'This invitation is for a different email address' })
      }

      // Check if user is already a member
      const existingMember = await prisma.groupMember.findUnique({
        where: {
          userId_groupId: {
            userId: userId,
            groupId: invite.groupId
          }
        }
      })

      if (existingMember) {
        // Mark invitation as accepted even if already a member
        await prisma.groupInvite.update({
          where: { id: invite.id },
          data: { acceptedAt: new Date() }
        })
        return res.status(400).json({ message: 'You are already a member of this group' })
      }

      // Accept the invitation - add user to group and mark invitation as accepted
      await prisma.$transaction([
        prisma.groupMember.create({
          data: {
            userId: userId,
            groupId: invite.groupId,
            isAdmin: invite.isAdmin
          }
        }),
        prisma.groupInvite.update({
          where: { id: invite.id },
          data: { acceptedAt: new Date() }
        })
      ])

      res.json({
        message: 'Invitation accepted successfully',
        group: {
          id: invite.group.id,
          name: invite.group.name
        },
        isAdmin: invite.isAdmin
      })
    } catch (error) {
      console.error('Accept invitation error:', error)
      res.status(500).json({ message: 'Failed to accept invitation' })
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' })
  }
}
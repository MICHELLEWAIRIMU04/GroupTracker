import { prisma } from '../../../../../lib/prisma'
import { verifyToken } from '../../../../../lib/auth'
import { getToken } from 'next-auth/jwt'
import { sendGroupInviteEmail, generateInviteToken } from '../../../../../lib/email'

export default async function handler(req, res) {
  const { id: groupId } = req.query
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

  if (req.method === 'GET') {
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
        return res.status(403).json({ message: 'Admin privileges required to view invitations' })
      }

      // Get pending invitations
      const invites = await prisma.groupInvite.findMany({
        where: {
          groupId: parseInt(groupId),
          acceptedAt: null,
          expiresAt: {
            gt: new Date()
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      res.json(invites)
    } catch (error) {
      console.error('Get group invites error:', error)
      res.status(500).json({ message: 'Failed to retrieve invitations' })
    }
  } else if (req.method === 'POST') {
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
        return res.status(403).json({ message: 'Admin privileges required to send invitations' })
      }

      const { email, is_admin } = req.body

      if (!email) {
        return res.status(400).json({ message: 'Email is required' })
      }

      // Get group and inviter info
      const group = await prisma.group.findUnique({
        where: { id: parseInt(groupId) },
        include: {
          owner: {
            select: { username: true }
          }
        }
      })

      const inviter = await prisma.user.findUnique({
        where: { id: userId },
        select: { username: true }
      })

      if (!group) {
        return res.status(404).json({ message: 'Group not found' })
      }

      // Check if user is already a member
      const existingUser = await prisma.user.findUnique({
        where: { email }
      })

      if (existingUser) {
        const existingMember = await prisma.groupMember.findUnique({
          where: {
            userId_groupId: {
              userId: existingUser.id,
              groupId: parseInt(groupId)
            }
          }
        })

        if (existingMember) {
          return res.status(400).json({ message: 'User is already a member of this group' })
        }
      }

      // Check if invitation already exists
      const existingInvite = await prisma.groupInvite.findUnique({
        where: {
          email_groupId: {
            email,
            groupId: parseInt(groupId)
          }
        }
      })

      if (existingInvite && existingInvite.expiresAt > new Date()) {
        return res.status(400).json({ message: 'An active invitation for this email already exists' })
      }

      // Delete any expired invitations for this email/group
      if (existingInvite) {
        await prisma.groupInvite.delete({
          where: { id: existingInvite.id }
        })
      }

      // Generate invitation token and expiry
      const token = generateInviteToken()
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

      // Create invitation
      const invite = await prisma.groupInvite.create({
        data: {
          email,
          groupId: parseInt(groupId),
          invitedById: userId,
          isAdmin: Boolean(is_admin),
          token,
          expiresAt
        }
      })

      // Send invitation email
      try {
        await sendGroupInviteEmail(
          email,
          group.name,
          inviter.username || 'A group admin',
          token,
          Boolean(is_admin)
        )
      } catch (emailError) {
        console.error('Failed to send invitation email:', emailError)
        // Don't fail the request if email fails, but log it
      }

      res.status(201).json({
        message: 'Invitation sent successfully',
        invite: {
          id: invite.id,
          email: invite.email,
          isAdmin: invite.isAdmin,
          expiresAt: invite.expiresAt,
          createdAt: invite.createdAt
        }
      })
    } catch (error) {
      console.error('Send group invite error:', error)
      res.status(500).json({ message: 'Failed to send invitation' })
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' })
  }
}
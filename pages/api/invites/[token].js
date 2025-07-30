import { prisma } from '@/lib/prisma'


export default async function handler(req, res) {
  const { token } = req.query

  if (req.method === 'GET') {
    try {
      // Find the invitation
      const invite = await prisma.groupInvite.findUnique({
        where: { token: token },
        include: {
          group: {
            select: { id: true, name: true }
          },
          invitedBy: {
            select: { username: true }
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

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { email: invite.email }
      })

      // Check if user is already a member
      if (existingUser) {
        const existingMember = await prisma.groupMember.findUnique({
          where: {
            userId_groupId: {
              userId: existingUser.id,
              groupId: invite.groupId
            }
          }
        })

        if (existingMember) {
          return res.status(400).json({ message: 'You are already a member of this group' })
        }
      }

      res.json({
        id: invite.id,
        email: invite.email,
        groupId: invite.groupId,
        groupName: invite.group.name,
        inviterName: invite.invitedBy.username || 'A group admin',
        isAdmin: invite.isAdmin,
        expiresAt: invite.expiresAt,
        userExists: !!existingUser
      })
    } catch (error) {
      console.error('Get invitation error:', error)
      res.status(500).json({ message: 'Failed to retrieve invitation' })
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' })
  }
}
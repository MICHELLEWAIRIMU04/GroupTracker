import { prisma } from '../../../lib/prisma'
import { sendWelcomeEmail } from '../../../lib/email'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { token } = req.query

    if (!token) {
      return res.status(400).json({ message: 'Verification token is required' })
    }

    // Find user with this verification token
    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: {
          gt: new Date()
        }
      }
    })

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification token' })
    }

    // Update user as verified
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        emailVerificationToken: null,
        emailVerificationExpires: null
      }
    })

    // Send welcome email (optional)
    try {
      await sendWelcomeEmail(user.email, user.username)
    } catch (emailError) {
      console.log('Welcome email failed but verification succeeded')
    }

    res.json({ message: 'Email verified successfully! You can now log in.' })
  } catch (error) {
    console.error('Email verification error:', error)
    res.status(500).json({ message: 'Email verification failed' })
  }
}
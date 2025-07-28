import { prisma } from '../../../lib/prisma'
import { hashPassword } from '../../../lib/auth'
import { sendVerificationEmail, generateVerificationToken } from '../../../lib/email'

// Check if email is configured
const isEmailConfigured = () => {
  return !!(
    process.env.SMTP_HOST && 
    process.env.SMTP_USER && 
    process.env.SMTP_PASS
  )
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { username, email, password } = req.body

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address' })
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' })
    }

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email }
        ]
      }
    })

    if (existingUser) {
      return res.status(400).json({ 
        message: existingUser.username === username ? 'Username already exists' : 'Email already registered' 
      })
    }

    const hashedPassword = await hashPassword(password)

    if (isEmailConfigured()) {
      // Email is configured - use verification flow
      const verificationToken = generateVerificationToken()
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

      // Create user with unverified email
      const user = await prisma.user.create({
        data: {
          username,
          email,
          password: hashedPassword,
          isAdmin: false,
          emailVerificationToken: verificationToken,
          emailVerificationExpires: verificationExpires
        }
      })

      // Try to send verification email
      try {
        await sendVerificationEmail(email, verificationToken, username)
        
        res.status(201).json({ 
          message: 'Registration successful! Please check your email to verify your account.',
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            emailVerified: false
          }
        })
      } catch (emailError) {
        // If email fails, delete the user and return error
        await prisma.user.delete({ where: { id: user.id } })
        return res.status(500).json({ 
          message: 'Failed to send verification email. Please try again.' 
        })
      }
    } else {
      // Email not configured - create user as verified for development
      console.log('📧 Email not configured - creating user as verified for development')
      
      const user = await prisma.user.create({
        data: {
          username,
          email,
          password: hashedPassword,
          isAdmin: false,
          emailVerified: new Date(), // Mark as verified since no email verification
          emailVerificationToken: null,
          emailVerificationExpires: null
        }
      })

      res.status(201).json({ 
        message: 'Registration successful! You can now log in. (Email verification skipped in development mode)',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          emailVerified: true
        }
      })
    }
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}
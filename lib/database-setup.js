import { prisma } from './prisma'
import { hashPassword } from './auth'

export async function setupDefaultAdmin() {
  try {
    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { username: 'admin' }
    })

    if (!existingAdmin) {
      const hashedPassword = await hashPassword('admin123')
      
      await prisma.user.create({
        data: {
          username: 'admin',
          email: 'admin@example.com',
          password: hashedPassword,
          isAdmin: true
        }
      })
      
      console.log('Default admin user created: admin / admin123')
    }
  } catch (error) {
    console.error('Error setting up default admin:', error)
  }
}

// Run this when the app starts
if (process.env.NODE_ENV !== 'test') {
  setupDefaultAdmin()
}
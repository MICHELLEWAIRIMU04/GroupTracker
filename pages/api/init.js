import { prisma } from '../../lib/prisma'
import { hashPassword } from '../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    console.log('🔄 Starting database initialization...')
    
    // Test database connection
    await prisma.$queryRaw`SELECT 1`
    console.log('✅ Database connection successful')

    // Create admin user if doesn't exist
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
          emailVerified: new Date()
        }
      })
      
      console.log('✅ Admin user created: admin / admin123')
    } else {
      console.log('ℹ️  Admin user already exists')
    }

    // Create sample user if doesn't exist
    const existingSampleUser = await prisma.user.findUnique({
      where: { username: 'john_doe' }
    })

    if (!existingSampleUser) {
      const hashedPassword = await hashPassword('password123')
      
      await prisma.user.create({
        data: {
          username: 'john_doe',
          email: 'john@example.com',
          password: hashedPassword,
          emailVerified: new Date()
        }
      })
      
      console.log('✅ Sample user created: john_doe / password123')
    } else {
      console.log('ℹ️  Sample user already exists')
    }

    // Get current counts
    const userCount = await prisma.user.count()
    const groupCount = await prisma.group.count()
    const activityCount = await prisma.activity.count()
    const contributionCount = await prisma.contribution.count()

    console.log('🎉 Database initialization completed!')

    res.json({
      message: 'Database initialized successfully!',
      summary: {
        users: userCount,
        groups: groupCount,
        activities: activityCount,
        contributions: contributionCount
      },
      defaultCredentials: {
        admin: { username: 'admin', password: 'admin123' },
        user: { username: 'john_doe', password: 'password123' }
      },
      nextSteps: [
        'Try logging in with the admin credentials',
        'Create your first group',
        'Add activities and track contributions'
      ]
    })
    
  } catch (error) {
    console.error('❌ Database initialization error:', error)
    
    // Check if it's a table doesn't exist error
    if (error.message.includes('relation') && error.message.includes('does not exist')) {
      return res.status(500).json({
        message: 'Database tables do not exist',
        error: 'The database schema needs to be created first',
        solution: 'The database tables need to be created. This might require running migrations.',
        details: error.message
      })
    }
    
    res.status(500).json({
      message: 'Database initialization failed',
      error: error.message,
      code: error.code || 'UNKNOWN'
    })
  }
}
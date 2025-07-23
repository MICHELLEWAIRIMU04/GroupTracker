// scripts/init-db.js
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('🚀 Initializing database...')
    
    // Create default admin user
    const existingAdmin = await prisma.user.findUnique({
      where: { username: 'admin' }
    })

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('admin123', 12)
      
      const admin = await prisma.user.create({
        data: {
          username: 'admin',
          email: 'admin@example.com',
          password: hashedPassword,
          isAdmin: true
        }
      })
      
      console.log('✅ Default admin user created:', {
        username: 'admin',
        password: 'admin123',
        email: 'admin@example.com'
      })

      // Create a sample regular user
      const hashedUserPassword = await bcrypt.hash('password123', 12)
      const sampleUser = await prisma.user.create({
        data: {
          username: 'john_doe',
          email: 'john@example.com',
          password: hashedUserPassword,
          isAdmin: false
        }
      })

      console.log('✅ Sample user created:', {
        username: 'john_doe',
        password: 'password123',
        email: 'john@example.com'
      })

      // Create a sample group
      const sampleGroup = await prisma.group.create({
        data: {
          name: 'Sample Project Team',
          description: 'A sample group for demonstration purposes',
          ownerId: admin.id,
          members: {
            create: [
              { userId: admin.id, isAdmin: true },
              { userId: sampleUser.id, isAdmin: false }
            ]
          }
        }
      })

      console.log('✅ Sample group created:', sampleGroup.name)

      // Create a sample activity
      const sampleActivity = await prisma.activity.create({
        data: {
          name: 'Website Development',
          description: 'Building the company website',
          groupId: sampleGroup.id
        }
      })

      console.log('✅ Sample activity created:', sampleActivity.name)

      // Create sample contributions
      await prisma.contribution.createMany({
        data: [
          {
            userId: admin.id,
            activityId: sampleActivity.id,
            contributionType: 'money',
            amount: 500.00,
            currency: 'USD',
            description: 'Initial project funding'
          },
          {
            userId: sampleUser.id,
            activityId: sampleActivity.id,
            contributionType: 'time',
            amount: 120,
            description: 'Frontend development work'
          }
        ]
      })

      console.log('✅ Sample contributions created')
      
    } else {
      console.log('ℹ️  Admin user already exists')
    }

    console.log('🎉 Database initialization completed!')
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
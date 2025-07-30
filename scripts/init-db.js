const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('🔄 Initializing database...')
    
    // Test database connection first
    await prisma.$connect()
    console.log('✅ Database connection successful')
    
    // Create default admin user (no longer has global isAdmin flag)
    const existingAdmin = await prisma.user.findUnique({
      where: { username: 'admin' }
    })

    let admin
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('admin123', 12)
      
      admin = await prisma.user.create({
        data: {
          username: 'admin',
          email: 'admin@example.com',
          password: hashedPassword,
          emailVerified: new Date() // Mark as verified
        }
      })
      
      console.log('✅ Default admin user created:', {
        username: 'admin',
        password: 'admin123',
        email: 'admin@example.com'
      })
    } else {
      admin = existingAdmin
      console.log('ℹ️  Admin user already exists')
    }

    // Create sample data (optional)
    const userCount = await prisma.user.count()
    if (userCount === 1) { // Only admin exists
      console.log('🔄 Creating sample data...')
      
      // Create a sample regular user
      const hashedPassword = await bcrypt.hash('password123', 12)
      const sampleUser = await prisma.user.create({
        data: {
          username: 'john_doe',
          email: 'john@example.com',
          password: hashedPassword,
          emailVerified: new Date() // Mark as verified
        }
      })

      // Create a sample group with admin as owner
      const sampleGroup = await prisma.group.create({
        data: {
          name: 'Sample Project Team',
          description: 'A sample group for demonstration purposes',
          ownerId: admin.id,
          members: {
            create: [
              { userId: admin.id, isAdmin: true }, // Owner is automatically admin
              { userId: sampleUser.id, isAdmin: false } // Regular member
            ]
          }
        }
      })

      // Create a sample activity
      const sampleActivity = await prisma.activity.create({
        data: {
          name: 'Website Development',
          description: 'Building the company website',
          groupId: sampleGroup.id
        }
      })

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

      console.log('✅ Sample data created successfully')
    } else {
      console.log('ℹ️  Sample data already exists')
    }

    // Verify the data
    const totalUsers = await prisma.user.count()
    const totalGroups = await prisma.group.count()
    const totalActivities = await prisma.activity.count()
    const totalContributions = await prisma.contribution.count()

    console.log('📊 Database Summary:')
    console.log(`   Users: ${totalUsers}`)
    console.log(`   Groups: ${totalGroups}`)
    console.log(`   Activities: ${totalActivities}`)
    console.log(`   Contributions: ${totalContributions}`)

    console.log('🎉 Database initialization completed!')
    console.log('📝 Key Changes:')
    console.log('   • Removed global isAdmin field')
    console.log('   • Admin privileges are now group-specific')
    console.log('   • Group owners automatically get admin rights')
    console.log('   • All users use the same dashboard')
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    
    if (error.code === 'P1001') {
      console.error('🔧 Connection Error - Check:')
      console.error('   1. Your DATABASE_URL in .env.local')
      console.error('   2. Your Neon database is running')
      console.error('   3. Your internet connection')
    }
    
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
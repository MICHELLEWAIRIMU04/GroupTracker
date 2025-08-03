// scripts/test-db-connection.js
require('dotenv').config()
const { Client } = require('pg')

async function testConnection() {
  const connectionString = process.env.DATABASE_URL
  
  console.log('🔍 Testing database connection...')
  console.log('Environment check:')
  console.log('- NODE_ENV:', process.env.NODE_ENV)
  console.log('- DATABASE_URL exists:', !!connectionString)
  console.log('- DATABASE_URL starts with postgresql://:', connectionString?.startsWith('postgresql://'))
  console.log('- DATABASE_URL preview:', connectionString?.substring(0, 50) + '...')
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL is not set')
    process.exit(1)
  }
  
  if (!connectionString.startsWith('postgresql://')) {
    console.error('❌ DATABASE_URL does not start with postgresql://')
    console.error('Current value:', connectionString)
    process.exit(1)
  }
  
  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false // For Neon compatibility
    }
  })
  
  try {
    console.log('🔌 Connecting to database...')
    await client.connect()
    console.log('✅ Connected successfully!')
    
    console.log('🔍 Testing query...')
    const result = await client.query('SELECT version()')
    console.log('✅ Query successful!')
    console.log('PostgreSQL version:', result.rows[0].version.split(' ')[0])
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message)
    console.error('Error code:', error.code)
    
    if (error.message.includes('authentication failed')) {
      console.error('🔧 Check your Neon credentials')
    } else if (error.message.includes('timeout')) {
      console.error('🔧 Check your internet connection and Neon database status')
    }
    
    process.exit(1)
  } finally {
    await client.end()
    console.log('🔌 Connection closed')
  }
}

testConnection().catch(console.error)
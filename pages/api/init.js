import { setupDefaultAdmin } from '../../lib/database-setup'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    await setupDefaultAdmin()
    res.json({ message: 'Database initialized successfully' })
  } catch (error) {
    console.error('Database initialization error:', error)
    res.status(500).json({ message: 'Failed to initialize database' })
  }
}
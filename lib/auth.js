import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export function createToken(user) {
  return jwt.sign(
    { 
      userId: user.id.toString(), 
      isAdmin: user.isAdmin 
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  )
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    return null
  }
}

export async function hashPassword(password) {
  return await bcrypt.hash(password, 12)
}

export async function comparePasswords(password, hashedPassword) {
  return await bcrypt.compare(password, hashedPassword)
}

export function requireAuth(handler) {
  return async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '')
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' })
    }
    
    const decoded = verifyToken(token)
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token' })
    }
    
    req.user = decoded
    return handler(req, res)
  }
}

export function requireAdmin(handler) {
  return requireAuth(async (req, res) => {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Admin privileges required' })
    }
    return handler(req, res)
  })
}
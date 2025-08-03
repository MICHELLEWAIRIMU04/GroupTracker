import { randomBytes } from 'crypto'

// Check if email is configured
const isEmailConfigured = () => {
  return !!(
    process.env.SMTP_HOST && 
    process.env.SMTP_USER && 
    process.env.SMTP_PASS
  )
}

let transporter = null

// Only create transporter if email is configured
if (isEmailConfigured()) {
  try {
    const nodemailer = require('nodemailer')
    transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  } catch (error) {
    console.warn('Email transporter could not be created:', error.message)
  }
}

export function generateVerificationToken() {
  return randomBytes(32).toString('hex')
}

export function generateInviteToken() {
  return randomBytes(32).toString('hex')
}

export async function sendVerificationEmail(email, token, username) {
  if (!isEmailConfigured() || !transporter) {
    console.log('📧 Email not configured - would send verification email to:', email)
    console.log('🔗 Verification token:', token)
    console.log('👤 Username:', username)
    
    // For development, just log the verification URL
    const verificationUrl = `${process.env.NEXTAUTH_URL}/auth/verify-email?token=${token}`
    console.log('🔗 Verification URL:', verificationUrl)
    
    return true
  }

  const verificationUrl = `${process.env.NEXTAUTH_URL}/auth/verify-email?token=${token}`
  
  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: 'Verify Your Email - Group TrackEm',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Group TrackEm!</h1>
          </div>
          <div class="content">
            <h2>Hi ${username}!</h2>
            <p>Thank you for registering with Group TrackEm. To complete your registration and verify that this email address belongs to you, please click the button below:</p>
            
            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #e5e7eb; padding: 10px; border-radius: 4px;">${verificationUrl}</p>
            
            <p><strong>This verification link will expire in 24 hours.</strong></p>
            
            <p>If you didn't create an account with us, please ignore this email.</p>
            
            <p>Best regards,<br>The Group TrackEm Team</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply to this message.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  try {
    await transporter.sendMail(mailOptions)
    console.log('✅ Verification email sent to:', email)
    return true
  } catch (error) {
    console.error('❌ Error sending verification email:', error)
    throw new Error('Failed to send verification email')
  }
}

export async function sendGroupInviteEmail(email, groupName, inviterName, token, isAdmin = false) {
  if (!isEmailConfigured() || !transporter) {
    console.log('📧 Email not configured - would send group invite to:', email)
    console.log('🔗 Invite token:', token)
    console.log('👥 Group:', groupName)
    console.log('👤 Inviter:', inviterName)
    
    // For development, just log the invite URL
    const inviteUrl = `${process.env.NEXTAUTH_URL}/invite/${token}`
    console.log('🔗 Invite URL:', inviteUrl)
    
    return true
  }

  const inviteUrl = `${process.env.NEXTAUTH_URL}/invite/${token}`
  const roleText = isAdmin ? 'as an admin' : 'as a member'
  
  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: `You're invited to join "${groupName}" - Group TrackEm`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Group Invitation</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f0fdf4; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
          .group-info { background: #e5f7f0; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 You're Invited!</h1>
          </div>
          <div class="content">
            <h2>Hi there!</h2>
            <p><strong>${inviterName}</strong> has invited you to join their group on Group TrackEm!</p>
            
            <div class="group-info">
              <h3>📋 Group: "${groupName}"</h3>
              <p><strong>Role:</strong> You've been invited ${roleText}</p>
              <p><strong>Invited by:</strong> ${inviterName}</p>
            </div>

            <p>Group TrackEm helps teams collaborate and track contributions together. You'll be able to:</p>
            <ul>
              <li>🤝 Collaborate with your team members</li>
              <li>📊 Track activities and contributions</li>
              <li>💰 Record both time and money contributions</li>
              <li>📈 View progress and statistics</li>
              ${isAdmin ? '<li>👑 Manage group activities and members (as admin)</li>' : ''}
            </ul>
            
            <div style="text-align: center;">
              <a href="${inviteUrl}" class="button">Accept Invitation</a>
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #e5e7eb; padding: 10px; border-radius: 4px;">${inviteUrl}</p>
            
            <p><strong>This invitation will expire in 7 days.</strong></p>
            <p><em>If you don't have an account yet, you'll be able to create one when you accept the invitation.</em></p>
            
            <p>If you didn't expect this invitation, please ignore this email.</p>
            
            <p>Best regards,<br>The Group TrackEm Team</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply to this message.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  try {
    await transporter.sendMail(mailOptions)
    console.log('✅ Group invitation email sent to:', email)
    return true
  } catch (error) {
    console.error('❌ Error sending group invitation email:', error)
    throw new Error('Failed to send group invitation email')
  }
}

export async function sendWelcomeEmail(email, username) {
  if (!isEmailConfigured() || !transporter) {
    console.log('📧 Email not configured - would send welcome email to:', email)
    return true
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: 'Welcome to Group TrackEm!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome!</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f0fdf4; padding: 30px; border-radius: 0 0 8px 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome Aboard!</h1>
          </div>
          <div class="content">
            <h2>Hi ${username}!</h2>
            <p>Your email has been successfully verified and your account is now active!</p>
            
            <p>You can now:</p>
            <ul>
              <li>Create and join groups</li>
              <li>Track activities and contributions</li>
              <li>Collaborate with your team</li>
              <li>Monitor progress in real-time</li>
            </ul>
            
            <p><a href="${process.env.NEXTAUTH_URL}/dashboard" style="color: #3b82f6;">Start exploring your dashboard →</a></p>
            
            <p>If you have any questions, feel free to reach out to our support team.</p>
            
            <p>Happy tracking!<br>The Group TrackEm Team</p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  try {
    await transporter.sendMail(mailOptions)
    console.log('✅ Welcome email sent to:', email)
  } catch (error) {
    console.error('❌ Error sending welcome email:', error)
  }
}
import nodemailer from 'nodemailer';
import logger from '../middleware/logger.js';

// Create transporter
const createTransporter = () => {
  // nodemailer exposes createTransport (not createTransporter)
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

// Send email
export const sendEmail = async (options) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.SMTP_FROM,
      to: options.email,
      subject: options.subject,
      html: options.html,
      text: options.text
    };

    const info = await transporter.sendMail(mailOptions);
    
    logger.info(`Email sent to ${options.email}: ${info.messageId}`);
    
    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    logger.error(`Failed to send email to ${options.email}:`, error);
    
    return {
      success: false,
      error: error.message
    };
  }
};

// Email templates
export const emailTemplates = {
  welcome: (user) => ({
    subject: 'Welcome to Zanira BuildLink!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Zanira BuildLink!</h1>
            <p>Your construction service platform</p>
          </div>
          <div class="content">
            <h2>Hello ${user.firstName} ${user.lastName},</h2>
            <p>Welcome to Zanira BuildLink! We're excited to have you on board.</p>
            <p>Your account has been successfully created as a <strong>${user.role}</strong>.</p>
            
            ${user.role === 'fundi' ? `
            <p>To start receiving job opportunities, please complete your verification by uploading the required documents in your profile.</p>
            ` : ''}
            
            ${user.role === 'client' ? `
            <p>You can now book certified plumbers and electricians for your construction needs.</p>
            ` : ''}
            
            <p>If you have any questions, feel free to contact our support team.</p>
            
            <a href="${process.env.FRONTEND_URL}/dashboard" class="button">Go to Dashboard</a>
            
            <p>Best regards,<br>The Zanira BuildLink Team</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Zanira BuildLink. All rights reserved.</p>
            <p>Nairobi, Kenya</p>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  verification: (user, verificationToken) => ({
    subject: 'Verify Your Email Address - Zanira BuildLink',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .code { font-size: 32px; font-weight: bold; text-align: center; letter-spacing: 5px; margin: 20px 0; color: #667eea; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Verify Your Email</h1>
          </div>
          <div class="content">
            <h2>Hello ${user.firstName},</h2>
            <p>Please verify your email address to complete your Zanira BuildLink registration.</p>
            
            <div class="code">${verificationToken}</div>
            
            <p>Enter this code on the verification page, or click the button below:</p>
            
            <a href="${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}" class="button">Verify Email Address</a>
            
            <p>This code will expire in 1 hour.</p>
            
            <p>If you didn't create an account with Zanira BuildLink, please ignore this email.</p>
            
            <p>Best regards,<br>The Zanira BuildLink Team</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Zanira BuildLink. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  passwordReset: (user, resetToken) => ({
    subject: 'Reset Your Password - Zanira BuildLink',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset</h1>
          </div>
          <div class="content">
            <h2>Hello ${user.firstName},</h2>
            <p>You requested to reset your password for your Zanira BuildLink account.</p>
            
            <p>Click the button below to reset your password:</p>
            
            <a href="${process.env.FRONTEND_URL}/reset-password?token=${resetToken}" class="button">Reset Password</a>
            
            <p>This link will expire in 10 minutes.</p>
            
            <p>If you didn't request this reset, please ignore this email and your password will remain unchanged.</p>
            
            <p>Best regards,<br>The Zanira BuildLink Team</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Zanira BuildLink. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  twoFactorSetup: (user, qrCode, secret) => ({
    subject: 'Set Up Two-Factor Authentication - Zanira BuildLink',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .qr-code { text-align: center; margin: 20px 0; }
          .backup-code { background: #f0f0f0; padding: 10px; border-radius: 5px; font-family: monospace; margin: 10px 0; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Two-Factor Authentication</h1>
          </div>
          <div class="content">
            <h2>Hello ${user.firstName},</h2>
            <p>You've enabled Two-Factor Authentication for your Zanira BuildLink account.</p>
            
            <p>Scan the QR code below with your authenticator app:</p>
            
            <div class="qr-code">
              <img src="${qrCode}" alt="QR Code for 2FA" style="max-width: 200px;">
            </div>
            
            <p>Or enter this secret key manually:</p>
            <div class="backup-code">${secret}</div>
            
            <p><strong>Important:</strong> Save this secret key in a secure place. You'll need it if you lose access to your authenticator app.</p>
            
            <p>Best regards,<br>The Zanira BuildLink Team</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Zanira BuildLink. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  })
};
// backend/src/services/emailTemplates.service.ts
export const getWelcomeEmailTemplate = (verificationLink: string, companyName: string) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f9fafb; padding: 40px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); padding: 40px; }
        .header { text-align: center; margin-bottom: 32px; }
        .logo { color: #3b82f6; font-size: 28px; font-weight: 700; margin-bottom: 16px; }
        .welcome-text { font-size: 20px; color: #111827; margin-bottom: 24px; text-align: center; }
        .button { background-color: #3b82f6; color: white; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block; margin: 20px 0; }
        .secondary-button { background-color: #10b981; color: white; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block; margin: 20px 0; }
        .text-center { text-align: center; }
        .spacer { margin: 24px 0; }
        .footer { margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">HIRALENT</div>
          <h1 style="color: #111827; margin-bottom: 8px;">Welcome to Hiralent! 🎉</h1>
        </div>
        
        <p>Dear ${companyName},</p>
        
        <p>Welcome to Hiralent - your partner in finding exceptional talent! We're thrilled to have you on board.</p>
        
        <p class="welcome-text">Let's get your account verified and start building your dream team!</p>
        
        <div class="text-center">
          <a href="${verificationLink}" class="button">Verify Your Email Address</a>
        </div>
        
        <div class="spacer"></div>
        
        <p>Once verified, you'll be able to:</p>
        <ul>
          <li>Access your company dashboard</li>
          <li>Post job listings</li>
          <li>Manage applications</li>
          <li>Track hiring analytics</li>
        </ul>
        
        <p>If you have any questions, our support team is here to help.</p>
        
        <div class="footer">
          <p>Best regards,<br>The Hiralent Team</p>
          <p>&copy; ${new Date().getFullYear()} Hiralent. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const getInterviewAssignedEmailTemplate = (
  candidateName: string,
  jobTitle: string,
  companyName: string,
  scheduledDate: Date,
  interviewLink: string
) => {
  const formattedDate = scheduledDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = scheduledDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f9fafb; padding: 40px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); padding: 40px; }
        .header { text-align: center; margin-bottom: 32px; }
        .logo { color: #001F3F; font-size: 28px; font-weight: 700; margin-bottom: 16px; }
        .highlight-box { background: linear-gradient(135deg, #001F3F 0%, #003366 100%); color: white; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center; }
        .highlight-box h2 { margin: 0 0 8px 0; font-size: 18px; }
        .highlight-box .date { font-size: 24px; font-weight: 700; margin: 8px 0; }
        .highlight-box .time { font-size: 16px; opacity: 0.9; }
        .button { background-color: #001F3F; color: white; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block; margin: 20px 0; }
        .text-center { text-align: center; }
        .info-box { background: #f0f9ff; border: 1px solid #e0f2fe; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .tips-box { background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .footer { margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">HIRALENT</div>
          <h1 style="color: #111827; margin-bottom: 8px;">AI Interview Scheduled! </h1>
        </div>

        <p>Dear ${candidateName},</p>

        <p>Great news! <strong>${companyName}</strong> has scheduled an AI-powered interview for you for the <strong>${jobTitle}</strong> position.</p>

        <div class="highlight-box">
          <h2>Your Interview Details</h2>
          <div class="date">${formattedDate}</div>
          <div class="time">at ${formattedTime}</div>
        </div>

        <div class="info-box">
          <strong>What to expect:</strong>
          <ul style="margin: 12px 0 0 0; padding-left: 20px;">
            <li>The interview will be conducted by our AI interviewer</li>
            <li>You'll answer questions via voice (speech-to-text)</li>
            <li>Duration: approximately 15-20 minutes</li>
            <li>Questions will focus on your skills and experience</li>
          </ul>
        </div>

        <div class="text-center">
          <a href="${interviewLink}" class="button" style="color: white;">Go to Interview</a>
        </div>

        <div class="tips-box">
          <strong>Tips for success:</strong>
          <ul style="margin: 12px 0 0 0; padding-left: 20px;">
            <li>Find a quiet place with good internet</li>
            <li>Test your microphone beforehand</li>
            <li>Speak clearly and at a moderate pace</li>
            <li>Take a moment to think before answering</li>
          </ul>
        </div>

        <p>If you have any questions or need to reschedule, please contact the recruiter directly.</p>

        <div class="footer">
          <p>Good luck! 🍀<br>The Hiralent Team</p>
          <p>&copy; ${new Date().getFullYear()} Hiralent. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const getLegacyCheckEmailTemplate = (legacyCheckLink: string, companyName: string) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f9fafb; padding: 40px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); padding: 40px; }
        .header { text-align: center; margin-bottom: 32px; }
        .logo { color: #10b981; font-size: 28px; font-weight: 700; margin-bottom: 16px; }
        .welcome-text { font-size: 20px; color: #111827; margin-bottom: 24px; text-align: center; }
        .button { background-color: #10b981; color: white; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block; margin: 20px 0; }
        .text-center { text-align: center; }
        .spacer { margin: 24px 0; }
        .footer { margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px; }
        .info-box { background: #f0f9ff; border: 1px solid #e0f2fe; border-radius: 8px; padding: 20px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">HIRALENT</div>
          <h1 style="color: #111827; margin-bottom: 8px;">Verify Your Company Legacy 📋</h1>
        </div>
        
        <p>Dear ${companyName},</p>
        
        <p>As part of our commitment to maintaining a trusted platform, we verify company information to ensure authenticity.</p>
        
        <div class="info-box">
          <strong>Why we verify:</strong>
          <ul>
            <li>Build trust with candidates</li>
            <li>Ensure company authenticity</li>
            <li>Maintain platform quality</li>
            <li>Enable premium features</li>
          </ul>
        </div>
        
        <p class="welcome-text">Please upload your company documents for verification</p>
        
        <div class="text-center">
          <a href="${legacyCheckLink}" class="button">Upload Company Documents</a>
        </div>
        
        <div class="spacer"></div>
        
        <p><strong>Accepted Documents:</strong></p>
        <ul>
          <li>Business registration certificate</li>
          <li>Tax identification documents</li>
          <li>Company incorporation documents</li>
          <li>Other official business documents</li>
        </ul>
        
        <p>This process typically takes 1-2 business days.</p>
        
        <div class="footer">
          <p>Best regards,<br>The Hiralent Verification Team</p>
          <p>&copy; ${new Date().getFullYear()} Hiralent. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};
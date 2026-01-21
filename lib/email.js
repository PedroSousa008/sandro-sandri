/* ========================================
   Sandro Sandri - Email Service
   Uses Resend for sending emails
   ======================================== */

const { Resend } = require('resend');

let resend = null;

// Initialize Resend
function initEmail() {
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
        resend = new Resend(apiKey);
        console.log('✅ Email service initialized (Resend)');
        return true;
    } else {
        console.warn('⚠️ RESEND_API_KEY not set - email service unavailable');
        return false;
    }
}

// Send verification email
async function sendVerificationEmail(email, token) {
    if (!resend) {
        if (!initEmail()) {
            throw new Error('Email service not configured');
        }
    }

    const appUrl = process.env.APP_URL || process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : 'http://localhost:3000';
    
    const verifyUrl = `${appUrl}/verify-email.html?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;

    const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email - Sandro Sandri</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Arapey', 'Georgia', serif; background-color: #f5f5f0; color: #1a1a2e;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f0; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 4px; overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px 40px 30px; text-align: center; border-bottom: 1px solid #e5e5e5;">
                            <h1 style="margin: 0; font-family: 'Allura', cursive; font-size: 32px; color: #1a1a2e; font-weight: normal;">Sandro Sandri</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #1a1a2e;">
                                Thank you for joining Sandro Sandri.
                            </p>
                            <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #1a1a2e;">
                                Please confirm your email address to activate your account and begin your journey with us.
                            </p>
                            
                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="${verifyUrl}" style="display: inline-block; padding: 14px 32px; background-color: #1a1a2e; color: #ffffff; text-decoration: none; font-family: 'Montserrat', sans-serif; font-size: 14px; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; border-radius: 2px;">
                                            Confirm Email
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 30px 0 0; font-size: 14px; line-height: 1.6; color: #666;">
                                Or copy and paste this link into your browser:<br>
                                <a href="${verifyUrl}" style="color: #1a1a2e; word-break: break-all;">${verifyUrl}</a>
                            </p>
                            
                            <p style="margin: 30px 0 0; font-size: 12px; line-height: 1.6; color: #999;">
                                This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 40px; text-align: center; border-top: 1px solid #e5e5e5; background-color: #fafafa;">
                            <p style="margin: 0; font-size: 12px; color: #999;">
                                © 2026 Sandro Sandri. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `;

    try {
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'Sandro Sandri <noreply@sandrosandri.com>';
        
        const result = await resend.emails.send({
            from: fromEmail,
            to: email,
            subject: 'Verify Your Email - Sandro Sandri',
            html: emailHtml
        });

        console.log('✅ Verification email sent to:', email);
        return { success: true, messageId: result.id };
    } catch (error) {
        console.error('❌ Error sending verification email:', error);
        throw error;
    }
}

module.exports = {
    initEmail,
    sendVerificationEmail
};


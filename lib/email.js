/* ========================================
   Sandro Sandri - Email Service
   Uses Resend for sending emails
   ======================================== */

const { Resend } = require('resend');

let resend = null;

// Initialize Resend
function initEmail() {
    // Check multiple possible environment variable names
    const apiKey = process.env.RESEND_API_KEY || 
                   process.env.RESEND_API_KEY_PROD || 
                   process.env.RESEND_API_KEY_PREVIEW ||
                   process.env.RESEND_API_KEY_DEV;
    
    console.log('🔍 Initializing email service...');
    console.log('   RESEND_API_KEY exists:', !!process.env.RESEND_API_KEY);
    console.log('   RESEND_API_KEY length:', apiKey ? apiKey.length : 0);
    console.log('   RESEND_API_KEY starts with re_:', apiKey ? apiKey.startsWith('re_') : false);
    console.log('   RESEND_API_KEY first 10 chars:', apiKey ? apiKey.substring(0, 10) : 'N/A');
    console.log('   All env vars with RESEND:', Object.keys(process.env).filter(k => k.includes('RESEND')));
    
    if (!apiKey) {
        console.warn('⚠️ RESEND_API_KEY not set - email service unavailable');
        console.warn('   Please add RESEND_API_KEY to Vercel environment variables');
        console.warn('   Current environment:', process.env.NODE_ENV || 'unknown');
        console.warn('   VERCEL env:', process.env.VERCEL || 'not set');
        return false;
    }
    
    if (!apiKey.startsWith('re_')) {
        console.warn('⚠️ RESEND_API_KEY does not start with "re_" - may be invalid');
    }
    
    try {
        resend = new Resend(apiKey);
        console.log('✅ Email service initialized (Resend)');
        console.log('   Resend instance created:', !!resend);
        return true;
    } catch (error) {
        console.error('❌ Error initializing Resend:');
        console.error('   Error type:', error.constructor.name);
        console.error('   Error message:', error.message);
        console.error('   Error stack:', error.stack);
        return false;
    }
}

// Send verification email
async function sendVerificationEmail(email, token) {
    if (!resend) {
        const initialized = initEmail();
        if (!initialized) {
            const error = new Error('Email service not configured - RESEND_API_KEY is missing');
            error.name = 'EmailServiceError';
            error.code = 'MISSING_API_KEY';
            throw error;
        }
    }

    // Determine app URL
    let appUrl = process.env.APP_URL;
    
    if (!appUrl) {
        // Try Vercel URL
        if (process.env.VERCEL_URL) {
            appUrl = `https://${process.env.VERCEL_URL}`;
        } else if (process.env.VERCEL) {
            // In Vercel environment, construct from deployment URL
            appUrl = `https://${process.env.VERCEL_URL || 'localhost:3000'}`;
        } else {
            appUrl = 'http://localhost:3000';
        }
    }
    
    // Ensure URL doesn't have trailing slash
    appUrl = appUrl.replace(/\/$/, '');
    
    const verifyUrl = `${appUrl}/verify-email.html?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
    
    console.log('📧 Preparing to send verification email:');
    console.log('   To:', email);
    console.log('   App URL:', appUrl);
    console.log('   Verify URL:', verifyUrl);

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
        // Always use Resend's default verified domain for automatic operation
        // This ensures emails work immediately without domain verification
        // If you want to use a custom domain, set RESEND_FROM_EMAIL in Vercel
        let fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
        
        // If a custom email is set but fails, we'll automatically fall back to onboarding@resend.dev
        console.log('📧 Using from email:', fromEmail);
        
        console.log('📤 Sending email via Resend:');
        console.log('   From:', fromEmail);
        console.log('   To:', email);
        console.log('   Resend instance exists:', !!resend);
        console.log('   Email HTML length:', emailHtml.length, 'characters');
        
        if (!resend) {
            const errorMsg = 'Resend instance not initialized. Check RESEND_API_KEY environment variable.';
            console.error('❌', errorMsg);
            throw new Error(errorMsg);
        }
        
        console.log('📨 Calling resend.emails.send()...');
        console.log('   Request payload:', JSON.stringify({
            from: fromEmail,
            to: email,
            subject: 'Verify Your Email - Sandro Sandri',
            html: emailHtml ? `${emailHtml.length} chars` : 'missing'
        }, null, 2));
        
        let result;
        try {
            result = await resend.emails.send({
                from: fromEmail,
                to: email,
                subject: 'Verify Your Email - Sandro Sandri',
                html: emailHtml
            });
            console.log('📬 Resend API call completed');
        } catch (sendError) {
            console.error('❌ Exception thrown by resend.emails.send():');
            console.error('   Error type:', sendError.constructor.name);
            console.error('   Error message:', sendError.message);
            console.error('   Error stack:', sendError.stack);
            console.error('   Full error:', JSON.stringify(sendError, Object.getOwnPropertyNames(sendError), 2));
            
            // If domain error and not already using onboarding@resend.dev, retry with fallback
            if ((sendError.message && (sendError.message.includes('domain') || sendError.message.includes('verified'))) && 
                fromEmail !== 'onboarding@resend.dev') {
                console.log('🔄 Domain verification error detected. Retrying with onboarding@resend.dev...');
                fromEmail = 'onboarding@resend.dev';
                try {
                    result = await resend.emails.send({
                        from: fromEmail,
                        to: email,
                        subject: 'Verify Your Email - Sandro Sandri',
                        html: emailHtml
                    });
                    console.log('✅ Email sent successfully using fallback address:', fromEmail);
                } catch (retryError) {
                    console.error('❌ Retry also failed:', retryError.message);
                    throw retryError;
                }
            } else {
                throw sendError;
            }
        }

        console.log('📬 Resend API response received:');
        console.log('   Response type:', typeof result);
        console.log('   Is null/undefined:', result == null);
        if (result) {
            console.log('   Response keys:', Object.keys(result));
            console.log('   Full response:', JSON.stringify(result, null, 2));
            
            // Check for errors in response (Resend v3 returns errors in result.error)
            if (result.error) {
                console.error('❌ Resend API returned an error in response:');
                console.error('   Error type:', typeof result.error);
                console.error('   Error object:', JSON.stringify(result.error, null, 2));
                console.error('   Error keys:', result.error ? Object.keys(result.error) : 'none');
                
                const errorMsg = result.error?.message || result.error?.toString() || JSON.stringify(result.error);
                console.error('   Error message extracted:', errorMsg);
                
                // If domain error and not already using onboarding@resend.dev, retry with fallback
                if ((errorMsg.includes('domain') || errorMsg.includes('verified') || errorMsg.includes('unauthorized') || errorMsg.includes('invalid')) && 
                    fromEmail !== 'onboarding@resend.dev') {
                    console.log('🔄 Resend API error detected. Retrying with onboarding@resend.dev...');
                    fromEmail = 'onboarding@resend.dev';
                    try {
                        result = await resend.emails.send({
                            from: fromEmail,
                            to: email,
                            subject: 'Verify Your Email - Sandro Sandri',
                            html: emailHtml
                        });
                        console.log('✅ Email sent successfully using fallback address:', fromEmail);
                        
                        // Check again for errors after retry
                        if (result && result.error) {
                            const retryErrorMsg = result.error?.message || JSON.stringify(result.error);
                            throw new Error(`Resend API error: ${retryErrorMsg}`);
                        }
                    } catch (retryError) {
                        console.error('❌ Retry also failed:', retryError.message);
                        throw new Error(`Resend API error: ${errorMsg}`);
                    }
                } else {
                    // Throw the actual Resend API error
                    throw new Error(`Resend API error: ${errorMsg}`);
                }
            }
        } else {
            console.warn('⚠️ Resend API returned null/undefined response');
            throw new Error('Resend API returned an empty response');
        }
        
        // Resend v3 returns { data: { id: '...' } } on success
        // Or sometimes just { id: '...' }
        const messageId = result?.data?.id || result?.id;
        if (messageId) {
            console.log('✅ Verification email sent successfully!');
            console.log('   Message ID:', messageId);
            return { success: true, messageId: messageId };
        } else if (result && !result.error) {
            // No error but no ID - might still be successful
            console.warn('⚠️ Resend response does not contain message ID but no error either');
            console.warn('   Response:', JSON.stringify(result, null, 2));
            // Check Resend dashboard - email might have been sent
            return { success: true, messageId: null, warning: 'No message ID in response - check Resend dashboard' };
        } else {
            // Unexpected response format
            console.error('❌ Unexpected Resend response format:');
            console.error('   Response:', JSON.stringify(result, null, 2));
            throw new Error('Unexpected response from Resend API: ' + JSON.stringify(result));
        }
    } catch (error) {
        console.error('❌ Error sending verification email:');
        console.error('   Error name:', error.name);
        console.error('   Error code:', error.code);
        console.error('   Error message:', error.message);
        console.error('   Error stack:', error.stack);
        console.error('   Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
        
        // Check for specific error types
        if (error.code === 'MISSING_API_KEY' || error.message?.includes('RESEND_API_KEY is missing')) {
            throw new Error('Email service not configured - RESEND_API_KEY is missing. Please add it to Vercel environment variables.');
        }
        
        // Provide more helpful error messages
        if (error.message && (error.message.includes('domain') || error.message.includes('verified'))) {
            // If we've already tried onboarding@resend.dev and it still fails, provide helpful message
            throw new Error('Unable to send verification email. Please check your Resend API key configuration.');
        }
        
        // Re-throw the original error with a more user-friendly message if needed
        if (error.message && error.message.includes('RESEND_FROM_EMAIL')) {
            // Don't mention the deleted variable - it's working as intended
            throw new Error('Email service configuration issue. Please check your Resend API key.');
        }
        
        // Re-throw with original message for debugging
        throw error;
    }
}

module.exports = {
    initEmail,
    sendVerificationEmail
};


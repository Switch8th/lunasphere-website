const express = require('express');
const { body, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
const validator = require('validator');
const logger = require('../utils/logger');
const { sanitizeInput, xssProtection } = require('../middleware/security');

const router = express.Router();

// Email transporter setup
let transporter;

const createTransporter = () => {
    if (process.env.EMAIL_SERVICE === 'gmail') {
        transporter = nodemailer.createTransporter({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
    } else if (process.env.SMTP_HOST) {
        transporter = nodemailer.createTransporter({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    } else {
        // Development mode - log emails instead of sending
        transporter = nodemailer.createTransporter({
            streamTransport: true,
            newline: 'unix',
            buffer: true
        });
    }
};

// Initialize transporter
createTransporter();

// Validation rules
const contactValidation = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters')
        .matches(/^[a-zA-Z\s\-'\.]+$/)
        .withMessage('Name contains invalid characters'),
    
    body('email')
        .trim()
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail()
        .isLength({ max: 254 })
        .withMessage('Email address is too long'),
    
    body('phone')
        .optional()
        .trim()
        .matches(/^[\+]?[1-9][\d]{0,15}$/)
        .withMessage('Please provide a valid phone number'),
    
    body('service')
        .trim()
        .isIn(['web-development', 'mobile-app', 'digital-transformation', 'consultation', 'other'])
        .withMessage('Please select a valid service'),
    
    body('message')
        .trim()
        .isLength({ min: 10, max: 2000 })
        .withMessage('Message must be between 10 and 2000 characters')
];

// Contact form submission endpoint
router.post('/', sanitizeInput, xssProtection, contactValidation, async (req, res) => {
    try {
        // Check validation results
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.warn('Contact form validation failed', {
                errors: errors.array(),
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });
            
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array(),
                code: 'VALIDATION_ERROR'
            });
        }

        const { name, email, phone, service, message } = req.body;
        
        // Additional security checks
        if (containsSpam(message) || containsSpam(name)) {
            logger.security('Spam content detected in contact form', {
                name,
                email,
                ip: req.ip
            });
            
            return res.status(400).json({
                success: false,
                error: 'Message contains inappropriate content',
                code: 'SPAM_DETECTED'
            });
        }

        // Rate limiting check (additional to middleware)
        const submissionKey = `contact_${req.ip}_${email}`;
        if (await checkRecentSubmission(submissionKey)) {
            logger.warn('Duplicate contact form submission detected', {
                email,
                ip: req.ip
            });
            
            return res.status(429).json({
                success: false,
                error: 'Please wait before submitting another message',
                code: 'DUPLICATE_SUBMISSION'
            });
        }

        // Prepare email content
        const emailData = {
            from: {
                name: 'LunaSphere Contact Form',
                address: process.env.EMAIL_FROM || 'noreply@lunasphere.com'
            },
            to: process.env.EMAIL_TO || 'hello@lunasphere.com',
            subject: `New Contact Form Submission - ${service}`,
            html: generateEmailHTML(name, email, phone, service, message),
            text: generateEmailText(name, email, phone, service, message),
            replyTo: email
        };

        // Send email
        const info = await transporter.sendMail(emailData);
        
        // Log successful submission
        logger.business('Contact form submitted', {
            name,
            email: email.replace(/(.{2})(.*)(@.*)/, '$1***$3'), // Partially mask email
            service,
            messageLength: message.length,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            messageId: info.messageId
        });

        // Store submission to prevent duplicates
        await storeSubmission(submissionKey);

        // Send auto-reply to user
        if (process.env.SEND_AUTO_REPLY === 'true') {
            try {
                await sendAutoReply(email, name);
                logger.info('Auto-reply sent successfully', { email, name });
            } catch (autoReplyError) {
                logger.error('Failed to send auto-reply', {
                    error: autoReplyError.message,
                    email,
                    name
                });
            }
        }

        res.status(200).json({
            success: true,
            message: 'Thank you for your message! We will get back to you soon.',
            data: {
                submissionId: generateSubmissionId(),
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        logger.error('Contact form submission failed', {
            error: error.message,
            stack: error.stack,
            body: req.body,
            ip: req.ip
        });

        res.status(500).json({
            success: false,
            error: 'Failed to send message. Please try again later.',
            code: 'SUBMISSION_FAILED'
        });
    }
});

// Get contact form statistics (admin only)
router.get('/stats', async (req, res) => {
    try {
        // In a real application, you would check for admin authentication here
        const stats = await getContactStats();
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        logger.error('Failed to get contact stats', { error: error.message });
        
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve statistics'
        });
    }
});

// Helper functions
function containsSpam(text) {
    const spamPatterns = [
        /viagra|cialis|pharmacy/i,
        /make money|earn money|work from home/i,
        /bitcoin|cryptocurrency|investment opportunity/i,
        /click here|visit now|act now/i,
        /congratulations.*won|lottery.*winner/i,
        /nigerian prince|inheritance|beneficiary/i,
        /urgent.*reply|immediate.*action/i
    ];
    
    return spamPatterns.some(pattern => pattern.test(text));
}

async function checkRecentSubmission(key) {
    // In a real application, you would use Redis or a database
    // For now, we'll use a simple in-memory cache
    const recentSubmissions = global.recentSubmissions || new Map();
    
    if (recentSubmissions.has(key)) {
        const lastSubmission = recentSubmissions.get(key);
        const timeDiff = Date.now() - lastSubmission;
        return timeDiff < 60000; // 1 minute cooldown
    }
    
    return false;
}

async function storeSubmission(key) {
    const recentSubmissions = global.recentSubmissions || new Map();
    global.recentSubmissions = recentSubmissions;
    
    recentSubmissions.set(key, Date.now());
    
    // Clean up old entries
    setTimeout(() => {
        recentSubmissions.delete(key);
    }, 300000); // Clean up after 5 minutes
}

function generateSubmissionId() {
    return 'LUNA_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function generateEmailHTML(name, email, phone, service, message) {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #6C63FF 0%, #FF6B9D 100%); color: white; padding: 30px; text-align: center; }
                .content { padding: 30px; }
                .field { margin-bottom: 20px; }
                .label { font-weight: bold; color: #333; margin-bottom: 5px; }
                .value { color: #666; line-height: 1.6; }
                .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🌙 New Contact Form Submission</h1>
                    <p>LunaSphere Website</p>
                </div>
                <div class="content">
                    <div class="field">
                        <div class="label">Name:</div>
                        <div class="value">${validator.escape(name)}</div>
                    </div>
                    <div class="field">
                        <div class="label">Email:</div>
                        <div class="value">${validator.escape(email)}</div>
                    </div>
                    <div class="field">
                        <div class="label">Phone:</div>
                        <div class="value">${phone ? validator.escape(phone) : 'Not provided'}</div>
                    </div>
                    <div class="field">
                        <div class="label">Service:</div>
                        <div class="value">${validator.escape(service)}</div>
                    </div>
                    <div class="field">
                        <div class="label">Message:</div>
                        <div class="value">${validator.escape(message).replace(/\n/g, '<br>')}</div>
                    </div>
                </div>
                <div class="footer">
                    <p>Submitted on ${new Date().toLocaleString()}</p>
                    <p>This message was sent from the LunaSphere contact form</p>
                </div>
            </div>
        </body>
        </html>
    `;
}

function generateEmailText(name, email, phone, service, message) {
    return `
New Contact Form Submission - LunaSphere

Name: ${name}
Email: ${email}
Phone: ${phone || 'Not provided'}
Service: ${service}
Message: ${message}

Submitted on: ${new Date().toLocaleString()}
    `.trim();
}

async function sendAutoReply(email, name) {
    const autoReplyData = {
        from: {
            name: 'LunaSphere Team',
            address: process.env.EMAIL_FROM || 'hello@lunasphere.com'
        },
        to: email,
        subject: 'Thank you for contacting LunaSphere',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
                    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                    .header { background: linear-gradient(135deg, #6C63FF 0%, #FF6B9D 100%); color: white; padding: 30px; text-align: center; }
                    .content { padding: 30px; line-height: 1.6; color: #333; }
                    .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🌙 Thank You!</h1>
                        <p>LunaSphere</p>
                    </div>
                    <div class="content">
                        <p>Hi ${validator.escape(name)},</p>
                        <p>Thank you for reaching out to LunaSphere! We've received your message and will get back to you within 24 hours.</p>
                        <p>Our team is excited to learn more about your project and discuss how we can help bring your digital vision to life.</p>
                        <p>In the meantime, feel free to explore our portfolio and learn more about our services on our website.</p>
                        <p>Best regards,<br>The LunaSphere Team</p>
                    </div>
                    <div class="footer">
                        <p>LunaSphere - Digital Innovation Beyond Boundaries</p>
                        <p>This is an automated response. Please do not reply to this email.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
        text: `
Hi ${name},

Thank you for reaching out to LunaSphere! We've received your message and will get back to you within 24 hours.

Our team is excited to learn more about your project and discuss how we can help bring your digital vision to life.

In the meantime, feel free to explore our portfolio and learn more about our services on our website.

Best regards,
The LunaSphere Team

--
LunaSphere - Digital Innovation Beyond Boundaries
This is an automated response. Please do not reply to this email.
        `.trim()
    };

    await transporter.sendMail(autoReplyData);
}

async function getContactStats() {
    // In a real application, you would query your database
    // For now, return mock data
    return {
        totalSubmissions: 42,
        submissionsThisMonth: 8,
        averageResponseTime: '2.5 hours',
        topServices: [
            { service: 'web-development', count: 18 },
            { service: 'digital-transformation', count: 12 },
            { service: 'mobile-app', count: 8 },
            { service: 'consultation', count: 4 }
        ]
    };
}

module.exports = router;
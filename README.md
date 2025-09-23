# 🌙 LunaSphere Website

**Professional Web Solutions & Digital Innovation**

A modern, secure, and fully-featured website built with HTML, CSS, JavaScript, and Node.js. This project showcases a professional digital agency website with advanced security features, automated backend processes, and a beautiful responsive design.

![LunaSphere](https://img.shields.io/badge/LunaSphere-1.0.0-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

## ✨ Features

### Frontend
- 📱 **Responsive Design** - Works perfectly on all devices
- 🎨 **Modern UI/UX** - Beautiful animations and interactions
- ⚡ **Performance Optimized** - Fast loading and smooth animations
- 🔍 **SEO Friendly** - Optimized for search engines
- ♿ **Accessible** - WCAG compliant
- 🌟 **Interactive Elements** - Particle systems, smooth scrolling, form validation

### Backend
- 🛡️ **Enterprise Security** - CSRF, XSS, SQL injection protection
- 📧 **Automated Email System** - Contact forms with auto-replies
- 📊 **Comprehensive Logging** - Winston-based logging system
- 🚦 **Rate Limiting** - Advanced rate limiting and DDoS protection
- 🔧 **Health Monitoring** - Built-in health checks
- 📈 **Performance Monitoring** - Request tracking and analytics

### Security Features
- 🔒 **Helmet.js** - Security headers
- 🛡️ **CORS Protection** - Cross-origin request security
- 🚨 **Input Validation** - Comprehensive input sanitization
- 🔐 **Session Security** - Secure session management
- 📝 **Request Logging** - Detailed security logging
- 🚫 **Brute Force Protection** - IP-based blocking

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** (v8 or higher)
- **Git**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/lunasphere/website.git
   cd lunasphere-website
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run setup script**
   ```bash
   npm run setup
   ```

4. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   ```
   http://localhost:3000
   ```

## 📁 Project Structure

```
lunasphere-website/
├── 📂 assets/           # Static assets (images, fonts)
├── 📂 css/              # Stylesheets
├── 📂 js/               # Frontend JavaScript
├── 📂 server/           # Backend application
│   ├── 📂 middleware/   # Express middleware
│   ├── 📂 routes/       # API routes
│   ├── 📂 utils/        # Utilities and helpers
│   └── 📂 logs/         # Application logs
├── 📂 scripts/          # Setup and deployment scripts
├── 📂 public/           # Public static files
├── 📄 index.html        # Main HTML file
├── 📄 package.json      # Dependencies and scripts
└── 📄 .env.example      # Environment template
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Server Configuration
NODE_ENV=development
PORT=3000
SESSION_SECRET=your-super-secret-session-key-here

# Email Configuration
EMAIL_SERVICE=gmail
EMAIL_FROM=hello@lunasphere.com
EMAIL_TO=hello@lunasphere.com
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-app-password

# Email Features
SEND_AUTO_REPLY=true

# Logging
LOG_LEVEL=info
```

### Email Setup

#### Option 1: Gmail
1. Enable 2-factor authentication on your Google account
2. Generate an App Password
3. Use your Gmail address and App Password in the `.env` file

#### Option 2: SMTP
```bash
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
```

## 📝 Available Scripts

```bash
# Development
npm run dev          # Start development server with auto-reload
npm start           # Start production server

# Building
npm run build       # Build optimized assets
npm run build:css   # Build and minify CSS
npm run build:js    # Build and minify JavaScript

# Testing
npm test            # Run tests
npm run test:watch  # Run tests in watch mode

# Code Quality
npm run lint        # Lint JavaScript files
npm run lint:fix    # Fix linting issues automatically

# Security
npm run security    # Run security audit

# Deployment
npm run deploy      # Deploy to production
```

## 🛡️ Security Features

### Headers Security
- **Content Security Policy (CSP)**
- **X-Frame-Options**
- **X-Content-Type-Options**
- **Referrer-Policy**
- **Permissions-Policy**

### Input Protection
- **XSS Protection** - Sanitizes HTML input
- **SQL Injection Protection** - Validates and sanitizes queries
- **CSRF Protection** - Token-based protection
- **Rate Limiting** - IP-based request limiting

### Logging & Monitoring
- **Security Event Logging** - Tracks suspicious activity
- **Error Tracking** - Comprehensive error logging
- **Performance Monitoring** - Request timing and metrics
- **Health Checks** - System status monitoring

## 📧 Contact Form

The contact form includes:
- ✅ **Real-time Validation** - Client and server-side
- 🚫 **Spam Protection** - Content filtering
- 📨 **Email Delivery** - Automatic email sending
- 🔄 **Auto-replies** - Confirmation emails
- 📊 **Analytics** - Submission tracking

### API Endpoints

```bash
POST /api/contact     # Submit contact form
GET  /api/contact/stats  # Get submission statistics (admin)
GET  /health          # Basic health check
GET  /health/detailed # Detailed system information
```

## 🎨 Customization

### Styling
- Modify `css/styles.css` for main styles
- Update CSS custom properties in `:root` for theme changes
- Add animations in `css/animations.css`

### JavaScript
- Main functionality: `js/main.js`
- Animations: `js/animations.js`
- Form handling: `js/forms.js`

### Content
- Update `index.html` for content changes
- Replace placeholder images in `assets/images/`
- Modify company information and contact details

## 📊 Monitoring & Logs

### Log Files (in `server/logs/`)
- `combined-YYYY-MM-DD.log` - All application logs
- `error-YYYY-MM-DD.log` - Error logs only
- `security-YYYY-MM-DD.log` - Security-related events
- `access-YYYY-MM-DD.log` - HTTP request logs

### Health Monitoring
```bash
curl http://localhost:3000/health          # Basic status
curl http://localhost:3000/health/detailed # System metrics
```

## 🚀 Deployment

### Development
```bash
npm run dev
```

### Production

1. **Build assets**
   ```bash
   npm run build
   ```

2. **Set environment**
   ```bash
   export NODE_ENV=production
   ```

3. **Start server**
   ```bash
   npm start
   ```

### Using PM2 (Recommended)
```bash
npm install -g pm2
pm2 start server/app.js --name "lunasphere"
pm2 startup
pm2 save
```

## 🔧 Troubleshooting

### Common Issues

**Port already in use**
```bash
lsof -ti:3000 | xargs kill -9
```

**Email not sending**
- Check Gmail App Password setup
- Verify SMTP credentials
- Check firewall settings

**CSS/JS not loading**
```bash
npm run build
```

**Permission denied**
```bash
chmod +x scripts/setup.js
```

## 📚 API Documentation

### Contact Form API

**Submit Contact Form**
```http
POST /api/contact
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "service": "web-development",
  "message": "Hello, I need a website..."
}
```

**Response**
```json
{
  "success": true,
  "message": "Thank you for your message! We will get back to you soon.",
  "data": {
    "submissionId": "LUNA_abc123",
    "timestamp": "2025-01-01T00:00:00.000Z"
  }
}
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or need help:

1. Check the [troubleshooting section](#-troubleshooting)
2. Review the logs in `server/logs/`
3. Open an issue on GitHub
4. Contact us at hello@lunasphere.com

## 🙏 Acknowledgments

- **Express.js** - Web framework
- **Winston** - Logging library
- **Helmet.js** - Security middleware
- **Nodemailer** - Email functionality
- **Google Fonts** - Typography

---

**Made with 🌙 and ❤️ by the LunaSphere Team**

> Digital Innovation Beyond Boundaries
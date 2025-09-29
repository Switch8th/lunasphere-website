# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Development Commands

### Setup and Installation
```bash
# Initial setup (copies .env.example, creates directories, builds assets)
npm run setup

# Install dependencies
npm install

# Copy environment template and edit with your settings
cp .env.example .env
```

### Development
```bash
# Start development server with auto-reload
npm run dev

# Start production server
npm start
```

### Building and Optimization
```bash
# Build all assets (CSS + JS)
npm run build

# Build CSS only (PostCSS with autoprefixer and cssnano)
npm run build:css

# Build JavaScript only (Terser for minification)
npm run build:js
```

### Testing and Quality
```bash
# Run Jest tests
npm test

# Run tests in watch mode
npm run test:watch

# Run ESLint
npm run lint

# Fix linting issues automatically
npm run lint:fix

# Run security audit (npm audit + snyk test)
npm run security
```

### Production Management
```bash
# Deploy (build assets + restart PM2)
npm run deploy

# PM2 process management
npm run logs      # View logs
npm run monitor   # Open PM2 monit
npm run stop      # Stop server
npm run restart   # Restart server
npm run status    # Check server status
```

### Health Monitoring
```bash
# Check server health
curl http://localhost:3000/health

# Detailed system information
curl http://localhost:3000/health/detailed

# View application logs (located in server/logs/)
# - combined-YYYY-MM-DD.log (all logs)
# - error-YYYY-MM-DD.log (errors only)
# - security-YYYY-MM-DD.log (security events)
# - access-YYYY-MM-DD.log (HTTP requests)
```

### Common Development Tasks

#### Running a Single Test
```bash
# Run specific test file
npx jest path/to/test.js

# Run tests matching pattern
npx jest --testNamePattern="specific test"
```

#### Kill Process on Port (Windows)
```powershell
# Find and kill process using port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

## Code Architecture

### High-Level Structure
This is a **full-stack Node.js web application** with a traditional MPA (Multi-Page Application) frontend and Express.js backend, designed as a professional digital agency website with enterprise-grade security features.

### Backend Architecture (Express.js)
The server follows a **layered middleware architecture** with comprehensive security measures:

**Core Components:**
- **Entry Point**: `server/app.js` - Main application file with middleware stack
- **Routes**: Modular route handlers in `server/routes/`
- **Middleware**: Security, validation, and utility middleware in `server/middleware/`
- **Utilities**: Logging and helper functions in `server/utils/`

**Security Layer:**
The application implements **defense-in-depth** security:
- **Headers**: Helmet.js with CSP, HSTS, frame options
- **Input Protection**: XSS sanitization, SQL injection prevention, input validation
- **Rate Limiting**: IP-based rate limiting for API endpoints
- **CSRF Protection**: Token-based CSRF protection for forms
- **Brute Force Protection**: Automatic IP blocking for repeated failed attempts
- **File Upload Security**: MIME type validation, size limits, filename sanitization

**Middleware Pipeline:**
1. Security headers (Helmet.js)
2. CORS configuration with origin validation
3. Body parsing with size limits
4. Session management with secure cookies
5. Custom security middleware (XSS, SQL injection protection)
6. Rate limiting (different limits for API vs contact endpoints)
7. Static file serving with caching
8. Route handlers
9. Error handling

### Frontend Architecture (Vanilla JavaScript)
The frontend is a **component-based vanilla JavaScript application** with modern UX patterns:

**Core Structure:**
- **Main Controller**: `js/main.js` - Initializes all functionality
- **Specialized Modules**: `js/animations.js`, `js/forms.js` for specific features
- **Styling**: Modular CSS with `css/styles.css` and `css/animations.css`

**Key Frontend Patterns:**
- **Observer Pattern**: Intersection Observer for scroll animations and lazy loading
- **Event-Driven**: Comprehensive event handling for navigation, forms, and interactions
- **Progressive Enhancement**: Works without JavaScript, enhanced with it
- **Accessibility First**: ARIA labels, keyboard navigation, focus management
- **Performance Optimized**: Debounced/throttled event handlers, lazy loading

### Email System Architecture
**Transporter Strategy Pattern**: Supports multiple email providers (Gmail, SMTP, development logging)
- **Production**: Nodemailer with Gmail or custom SMTP
- **Development**: Stream transport for email logging
- **Features**: Auto-replies, HTML/text templates, spam detection
- **Security**: Input validation, rate limiting, duplicate submission prevention

### Build System
**Asset Pipeline**: PostCSS and Terser for optimization
- **CSS Processing**: Autoprefixer for browser compatibility, cssnano for minification
- **JavaScript Processing**: Terser for compression and mangling
- **Development**: Nodemon for auto-reload, ESLint for code quality
- **Testing**: Jest with coverage reporting

### Environment Configuration
**Multi-Environment Setup**: Different configs for development/production
- **Environment Variables**: Centralized in `.env` file
- **Security**: Separate configs for session secrets, email credentials
- **Features**: Conditional features (auto-reply, logging levels)

### Logging and Monitoring
**Winston-based Logging**: Structured logging with multiple transports
- **Log Files**: Daily rotation with different log levels
- **Categories**: Combined, error, security, and access logs
- **Integration**: HTTP request logging via Morgan
- **Health Checks**: Basic and detailed system health endpoints

### Key Integration Points
When modifying this codebase:
1. **Security First**: All user input goes through validation and sanitization middleware
2. **Logging**: All significant events are logged with appropriate context
3. **Error Handling**: Centralized error handling with user-friendly messages
4. **Performance**: Static files are served with appropriate caching headers
5. **Accessibility**: All interactive elements have keyboard support and ARIA labels

### API Endpoints
- `POST /api/contact` - Contact form submission with validation and email sending
- `GET /api/contact/stats` - Contact form statistics (admin feature)
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed system metrics

### Development Notes
- **Database**: Currently uses in-memory storage for rate limiting and submissions (implement Redis/MongoDB for production)
- **PM2 Ready**: Configured for production deployment with PM2 process manager
- **SSL Ready**: HTTPS configuration ready (update CORS origins and session cookies)
- **Testing**: Jest configured with coverage reporting for server-side code
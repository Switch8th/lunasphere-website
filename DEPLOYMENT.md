# 🚀 LunaSphere Website Deployment Guide

This guide will help you deploy your updated LunaSphere website with all the new features to https://www.lunasphere.top.

## ✨ New Features Being Deployed

- 🔐 **Complete Admin Panel** with authentication system
- 👥 **User Management System** with role-based access control
- 📊 **Real-time Analytics Dashboard** with visitor tracking
- 🛡️ **Enhanced Security** with rate limiting and input validation
- 📧 **Contact Form Integration** with email notifications
- 🔧 **API Endpoints** for all admin functionality
- 📱 **Responsive Design** optimized for all devices

## 📋 Prerequisites

- Node.js 18+ installed on your server
- PM2 or similar process manager (recommended)
- SSL certificate configured (for HTTPS)
- Domain pointing to your server
- Access to your web server/hosting provider

## 📦 Deployment Files

The key files for deployment are:

- `production-server.js` - Production-optimized server
- `package-production.json` - Production dependencies
- `.env.production` - Environment configuration
- All existing frontend files (HTML, CSS, JS, assets)

## 🔧 Deployment Steps

### Step 1: Prepare Your Server

1. **Connect to your server** (via SSH, FTP, or hosting panel)

2. **Create deployment directory**:
   ```bash
   mkdir -p /var/www/lunasphere-website
   cd /var/www/lunasphere-website
   ```

3. **Install Node.js and PM2** (if not already installed):
   ```bash
   # On Ubuntu/Debian
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PM2 globally
   npm install -g pm2
   ```

### Step 2: Upload Files

Upload all these files to your server:

**Required Files:**
- `production-server.js`
- `package-production.json` (rename to `package.json` on server)
- `.env.production` (rename to `.env` on server)
- `index.html`
- `public/` directory (all contents)
- `css/` directory (all contents)
- `js/` directory (all contents)
- `assets/` directory (all contents)

**Directory Structure on Server:**
```
/var/www/lunasphere-website/
├── production-server.js
├── package.json
├── .env
├── index.html
├── public/
├── css/
├── js/
├── assets/
└── logs/ (will be created)
```

### Step 3: Install Dependencies

```bash
cd /var/www/lunasphere-website
npm install --production
```

### Step 4: Configure Environment

1. **Edit the `.env` file** with your production settings:
   ```bash
   nano .env
   ```

2. **Update these critical settings**:
   ```env
   NODE_ENV=production
   PORT=3000
   ADMIN_USERNAME=your-admin-username
   ADMIN_PASSWORD=your-secure-admin-password
   SESSION_SECRET=your-super-secure-session-secret-change-this
   EMAIL_FROM=hello@lunasphere.top
   EMAIL_TO=admin@lunasphere.top
   ```

### Step 5: Start the Application

**Option 1: Using PM2 (Recommended)**
```bash
pm2 start production-server.js --name lunasphere-website --env production
pm2 save
pm2 startup
```

**Option 2: Direct Node.js**
```bash
NODE_ENV=production node production-server.js
```

**Option 3: Using systemd service**
```bash
# Create service file
sudo nano /etc/systemd/system/lunasphere.service

# Add this content:
[Unit]
Description=LunaSphere Website
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/lunasphere-website
ExecStart=/usr/bin/node production-server.js
Restart=always
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target

# Enable and start service
sudo systemctl enable lunasphere
sudo systemctl start lunasphere
```

### Step 6: Configure Web Server (Nginx/Apache)

**For Nginx:**
```nginx
server {
    listen 80;
    listen 443 ssl;
    server_name lunasphere.top www.lunasphere.top;

    # SSL configuration
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;

    # Redirect HTTP to HTTPS
    if ($scheme != "https") {
        return 301 https://$server_name$request_uri;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
```

**For Apache:**
```apache
<VirtualHost *:443>
    ServerName www.lunasphere.top
    ServerAlias lunasphere.top
    
    SSLEngine on
    SSLCertificateFile /path/to/your/certificate.crt
    SSLCertificateKeyFile /path/to/your/private.key
    
    ProxyPreserveHost On
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/
    
    # Security headers
    Header always set X-Frame-Options "DENY"
    Header always set X-XSS-Protection "1; mode=block"
    Header always set X-Content-Type-Options "nosniff"
</VirtualHost>

<VirtualHost *:80>
    ServerName www.lunasphere.top
    ServerAlias lunasphere.top
    Redirect permanent / https://www.lunasphere.top/
</VirtualHost>
```

### Step 7: Test Deployment

1. **Check if the service is running**:
   ```bash
   pm2 status
   # or
   sudo systemctl status lunasphere
   ```

2. **Test locally**:
   ```bash
   curl http://localhost:3000/health
   ```

3. **Test externally**:
   ```bash
   curl https://www.lunasphere.top/health
   ```

4. **Check admin login**:
   - Visit https://www.lunasphere.top
   - Click "Login"
   - Use your admin credentials
   - Verify admin panel loads correctly

## 🔒 Security Checklist

- [ ] Change default admin password
- [ ] Update SESSION_SECRET in .env
- [ ] Configure firewall to only allow necessary ports
- [ ] Enable SSL/HTTPS
- [ ] Review rate limiting settings
- [ ] Set up regular backups
- [ ] Configure log rotation
- [ ] Set up monitoring/alerts

## 📊 Admin Panel Features

After deployment, you'll have access to:

- **User Management**: Create, edit, and manage user roles
- **Analytics Dashboard**: Real-time visitor and traffic statistics
- **Role-Based Access Control**: Super Admin, Admin, Developer, Member, Customer, User roles
- **Contact Form Management**: Handle and respond to contact submissions
- **Service Upload**: Add new services and portfolios
- **Visitor Tracking**: Monitor site usage and user behavior

## 🔐 Default Admin Credentials

**Username**: `admin`
**Password**: `lunasphere2025!`

⚠️ **IMPORTANT**: Change these credentials immediately after deployment!

## 🛠️ Maintenance Commands

```bash
# View logs
pm2 logs lunasphere-website

# Restart application
pm2 restart lunasphere-website

# Stop application
pm2 stop lunasphere-website

# Monitor application
pm2 monit

# Update application (after uploading new files)
pm2 restart lunasphere-website --update-env
```

## 🆘 Troubleshooting

**If the site doesn't load:**
1. Check if Node.js process is running
2. Verify firewall settings
3. Check web server configuration
4. Review application logs
5. Test direct access to Node.js app

**If admin login doesn't work:**
1. Check environment variables
2. Verify API endpoints are accessible
3. Check browser console for errors
4. Review server logs

**Common Issues:**
- Port conflicts (change PORT in .env)
- Permission issues (check file ownership)
- SSL certificate problems (verify certificate paths)
- Database connection issues (if using external DB)

## 📞 Support

For deployment support or issues:
- Check server logs: `pm2 logs lunasphere-website`
- Review system logs: `journalctl -u lunasphere`
- Monitor resource usage: `pm2 monit`

## 🎉 Post-Deployment

After successful deployment:
1. Update DNS if needed
2. Test all functionality
3. Set up monitoring
4. Configure backups
5. Update documentation
6. Notify stakeholders

Your LunaSphere website is now live with all the enhanced features! 🌙✨
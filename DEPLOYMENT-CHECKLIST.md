# 📋 LunaSphere Deployment Checklist

## 🎯 Pre-Deployment Checklist

- [ ] Local testing completed successfully
- [ ] All API endpoints working correctly
- [ ] Admin login functioning properly
- [ ] Analytics dashboard displays data
- [ ] User management system operational
- [ ] Contact form sending emails (if configured)
- [ ] All static assets loading correctly

## 📦 Files to Upload

### Core Server Files
- [ ] `production-server.js` ➜ Main server file
- [ ] `package-production.json` ➜ Rename to `package.json`
- [ ] `.env.production` ➜ Rename to `.env` and configure

### Frontend Files
- [ ] `index.html` ➜ Main HTML file
- [ ] `public/` directory ➜ All public assets
- [ ] `css/` directory ➜ Stylesheets
- [ ] `js/` directory ➜ JavaScript files  
- [ ] `assets/` directory ➜ Images and other assets

## 🔧 Server Setup

- [ ] Node.js 18+ installed
- [ ] PM2 installed globally (`npm install -g pm2`)
- [ ] Create deployment directory
- [ ] Set correct file permissions
- [ ] Configure firewall (allow port 80, 443, and your app port)

## 🌐 Environment Configuration

Critical settings to update in `.env`:
- [ ] `ADMIN_USERNAME` - Change from default
- [ ] `ADMIN_PASSWORD` - Set strong password  
- [ ] `SESSION_SECRET` - Generate secure secret
- [ ] `EMAIL_FROM` - Set to your domain email
- [ ] `EMAIL_TO` - Set admin email address
- [ ] `NODE_ENV=production`
- [ ] `PORT=3000` (or your preferred port)

## 🚀 Deployment Commands

```bash
# 1. Install dependencies
npm install --production

# 2. Start with PM2
pm2 start production-server.js --name lunasphere-website --env production

# 3. Save PM2 configuration
pm2 save

# 4. Setup PM2 startup
pm2 startup
```

## 🌐 Web Server Configuration

- [ ] Nginx or Apache configured as reverse proxy
- [ ] SSL certificate installed and configured
- [ ] HTTP to HTTPS redirect enabled
- [ ] Security headers configured
- [ ] Domain DNS pointing to server

## ✅ Testing

- [ ] Health check: `curl https://www.lunasphere.top/health`
- [ ] Website loads: Visit https://www.lunasphere.top
- [ ] Admin login works
- [ ] Analytics dashboard displays
- [ ] User management functions
- [ ] Contact form submits
- [ ] All pages responsive on mobile

## 🔒 Security

- [ ] Default admin password changed
- [ ] Session secret updated
- [ ] Rate limiting configured
- [ ] Firewall rules applied
- [ ] SSL certificate valid
- [ ] Security headers active

## 🎉 Post-Deployment

- [ ] Monitor logs: `pm2 logs lunasphere-website`
- [ ] Check performance: `pm2 monit`
- [ ] Test all functionality
- [ ] Set up monitoring/alerts
- [ ] Configure automated backups
- [ ] Update documentation

## 🔑 Default Credentials (CHANGE IMMEDIATELY)

**Username**: `admin`
**Password**: `lunasphere2025!`

## 📞 Emergency Commands

```bash
# View status
pm2 status

# View logs
pm2 logs lunasphere-website

# Restart app
pm2 restart lunasphere-website

# Stop app
pm2 stop lunasphere-website

# Delete app from PM2
pm2 delete lunasphere-website
```

## 🌟 New Features Live After Deployment

✅ **Complete Admin Panel**
✅ **User Management System**  
✅ **Real-time Analytics**
✅ **Role-Based Access Control**
✅ **Contact Form Integration**
✅ **Enhanced Security**
✅ **API Endpoints**
✅ **Visitor Tracking**

---

**🎯 Goal**: Deploy enhanced LunaSphere website to https://www.lunasphere.top with all new admin and analytics features!
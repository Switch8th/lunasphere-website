#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🌙 LunaSphere Website Setup');
console.log('============================');

try {
    // Check if .env exists
    const envPath = path.join(__dirname, '../.env');
    if (!fs.existsSync(envPath)) {
        console.log('📝 Creating .env file from template...');
        const envExamplePath = path.join(__dirname, '../.env.example');
        fs.copyFileSync(envExamplePath, envPath);
        console.log('✅ .env file created. Please update it with your actual values.');
    } else {
        console.log('📝 .env file already exists.');
    }

    // Create necessary directories
    const dirs = [
        'server/logs',
        'public/css',
        'public/js',
        'public/images',
        'data'
    ];

    console.log('📁 Creating directories...');
    dirs.forEach(dir => {
        const dirPath = path.join(__dirname, '..', dir);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
            console.log(`✅ Created ${dir}`);
        }
    });

    // Copy assets to public folder
    console.log('📦 Setting up public assets...');
    const publicCssPath = path.join(__dirname, '../public/css');
    const publicJsPath = path.join(__dirname, '../public/js');
    
    // Copy CSS files
    if (fs.existsSync(path.join(__dirname, '../css/styles.css'))) {
        fs.copyFileSync(
            path.join(__dirname, '../css/styles.css'),
            path.join(publicCssPath, 'styles.css')
        );
        console.log('✅ Copied CSS files');
    }

    // Copy JS files
    const jsFiles = ['main.js', 'animations.js', 'forms.js'];
    jsFiles.forEach(file => {
        const srcPath = path.join(__dirname, '../js', file);
        const destPath = path.join(publicJsPath, file);
        if (fs.existsSync(srcPath)) {
            fs.copyFileSync(srcPath, destPath);
        }
    });
    console.log('✅ Copied JavaScript files');

    // Create gitignore if it doesn't exist
    const gitignorePath = path.join(__dirname, '../.gitignore');
    if (!fs.existsSync(gitignorePath)) {
        const gitignoreContent = `
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.production

# Logs
server/logs/
*.log

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# Build outputs
public/css/*.min.css
public/js/*.min.js
dist/
build/

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# PM2
ecosystem.config.js
        `.trim();

        fs.writeFileSync(gitignorePath, gitignoreContent);
        console.log('✅ Created .gitignore file');
    }

    console.log('\n🎉 Setup complete!');
    console.log('\nNext steps:');
    console.log('1. Update the .env file with your configuration');
    console.log('2. Run "npm install" to install dependencies');
    console.log('3. Run "npm run dev" to start development server');
    console.log('4. Visit http://localhost:3000 to see your website');

} catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
}
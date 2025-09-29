# PowerShell Script to Deploy Logout Button Update
# Run this script to quickly deploy the header logout button changes

Write-Host "🚀 LunaSphere Logout Button Update Deployment" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# Check if files exist
$jsFile = "js/auth.js"
$cssFile = "css/styles.css"
$publicJsFile = "public/js/auth.js"
$publicCssFile = "public/css/styles.css"

Write-Host "📋 Checking files..." -ForegroundColor Yellow

if (Test-Path $jsFile) {
    Write-Host "✅ Found: $jsFile" -ForegroundColor Green
} else {
    Write-Host "❌ Missing: $jsFile" -ForegroundColor Red
}

if (Test-Path $cssFile) {
    Write-Host "✅ Found: $cssFile" -ForegroundColor Green
} else {
    Write-Host "❌ Missing: $cssFile" -ForegroundColor Red
}

if (Test-Path $publicJsFile) {
    Write-Host "✅ Found: $publicJsFile" -ForegroundColor Green
} else {
    Write-Host "❌ Missing: $publicJsFile" -ForegroundColor Red
}

if (Test-Path $publicCssFile) {
    Write-Host "✅ Found: $publicCssFile" -ForegroundColor Green
} else {
    Write-Host "❌ Missing: $publicCssFile" -ForegroundColor Red
}

Write-Host ""
Write-Host "📦 Files to upload to your server:" -ForegroundColor Cyan
Write-Host "  • js/auth.js (or public/js/auth.js)" -ForegroundColor White
Write-Host "  • css/styles.css (or public/css/styles.css)" -ForegroundColor White

Write-Host ""
Write-Host "🎯 Changes included:" -ForegroundColor Cyan
Write-Host "  • Logout button moved to header next to admin badge" -ForegroundColor White
Write-Host "  • Custom red styling for the header logout button" -ForegroundColor White
Write-Host "  • Responsive design maintained" -ForegroundColor White

Write-Host ""
Write-Host "📤 Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Upload the files above to your server" -ForegroundColor White
Write-Host "  2. Restart your Node.js application (pm2 restart lunasphere-website)" -ForegroundColor White
Write-Host "  3. Test login at https://www.lunasphere.top" -ForegroundColor White
Write-Host "  4. Verify logout button appears next to admin badge" -ForegroundColor White

Write-Host ""
Write-Host "🔧 Quick SSH commands (if applicable):" -ForegroundColor Cyan
Write-Host "  scp js/auth.js user@server:/var/www/lunasphere-website/js/" -ForegroundColor Gray
Write-Host "  scp css/styles.css user@server:/var/www/lunasphere-website/css/" -ForegroundColor Gray
Write-Host "  ssh user@server 'pm2 restart lunasphere-website'" -ForegroundColor Gray

Write-Host ""
Write-Host "✨ Your admin header will show: [Welcome, username] [ADMIN] [Logout]" -ForegroundColor Green
Write-Host ""
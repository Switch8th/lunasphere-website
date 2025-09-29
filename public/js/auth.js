// ===== AUTHENTICATION SYSTEM =====
console.log('🚀 AUTH.JS LOADED SUCCESSFULLY!');

// Available roles in the system
const ROLES = {
    SUPER_ADMIN: 'super_admin',  // Can assign roles to others
    ADMIN: 'admin',              // Regular admin privileges
    DEVELOPER: 'developer',      // Developer badge
    MEMBER: 'member',            // Member badge
    CUSTOMER: 'customer',        // Customer badge
    USER: 'user'                 // Default role (no special badge)
};

// Debug: Log roles to console
console.log('🎭 Available ROLES:', ROLES);

// Role hierarchy and permissions
const ROLE_PERMISSIONS = {
    [ROLES.SUPER_ADMIN]: { canAssignRoles: true, canAccessAdmin: true },
    [ROLES.ADMIN]: { canAssignRoles: false, canAccessAdmin: true },
    [ROLES.DEVELOPER]: { canAssignRoles: false, canAccessAdmin: false },
    [ROLES.MEMBER]: { canAssignRoles: false, canAccessAdmin: false },
    [ROLES.CUSTOMER]: { canAssignRoles: false, canAccessAdmin: false },
    [ROLES.USER]: { canAssignRoles: false, canAccessAdmin: false }
};

// Users are now managed server-side via API
// No need for in-memory storage

// currentUser will be defined as a property in DOMContentLoaded
let services = []; // Array to store uploaded services
let visitors = []; // Array to store visitor information
let analytics = {
    totalVisitors: 0,
    pageViews: 0,
    registeredUsers: 1, // Start with 1 (admin)
    onlineNow: 0
};
let currentVisitorId = null;
let jsZip = null; // Will be loaded dynamically for folder zipping

// DOM Elements
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const loginModal = document.getElementById('login-modal');
const signupModal = document.getElementById('signup-modal');
const closeLogin = document.getElementById('close-login');
const closeSignup = document.getElementById('close-signup');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const adminPanel = document.getElementById('admin-panel');
const logoutBtn = document.getElementById('logout-btn');
const serviceUploadForm = document.getElementById('service-upload-form');
const servicesGrid = document.getElementById('services-grid');
const authButtons = document.querySelector('.auth-buttons');

// Enhanced Admin Panel Elements
const toggleAdminBtn = document.getElementById('toggle-admin');
const adminContent = document.getElementById('admin-content');
const totalVisitorsEl = document.getElementById('total-visitors');
const pageViewsEl = document.getElementById('page-views');
const registeredUsersEl = document.getElementById('registered-users');
const onlineNowEl = document.getElementById('online-now');
const visitorsListEl = document.getElementById('visitors-list');
const usersListEl = document.getElementById('users-list');

// Upload Elements
const uploadTypeRadios = document.querySelectorAll('input[name="upload-type"]');
const singleFileUpload = document.getElementById('single-file-upload');
const folderUpload = document.getElementById('folder-upload');
const serviceFileInput = document.getElementById('service-file');
const serviceFolderInput = document.getElementById('service-folder');

// ===== EVENT LISTENERS =====
document.addEventListener('DOMContentLoaded', () => {
    // DISABLED: Initialize visitor tracking (causing analytics spiral)
    // initializeVisitorTracking();
    
    // Load JSZip for folder handling
    loadJSZip();
    
    // Monitor what's clearing the user session
    let originalCurrentUser = null;
    Object.defineProperty(window, 'currentUser', {
        get() {
            return originalCurrentUser;
        },
        set(value) {
            if (originalCurrentUser && !value) {
                console.error('🚨 CURRENT USER CLEARED!', new Error().stack);
                console.error('Previous user was:', originalCurrentUser);
                console.error('roleAssignmentInProgress:', window.roleAssignmentInProgress);
            }
            if (value) {
                console.log('✅ Current user set:', value.username);
            }
            originalCurrentUser = value;
        }
    });
    
    // Monitor localStorage changes
    const originalRemoveItem = localStorage.removeItem.bind(localStorage);
    localStorage.removeItem = function(key) {
        if (key === 'currentUser') {
            console.error('🚨 LOCALSTORAGE CURRENTUSER REMOVED!', new Error().stack);
            if (window.roleAssignmentInProgress) {
                console.log('⚠️ Blocked localStorage.removeItem for currentUser during role assignment');
                return;
            }
        }
        return originalRemoveItem(key);
    };
    
    const originalSetItem = localStorage.setItem.bind(localStorage);
    localStorage.setItem = function(key, value) {
        if (key === 'currentUser') {
            console.log('💾 localStorage currentUser updated:', JSON.parse(value || '{}').username);
        }
        return originalSetItem(key, value);
    };
    
    // Check if user is already logged in (from localStorage)
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        updateUI();
    }

    // DISABLED: Load saved data (causing analytics spiral)
    // loadSavedData();

    // Modal event listeners
    if (loginBtn) loginBtn.addEventListener('click', () => showModal(loginModal));
    if (signupBtn) signupBtn.addEventListener('click', () => showModal(signupModal));
    if (closeLogin) closeLogin.addEventListener('click', () => hideModal(loginModal));
    if (closeSignup) closeSignup.addEventListener('click', () => hideModal(signupModal));
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === loginModal) hideModal(loginModal);
        if (e.target === signupModal) hideModal(signupModal);
    });

    // Form submissions
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (signupForm) signupForm.addEventListener('submit', handleSignup);
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    if (serviceUploadForm) serviceUploadForm.addEventListener('submit', handleServiceUpload);
    
    // Admin panel controls
    if (toggleAdminBtn) toggleAdminBtn.addEventListener('click', toggleAdminPanel);
    
    // Upload type selector
    uploadTypeRadios.forEach(radio => {
        radio.addEventListener('change', toggleUploadType);
    });
    
    // DISABLED: Update analytics periodically (causing spiraling)
    // setInterval(updateAnalytics, 30000); // Every 30 seconds
    
    // DISABLED: Sync to prevent spiraling
    // setInterval(syncAnalyticsWithServer, 120000); // Every 2 minutes
    
    // DISABLED: Track page view (causing spiraling)
    // trackPageView();
    
    // Check for existing JWT tokens and auto-login
    checkAutoLogin();
});

// ===== MODAL FUNCTIONS =====
function showModal(modal) {
    modal.style.display = 'block';
}

function hideModal(modal) {
    modal.style.display = 'none';
    // Clear forms
    if (modal === loginModal) loginForm.reset();
    if (modal === signupModal) signupForm.reset();
}

// ===== AUTHENTICATION FUNCTIONS =====
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    console.log('🔐 Attempting login with API for:', username);
    
    try {
        const rememberMe = document.getElementById('remember-me')?.checked;
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, rememberMe })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Store user data and JWT tokens
            currentUser = result.user;
            localStorage.setItem('currentUser', JSON.stringify(result.user));
            
            // Store JWT tokens for persistent sessions
            if (result.tokens) {
                localStorage.setItem('accessToken', result.tokens.accessToken);
                localStorage.setItem('refreshToken', result.tokens.refreshToken);
                
                // Store remember me preference
                if (rememberMe) {
                    localStorage.setItem('rememberMe', 'true');
                    console.log('🔐 JWT tokens stored with remember me for 30 days');
                } else {
                    localStorage.setItem('rememberMe', 'false');
                    console.log('🔐 JWT tokens stored for current session');
                }
                
                // Setup automatic token refresh
                setupTokenRefresh();
            }
            
            hideModal(loginModal);
            updateUI();
            
            const persistenceMsg = rememberMe 
                ? 'Login successful! You\'ll stay logged in for 30 days.' 
                : 'Login successful! Session will persist until logout.';
            showNotification(persistenceMsg, 'success');
        } else {
            showNotification(result.error || 'Invalid username or password!', 'error');
        }
    } catch (error) {
        showNotification('Login failed. Please try again.', 'error');
    }
}

async function handleSignup(e) {
    e.preventDefault();
    
    const username = document.getElementById('signup-username').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;

    console.log('📋 Attempting signup with API for:', username);
    
    // Validation
    if (password !== confirmPassword) {
        showNotification('Passwords do not match!', 'error');
        return;
    }

    if (password.length < 6) {
        showNotification('Password must be at least 6 characters long!', 'error');
        return;
    }

    try {
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, role: ROLES.USER })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Auto-login the new user
            currentUser = result.user;
            localStorage.setItem('currentUser', JSON.stringify(result.user));
            
            // DISABLED: Update local analytics for new user (causing spiraling)
            // analytics.registeredUsers++;
            
            hideModal(signupModal);
            updateUI();
            
            showNotification('Account created successfully!', 'success');
        } else {
            showNotification(result.error || 'Failed to create account!', 'error');
        }
    } catch (error) {
        showNotification('Signup failed. Please try again.', 'error');
    }
}

async function handleLogout() {
    // Prevent logout during role assignments (unless it's an intentional logout)
    if (window.roleAssignmentInProgress) {
        console.log('⚠️ Logout blocked during role assignment');
        return;
    }
    
    console.log('🚪 Logging out user:', currentUser ? currentUser.username : 'unknown');
    
    // Notify server about logout
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (accessToken) {
        try {
            await fetch('/api/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refreshToken })
            });
            console.log('📝 Server notified about logout');
        } catch (error) {
            console.warn('Logout request failed:', error);
        }
    }
    
    // Clear all stored data
    currentUser = null;
    localStorage.removeItem('currentUser');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('rememberMe');
    
    // Clear token refresh timer
    if (window.tokenRefreshTimer) {
        clearTimeout(window.tokenRefreshTimer);
        window.tokenRefreshTimer = null;
    }
    
    updateUI();
    showNotification('Logged out successfully!', 'success');
}

// ===== UI UPDATE FUNCTIONS =====
function updateUI() {
    console.log('🎨 UpdateUI called, current user:', currentUser);
    
    // Don't update UI during role assignments to prevent interference
    if (window.roleAssignmentInProgress) {
        console.log('⏸️ Skipping UI update during role assignment');
        return;
    }
    
    if (currentUser) {
        console.log('✅ User is logged in, updating UI for:', currentUser.username);
        // Hide login/signup buttons, show user info with logout button next to badge
        authButtons.innerHTML = `
            <div class="user-info show">
                <span>Welcome, ${currentUser.username}</span>
                ${getRoleBadgeHTML(currentUser.role)}
                <button class="btn btn-outline btn-sm" id="header-logout-btn" onclick="handleLogout()" style="margin-left: 10px;">Logout</button>
            </div>
        `;
        
        // Show admin panel if user has admin access
        if (hasAdminAccess(currentUser.role)) {
            adminPanel.style.display = 'block';
            
            // Ensure logout button in admin panel works
            const adminLogoutBtn = document.getElementById('logout-btn');
            if (adminLogoutBtn && !adminLogoutBtn.hasAttribute('data-listener-added')) {
                adminLogoutBtn.addEventListener('click', handleLogout);
                adminLogoutBtn.setAttribute('data-listener-added', 'true');
            }
        }
    } else {
        console.log('❌ No user logged in, showing auth buttons');
        // Show login/signup buttons
        authButtons.innerHTML = `
            <button class="btn btn-outline" id="login-btn">Login</button>
            <button class="btn btn-primary" id="signup-btn">Sign Up</button>
        `;
        
        // Re-attach event listeners
        document.getElementById('login-btn').addEventListener('click', () => showModal(loginModal));
        document.getElementById('signup-btn').addEventListener('click', () => showModal(signupModal));
        
        // Hide admin panel
        if (adminPanel) adminPanel.style.display = 'none';
    }
}

// ===== SERVICE MANAGEMENT =====
function handleServiceUpload(e) {
    e.preventDefault();
    
    const title = document.getElementById('service-title').value;
    const description = document.getElementById('service-description').value;
    const icon = document.getElementById('service-icon').value;
    const uploadType = document.querySelector('input[name="upload-type"]:checked').value;
    
    if (uploadType === 'file') {
        handleSingleFileUpload(title, description, icon);
    } else {
        handleFolderUpload(title, description, icon);
    }
}

function handleSingleFileUpload(title, description, icon) {
    const fileInput = document.getElementById('service-file');
    const file = fileInput.files[0];
    
    if (!file) {
        showNotification('Please select a file to upload!', 'error');
        return;
    }
    
    uploadService(title, description, icon, file, file.name);
}

function handleFolderUpload(title, description, icon) {
    const folderInput = document.getElementById('service-folder');
    const files = folderInput.files;
    
    if (!files || files.length === 0) {
        showNotification('Please select a folder to upload!', 'error');
        return;
    }
    
    if (!jsZip) {
        showNotification('Zip library not loaded yet. Please try again.', 'error');
        return;
    }
    
    // Create ZIP from folder
    const zip = new jsZip();
    let processedFiles = 0;
    const totalFiles = files.length;
    
    showNotification('Compressing folder...', 'info');
    
    Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = function(e) {
            // Maintain folder structure
            const relativePath = file.webkitRelativePath || file.name;
            zip.file(relativePath, e.target.result);
            
            processedFiles++;
            if (processedFiles === totalFiles) {
                // All files processed, generate ZIP
                zip.generateAsync({ type: 'blob' })
                    .then(function(blob) {
                        const folderName = files[0].webkitRelativePath.split('/')[0];
                        const zipFileName = `${folderName}.zip`;
                        
                        uploadService(title, description, icon, blob, zipFileName);
                    })
                    .catch(function(error) {
                        console.error('Error creating ZIP:', error);
                        showNotification('Error compressing folder!', 'error');
                    });
            }
        };
        reader.readAsArrayBuffer(file);
    });
}

function uploadService(title, description, icon, fileData, fileName) {
    // Create service object
    const service = {
        id: Date.now().toString(),
        title,
        description,
        icon,
        fileName: fileName,
        fileSize: formatFileSize(fileData.size),
        uploadedAt: new Date().toISOString(),
        downloadCount: 0,
        type: fileName.endsWith('.zip') ? 'folder' : 'file'
    };
    
    services.push(service);
    localStorage.setItem('services', JSON.stringify(services));
    
    // Store file in localStorage (in production, upload to server)
    const reader = new FileReader();
    reader.onload = function(e) {
        localStorage.setItem(`service-file-${service.id}`, e.target.result);
    };
    reader.readAsDataURL(fileData);
    
    renderServices();
    serviceUploadForm.reset();
    
    // Reset upload type selector
    const fileRadio = document.querySelector('input[name="upload-type"][value="file"]');
    if (fileRadio) {
        fileRadio.checked = true;
        toggleUploadType();
    }
    
    showNotification('Service uploaded successfully!', 'success');
}

function renderServices() {
    if (services.length === 0) {
        servicesGrid.innerHTML = `
            <div class="no-services-message">
                <div class="no-services-icon">📦</div>
                <h3>No Services Available Yet</h3>
                <p>Services will appear here once uploaded by an administrator.</p>
            </div>
        `;
        return;
    }
    
    servicesGrid.innerHTML = services.map(service => `
        <div class="service-card" data-id="${service.id}">
            <div class="service-icon">${service.icon}</div>
            <h3>${service.title}</h3>
            <p>${service.description}</p>
            <div class="service-meta">
                <span class="file-info">📁 ${service.fileName} (${service.fileSize})</span>
                <span class="download-count">⬇️ ${service.downloadCount} downloads</span>
            </div>
            <button class="service-btn" onclick="downloadService('${service.id}')">
                Download
                <span class="btn-icon">⬇️</span>
            </button>
            ${currentUser && currentUser.role === 'admin' ? 
                `<button class="service-delete-btn" onclick="deleteService('${service.id}')">
                    Delete
                    <span class="btn-icon">🗑️</span>
                </button>` : 
                ''
            }
        </div>
    `).join('');
}

function downloadService(serviceId) {
    const service = services.find(s => s.id === serviceId);
    if (!service) return;
    
    const fileData = localStorage.getItem(`service-file-${serviceId}`);
    if (!fileData) {
        showNotification('File not found!', 'error');
        return;
    }
    
    // Create download link
    const link = document.createElement('a');
    link.href = fileData;
    link.download = service.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Increment download count
    service.downloadCount++;
    localStorage.setItem('services', JSON.stringify(services));
    renderServices();
    
    showNotification('Download started!', 'success');
}

function deleteService(serviceId) {
    if (!confirm('Are you sure you want to delete this service?')) return;
    
    services = services.filter(s => s.id !== serviceId);
    localStorage.setItem('services', JSON.stringify(services));
    localStorage.removeItem(`service-file-${serviceId}`);
    
    renderServices();
    showNotification('Service deleted successfully!', 'success');
}

// ===== UTILITY FUNCTIONS =====
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button class="notification-close">&times;</button>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
    
    // Close button
    notification.querySelector('.notification-close').addEventListener('click', () => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    });
}

// ===== VISITOR TRACKING FUNCTIONS =====
function initializeVisitorTracking() {
    // Generate unique visitor ID if not exists
    currentVisitorId = localStorage.getItem('visitorId');
    if (!currentVisitorId) {
        currentVisitorId = 'visitor_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('visitorId', currentVisitorId);
        analytics.totalVisitors++;
    }
    
    // Track visitor session
    trackVisitor();
    
    // Update online count
    updateOnlineCount();
    
    // Clean up old visitors periodically
    setInterval(cleanupOldVisitors, 60000); // Every minute
}

function trackVisitor() {
    const visitor = {
        id: currentVisitorId,
        ip: 'Hidden', // In real app, get from server
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        location: 'Unknown', // In real app, get from IP geolocation
        pages: [window.location.pathname],
        lastActivity: Date.now()
    };
    
    // Check if visitor already exists
    const existingVisitorIndex = visitors.findIndex(v => v.id === currentVisitorId);
    if (existingVisitorIndex >= 0) {
        // Update existing visitor
        visitors[existingVisitorIndex].lastActivity = Date.now();
        if (!visitors[existingVisitorIndex].pages.includes(window.location.pathname)) {
            visitors[existingVisitorIndex].pages.push(window.location.pathname);
        }
    } else {
        // Add new visitor
        visitors.push(visitor);
    }
    
    saveVisitors();
}

// DISABLED: function trackPageView() {
//     analytics.pageViews++;
//     saveAnalytics();
//     updateAnalyticsDisplay();
// }

function updateOnlineCount() {
    const now = Date.now();
    const onlineThreshold = 5 * 60 * 1000; // 5 minutes
    
    analytics.onlineNow = visitors.filter(v => 
        now - v.lastActivity < onlineThreshold
    ).length;
    
    saveAnalytics();
    updateAnalyticsDisplay();
}

function cleanupOldVisitors() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    visitors = visitors.filter(v => 
        now - new Date(v.timestamp).getTime() < maxAge
    );
    
    saveVisitors();
    updateOnlineCount();
}

// ===== ANALYTICS FUNCTIONS =====
function updateAnalytics() {
    // Skip ALL analytics updates during role assignments to prevent interference
    if (window.roleAssignmentInProgress) {
        console.log('⏸️ Skipping analytics update during role assignment');
        return;
    }
    
    updateOnlineCount();
    updateAnalyticsDisplay();
    updateVisitorsList();
    updateUsersList();
}

// Fix negative registered users count
function fixRegisteredUsersCount() {
    if (analytics.registeredUsers < 0) {
        console.warn('⚠️ Detected negative registered users count:', analytics.registeredUsers, '- resetting to 4');
        analytics.registeredUsers = 4; // Set to known correct value
        console.log('🔧 Reset registered users to:', analytics.registeredUsers);
    }
}

function updateAnalyticsDisplay() {
    // Fix negative counts before displaying
    fixRegisteredUsersCount();
    
    if (totalVisitorsEl) totalVisitorsEl.textContent = Math.max(0, analytics.totalVisitors);
    if (pageViewsEl) pageViewsEl.textContent = Math.max(0, analytics.pageViews);
    if (registeredUsersEl) registeredUsersEl.textContent = Math.max(0, analytics.registeredUsers);
    if (onlineNowEl) onlineNowEl.textContent = Math.max(0, analytics.onlineNow);
}

function updateVisitorsList() {
    if (!visitorsListEl) return;
    
    if (visitors.length === 0) {
        visitorsListEl.innerHTML = '<div class="no-data">No visitors yet</div>';
        return;
    }
    
    const recentVisitors = visitors
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 10); // Show last 10 visitors
    
    visitorsListEl.innerHTML = recentVisitors.map(visitor => {
        const isOnline = Date.now() - visitor.lastActivity < 5 * 60 * 1000;
        return `
            <div class="visitor-item">
                <div class="visitor-info">
                    <div class="visitor-ip">
                        ${isOnline ? '<span class="online-indicator"></span>' : ''}
                        ${visitor.ip} (${visitor.id.split('_')[1]})
                    </div>
                    <div class="visitor-location">${visitor.location}</div>
                </div>
                <div class="visitor-time">
                    ${new Date(visitor.timestamp).toLocaleString()}
                </div>
            </div>
        `;
    }).join('');
}

async function updateUsersList() {
    if (!usersListEl) return;
    
    console.log('👥 Updating users list with API...');
    
    // Ensure we have current user info
    if (!currentUser) {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            currentUser = JSON.parse(savedUser);
        }
    }
    
    try {
        const response = await fetch('/api/users');
        const allUsers = await response.json();
        console.log('👥 Fetched users from API:', allUsers);
        const filteredUsers = allUsers.filter(u => u.username !== currentUser?.username);
        
        if (filteredUsers.length === 0) {
            usersListEl.innerHTML = '<div class="no-data">No other users registered yet</div>';
            return;
        }
        
        const canManageRoles = currentUser && canAssignRoles(currentUser.role);
        
        // Add bulk actions header if user can manage roles
        const bulkActionsHeader = canManageRoles ? `
            <div class="bulk-actions-header">
                <div class="bulk-controls">
                    <label class="bulk-select-all">
                        <input type="checkbox" id="select-all-users" onchange="toggleAllUsers(this.checked)">
                        <span>Select All</span>
                    </label>
                    <div class="bulk-role-actions">
                        <select id="bulk-role-selector" class="role-selector bulk-selector">
                            <option value="">Bulk Assign Role...</option>
                            <option value="${ROLES.USER}">User</option>
                            <option value="${ROLES.CUSTOMER}">Customer</option>
                            <option value="${ROLES.MEMBER}">Member</option>
                            <option value="${ROLES.DEVELOPER}">Developer</option>
                            <option value="${ROLES.ADMIN}">Admin</option>
                        </select>
                        <button id="apply-bulk-role" class="btn btn-sm btn-primary" onclick="applyBulkRoleAssignment()">
                            <span class="btn-icon">📦</span>
                            Apply to Selected
                        </button>
                    </div>
                </div>
            </div>
        ` : '';
        
        const usersList = filteredUsers.map(user => {
            console.log('👤 Processing user:', user.username, 'with role:', user.role);
            console.log('🔑 Can manage roles:', canManageRoles);
            
            const roleDropdown = canManageRoles ? `
                <select class="role-selector" onchange="assignUserRole('${user.username}', this.value, '${currentUser.username}')">
                    <option value="${ROLES.USER}" ${user.role === ROLES.USER ? 'selected' : ''}>User</option>
                    <option value="${ROLES.CUSTOMER}" ${user.role === ROLES.CUSTOMER ? 'selected' : ''}>Customer</option>
                    <option value="${ROLES.MEMBER}" ${user.role === ROLES.MEMBER ? 'selected' : ''}>Member</option>
                    <option value="${ROLES.DEVELOPER}" ${user.role === ROLES.DEVELOPER ? 'selected' : ''}>Developer</option>
                    <option value="${ROLES.ADMIN}" ${user.role === ROLES.ADMIN ? 'selected' : ''}>Admin</option>
                </select>
            ` : getRoleBadgeHTML(user.role);
            
            const userCheckbox = canManageRoles ? `
                <input type="checkbox" class="user-select-checkbox" data-username="${user.username}" onchange="updateBulkActions()">
            ` : '';
            
            console.log('👤 Generated role display for', user.username, ':', roleDropdown);
            
            return `
                <div class="user-item" data-username="${user.username}">
                    ${canManageRoles ? `<div class="user-select">${userCheckbox}</div>` : ''}
                    <div class="user-info">
                        <div class="user-name">${user.username}</div>
                        <div class="user-role-container">
                            ${roleDropdown}
                        </div>
                        ${user.assignedBy && user.assignedBy !== 'self-registration' ? 
                            `<div class="role-assigned-info">Role assigned by: ${user.assignedBy}</div>` : ''}
                    </div>
                    <div class="user-time">
                        Registered: ${new Date(user.registeredAt).toLocaleDateString()}
                    </div>
                </div>
            `;
        }).join('');
        
        usersListEl.innerHTML = bulkActionsHeader + usersList;
    } catch (error) {
        usersListEl.innerHTML = '<div class="no-data">Failed to load users</div>';
    }
}

// Safe version that doesn't interfere with user sessions during role assignments
async function updateUsersListSafe() {
    // Set flag to prevent periodic updates from interfering
    window.roleAssignmentInProgress = true;
    
    try {
        await updateUsersList();
    } finally {
        // Clear flag after a short delay
        setTimeout(() => {
            window.roleAssignmentInProgress = false;
        }, 2000); // 2 second protection window
    }
}

// Update single user's role display without rebuilding entire list
function updateSingleUserRole(username, newRole) {
    console.log('🔄 Updating single user role display:', username, '->', newRole);
    
    const userItem = document.querySelector(`[data-username="${username}"]`);
    if (!userItem) {
        console.log('⚠️ User item not found, will update entire list later');
        return;
    }
    
    const roleDropdown = userItem.querySelector('.role-selector');
    if (roleDropdown) {
        // Update the dropdown selection
        roleDropdown.value = newRole;
        console.log('✅ Updated dropdown for', username, 'to', newRole);
        
        // Update role assignment info if it exists
        const roleAssignedInfo = userItem.querySelector('.role-assigned-info');
        if (roleAssignedInfo) {
            roleAssignedInfo.textContent = `Role assigned by: ${currentUser.username}`;
        }
    } else {
        console.log('⚠️ Role dropdown not found for user:', username);
    }
}

// ===== ADMIN PANEL FUNCTIONS =====
function toggleAdminPanel() {
    if (!adminPanel) return;
    
    adminPanel.classList.toggle('minimized');
    const isMinimized = adminPanel.classList.contains('minimized');
    
    if (toggleAdminBtn) {
        toggleAdminBtn.innerHTML = isMinimized ? '+' : '−';
        toggleAdminBtn.title = isMinimized ? 'Expand Panel' : 'Minimize Panel';
    }
}

// ===== UPLOAD TYPE FUNCTIONS =====
function toggleUploadType() {
    const selectedType = document.querySelector('input[name="upload-type"]:checked').value;
    
    if (selectedType === 'file') {
        if (singleFileUpload) singleFileUpload.style.display = 'block';
        if (folderUpload) folderUpload.style.display = 'none';
    } else {
        if (singleFileUpload) singleFileUpload.style.display = 'none';
        if (folderUpload) folderUpload.style.display = 'block';
    }
}

function loadJSZip() {
    // Load JSZip dynamically for folder compression
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    script.onload = () => {
        jsZip = window.JSZip;
    };
    document.head.appendChild(script);
}

// ===== DATA PERSISTENCE FUNCTIONS =====
async function loadSavedData() {
    // Load services from localStorage (keeping this for now)
    const savedServices = localStorage.getItem('services');
    if (savedServices) {
        services = JSON.parse(savedServices);
        renderServices();
    }
    
    // Load analytics from API (simplified)
    try {
        const response = await fetch('/api/analytics');
        if (response.ok) {
            const serverAnalytics = await response.json();
            analytics = { ...analytics, ...serverAnalytics };
        }
    } catch (error) {
        console.warn('Failed to load analytics from server');
    }
    
    // Load visitors from API  
    try {
        const response = await fetch('/api/visitors');
        visitors = await response.json();
    } catch (error) {
        console.warn('Failed to load visitors from server');
    }
    
    updateAnalytics();
}

// DISABLED: Properly sync analytics with server (causing spiraling issue)
/*
async function syncAnalyticsWithServer() {
    try {
        // First, get current user count from server
        const usersCountResponse = await fetch('/api/users/count');
        if (usersCountResponse.ok) {
            const userCountData = await usersCountResponse.json();
            const actualUserCount = userCountData.count;
            console.log('🔢 Actual user count from server:', actualUserCount);
            
            // Load server analytics
            const analyticsResponse = await fetch('/api/analytics');
            if (analyticsResponse.ok) {
                const serverAnalytics = await analyticsResponse.json();
                console.log('📊 Server analytics:', serverAnalytics);
                
                // Merge with local analytics but ensure user count is correct
                analytics = {
                    ...analytics,
                    ...serverAnalytics,
                    registeredUsers: actualUserCount // Always use actual count
                };
                
                // Update server with correct count if it's different
                if (serverAnalytics.registeredUsers !== actualUserCount) {
                    console.log('🔧 Fixing server analytics - updating registered users from', serverAnalytics.registeredUsers, 'to', actualUserCount);
                    await fetch('/api/analytics', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ registeredUsers: actualUserCount })
                    });
                }
            }
        }
    } catch (error) {
        console.warn('Failed to sync analytics with server:', error);
        // Fallback: try to get user count and fix local analytics
        try {
            const usersCountResponse = await fetch('/api/users/count');
            if (usersCountResponse.ok) {
                const userCountData = await usersCountResponse.json();
                analytics.registeredUsers = userCountData.count;
                console.log('🔧 Fixed local analytics - registered users:', analytics.registeredUsers);
            }
        } catch (fallbackError) {
            console.warn('Failed fallback analytics fix:', fallbackError);
        }
    }
}
*/

// Keep localStorage functions for services (not yet moved to API)
function saveAnalytics() {
    // Analytics are now saved server-side
}

function saveVisitors() {
    // Visitors are now saved server-side
}

function saveUsers() {
    // Users are now saved server-side
}

// ===== ROLE SYSTEM HELPER FUNCTIONS =====
function getRoleBadgeHTML(role) {
    console.log('🏷️ Getting badge for role:', role);
    
    const roleConfig = {
        [ROLES.SUPER_ADMIN]: { text: 'SUPER ADMIN', class: 'super-admin-badge' },
        [ROLES.ADMIN]: { text: 'ADMIN', class: 'admin-badge' },
        [ROLES.DEVELOPER]: { text: 'DEVELOPER', class: 'developer-badge' },
        [ROLES.MEMBER]: { text: 'MEMBER', class: 'member-badge' },
        [ROLES.CUSTOMER]: { text: 'CUSTOMER', class: 'customer-badge' },
        [ROLES.USER]: null // No badge for regular users
    };
    
    console.log('🏷️ Role config:', roleConfig);
    const config = roleConfig[role];
    console.log('🏷️ Found config for', role, ':', config);
    
    const result = config ? `<span class="${config.class}">${config.text}</span>` : '';
    console.log('🏷️ Returning badge HTML:', result);
    return result;
}

function hasAdminAccess(role) {
    return ROLE_PERMISSIONS[role]?.canAccessAdmin || false;
}

function canAssignRoles(role) {
    return ROLE_PERMISSIONS[role]?.canAssignRoles || false;
}

async function assignUserRole(username, newRole, assignedBy) {
    console.log('🔄 Starting role assignment:', { username, newRole, assignedBy });
    console.log('👤 Current user before assignment:', currentUser);
    
    // Prevent multiple simultaneous calls
    if (window.roleAssignmentInProgress) {
        console.log('⏸️ Role assignment already in progress, skipping');
        return false;
    }
    
    // Set flag immediately to prevent interference
    window.roleAssignmentInProgress = true;
    console.log('🔒 Role assignment flag set');
    
    try {
        // Preserve current user state before making changes
        const preservedUser = JSON.parse(JSON.stringify(currentUser)); // Deep clone
        console.log('💾 Preserved user:', preservedUser);
        
        const response = await fetch(`/api/users/${username}/role`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: newRole, assignedBy })
        });
        
        const result = await response.json();
        console.log('📡 API response:', result);
        
        if (result.success) {
            // Force restore current user state IMMEDIATELY
            currentUser = preservedUser;
            localStorage.setItem('currentUser', JSON.stringify(preservedUser));
            console.log('✅ Current user state restored:', currentUser);
            
            // Update the specific dropdown that was changed without rebuilding entire list
            updateSingleUserRole(username, newRole);
            
            showNotification(`Role updated to ${newRole} successfully!`, 'success');
            
            // Verify user is still logged in after delay
            setTimeout(() => {
                const stillLoggedIn = localStorage.getItem('currentUser');
                console.log('🔍 User still logged in after 2 seconds?', !!stillLoggedIn);
                if (!stillLoggedIn) {
                    console.error('❌ USER WAS LOGGED OUT! Restoring...');
                    currentUser = preservedUser;
                    localStorage.setItem('currentUser', JSON.stringify(preservedUser));
                    updateUI();
                } else {
                    console.log('✅ User session preserved successfully!');
                }
            }, 2000);
            
            return true;
        } else {
            console.error('❌ Role assignment failed:', result.error);
            showNotification(result.error || 'Failed to update role!', 'error');
            return false;
        }
    } catch (error) {
        console.error('💥 Exception during role assignment:', error);
        
        // Force restore current user state
        const preservedUserStr = localStorage.getItem('currentUser');
        if (preservedUserStr) {
            currentUser = JSON.parse(preservedUserStr);
            console.log('🔧 Force restored user from localStorage:', currentUser);
        }
        
        showNotification('Failed to update role. Please try again.', 'error');
        return false;
    } finally {
        // Clear flag after a delay to prevent interference
        setTimeout(() => {
            window.roleAssignmentInProgress = false;
            console.log('🔓 Role assignment flag cleared');
        }, 3000);
    }
}
    const checkboxes = document.querySelectorAll('.user-select-checkbox');
    const checkedBoxes = document.querySelectorAll('.user-select-checkbox:checked');
    const selectAllCheckbox = document.getElementById('select-all-users');
    const applyButton = document.getElementById('apply-bulk-role');
    
    // Update select all checkbox state
    if (selectAllCheckbox) {
        if (checkedBoxes.length === 0) {
            selectAllCheckbox.indeterminate = false;
            selectAllCheckbox.checked = false;
        } else if (checkedBoxes.length === checkboxes.length) {
            selectAllCheckbox.indeterminate = false;
            selectAllCheckbox.checked = true;
        } else {
            selectAllCheckbox.indeterminate = true;
            selectAllCheckbox.checked = false;
        }
    }
    
    // Update apply button state
    if (applyButton) {
        applyButton.disabled = checkedBoxes.length === 0;
        applyButton.textContent = checkedBoxes.length === 0 ? 
            'Apply to Selected' : 
            `Apply to ${checkedBoxes.length} user${checkedBoxes.length === 1 ? '' : 's'}`;
    }
}

async function applyBulkRoleAssignment() {
    const bulkRoleSelector = document.getElementById('bulk-role-selector');
    const selectedRole = bulkRoleSelector?.value;
    
    if (!selectedRole) {
        showNotification('Please select a role to assign!', 'error');
        return;
    }
    
    const checkedBoxes = document.querySelectorAll('.user-select-checkbox:checked');
    const usernames = Array.from(checkedBoxes).map(cb => cb.dataset.username);
    
    if (usernames.length === 0) {
        showNotification('Please select users to update!', 'error');
        return;
    }
    
    // Show confirmation dialog
    const confirmMessage = `Are you sure you want to assign the role "${selectedRole}" to ${usernames.length} user${usernames.length === 1 ? '' : 's'}?\n\nUsers: ${usernames.join(', ')}`;
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    // Set bulk assignment flag
    window.roleAssignmentInProgress = true;
    
    try {
        // Apply role to each selected user
        let successful = 0;
        let failed = 0;
        
        showNotification(`Updating roles for ${usernames.length} users...`, 'info');
        
        for (const username of usernames) {
            const success = await assignUserRole(username, selectedRole, currentUser.username);
            if (success) {
                successful++;
            } else {
                failed++;
            }
        }
        
        // Show results
        if (failed === 0) {
            showNotification(`Successfully updated ${successful} user role${successful === 1 ? '' : 's'}!`, 'success');
        } else {
            showNotification(`Updated ${successful} users successfully. ${failed} failed.`, 'warning');
        }
        
        // Reset bulk controls
        bulkRoleSelector.value = '';
        document.querySelectorAll('.user-select-checkbox').forEach(cb => cb.checked = false);
        const selectAllCheckbox = document.getElementById('select-all-users');
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        }
        updateBulkActions();
        
    } finally {
        // Clear bulk assignment flag after delay
        setTimeout(() => {
            window.roleAssignmentInProgress = false;
        }, 3000);
    }
}

// ===== ISOLATED ROLE ASSIGNMENT =====
window.isolatedRoleAssignment = async function(username, newRole) {
    console.log('🔒 ISOLATED ROLE ASSIGNMENT START');
    
    // Completely freeze the current user state
    const frozenUser = JSON.parse(localStorage.getItem('currentUser'));
    console.log('Frozen user before assignment:', frozenUser);
    
    try {
        const response = await fetch(`/api/users/${username}/role`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: newRole, assignedBy: frozenUser.username })
        });
        
        const result = await response.json();
        console.log('API response:', result);
        
        if (result.success) {
            // Force restore user immediately - multiple times
            localStorage.setItem('currentUser', JSON.stringify(frozenUser));
            currentUser = frozenUser;
            
            setTimeout(() => {
                localStorage.setItem('currentUser', JSON.stringify(frozenUser));
                currentUser = frozenUser;
            }, 100);
            
            setTimeout(() => {
                localStorage.setItem('currentUser', JSON.stringify(frozenUser));
                currentUser = frozenUser;
            }, 500);
            
            setTimeout(() => {
                localStorage.setItem('currentUser', JSON.stringify(frozenUser));
                currentUser = frozenUser;
                console.log('Final user check:', currentUser);
            }, 1000);
            
            console.log('✅ Role assignment successful');
            return true;
        } else {
            console.error('Role assignment failed:', result.error);
            return false;
        }
    } catch (error) {
        console.error('Exception during role assignment:', error);
        return false;
    }
};

// ===== DEBUG FUNCTIONS FOR TESTING =====
window.debugUserState = function() {
    console.log('🔍 DEBUG USER STATE:');
    console.log('currentUser variable:', currentUser);
    console.log('localStorage currentUser:', localStorage.getItem('currentUser'));
    console.log('roleAssignmentInProgress:', window.roleAssignmentInProgress);
    console.log('Admin panel visible:', document.getElementById('admin-panel')?.style.display);
    console.log('Auth buttons content:', document.querySelector('.auth-buttons')?.innerHTML);
};

window.testRoleAssignment = async function(username, role) {
    console.log('🧪 TESTING ROLE ASSIGNMENT:');
    console.log('Before - currentUser:', currentUser);
    const result = await isolatedRoleAssignment(username, role);
    console.log('After - currentUser:', currentUser);
    console.log('Result:', result);
    return result;
};

window.forceRestoreUser = function() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        updateUI();
        console.log('✅ Force restored user:', currentUser);
    } else {
        console.log('❌ No user to restore from localStorage');
    }
};

// ===== JWT TOKEN MANAGEMENT =====

// Setup automatic token refresh (15 minutes = 900000ms, refresh at 14 minutes = 840000ms)
function setupTokenRefresh() {
    if (window.tokenRefreshTimer) {
        clearTimeout(window.tokenRefreshTimer);
    }
    
    const refreshIn = 14 * 60 * 1000; // 14 minutes in milliseconds
    
    window.tokenRefreshTimer = setTimeout(async () => {
        console.log('⏰ Auto-refreshing JWT token...');
        await refreshJWTTokens();
    }, refreshIn);
    
    console.log(`⏰ Token refresh scheduled in ${refreshIn / 1000 / 60} minutes`);
}

// Refresh JWT tokens
async function refreshJWTTokens() {
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (!refreshToken) {
        console.warn('No refresh token available');
        return false;
    }
    
    try {
        const response = await fetch('/api/refresh', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ refreshToken })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Update tokens
            localStorage.setItem('accessToken', result.tokens.accessToken);
            localStorage.setItem('refreshToken', result.tokens.refreshToken);
            
            console.log('🔄 JWT tokens refreshed successfully');
            
            // Setup next refresh
            setupTokenRefresh();
            return true;
        } else {
            console.error('❌ Token refresh failed:', result.error);
            // Clear tokens and logout
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('currentUser');
            currentUser = null;
            updateUI();
            showNotification('Session expired. Please login again.', 'warning');
            return false;
        }
    } catch (error) {
        console.error('❌ Token refresh error:', error);
        return false;
    }
}

// Check for existing tokens and auto-login
async function checkAutoLogin() {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    const savedUser = localStorage.getItem('currentUser');
    
    if (!accessToken || !refreshToken || !savedUser) {
        console.log('👤 No valid session found');
        return;
    }
    
    console.log('🔐 Found existing JWT tokens, attempting auto-login...');
    
    try {
        // Try to get current user info using the access token
        const response = await fetch('/api/me', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                // Successfully validated, user is still logged in
                currentUser = result.user;
                localStorage.setItem('currentUser', JSON.stringify(result.user));
                console.log('✅ Auto-login successful:', result.user.username);
                
                // Setup token refresh
                setupTokenRefresh();
                
                updateUI();
                showNotification(`Welcome back, ${result.user.username}! Your session was restored.`, 'success');
                return;
            }
        } else if (response.status === 403 || response.status === 401) {
            // Token expired, try to refresh
            console.log('🔄 Access token expired, attempting refresh...');
            const refreshed = await refreshJWTTokens();
            
            if (refreshed) {
                // Try again with new token
                await checkAutoLogin();
                return;
            }
        }
    } catch (error) {
        console.warn('Auto-login failed:', error);
    }
    
    // If we get here, auto-login failed
    console.log('❌ Auto-login failed, clearing session');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('currentUser');
    currentUser = null;
    updateUI();
}

// Make authenticated API requests
async function authenticatedFetch(url, options = {}) {
    const accessToken = localStorage.getItem('accessToken');
    
    if (!accessToken) {
        throw new Error('No access token available');
    }
    
    const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    try {
        const response = await fetch(url, {
            ...options,
            headers
        });
        
        // If token expired, try to refresh and retry
        if (response.status === 403 || response.status === 401) {
            console.log('🔄 Token expired, attempting refresh...');
            const refreshed = await refreshJWTTokens();
            
            if (refreshed) {
                // Retry with new token
                const newAccessToken = localStorage.getItem('accessToken');
                headers['Authorization'] = `Bearer ${newAccessToken}`;
                return await fetch(url, { ...options, headers });
            } else {
                throw new Error('Authentication failed');
            }
        }
        
        return response;
    } catch (error) {
        console.error('Authenticated fetch failed:', error);
        throw error;
    }
}

// Make functions available globally
window.downloadService = downloadService;
window.deleteService = deleteService;
window.assignUserRole = assignUserRole;
window.toggleAllUsers = toggleAllUsers;
window.updateBulkActions = updateBulkActions;
window.applyBulkRoleAssignment = applyBulkRoleAssignment;
window.authenticatedFetch = authenticatedFetch;
window.refreshJWTTokens = refreshJWTTokens;
window.setupTokenRefresh = setupTokenRefresh;

console.log('🔐 JWT Authentication system loaded with persistent sessions!');

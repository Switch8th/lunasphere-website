// STANDALONE ROLE MANAGER - COMPLETELY ISOLATED FROM auth.js
console.log('🔧 Role Manager loaded - completely isolated system');

// Create our own isolated user state management
let isolatedCurrentUser = null;

// Initialize isolated system
function initializeRoleManager() {
    console.log('🚀 Initializing isolated role manager');
    
    // Get user from localStorage
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        isolatedCurrentUser = JSON.parse(savedUser);
        console.log('👤 Isolated user loaded:', isolatedCurrentUser.username);
    }
    
    // Add our own role assignment handlers
    addIsolatedRoleHandlers();
}

// Add event handlers that completely bypass the existing system
function addIsolatedRoleHandlers() {
    console.log('🔗 Adding isolated role handlers');
    
    // Find all role dropdowns and add our own handlers
    const roleDropdowns = document.querySelectorAll('.role-selector');
    roleDropdowns.forEach(dropdown => {
        // Remove existing handlers
        const newDropdown = dropdown.cloneNode(true);
        dropdown.parentNode.replaceChild(newDropdown, dropdown);
        
        // Add our isolated handler
        newDropdown.addEventListener('change', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const username = this.closest('[data-username]')?.getAttribute('data-username');
            const newRole = this.value;
            
            console.log('🔄 Isolated role assignment:', { username, newRole });
            
            if (username && newRole) {
                await performIsolatedRoleAssignment(username, newRole);
            }
        });
    });
}

// Completely isolated role assignment function
async function performIsolatedRoleAssignment(username, newRole) {
    console.log('🔒 Starting completely isolated role assignment');
    console.log('User before:', isolatedCurrentUser);
    
    // Create a frozen backup
    const userBackup = JSON.parse(JSON.stringify(isolatedCurrentUser));
    
    try {
        // Make API call
        const response = await fetch(`/api/users/${username}/role`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                role: newRole, 
                assignedBy: isolatedCurrentUser.username 
            })
        });
        
        const result = await response.json();
        console.log('📡 API Response:', result);
        
        if (result.success) {
            console.log('✅ Role assignment successful');
            
            // Force restore user state multiple ways
            restoreUserState(userBackup);
            
            // Show success message without using the existing notification system
            showIsolatedNotification(`Role updated to ${newRole} successfully!`, 'success');
            
            // Update just this dropdown
            updateSingleDropdown(username, newRole);
            
            return true;
        } else {
            console.error('❌ Role assignment failed:', result.error);
            showIsolatedNotification(result.error || 'Failed to update role!', 'error');
            return false;
        }
    } catch (error) {
        console.error('💥 Exception during isolated role assignment:', error);
        showIsolatedNotification('Failed to update role. Please try again.', 'error');
        return false;
    } finally {
        // Always restore user state
        restoreUserState(userBackup);
    }
}

// Force restore user state in every possible way
function restoreUserState(userBackup) {
    console.log('🔧 Force restoring user state');
    
    // Restore our isolated state
    isolatedCurrentUser = userBackup;
    
    // Restore localStorage
    localStorage.setItem('currentUser', JSON.stringify(userBackup));
    
    // Try to restore the global currentUser if it exists
    if (window.currentUser !== undefined) {
        window.currentUser = userBackup;
    }
    
    // Multiple restore attempts with delays
    setTimeout(() => {
        localStorage.setItem('currentUser', JSON.stringify(userBackup));
        if (window.currentUser !== undefined) {
            window.currentUser = userBackup;
        }
    }, 100);
    
    setTimeout(() => {
        localStorage.setItem('currentUser', JSON.stringify(userBackup));
        if (window.currentUser !== undefined) {
            window.currentUser = userBackup;
        }
        console.log('🔍 Final restore check - user should still be logged in');
    }, 500);
}

// Update just the specific dropdown that was changed
function updateSingleDropdown(username, newRole) {
    const userItem = document.querySelector(`[data-username="${username}"]`);
    if (userItem) {
        const dropdown = userItem.querySelector('.role-selector');
        if (dropdown) {
            dropdown.value = newRole;
            console.log('✅ Updated dropdown for', username, 'to', newRole);
        }
    }
}

// Show notifications without using the existing system
function showIsolatedNotification(message, type = 'info') {
    console.log(`📢 ${type.toUpperCase()}: ${message}`);
    
    // Create a simple notification that doesn't interfere with anything
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        ${type === 'success' ? 'background: #22c55e;' : 
          type === 'error' ? 'background: #ef4444;' : 
          'background: #3b82f6;'}
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

// Global functions for testing
window.isolatedRoleManager = {
    init: initializeRoleManager,
    assignRole: performIsolatedRoleAssignment,
    checkUser: () => {
        console.log('🔍 Isolated user check:', isolatedCurrentUser);
        console.log('🔍 localStorage user:', localStorage.getItem('currentUser'));
        console.log('🔍 Global currentUser:', window.currentUser);
    }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeRoleManager);
} else {
    initializeRoleManager();
}

console.log('✅ Role Manager ready - use isolatedRoleManager.checkUser() to debug');
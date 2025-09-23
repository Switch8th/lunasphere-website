// ===== FORM HANDLING & VALIDATION =====

class FormValidator {
    constructor(form, rules = {}) {
        this.form = form;
        this.rules = rules;
        this.errors = {};
        this.isValid = false;
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.setupRealTimeValidation();
    }
    
    bindEvents() {
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.validate();
            
            if (this.isValid) {
                this.submitForm();
            }
        });
    }
    
    setupRealTimeValidation() {
        const inputs = this.form.querySelectorAll('input, textarea, select');
        
        inputs.forEach(input => {
            input.addEventListener('blur', () => {
                this.validateField(input);
            });
            
            input.addEventListener('input', () => {
                if (this.errors[input.name]) {
                    this.validateField(input);
                }
            });
        });
    }
    
    validateField(field) {
        const fieldName = field.name;
        const fieldValue = field.value.trim();
        const fieldRules = this.rules[fieldName];
        
        if (!fieldRules) return true;
        
        // Clear previous error
        delete this.errors[fieldName];
        this.clearFieldError(field);
        
        // Apply validation rules
        for (let rule of fieldRules) {
            if (!this.applyRule(fieldValue, rule, field)) {
                this.errors[fieldName] = rule.message;
                this.showFieldError(field, rule.message);
                return false;
            }
        }
        
        this.showFieldSuccess(field);
        return true;
    }
    
    applyRule(value, rule, field) {
        switch (rule.type) {
            case 'required':
                return value.length > 0;
                
            case 'email':
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return !value || emailRegex.test(value);
                
            case 'minLength':
                return value.length >= rule.value;
                
            case 'maxLength':
                return value.length <= rule.value;
                
            case 'pattern':
                return new RegExp(rule.value).test(value);
                
            case 'phone':
                const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
                return !value || phoneRegex.test(value.replace(/\s/g, ''));
                
            case 'url':
                try {
                    new URL(value);
                    return true;
                } catch {
                    return !value;
                }
                
            case 'custom':
                return rule.validator(value, field);
                
            default:
                return true;
        }
    }
    
    validate() {
        this.errors = {};
        this.isValid = true;
        
        const inputs = this.form.querySelectorAll('input, textarea, select');
        
        inputs.forEach(input => {
            if (!this.validateField(input)) {
                this.isValid = false;
            }
        });
    }
    
    showFieldError(field, message) {
        const formGroup = field.closest('.form-group');
        
        // Remove existing error
        this.clearFieldError(field);
        
        // Add error styling
        formGroup.classList.add('has-error');
        field.classList.add('error');
        
        // Create error message element
        const errorElement = document.createElement('div');
        errorElement.className = 'field-error';
        errorElement.textContent = message;
        errorElement.style.cssText = `
            color: #FF5252;
            font-size: 0.8rem;
            margin-top: 0.5rem;
            opacity: 0;
            animation: fadeInUp 0.3s ease-out forwards;
        `;
        
        formGroup.appendChild(errorElement);
        
        // Animate field
        field.animate([
            { transform: 'translateX(-2px)' },
            { transform: 'translateX(2px)' },
            { transform: 'translateX(-2px)' },
            { transform: 'translateX(0)' }
        ], {
            duration: 300,
            easing: 'ease-in-out'
        });
    }
    
    showFieldSuccess(field) {
        const formGroup = field.closest('.form-group');
        
        formGroup.classList.remove('has-error');
        formGroup.classList.add('has-success');
        field.classList.remove('error');
        field.classList.add('success');
        
        // Remove success styling after 2 seconds
        setTimeout(() => {
            formGroup.classList.remove('has-success');
            field.classList.remove('success');
        }, 2000);
    }
    
    clearFieldError(field) {
        const formGroup = field.closest('.form-group');
        const existingError = formGroup.querySelector('.field-error');
        
        if (existingError) {
            existingError.remove();
        }
        
        formGroup.classList.remove('has-error');
        field.classList.remove('error');
    }
    
    async submitForm() {
        const formData = new FormData(this.form);
        const data = Object.fromEntries(formData.entries());
        
        // Show loading state
        this.setSubmitState('loading');
        
        try {
            const response = await fetch(this.form.action || '/api/contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                const result = await response.json();
                this.handleSuccess(result);
            } else {
                const error = await response.json();
                this.handleError(error.message || 'Failed to submit form');
            }
        } catch (error) {
            console.error('Form submission error:', error);
            this.handleError('Network error. Please check your connection and try again.');
        } finally {
            setTimeout(() => {
                this.setSubmitState('default');
            }, 2000);
        }
    }
    
    setSubmitState(state) {
        const submitButton = this.form.querySelector('button[type="submit"]');
        const originalText = submitButton.dataset.originalText || submitButton.innerHTML;
        
        if (!submitButton.dataset.originalText) {
            submitButton.dataset.originalText = originalText;
        }
        
        switch (state) {
            case 'loading':
                submitButton.innerHTML = '⏳ Sending...';
                submitButton.disabled = true;
                submitButton.classList.add('loading');
                break;
                
            case 'success':
                submitButton.innerHTML = '✅ Sent!';
                submitButton.disabled = true;
                submitButton.classList.add('success');
                break;
                
            case 'error':
                submitButton.innerHTML = '❌ Failed';
                submitButton.disabled = false;
                submitButton.classList.add('error');
                break;
                
            default:
                submitButton.innerHTML = originalText;
                submitButton.disabled = false;
                submitButton.classList.remove('loading', 'success', 'error');
        }
    }
    
    handleSuccess(result) {
        this.setSubmitState('success');
        this.showFormMessage('success', result.message || 'Thank you! Your message has been sent successfully.');
        
        // Reset form after delay
        setTimeout(() => {
            this.form.reset();
            this.clearAllErrors();
        }, 1000);
        
        // Fire success event
        this.form.dispatchEvent(new CustomEvent('formSuccess', { detail: result }));
    }
    
    handleError(message) {
        this.setSubmitState('error');
        this.showFormMessage('error', message);
        
        // Fire error event
        this.form.dispatchEvent(new CustomEvent('formError', { detail: { message } }));
    }
    
    showFormMessage(type, message) {
        // Remove existing message
        const existingMessage = this.form.querySelector('.form-message');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        const messageElement = document.createElement('div');
        messageElement.className = `form-message form-message--${type}`;
        messageElement.textContent = message;
        
        const styles = {
            success: 'background: rgba(78, 205, 196, 0.1); color: #4ECDC4; border: 1px solid #4ECDC4;',
            error: 'background: rgba(255, 82, 82, 0.1); color: #FF5252; border: 1px solid #FF5252;'
        };
        
        messageElement.style.cssText = `
            ${styles[type]}
            padding: 1rem;
            border-radius: 8px;
            margin-top: 1rem;
            text-align: center;
            opacity: 0;
            animation: fadeInUp 0.3s ease-out forwards;
        `;
        
        this.form.appendChild(messageElement);
        
        // Remove message after 5 seconds
        setTimeout(() => {
            messageElement.style.animation = 'fadeOut 0.3s ease-out forwards';
            setTimeout(() => messageElement.remove(), 300);
        }, 5000);
    }
    
    clearAllErrors() {
        const inputs = this.form.querySelectorAll('input, textarea, select');
        inputs.forEach(input => this.clearFieldError(input));
        
        const formMessage = this.form.querySelector('.form-message');
        if (formMessage) {
            formMessage.remove();
        }
    }
}

// Auto-save functionality for forms
class FormAutoSave {
    constructor(form, options = {}) {
        this.form = form;
        this.options = {
            key: options.key || `autosave_${form.id || 'form'}`,
            delay: options.delay || 1000,
            exclude: options.exclude || []
        };
        
        this.saveTimeout = null;
        this.init();
    }
    
    init() {
        this.loadSavedData();
        this.bindEvents();
    }
    
    bindEvents() {
        const inputs = this.form.querySelectorAll('input, textarea, select');
        
        inputs.forEach(input => {
            if (this.options.exclude.includes(input.name)) return;
            
            input.addEventListener('input', () => {
                clearTimeout(this.saveTimeout);
                this.saveTimeout = setTimeout(() => {
                    this.saveData();
                }, this.options.delay);
            });
        });
        
        // Clear saved data on successful submission
        this.form.addEventListener('formSuccess', () => {
            this.clearSavedData();
        });
    }
    
    saveData() {
        const formData = new FormData(this.form);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            if (!this.options.exclude.includes(key)) {
                data[key] = value;
            }
        }
        
        localStorage.setItem(this.options.key, JSON.stringify(data));
    }
    
    loadSavedData() {
        try {
            const savedData = localStorage.getItem(this.options.key);
            if (savedData) {
                const data = JSON.parse(savedData);
                
                Object.entries(data).forEach(([key, value]) => {
                    const input = this.form.querySelector(`[name="${key}"]`);
                    if (input && value) {
                        input.value = value;
                    }
                });
                
                this.showRestoreNotification();
            }
        } catch (error) {
            console.warn('Failed to load auto-saved form data:', error);
        }
    }
    
    showRestoreNotification() {
        const notification = document.createElement('div');
        notification.className = 'autosave-notification';
        notification.innerHTML = `
            <span>📝 Form data restored from auto-save</span>
            <button type="button" onclick="this.parentElement.remove()">✕</button>
        `;
        notification.style.cssText = `
            background: rgba(255, 211, 61, 0.1);
            color: #FFD93D;
            border: 1px solid #FFD93D;
            padding: 0.75rem;
            border-radius: 8px;
            margin-bottom: 1rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.9rem;
        `;
        
        this.form.insertBefore(notification, this.form.firstChild);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 10000);
    }
    
    clearSavedData() {
        localStorage.removeItem(this.options.key);
    }
}

// Character counter for text inputs
class CharacterCounter {
    constructor(input, maxLength) {
        this.input = input;
        this.maxLength = maxLength || parseInt(input.getAttribute('maxlength'));
        this.counter = null;
        
        this.init();
    }
    
    init() {
        if (!this.maxLength) return;
        
        this.createCounter();
        this.bindEvents();
        this.updateCounter();
    }
    
    createCounter() {
        this.counter = document.createElement('div');
        this.counter.className = 'character-counter';
        this.counter.style.cssText = `
            font-size: 0.8rem;
            color: var(--text-muted);
            text-align: right;
            margin-top: 0.5rem;
            transition: color 0.3s ease;
        `;
        
        const formGroup = this.input.closest('.form-group');
        formGroup.appendChild(this.counter);
    }
    
    bindEvents() {
        this.input.addEventListener('input', () => {
            this.updateCounter();
        });
    }
    
    updateCounter() {
        const currentLength = this.input.value.length;
        const remaining = this.maxLength - currentLength;
        
        this.counter.textContent = `${currentLength}/${this.maxLength}`;
        
        // Update color based on remaining characters
        if (remaining < 10) {
            this.counter.style.color = '#FF5252';
        } else if (remaining < 50) {
            this.counter.style.color = '#FF8A65';
        } else {
            this.counter.style.color = 'var(--text-muted)';
        }
    }
}

// Input masking for phone numbers, dates, etc.
class InputMask {
    constructor(input, mask) {
        this.input = input;
        this.mask = mask;
        this.init();
    }
    
    init() {
        this.input.addEventListener('input', (e) => {
            this.applyMask(e);
        });
    }
    
    applyMask(e) {
        let value = e.target.value.replace(/\D/g, '');
        let formattedValue = '';
        let maskIndex = 0;
        let valueIndex = 0;
        
        while (maskIndex < this.mask.length && valueIndex < value.length) {
            if (this.mask[maskIndex] === '9') {
                formattedValue += value[valueIndex];
                valueIndex++;
            } else {
                formattedValue += this.mask[maskIndex];
            }
            maskIndex++;
        }
        
        e.target.value = formattedValue;
    }
}

// Initialize forms when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize contact form validation
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        const validator = new FormValidator(contactForm, {
            name: [
                { type: 'required', message: 'Name is required' },
                { type: 'minLength', value: 2, message: 'Name must be at least 2 characters' }
            ],
            email: [
                { type: 'required', message: 'Email is required' },
                { type: 'email', message: 'Please enter a valid email address' }
            ],
            phone: [
                { type: 'phone', message: 'Please enter a valid phone number' }
            ],
            service: [
                { type: 'required', message: 'Please select a service' }
            ],
            message: [
                { type: 'required', message: 'Message is required' },
                { type: 'minLength', value: 10, message: 'Message must be at least 10 characters' },
                { type: 'maxLength', value: 1000, message: 'Message must not exceed 1000 characters' }
            ]
        });
        
        // Auto-save functionality
        new FormAutoSave(contactForm, {
            exclude: ['phone'] // Don't auto-save sensitive fields
        });
        
        // Character counter for message field
        const messageField = contactForm.querySelector('#message');
        if (messageField) {
            new CharacterCounter(messageField, 1000);
        }
        
        // Phone number masking
        const phoneField = contactForm.querySelector('#phone');
        if (phoneField) {
            new InputMask(phoneField, '+9 (999) 999-9999');
        }
        
        // Add floating labels effect
        const formInputs = contactForm.querySelectorAll('input, textarea, select');
        formInputs.forEach(input => {
            input.addEventListener('focus', () => {
                input.parentElement.classList.add('focused');
            });
            
            input.addEventListener('blur', () => {
                if (!input.value) {
                    input.parentElement.classList.remove('focused');
                }
            });
            
            // Check if input has value on page load
            if (input.value) {
                input.parentElement.classList.add('focused');
            }
        });
    }
    
    // Newsletter form (if exists)
    const newsletterForm = document.querySelector('.newsletter-form');
    if (newsletterForm) {
        new FormValidator(newsletterForm, {
            email: [
                { type: 'required', message: 'Email is required' },
                { type: 'email', message: 'Please enter a valid email address' }
            ]
        });
    }
    
    // Add CSS animations for form states
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        @keyframes fadeOut {
            from {
                opacity: 1;
            }
            to {
                opacity: 0;
            }
        }
        
        .form-group.has-error input,
        .form-group.has-error textarea,
        .form-group.has-error select {
            border-color: #FF5252;
            box-shadow: 0 0 0 3px rgba(255, 82, 82, 0.1);
        }
        
        .form-group.has-success input,
        .form-group.has-success textarea,
        .form-group.has-success select {
            border-color: #4ECDC4;
            box-shadow: 0 0 0 3px rgba(78, 205, 196, 0.1);
        }
        
        .btn.loading {
            opacity: 0.7;
            cursor: not-allowed;
        }
        
        .btn.success {
            background: #4ECDC4 !important;
        }
        
        .btn.error {
            background: #FF5252 !important;
        }
        
        .autosave-notification button {
            background: none;
            border: none;
            color: inherit;
            cursor: pointer;
            padding: 0.25rem;
            border-radius: 4px;
            transition: background-color 0.2s;
        }
        
        .autosave-notification button:hover {
            background: rgba(255, 255, 255, 0.1);
        }
    `;
    
    document.head.appendChild(style);
});

// Export classes for external use
window.FormValidator = FormValidator;
window.FormAutoSave = FormAutoSave;
window.CharacterCounter = CharacterCounter;
window.InputMask = InputMask;
// ===== ADVANCED ANIMATIONS =====

// Particle system for hero section
class ParticleSystem {
    constructor(container, options = {}) {
        this.container = container;
        this.particles = [];
        this.options = {
            particleCount: options.particleCount || 50,
            maxSpeed: options.maxSpeed || 0.5,
            minSpeed: options.minSpeed || 0.1,
            colors: options.colors || ['#6C63FF', '#FF6B9D', '#4ECDC4', '#FFD93D'],
            sizes: options.sizes || [2, 3, 4, 5]
        };
        
        this.init();
    }
    
    init() {
        this.createParticles();
        this.animate();
    }
    
    createParticles() {
        for (let i = 0; i < this.options.particleCount; i++) {
            this.particles.push({
                x: Math.random() * this.container.offsetWidth,
                y: Math.random() * this.container.offsetHeight,
                vx: (Math.random() - 0.5) * this.options.maxSpeed,
                vy: (Math.random() - 0.5) * this.options.maxSpeed,
                size: this.options.sizes[Math.floor(Math.random() * this.options.sizes.length)],
                color: this.options.colors[Math.floor(Math.random() * this.options.colors.length)],
                opacity: Math.random() * 0.5 + 0.2
            });
        }
    }
    
    animate() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = this.container.offsetWidth;
        canvas.height = this.container.offsetHeight;
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '1';
        
        this.container.appendChild(canvas);
        
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            this.particles.forEach(particle => {
                // Update position
                particle.x += particle.vx;
                particle.y += particle.vy;
                
                // Bounce off walls
                if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
                if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;
                
                // Keep particles in bounds
                particle.x = Math.max(0, Math.min(canvas.width, particle.x));
                particle.y = Math.max(0, Math.min(canvas.height, particle.y));
                
                // Draw particle
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                ctx.fillStyle = particle.color + Math.floor(particle.opacity * 255).toString(16);
                ctx.fill();
            });
            
            requestAnimationFrame(animate);
        };
        
        animate();
    }
}

// Magnetic effect for buttons and cards
class MagneticEffect {
    constructor(elements, strength = 0.3) {
        this.elements = Array.from(elements);
        this.strength = strength;
        this.init();
    }
    
    init() {
        this.elements.forEach(element => {
            element.addEventListener('mousemove', (e) => {
                const rect = element.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;
                
                element.style.transform = `translate(${x * this.strength}px, ${y * this.strength}px) scale(1.02)`;
            });
            
            element.addEventListener('mouseleave', () => {
                element.style.transform = 'translate(0px, 0px) scale(1)';
            });
        });
    }
}

// Text reveal animation
class TextReveal {
    constructor(element, options = {}) {
        this.element = element;
        this.options = {
            delay: options.delay || 0,
            duration: options.duration || 1000,
            ease: options.ease || 'ease-out'
        };
        
        this.init();
    }
    
    init() {
        const text = this.element.textContent;
        this.element.innerHTML = '';
        
        // Create spans for each character
        Array.from(text).forEach((char, index) => {
            const span = document.createElement('span');
            span.textContent = char === ' ' ? '\u00A0' : char;
            span.style.opacity = '0';
            span.style.transform = 'translateY(20px)';
            span.style.transition = `all ${this.options.duration}ms ${this.options.ease}`;
            span.style.transitionDelay = `${this.options.delay + index * 50}ms`;
            this.element.appendChild(span);
        });
        
        // Trigger animation when element is in view
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.reveal();
                    observer.unobserve(entry.target);
                }
            });
        });
        
        observer.observe(this.element);
    }
    
    reveal() {
        Array.from(this.element.children).forEach(span => {
            span.style.opacity = '1';
            span.style.transform = 'translateY(0)';
        });
    }
}

// Morphing shapes animation
class MorphingShape {
    constructor(element, paths, options = {}) {
        this.element = element;
        this.paths = paths;
        this.currentIndex = 0;
        this.options = {
            duration: options.duration || 3000,
            easing: options.easing || 'ease-in-out',
            autoplay: options.autoplay !== false
        };
        
        this.init();
    }
    
    init() {
        if (this.options.autoplay) {
            this.startAnimation();
        }
    }
    
    startAnimation() {
        setInterval(() => {
            this.morphToNext();
        }, this.options.duration);
    }
    
    morphToNext() {
        this.currentIndex = (this.currentIndex + 1) % this.paths.length;
        const nextPath = this.paths[this.currentIndex];
        
        this.element.style.transition = `d ${this.options.duration}ms ${this.options.easing}`;
        this.element.setAttribute('d', nextPath);
    }
}

// Scroll-triggered number counter
class ScrollCounter {
    constructor(element, endValue, options = {}) {
        this.element = element;
        this.endValue = endValue;
        this.currentValue = 0;
        this.options = {
            duration: options.duration || 2000,
            easing: options.easing || 'easeOutQuart',
            suffix: options.suffix || '',
            prefix: options.prefix || ''
        };
        
        this.init();
    }
    
    init() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.animate();
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });
        
        observer.observe(this.element);
    }
    
    animate() {
        const start = Date.now();
        const startValue = this.currentValue;
        
        const update = () => {
            const now = Date.now();
            const progress = Math.min((now - start) / this.options.duration, 1);
            const easedProgress = this.easeOutQuart(progress);
            
            this.currentValue = Math.floor(startValue + (this.endValue - startValue) * easedProgress);
            this.element.textContent = this.options.prefix + this.currentValue + this.options.suffix;
            
            if (progress < 1) {
                requestAnimationFrame(update);
            }
        };
        
        update();
    }
    
    easeOutQuart(t) {
        return 1 - (--t) * t * t * t;
    }
}

// Parallax scrolling effect
class ParallaxScroll {
    constructor() {
        this.elements = document.querySelectorAll('[data-parallax]');
        this.init();
    }
    
    init() {
        if (this.elements.length === 0) return;
        
        this.bindEvents();
        this.update();
    }
    
    bindEvents() {
        window.addEventListener('scroll', () => {
            requestAnimationFrame(() => this.update());
        });
    }
    
    update() {
        const scrolled = window.pageYOffset;
        const viewportHeight = window.innerHeight;
        
        this.elements.forEach(element => {
            const rate = parseFloat(element.dataset.parallax) || 0.5;
            const rect = element.getBoundingClientRect();
            
            if (rect.bottom >= 0 && rect.top <= viewportHeight) {
                const yPos = -(scrolled * rate);
                element.style.transform = `translateY(${yPos}px)`;
            }
        });
    }
}

// Mouse trail effect
class MouseTrail {
    constructor(options = {}) {
        this.options = {
            particleCount: options.particleCount || 15,
            particleLife: options.particleLife || 1000,
            particleSpeed: options.particleSpeed || 0.1,
            color: options.color || '#6C63FF'
        };
        
        this.particles = [];
        this.mouse = { x: 0, y: 0 };
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.animate();
    }
    
    bindEvents() {
        document.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
            
            this.addParticle();
        });
    }
    
    addParticle() {
        this.particles.push({
            x: this.mouse.x,
            y: this.mouse.y,
            size: Math.random() * 4 + 2,
            life: this.options.particleLife,
            maxLife: this.options.particleLife,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2
        });
        
        // Limit particle count
        if (this.particles.length > this.options.particleCount) {
            this.particles.shift();
        }
    }
    
    animate() {
        // Create canvas if it doesn't exist
        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
            this.ctx = this.canvas.getContext('2d');
            this.canvas.style.position = 'fixed';
            this.canvas.style.top = '0';
            this.canvas.style.left = '0';
            this.canvas.style.pointerEvents = 'none';
            this.canvas.style.zIndex = '9999';
            document.body.appendChild(this.canvas);
        }
        
        // Update canvas size
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.particles.forEach((particle, index) => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life -= 16;
            
            if (particle.life <= 0) {
                this.particles.splice(index, 1);
                return;
            }
            
            const opacity = particle.life / particle.maxLife;
            const size = particle.size * opacity;
            
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
            this.ctx.fillStyle = this.options.color + Math.floor(opacity * 255).toString(16);
            this.ctx.fill();
        });
        
        requestAnimationFrame(() => this.animate());
    }
}

// Stagger animation for lists
class StaggerAnimation {
    constructor(elements, options = {}) {
        this.elements = Array.from(elements);
        this.options = {
            delay: options.delay || 100,
            duration: options.duration || 600,
            distance: options.distance || 30,
            easing: options.easing || 'ease-out'
        };
        
        this.init();
    }
    
    init() {
        // Set initial state
        this.elements.forEach((element, index) => {
            element.style.opacity = '0';
            element.style.transform = `translateY(${this.options.distance}px)`;
            element.style.transition = `opacity ${this.options.duration}ms ${this.options.easing}, transform ${this.options.duration}ms ${this.options.easing}`;
        });
        
        // Observe for intersection
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.animate();
                    observer.disconnect();
                }
            });
        }, { threshold: 0.2 });
        
        if (this.elements.length > 0) {
            observer.observe(this.elements[0]);
        }
    }
    
    animate() {
        this.elements.forEach((element, index) => {
            setTimeout(() => {
                element.style.opacity = '1';
                element.style.transform = 'translateY(0px)';
            }, index * this.options.delay);
        });
    }
}

// Initialize animations when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize particle system for hero section
    const heroSection = document.querySelector('.hero');
    if (heroSection) {
        new ParticleSystem(heroSection, {
            particleCount: 30,
            colors: ['rgba(108, 99, 255, 0.3)', 'rgba(255, 107, 157, 0.3)', 'rgba(78, 205, 196, 0.3)']
        });
    }
    
    // Initialize magnetic effect for buttons and cards
    const magneticElements = document.querySelectorAll('.btn, .service-card, .portfolio-item');
    if (magneticElements.length > 0) {
        new MagneticEffect(magneticElements, 0.2);
    }
    
    // Initialize text reveal for titles
    const titleElements = document.querySelectorAll('.hero-title, .section-title');
    titleElements.forEach((element, index) => {
        new TextReveal(element, { delay: index * 200 });
    });
    
    // Initialize scroll counters
    const statNumbers = document.querySelectorAll('.stat-number[data-target]');
    statNumbers.forEach(element => {
        const target = parseInt(element.dataset.target);
        const suffix = element.dataset.suffix || '';
        new ScrollCounter(element, target, { suffix });
    });
    
    // Initialize parallax scrolling
    new ParallaxScroll();
    
    // Initialize stagger animations for lists
    const serviceFeatures = document.querySelectorAll('.service-features');
    serviceFeatures.forEach(list => {
        const items = list.querySelectorAll('li');
        new StaggerAnimation(items, { delay: 150 });
    });
    
    const portfolioItems = document.querySelectorAll('.portfolio-item');
    new StaggerAnimation(portfolioItems, { delay: 200, distance: 50 });
    
    // Initialize mouse trail (optional - can be resource intensive)
    if (!window.matchMedia('(max-width: 768px)').matches) {
        new MouseTrail({
            particleCount: 10,
            color: 'rgba(108, 99, 255, 0.5)'
        });
    }
});

// Export classes for external use
window.ParticleSystem = ParticleSystem;
window.MagneticEffect = MagneticEffect;
window.TextReveal = TextReveal;
window.ScrollCounter = ScrollCounter;
window.ParallaxScroll = ParallaxScroll;
window.MouseTrail = MouseTrail;
window.StaggerAnimation = StaggerAnimation;
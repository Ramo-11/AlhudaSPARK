// Layout JavaScript - Global functionality and utilities
document.addEventListener('DOMContentLoaded', function() {
    
    // Initialize layout functionality
    initializeLayout();
    
    // Smooth scrolling for anchor links
    initializeSmoothScrolling();
    
    // Accessibility improvements
    initializeAccessibility();
    
    // Performance optimizations
    initializePerformanceOptimizations();
    
    // External link handling
    initializeExternalLinks();
    
    // Back to top functionality
    initializeBackToTop();
});

// Initialize layout functionality
function initializeLayout() {
    // Add loaded class to body for CSS animations
    document.body.classList.add('loaded');
    
    // Handle viewport height issues on mobile
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    
    window.addEventListener('resize', () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    });
}

// Smooth scrolling for anchor links
function initializeSmoothScrolling() {
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    
    anchorLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href').substring(1);
            
            // Skip if it's just "#" or empty
            if (!targetId) return;
            
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                e.preventDefault();
                
                const navbar = document.querySelector('.navbar');
                const navbarHeight = navbar ? navbar.offsetHeight : 0;
                const offsetTop = targetElement.offsetTop - navbarHeight - 20;
                
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
                
                // Update URL without jumping
                if (history.pushState) {
                    history.pushState(null, null, `#${targetId}`);
                }
            }
        });
    });
}

// Accessibility improvements
function initializeAccessibility() {
    // Skip to main content link
    createSkipLink();
    
    // Focus management for modal-like interactions
    handleFocusManagement();
    
    // Keyboard navigation improvements
    improveKeyboardNavigation();
}

// Create skip to main content link
function createSkipLink() {
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.textContent = 'Skip to main content';
    skipLink.className = 'skip-link sr-only';
    skipLink.style.cssText = `
        position: absolute;
        top: -40px;
        left: 6px;
        background: var(--primary-color);
        color: white;
        padding: 8px;
        text-decoration: none;
        border-radius: 4px;
        z-index: 1000;
        transition: top 0.3s;
    `;
    
    skipLink.addEventListener('focus', function() {
        this.style.top = '6px';
        this.classList.remove('sr-only');
    });
    
    skipLink.addEventListener('blur', function() {
        this.style.top = '-40px';
        this.classList.add('sr-only');
    });
    
    document.body.insertBefore(skipLink, document.body.firstChild);
    
    // Add id to main content if it doesn't exist
    const mainContent = document.querySelector('.main-content, main');
    if (mainContent && !mainContent.id) {
        mainContent.id = 'main-content';
    }
}

// Handle focus management
function handleFocusManagement() {
    // Store the last focused element before modal/dropdown opens
    let lastFocusedElement = null;
    
    window.storeFocus = function() {
        lastFocusedElement = document.activeElement;
    };
    
    window.restoreFocus = function() {
        if (lastFocusedElement) {
            lastFocusedElement.focus();
        }
    };
}

// Improve keyboard navigation
function improveKeyboardNavigation() {
    // Add visible focus indicators for keyboard users
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Tab') {
            document.body.classList.add('keyboard-navigation');
        }
    });
    
    document.addEventListener('mousedown', function() {
        document.body.classList.remove('keyboard-navigation');
    });
}

// Performance optimizations
function initializePerformanceOptimizations() {
    // Lazy loading for images
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        img.classList.remove('lazy');
                        observer.unobserve(img);
                    }
                }
            });
        });
        
        document.querySelectorAll('img[data-src]').forEach(img => {
            img.classList.add('lazy');
            imageObserver.observe(img);
        });
    }
    
    // Debounced resize handler
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function() {
            window.dispatchEvent(new CustomEvent('debouncedResize'));
        }, 250);
    });
}

// Handle external links
function initializeExternalLinks() {
    const externalLinks = document.querySelectorAll('a[href^="http"]:not([href*="' + window.location.hostname + '"])');
    
    externalLinks.forEach(link => {
        // Add external link indicator
        if (!link.querySelector('.external-icon')) {
            const icon = document.createElement('span');
            icon.className = 'external-icon sr-only';
            icon.textContent = ' (opens in new window)';
            link.appendChild(icon);
        }
        
        // Set target and rel attributes for security
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
    });
}

// Back to top functionality
function initializeBackToTop() {
    // Create back to top button
    const backToTopButton = document.createElement('button');
    backToTopButton.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="18,15 12,9 6,15"></polyline>
        </svg>
        <span class="sr-only">Back to top</span>
    `;
    backToTopButton.className = 'back-to-top';
    backToTopButton.setAttribute('aria-label', 'Back to top');
    backToTopButton.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        width: 50px;
        height: 50px;
        background: var(--primary-color);
        color: white;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: var(--shadow-lg);
        transition: all var(--transition-normal);
        transform: translateY(100px);
        opacity: 0;
        z-index: var(--z-fixed);
    `;
    
    // Show/hide based on scroll position
    function toggleBackToTop() {
        if (window.scrollY > 300) {
            backToTopButton.style.transform = 'translateY(0)';
            backToTopButton.style.opacity = '1';
        } else {
            backToTopButton.style.transform = 'translateY(100px)';
            backToTopButton.style.opacity = '0';
        }
    }
    
    // Scroll to top functionality
    backToTopButton.addEventListener('click', function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
    
    // Throttled scroll listener
    let scrollTimeout;
    window.addEventListener('scroll', function() {
        if (!scrollTimeout) {
            scrollTimeout = setTimeout(function() {
                toggleBackToTop();
                scrollTimeout = null;
            }, 100);
        }
    });
    
    document.body.appendChild(backToTopButton);
}

// Utility functions
window.LayoutUtils = {
    // Show loading state
    showLoading: function(element) {
        if (element) {
            element.classList.add('loading');
            element.setAttribute('aria-busy', 'true');
        }
    },
    
    // Hide loading state
    hideLoading: function(element) {
        if (element) {
            element.classList.remove('loading');
            element.setAttribute('aria-busy', 'false');
        }
    },
    
    // Toast notification system
    showToast: function(message, type = 'info', duration = 5000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 2rem;
            right: 2rem;
            background: var(--${type === 'error' ? 'red' : type === 'success' ? 'green' : 'primary'}-color, var(--primary-color));
            color: white;
            padding: 1rem 1.5rem;
            border-radius: var(--border-radius-md);
            box-shadow: var(--shadow-lg);
            z-index: var(--z-modal);
            transform: translateX(100%);
            transition: transform var(--transition-normal);
        `;
        
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 100);
        
        // Remove after duration
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, duration);
    },
    
    // Scroll to element
    scrollToElement: function(element, offset = 0) {
        if (element) {
            const elementTop = element.offsetTop;
            const navbar = document.querySelector('.navbar');
            const navbarHeight = navbar ? navbar.offsetHeight : 0;
            
            window.scrollTo({
                top: elementTop - navbarHeight - offset,
                behavior: 'smooth'
            });
        }
    }
};
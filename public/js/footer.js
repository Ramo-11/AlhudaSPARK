// Footer JavaScript
(function() {
    'use strict';

    // Initialize
    init();

    function init() {
        setCurrentYear();
        setupSmoothScrolling();
    }

    // Set current year in copyright
    function setCurrentYear() {
        const yearElement = document.getElementById('currentYear');
        if (yearElement) {
            yearElement.textContent = new Date().getFullYear();
        }
    }

    // Smooth scrolling for footer links
    function setupSmoothScrolling() {
        const footerLinks = document.querySelectorAll('.footer a[href^="#"]');
        
        footerLinks.forEach(link => {
            link.addEventListener('click', handleSmoothScroll);
        });
    }

    function handleSmoothScroll(e) {
        const href = this.getAttribute('href');
        
        // Only handle hash links
        if (href && href.startsWith('#') && href.length > 1) {
            e.preventDefault();
            
            const targetId = href.substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                const navHeight = document.querySelector('.navbar')?.offsetHeight || 0;
                const targetPosition = targetElement.offsetTop - navHeight - 20;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        }
    }

    // Track footer link clicks (for analytics if needed)
    function trackFooterClick(category, label) {
        // Placeholder for analytics tracking
        // Can integrate with Google Analytics or other services
        console.log('Footer click:', { category, label });
    }

    // Add click tracking to footer links
    const footerLinks = document.querySelectorAll('.footer a');
    footerLinks.forEach(link => {
        link.addEventListener('click', function() {
            const section = this.closest('.footer-section');
            const category = section ? section.querySelector('h4')?.textContent : 'Footer';
            const label = this.textContent || this.getAttribute('aria-label');
            
            if (label) {
                trackFooterClick(category, label);
            }
        });
    });

})();
// Navigation JavaScript
(function() {
    'use strict';

    // DOM Elements
    const navbar = document.getElementById('navbar');
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');
    const navOverlay = document.getElementById('navOverlay');
    const navLinks = document.querySelectorAll('.nav-link');

    // Initialize
    init();

    function init() {
        setupMobileMenu();
        setupActiveLink();
        setupScrollBehavior();
    }

    // Mobile Menu Toggle
    function setupMobileMenu() {
        if (!navToggle || !navMenu) return;

        navToggle.addEventListener('click', toggleMobileMenu);
        navOverlay.addEventListener('click', closeMobileMenu);

        // Close menu on link click (mobile)
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    closeMobileMenu();
                }
            });
        });

        // Close menu on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && navMenu.classList.contains('active')) {
                closeMobileMenu();
            }
        });
    }

    function toggleMobileMenu() {
        const isActive = navMenu.classList.contains('active');
        
        if (isActive) {
            closeMobileMenu();
        } else {
            openMobileMenu();
        }
    }

    function openMobileMenu() {
        navMenu.classList.add('active');
        navToggle.classList.add('active');
        navOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeMobileMenu() {
        navMenu.classList.remove('active');
        navToggle.classList.remove('active');
        navOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    // Active Link Highlighting
    function setupActiveLink() {
        const currentPath = window.location.pathname;
        
        navLinks.forEach(link => {
            const linkPath = link.getAttribute('href');
            
            if (currentPath === linkPath || 
                (currentPath === '/' && linkPath === '/') ||
                (currentPath !== '/' && linkPath !== '/' && currentPath.startsWith(linkPath))) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    // Scroll Behavior
    function setupScrollBehavior() {
        let lastScroll = 0;
        
        window.addEventListener('scroll', () => {
            const currentScroll = window.pageYOffset;
            
            // Add scrolled class for shadow
            if (currentScroll > 10) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
            
            lastScroll = currentScroll;
        });
    }

    // Handle window resize
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (window.innerWidth > 768) {
                closeMobileMenu();
            }
        }, 250);
    });

})();
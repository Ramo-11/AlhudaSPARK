// Home Page JavaScript
(function() {
    'use strict';

    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', init);

    function init() {
        setupVideoPlayer();
        setupCountdown();
        animateStats();
    }

    // Video Player Enhancement
    function setupVideoPlayer() {
        // Check for video element (local file)
        const video = document.querySelector('.tournament-video:not(.youtube-video)');
        if (video) {
            // Add play button overlay for better UX
            video.addEventListener('loadedmetadata', function() {
                console.log('Video ready to play');
            });

            // Track video engagement
            video.addEventListener('play', function() {
                console.log('Video started');
            });

            video.addEventListener('ended', function() {
                console.log('Video completed');
            });

            // Handle video errors gracefully
            video.addEventListener('error', function(e) {
                console.error('Video error:', e);
                // Could show fallback content here
            });
        }

        // Check for YouTube iframe
        const youtubeVideo = document.querySelector('.youtube-video');
        if (youtubeVideo) {
            console.log('YouTube video embedded');
            // Could add YouTube API tracking here if needed
        }
    }

    // Countdown to Tournament
    function setupCountdown() {
        const tournamentDate = new Date('2025-11-01T09:00:00');
        const dateElement = document.querySelector('.date-highlight');
        
        if (!dateElement) return;

        // Check if we should show countdown
        const now = new Date();
        const daysUntil = Math.floor((tournamentDate - now) / (1000 * 60 * 60 * 24));
        
        // If tournament is more than 30 days away, show countdown
        if (daysUntil > 30) {
            const countdownSpan = document.createElement('span');
            countdownSpan.className = 'countdown-days';
            countdownSpan.style.fontSize = '0.9rem';
            countdownSpan.style.display = 'block';
            countdownSpan.style.marginTop = '0.5rem';
            countdownSpan.style.opacity = '0.9';
            countdownSpan.textContent = `${daysUntil} days to go!`;
            dateElement.parentNode.appendChild(countdownSpan);
        }
    }

    // Animate stats when they come into view
    function animateStats() {
        const statNumbers = document.querySelectorAll('.stat-number');
        if (!statNumbers.length) return;

        const observerOptions = {
            threshold: 0.5,
            rootMargin: '0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animateNumber(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        statNumbers.forEach(stat => {
            observer.observe(stat);
        });
    }

    // Animate number counting up
    function animateNumber(element) {
        const text = element.textContent;
        const isPlus = text.includes('+');
        const finalValue = parseInt(text.replace(/\D/g, ''));
        const duration = 1000;
        const increment = finalValue / (duration / 16);
        let current = 0;

        const timer = setInterval(() => {
            current += increment;
            if (current >= finalValue) {
                current = finalValue;
                clearInterval(timer);
                element.textContent = isPlus ? finalValue + '+' : finalValue;
            } else {
                element.textContent = Math.floor(current);
            }
        }, 16);
    }

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href && href !== '#' && href.length > 1) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    const navHeight = document.querySelector('.navbar')?.offsetHeight || 0;
                    const targetPosition = target.offsetTop - navHeight - 20;
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });

})();
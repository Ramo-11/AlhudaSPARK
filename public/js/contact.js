// Contact Page JavaScript
(function() {
    'use strict';

    // DOM Elements
    const form = document.getElementById('contactForm');
    const submitBtn = document.getElementById('submitBtn');
    const phoneInput = document.getElementById('phone');
    const successMessage = document.getElementById('successMessage');
    const errorMessage = document.getElementById('errorMessage');
    const successModal = document.getElementById('successModal');
    const errorModal = document.getElementById('errorModal');
    const modalClose = document.getElementById('modalClose');
    const modalDone = document.getElementById('modalDone');
    const errorModalClose = document.getElementById('errorModalClose');
    const errorModalOk = document.getElementById('errorModalOk');
    const errorModalText = document.getElementById('errorModalText');

    // Initialize
    init();

    function init() {
        setupFormHandling();
        setupModalHandling();
        setupPhoneFormatting();
    }

    // Form Handling
    function setupFormHandling() {
        if (form) {
            form.addEventListener('submit', handleFormSubmit);
        }
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        
        // Clear previous messages
        hideMessages();
        
        // Get form data
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        // Basic validation
        if (!validateForm(data)) {
            return;
        }
        
        // Process contact form
        await processContact(data);
    }

    function validateForm(data) {
        // Check required fields
        const requiredFields = ['firstName', 'lastName', 'email', 'subject', 'message'];
        
        for (const field of requiredFields) {
            if (!data[field] || data[field].trim() === '') {
                const fieldName = field.replace(/([A-Z])/g, ' $1').toLowerCase();
                showError(`Please fill in the ${fieldName} field.`);
                return false;
            }
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            showError('Please enter a valid email address.');
            return false;
        }
        
        // Validate message length
        if (data.message.trim().length < 10) {
            showError('Please enter a message with at least 10 characters.');
            return false;
        }
        
        return true;
    }

    async function processContact(data) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';
        hideMessages();

        try {
            const res = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await res.json();
            
            if (!res.ok || !result.success) {
                throw new Error(result?.error || 'Failed to send message');
            }

            // Show success modal
            showSuccessModal();
            
            // Show success message
            showSuccess(result.message || 'Message sent successfully.');
            
            // Reset form
            resetForm();

        } catch (err) {
            console.error('Contact form error:', err);
            showError(err.message || 'Could not send message. Please try again or contact us directly.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Send Message';
        }
    }

    // Modal Handling
    function setupModalHandling() {
        // Success modal
        if (modalClose) {
            modalClose.addEventListener('click', hideSuccessModal);
        }
        
        if (modalDone) {
            modalDone.addEventListener('click', () => {
                hideSuccessModal();
                scrollToTop();
            });
        }
        
        // Close success modal on outside click
        if (successModal) {
            successModal.addEventListener('click', (e) => {
                if (e.target === successModal) {
                    hideSuccessModal();
                }
            });
        }

        // Error modal
        if (errorModalClose) {
            errorModalClose.addEventListener('click', hideErrorModal);
        }
        
        if (errorModalOk) {
            errorModalOk.addEventListener('click', hideErrorModal);
        }
        
        // Close error modal on outside click
        if (errorModal) {
            errorModal.addEventListener('click', (e) => {
                if (e.target === errorModal) {
                    hideErrorModal();
                }
            });
        }
    }

    function showSuccessModal() {
        if (successModal) {
            successModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }

    function hideSuccessModal() {
        if (successModal) {
            successModal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    function showErrorModal() {
        if (errorModal) {
            errorModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }

    function hideErrorModal() {
        if (errorModal) {
            errorModal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    // Phone Number Formatting
    function setupPhoneFormatting() {
        if (phoneInput) {
            phoneInput.addEventListener('input', function(e) {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length > 0) {
                    if (value.length <= 3) {
                        value = `(${value}`;
                    } else if (value.length <= 6) {
                        value = `(${value.slice(0, 3)}) ${value.slice(3)}`;
                    } else {
                        value = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6, 10)}`;
                    }
                }
                e.target.value = value;
            });
        }
    }

    // Message Handling
    function showSuccess(message) {
        const successText = document.getElementById('successText');
        if (successText && successMessage) {
            successText.textContent = message;
            successMessage.style.display = 'block';
            hideError();
        }
    }

    function showError(message) {
        if (errorModalText && errorModal) {
            errorModalText.textContent = message;
            showErrorModal();
        }
    }

    function hideSuccess() {
        if (successMessage) {
            successMessage.style.display = 'none';
        }
    }

    function hideError() {
        if (errorMessage) {
            errorMessage.style.display = 'none';
        }
    }

    function hideMessages() {
        hideSuccess();
        hideError();
    }

    // Utility Functions
    function resetForm() {
        if (form) {
            form.reset();
        }
    }

    function scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    // Auto-resize textarea
    const messageTextarea = document.getElementById('message');
    if (messageTextarea) {
        messageTextarea.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.max(120, this.scrollHeight) + 'px';
        });
    }

})();
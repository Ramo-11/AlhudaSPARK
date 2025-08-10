// Sponsorship Page JavaScript
(function() {
    'use strict';

    // State
    let selectedTier = null;
    let selectedAmount = null;

    // DOM Elements
    const form = document.getElementById('sponsorshipForm');
    const tierCards = document.querySelectorAll('.tier-card');
    const selectButtons = document.querySelectorAll('.select-tier');
    const selectedTierDisplay = document.getElementById('selectedTierDisplay');
    const selectedTierText = document.getElementById('selectedTierText');
    const selectedAmountText = document.getElementById('selectedAmountText');
    const selectedTierInput = document.getElementById('selectedTier');
    const sponsorAmountInput = document.getElementById('sponsorAmount');
    const changeTierBtn = document.querySelector('.change-tier');
    const submitBtn = document.getElementById('submitBtn');
    const modal = document.getElementById('paymentModal');
    const modalClose = document.getElementById('modalClose');
    const modalDone = document.getElementById('modalDone');
    const successMessage = document.getElementById('successMessage');
    const errorMessage = document.getElementById('errorMessage');
    const phoneInput = document.getElementById('phone');
    const errorModal = document.getElementById('errorModal');
    const errorModalClose = document.getElementById('errorModalClose');
    const errorModalOk = document.getElementById('errorModalOk');
    const errorModalText = document.getElementById('errorModalText');

    // Initialize
    init();

    function init() {
        setupTierSelection();
        setupFormHandling();
        setupModalHandling();
        setupPhoneFormatting();
    }

    // Tier Selection
    function setupTierSelection() {
        selectButtons.forEach(button => {
            button.addEventListener('click', handleTierSelection);
        });

        if (changeTierBtn) {
            changeTierBtn.addEventListener('click', resetTierSelection);
        }
    }

    function handleTierSelection(e) {
        e.preventDefault();
        
        const button = e.target;
        const tierCard = button.closest('.tier-card');
        const tier = tierCard.dataset.tier;
        const amount = tierCard.dataset.amount;
        
        selectTier(tier, amount);
        scrollToForm();
    }

    function selectTier(tier, amount) {
        // Update state
        selectedTier = tier;
        selectedAmount = amount;
        
        // Update UI
        tierCards.forEach(card => card.classList.remove('selected'));
        const selectedCard = document.querySelector(`.tier-card[data-tier="${tier}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
        }
        
        // Update display
        const tierNames = {
            'diamond': 'Diamond Sponsor',
            'platinum': 'Platinum Sponsor',
            'gold': 'Gold Sponsor',
            'silver': 'Silver Sponsor'
        };
        
        selectedTierText.textContent = tierNames[tier];
        selectedAmountText.textContent = `$${parseInt(amount).toLocaleString()}`;
        selectedTierDisplay.style.display = 'flex';
        
        // Update hidden inputs
        selectedTierInput.value = tier;
        sponsorAmountInput.value = amount;
    }

    function resetTierSelection() {
        selectedTier = null;
        selectedAmount = null;
        
        tierCards.forEach(card => card.classList.remove('selected'));
        selectedTierDisplay.style.display = 'none';
        selectedTierInput.value = '';
        sponsorAmountInput.value = '';
        
        scrollToTiers();
    }

    function scrollToForm() {
        const formSection = document.querySelector('.registration-section');
        if (formSection) {
            const offset = 100;
            const targetPosition = formSection.offsetTop - offset;
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    }

    function scrollToTiers() {
        const tiersSection = document.querySelector('.tiers-section');
        if (tiersSection) {
            const offset = 100;
            const targetPosition = tiersSection.offsetTop - offset;
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
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
        
        // Validate tier selection
        if (!selectedTier) {
            showError('Please select a sponsorship tier');
            scrollToTiers();
            return;
        }
        
        // Get form data
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        // Add tier and amount
        data.tier = selectedTier;
        data.amount = selectedAmount;
        
        // Process registration
        await processRegistration(data);
    }

    async function processRegistration(data) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';
        hideMessages();

        try {
            const res = await fetch('/api/sponsor/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await res.json();
            
            if (!res.ok || !result.success) {
                throw new Error(result?.error || 'Registration failed');
            }

            // Update modal content with backend instructions
            updateModalContent(result);
            
            // Show modal
            showModal();
            
            // Show success message
            showSuccess(result.message || 'Registration saved successfully.');

        } catch (err) {
            console.error('Registration error:', err);
            showError(err.message || 'Could not save registration. Please try again or contact support.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Complete Registration';
        }
    }

    function updateModalContent(result) {
        const paymentInstructions = document.getElementById('paymentInstructions');
        const paymentDetails = document.getElementById('paymentDetails');
        const titleEl = document.getElementById('paymentTitle');

        if (result.instructions) {
            if (titleEl && result.instructions.title) {
                titleEl.textContent = result.instructions.title;
            }
            
            if (paymentInstructions && result.instructions.text) {
                paymentInstructions.textContent = result.instructions.text;
            }

            if (paymentDetails) {
                const details = result.instructions.details || '';
                const ref = result.sponsorId ? `<br><strong>Reference:</strong> ${result.sponsorId}` : '';
                paymentDetails.innerHTML = `${details}${ref}`;
            }
        }
    }

    // Modal Handling
    function setupModalHandling() {
        if (modalClose) {
            modalClose.addEventListener('click', hideModal);
        }
        
        if (modalDone) {
            modalDone.addEventListener('click', () => {
                hideModal();
                resetForm();
                showSuccess('Thank you for your sponsorship commitment! We will contact you soon.');
                scrollToTop();
            });
        }
        
        // Close modal on outside click
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    hideModal();
                }
            });
        }

        // Error modal handling
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

    function showModal() {
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }

    function hideModal() {
        if (modal) {
            modal.style.display = 'none';
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

    // Add these new functions
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
        resetTierSelection();
    }

    function scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

})();
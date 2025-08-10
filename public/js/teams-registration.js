// Team Registration Page JavaScript
(function() {
    'use strict';

    // State
    let playerCount = 0;
    const MIN_PLAYERS = 5;
    const MAX_PLAYERS = 10;

    // DOM Elements
    const form = document.getElementById('teamRegistrationForm');
    const playersContainer = document.getElementById('playersContainer');
    const addPlayerBtn = document.getElementById('addPlayerBtn');
    const playerCountDisplay = document.getElementById('playerCount');
    const submitBtn = document.getElementById('submitBtn');
    const modal = document.getElementById('paymentModal');
    const modalClose = document.getElementById('modalClose');
    const modalDone = document.getElementById('modalDone');
    const successMessage = document.getElementById('successMessage');
    const errorMessage = document.getElementById('errorMessage');
    const coachPhoneInput = document.getElementById('coachPhone');
    const emergencyPhoneInput = document.getElementById('emergencyPhone');
    const errorModal = document.getElementById('errorModal');
    const errorModalClose = document.getElementById('errorModalClose');
    const errorModalOk = document.getElementById('errorModalOk');
    const errorModalText = document.getElementById('errorModalText');
    const specialRequirementsInput = document.getElementById('specialRequirements');
    const specialReqCount = document.getElementById('specialReqCount');

    // Initialize
    init();

    function init() {
        setupPlayerManagement();
        setupFormHandling();
        setupModalHandling();
        setupPhoneFormatting();
        setupCharacterCounter();
        
        // Add initial players
        for (let i = 0; i < MIN_PLAYERS; i++) {
            addPlayer();
        }
    }

    // Player Management
    function setupPlayerManagement() {
        if (addPlayerBtn) {
            addPlayerBtn.addEventListener('click', addPlayer);
        }
    }

    function addPlayer() {
        if (playerCount >= MAX_PLAYERS) {
            showError('Maximum 10 players allowed per team');
            return;
        }

        playerCount++;
        const playerDiv = createPlayerCard(playerCount);
        playersContainer.appendChild(playerDiv);
        updatePlayerCount();
        updateAddPlayerButton();
    }

    function createPlayerCard(playerNum) {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player-card';
        playerDiv.dataset.playerNumber = playerNum;

        playerDiv.innerHTML = `
            <div class="player-header">
                <div class="player-number">Player ${playerNum}</div>
                ${playerNum > MIN_PLAYERS ? '<button type="button" class="remove-player" onclick="removePlayer(this)">×</button>' : ''}
            </div>
            <div class="player-fields">
                <div class="form-group">
                    <label for="playerName${playerNum}">Player Name *</label>
                    <input type="text" id="playerName${playerNum}" name="players[${playerNum-1}][playerName]" required>
                </div>
                <div class="form-group">
                    <label for="playerDob${playerNum}">Date of Birth *</label>
                    <input type="date" id="playerDob${playerNum}" name="players[${playerNum-1}][dateOfBirth]" required>
                </div>
                <div class="form-group player-id-upload">
                    <label for="playerIdPhoto${playerNum}">ID Photo *</label>
                    <div class="file-input-wrapper">
                        <input type="file" id="playerIdPhoto${playerNum}" name="players[${playerNum-1}][idPhoto]" class="file-input" accept="image/*" required>
                        <label for="playerIdPhoto${playerNum}" class="file-input-label">
                            <span class="file-text">Click to upload ID photo</span>
                        </label>
                    </div>
                </div>
            </div>
        `;

        // Setup file input handler for this player
        const fileInput = playerDiv.querySelector('.file-input');
        const fileLabel = playerDiv.querySelector('.file-input-label');
        const fileText = playerDiv.querySelector('.file-text');

        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                fileText.textContent = file.name;
                fileLabel.classList.add('has-file');
            } else {
                fileText.textContent = 'Click to upload ID photo';
                fileLabel.classList.remove('has-file');
            }
        });

        return playerDiv;
    }

    function removePlayer(btn) {
        if (playerCount <= MIN_PLAYERS) {
            showError(`Minimum ${MIN_PLAYERS} players required`);
            return;
        }

        const playerCard = btn.closest('.player-card');
        playerCard.remove();
        playerCount--;
        
        // Renumber players
        renumberPlayers();
        updatePlayerCount();
        updateAddPlayerButton();
    }

    function renumberPlayers() {
        const playerCards = playersContainer.querySelectorAll('.player-card');
        playerCards.forEach((card, index) => {
            const playerNum = index + 1;
            card.dataset.playerNumber = playerNum;
            
            // Update player number display
            const playerNumber = card.querySelector('.player-number');
            if (playerNumber) {
                playerNumber.textContent = `Player ${playerNum}`;
            }
            
            // Update input names and IDs
            const nameInput = card.querySelector('input[type="text"]');
            const dobInput = card.querySelector('input[type="date"]');
            const fileInput = card.querySelector('input[type="file"]');
            const fileLabel = card.querySelector('.file-input-label');
            
            if (nameInput) {
                nameInput.id = `playerName${playerNum}`;
                nameInput.name = `players[${index}][playerName]`;
                nameInput.previousElementSibling.setAttribute('for', `playerName${playerNum}`);
            }
            
            if (dobInput) {
                dobInput.id = `playerDob${playerNum}`;
                dobInput.name = `players[${index}][dateOfBirth]`;
                dobInput.previousElementSibling.setAttribute('for', `playerDob${playerNum}`);
            }
            
            if (fileInput) {
                fileInput.id = `playerIdPhoto${playerNum}`;
                fileInput.name = `players[${index}][idPhoto]`;
                fileInput.previousElementSibling.setAttribute('for', `playerIdPhoto${playerNum}`);
            }
            
            if (fileLabel) {
                fileLabel.setAttribute('for', `playerIdPhoto${playerNum}`);
            }
            
            // Show/hide remove button
            const removeBtn = card.querySelector('.remove-player');
            if (removeBtn) {
                if (playerNum <= MIN_PLAYERS) {
                    removeBtn.remove();
                }
            } else if (playerNum > MIN_PLAYERS) {
                // Add remove button if it doesn't exist and should exist
                const playerHeader = card.querySelector('.player-header');
                const newRemoveBtn = document.createElement('button');
                newRemoveBtn.type = 'button';
                newRemoveBtn.className = 'remove-player';
                newRemoveBtn.innerHTML = '×';
                newRemoveBtn.onclick = function() { removePlayer(this); };
                playerHeader.appendChild(newRemoveBtn);
            }
        });
    }

    function updatePlayerCount() {
        if (playerCountDisplay) {
            playerCountDisplay.textContent = playerCount;
        }
    }

    function updateAddPlayerButton() {
        if (addPlayerBtn) {
            addPlayerBtn.disabled = playerCount >= MAX_PLAYERS;
            if (playerCount >= MAX_PLAYERS) {
                addPlayerBtn.textContent = 'Maximum Players Reached';
            } else {
                addPlayerBtn.textContent = '+ Add Player';
            }
        }
    }

    // Make removePlayer globally accessible
    window.removePlayer = removePlayer;

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
        
        // Validate players
        if (playerCount < MIN_PLAYERS) {
            showError(`Minimum ${MIN_PLAYERS} players required`);
            scrollToPlayers();
            return;
        }
        
        // Validate all player fields are filled
        if (!validatePlayerFields()) {
            showError('Please fill in all required player information');
            scrollToPlayers();
            return;
        }
        
        // Process registration
        await processRegistration();
    }

    function validatePlayerFields() {
        const playerCards = playersContainer.querySelectorAll('.player-card');
        let allValid = true;
        
        playerCards.forEach(card => {
            const nameInput = card.querySelector('input[type="text"]');
            const dobInput = card.querySelector('input[type="date"]');
            const fileInput = card.querySelector('input[type="file"]');
            
            if (!nameInput.value.trim()) {
                nameInput.style.borderColor = 'var(--error-color)';
                allValid = false;
            } else {
                nameInput.style.borderColor = '';
            }
            
            if (!dobInput.value) {
                dobInput.style.borderColor = 'var(--error-color)';
                allValid = false;
            } else {
                dobInput.style.borderColor = '';
            }
            
            if (!fileInput.files[0]) {
                fileInput.closest('.file-input-wrapper').querySelector('.file-input-label').style.borderColor = 'var(--error-color)';
                allValid = false;
            } else {
                fileInput.closest('.file-input-wrapper').querySelector('.file-input-label').style.borderColor = '';
            }
        });
        
        return allValid;
    }

    async function processRegistration() {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';
        hideMessages();

        try {
            // Create FormData to handle file uploads
            const formData = new FormData(form);
            
            const res = await fetch('/api/team-registration', {
                method: 'POST',
                body: formData
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
            showSuccess(result.message || 'Team registration saved successfully.');

        } catch (err) {
            console.error('Registration error:', err);
            showError(err.message || 'Could not save registration. Please try again or contact support.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Register Team - $300';
        }
    }

    function updateModalContent(result) {
        const paymentInstructions = document.getElementById('paymentInstructions');
        const paymentDetails = document.getElementById('paymentDetails');

        if (result.instructions) {
            if (paymentInstructions && result.instructions.text) {
                paymentInstructions.textContent = result.instructions.text;
            }

            if (paymentDetails) {
                const details = result.instructions.details || '';
                const ref = result.teamId ? `<br><strong>Reference:</strong> ${result.teamId}` : '';
                paymentDetails.innerHTML = `${details}${ref}`;
            }
        }
    }

    // Phone Number Formatting
    function setupPhoneFormatting() {
        [coachPhoneInput, emergencyPhoneInput].forEach(phoneInput => {
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
        });
    }

    // Character Counter
    function setupCharacterCounter() {
        if (specialRequirementsInput && specialReqCount) {
            specialRequirementsInput.addEventListener('input', function(e) {
                const count = e.target.value.length;
                specialReqCount.textContent = count;
                
                if (count > 300) {
                    specialReqCount.style.color = 'var(--error-color)';
                } else if (count > 250) {
                    specialReqCount.style.color = 'var(--warning-color)';
                } else {
                    specialReqCount.style.color = '#666';
                }
            });
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
                showSuccess('Thank you for registering your team! We will contact you soon with further details.');
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
        
        // Reset players to minimum
        playersContainer.innerHTML = '';
        playerCount = 0;
        
        for (let i = 0; i < MIN_PLAYERS; i++) {
            addPlayer();
        }
        
        // Reset character counter
        if (specialReqCount) {
            specialReqCount.textContent = '0';
            specialReqCount.style.color = '#666';
        }
    }

    function scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    function scrollToPlayers() {
        const playersSection = document.querySelector('.players-header');
        if (playersSection) {
            const offset = 100;
            const targetPosition = playersSection.offsetTop - offset;
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    }

})();
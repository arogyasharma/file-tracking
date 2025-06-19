// Main JavaScript file for the File Tracking System

document.addEventListener('DOMContentLoaded', function() {
    // Initialize any components that need JavaScript
    
    // Add active class to current nav item
    const currentLocation = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentLocation) {
            link.classList.add('active');
        }
    });
    
    // Initialize any form validation with loading states
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
        form.addEventListener('submit', function(event) {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            } else {
                // Special handling for file creation form
                if (form.action.includes('/files') && form.method.toLowerCase() === 'post') {
                    event.preventDefault();
                    handleFileCreation(form);
                    return;
                }
                
                // Add loading state to submit button
                const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
                if (submitBtn) {
                    submitBtn.disabled = true;
                    const originalText = submitBtn.textContent || submitBtn.value;
                    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
                    
                    // Re-enable after 15 seconds as fallback
                    setTimeout(() => {
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = originalText;
                    }, 15000);
                }
            }
            
            form.classList.add('was-validated');
        });
    });
    
    // Handle file creation with better error handling
    function handleFileCreation(form) {
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        // Check if already processing to prevent double submission
        if (submitBtn.disabled || form.dataset.submitting === 'true') {
            console.log('Form submission already in progress, ignoring duplicate request');
            return;
        }
        
        // Mark form as submitting
        form.dataset.submitting = 'true';
        
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Creating File...';
        
        const formData = new FormData(form);
        
        fetch('/files', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
                });
            }
            return response.text();
        })
        .then(html => {
            // Success - redirect to the QR code page
            document.open();
            document.write(html);
            document.close();
        })
        .catch(error => {
            console.error('File creation error:', error);
            
            // Check if it's a duplicate file number error
            if (error.message.toLowerCase().includes('duplicate file number')) {
                // Highlight the file number field
                const fileNumberField = form.querySelector('#fileNumber');
                const errorDiv = form.querySelector('#fileNumberError');
                
                if (fileNumberField) {
                    fileNumberField.classList.add('is-invalid');
                    fileNumberField.focus();
                    
                    // Show error message in the form
                    if (errorDiv) {
                        errorDiv.textContent = '❌ ' + error.message;
                        errorDiv.style.display = 'block';
                    }
                    
                    // Remove the error styling and message after user starts typing
                    fileNumberField.addEventListener('input', function() {
                        this.classList.remove('is-invalid');
                        if (errorDiv) {
                            errorDiv.style.display = 'none';
                        }
                    }, { once: true });
                }
                
                alert('❌ DUPLICATE FILE NUMBER!\n\n' + error.message + '\n\nPlease enter a different file number and try again.');
            } else {
                alert('Error creating file: ' + error.message + '\n\nPlease check your internet connection and try again.');
            }
            
            // Reset form state
            form.dataset.submitting = 'false';
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        });
    }
    
    // Initialize any tooltips
    if (typeof $ !== 'undefined' && typeof $.fn.tooltip !== 'undefined') {
        $('[data-toggle="tooltip"]').tooltip();
    }
    
    // Add retry functionality for failed requests
    window.retryRequest = function(url, maxRetries = 3) {
        let retryCount = 0;
        
        function attemptRequest() {
            return fetch(url)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}`);
                    }
                    return response;
                })
                .catch(error => {
                    retryCount++;
                    if (retryCount < maxRetries) {
                        console.log(`Request failed, retrying... (${retryCount}/${maxRetries})`);
                        return new Promise(resolve => {
                            setTimeout(() => resolve(attemptRequest()), 1000 * retryCount);
                        });
                    } else {
                        throw error;
                    }
                });
        }
        
        return attemptRequest();
    };
    
    // Enhanced print function with error handling
    window.printQR = function() {
        try {
            // Check if QR image is loaded
            const qrImage = document.querySelector('.qr-container img');
            if (qrImage && !qrImage.complete) {
                alert('QR code is still loading. Please wait a moment and try again.');
                return;
            }
            
            window.print();
        } catch (error) {
            console.error('Print error:', error);
            alert('Error occurred while printing. Please try again or use your browser\'s print function (Ctrl+P).');
        }
    };
    
    // Add error handling for navigation links
    const navLinksWithRetry = document.querySelectorAll('a[href^="/files"], a[href^="/file/"]');
    navLinksWithRetry.forEach(link => {
        link.addEventListener('click', function(event) {
            // Add loading indicator for file-related links
            const originalText = this.textContent;
            this.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Loading...';
            
            // Restore original text after a delay (in case of slow navigation)
            setTimeout(() => {
                this.textContent = originalText;
            }, 3000);
        });
    });
    
    // Connection monitoring
    let isOnline = navigator.onLine;
    const connectionStatus = document.getElementById('connectionStatus');
    const statusText = document.getElementById('statusText');
    
    function updateConnectionStatus(online) {
        isOnline = online;
        if (online) {
            connectionStatus.className = 'connection-status';
            connectionStatus.style.display = 'none';
        } else {
            connectionStatus.className = 'connection-status offline';
            statusText.textContent = 'Connection lost. Some features may not work.';
            connectionStatus.style.display = 'block';
        }
    }
    
    // Monitor online/offline status
    window.addEventListener('online', () => updateConnectionStatus(true));
    window.addEventListener('offline', () => updateConnectionStatus(false));
    
    // Periodic health check
    function checkServerHealth() {
        if (!isOnline) return;
        
        fetch('/health', { 
            method: 'GET',
            cache: 'no-cache',
            timeout: 5000 
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Server health check failed');
            }
            return response.json();
        })
        .then(data => {
            if (data.status !== 'healthy') {
                showConnectionIssue('Server experiencing issues');
            }
        })
        .catch(error => {
            console.warn('Health check failed:', error);
            showConnectionIssue('Connection issues detected');
        });
    }
    
    function showConnectionIssue(message) {
        connectionStatus.className = 'connection-status reconnecting';
        statusText.textContent = message;
        connectionStatus.style.display = 'block';
        
        // Hide after 5 seconds
        setTimeout(() => {
            if (connectionStatus.classList.contains('reconnecting')) {
                connectionStatus.style.display = 'none';
            }
        }, 5000);
    }
    
    // Check server health every 30 seconds
    setInterval(checkServerHealth, 30000);
    
    // Initial connection status
    updateConnectionStatus(navigator.onLine);
});
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
                // Add loading state to submit button
                const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
                if (submitBtn) {
                    submitBtn.disabled = true;
                    const originalText = submitBtn.textContent || submitBtn.value;
                    submitBtn.textContent = 'Processing...';
                    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
                    
                    // Re-enable after 10 seconds as fallback
                    setTimeout(() => {
                        submitBtn.disabled = false;
                        submitBtn.textContent = originalText;
                    }, 10000);
                }
            }
            
            form.classList.add('was-validated');
        });
    });
    
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
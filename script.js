/**
 * IFC Email Preference Center
 * Connected to HubSpot and ReachInbox for email subscription management
 */

// API Base URL - uses relative path for Netlify Functions
const API_BASE = '/.netlify/functions';

// Parse URL parameters
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        email: params.get('email') || '',
        campaign: params.get('campaign') || 'Current Campaign',
        campaignId: params.get('campaignId') || params.get('campaign_id') || '',
        source: params.get('source') || 'unknown' // 'hubspot', 'reachinbox', etc.
    };
}

// Initialize page with URL parameters
function initializePage() {
    const params = getUrlParams();

    // Set email display
    const emailElement = document.getElementById('userEmail');
    if (emailElement) {
        if (params.email) {
            emailElement.textContent = params.email;
        } else {
            emailElement.textContent = 'Email not provided';
            emailElement.classList.add('email-missing');
        }
    }

    // Set campaign name
    const campaignElement = document.getElementById('campaignName');
    if (campaignElement) {
        campaignElement.textContent = params.campaign;
    }

    // If no email, show error in email display
    if (!params.email) {
        const emailDisplay = document.getElementById('emailDisplay');
        if (emailDisplay) {
            emailDisplay.classList.add('warning');
        }
    }
}

// Handle preference actions
async function handleAction(action) {
    const params = getUrlParams();

    // Validate email
    if (!params.email) {
        showModal('Error', 'No email address provided. Please use the link from your email.', 'error');
        return;
    }

    // Show loading state
    showLoadingState(true);

    let title, message;
    let success = false;

    try {
        switch (action) {
            case 'subscribe':
                await callAPI('/subscribe', {
                    email: params.email,
                    campaign: params.campaign,
                    source: params.source
                });
                title = 'Welcome Back!';
                message = `You've been re-subscribed to Impact Finance Center communications at ${params.email}.`;
                success = true;
                break;

            case 'unsubscribe-campaign':
                await callAPI('/unsubscribe-campaign', {
                    email: params.email,
                    campaign: params.campaign,
                    campaignId: params.campaignId,
                    source: params.source
                });
                title = 'Unsubscribed from Campaign';
                message = `You will no longer receive emails from "${params.campaign}". You'll still receive other communications from us.`;
                success = true;
                break;

            case 'unsubscribe-all':
                await callAPI('/unsubscribe-all', {
                    email: params.email,
                    source: params.source
                });
                title = 'Unsubscribed';
                message = `${params.email} has been removed from all Impact Finance Center mailing lists. We're sorry to see you go.`;
                success = true;
                break;

            default:
                throw new Error(`Unknown action: ${action}`);
        }
    } catch (error) {
        console.error(`[${action}] Error:`, error);
        title = 'Error';
        message = `There was a problem processing your request. Please try again later or contact us directly.`;
    } finally {
        showLoadingState(false);
    }

    showModal(title, message, success ? 'success' : 'error');
}

// Call API endpoint
async function callAPI(endpoint, data) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });

    const result = await response.json();

    if (!response.ok) {
        console.error('[API] Error response:', result);
        throw new Error(result.error || 'API request failed');
    }

    console.log('[API] Success:', result);
    return result;
}

// Show loading state on options
function showLoadingState(isLoading) {
    const options = document.querySelectorAll('.option-card');
    options.forEach(option => {
        if (isLoading) {
            option.classList.add('loading');
            option.disabled = true;
        } else {
            option.classList.remove('loading');
            option.disabled = false;
        }
    });
}

// Show modal with result
function showModal(title, message, type = 'success') {
    const modal = document.getElementById('successModal');
    const titleElement = document.getElementById('modalTitle');
    const messageElement = document.getElementById('modalMessage');
    const iconContainer = document.querySelector('.modal-icon');

    titleElement.textContent = title;
    messageElement.textContent = message;

    // Update icon based on type
    if (type === 'error') {
        iconContainer.classList.remove('success');
        iconContainer.classList.add('error');
        iconContainer.innerHTML = `
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
        `;
    } else {
        iconContainer.classList.remove('error');
        iconContainer.classList.add('success');
        iconContainer.innerHTML = `
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
        `;
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Close success modal
function closeModal() {
    const modal = document.getElementById('successModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

// Open privacy policy modal
function openPrivacyPolicy() {
    const modal = document.getElementById('privacyModal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Close privacy policy modal
function closePrivacyModal() {
    const modal = document.getElementById('privacyModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

// Close modal when clicking outside
document.addEventListener('click', function (e) {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
        document.body.style.overflow = '';
    }
});

// Close modal with Escape key
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        const modals = document.querySelectorAll('.modal.active');
        modals.forEach(modal => {
            modal.classList.remove('active');
        });
        document.body.style.overflow = '';
    }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', initializePage);

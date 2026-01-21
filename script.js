// Parse URL parameters
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        email: params.get('email') || 'your-email@example.com',
        campaign: params.get('campaign') || 'Current Campaign',
        source: params.get('source') || 'unknown' // 'cold' or 'warm'
    };
}

// Initialize page with URL parameters
function initializePage() {
    const params = getUrlParams();
    
    // Set email display
    const emailElement = document.getElementById('userEmail');
    if (emailElement) {
        emailElement.textContent = params.email;
    }
    
    // Set campaign name
    const campaignElement = document.getElementById('campaignName');
    if (campaignElement) {
        campaignElement.textContent = params.campaign;
    }
}

// Handle preference actions
function handleAction(action) {
    const params = getUrlParams();
    let title, message;
    
    switch (action) {
        case 'subscribe':
            title = 'Welcome Back!';
            message = `You've been re-subscribed to Impact Finance Center communications at ${params.email}.`;
            break;
        case 'unsubscribe-campaign':
            title = 'Unsubscribed from Campaign';
            message = `You will no longer receive emails from "${params.campaign}". You'll still receive other communications from us.`;
            break;
        case 'unsubscribe-all':
            title = 'Unsubscribed';
            message = `${params.email} has been removed from all Impact Finance Center mailing lists. We're sorry to see you go.`;
            break;
        default:
            return;
    }
    
    // In production, this would send data to the server
    // For now, just show the success modal
    savePreference(action, params);
    showModal(title, message);
}

// Save preference (mock function - would connect to Airtable in production)
async function savePreference(action, params) {
    const data = {
        email: params.email,
        campaign: params.campaign,
        source: params.source,
        action: action,
        timestamp: new Date().toISOString()
    };
    
    console.log('Saving preference to Airtable:', data);
    
    // In production, this would be:
    // await fetch('/api/preferences', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(data)
    // });
}

// Show success modal
function showModal(title, message) {
    const modal = document.getElementById('successModal');
    const titleElement = document.getElementById('modalTitle');
    const messageElement = document.getElementById('modalMessage');
    
    titleElement.textContent = title;
    messageElement.textContent = message;
    modal.classList.add('active');
    
    // Prevent body scroll
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
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
        document.body.style.overflow = '';
    }
});

// Close modal with Escape key
document.addEventListener('keydown', function(e) {
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

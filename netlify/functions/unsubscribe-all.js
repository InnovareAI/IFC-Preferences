/**
 * Unsubscribe All Function
 * Unsubscribes a contact from ALL email communications
 * - HubSpot: Unsubscribe from all email using v4 API
 * - ReachInbox: Add email to blocklist
 */

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
const REACHINBOX_API_KEY = process.env.REACHINBOX_API_KEY;

exports.handler = async (event, context) => {
    // Set CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { email, source } = JSON.parse(event.body);

        if (!email) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Email is required' })
            };
        }

        console.log(`[Unsubscribe All] Processing for: ${email}`);

        const results = {
            hubspot: null,
            reachinbox: null
        };

        // Run both unsubscribe operations in parallel
        const [hubspotResult, reachinboxResult] = await Promise.allSettled([
            HUBSPOT_API_KEY ? unsubscribeAllFromHubSpot(email) : Promise.resolve({ skipped: true }),
            REACHINBOX_API_KEY ? addToReachInboxBlocklist(email) : Promise.resolve({ skipped: true })
        ]);

        results.hubspot = hubspotResult.status === 'fulfilled'
            ? hubspotResult.value
            : { success: false, error: hubspotResult.reason?.message };

        results.reachinbox = reachinboxResult.status === 'fulfilled'
            ? reachinboxResult.value
            : { success: false, error: reachinboxResult.reason?.message };

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Successfully unsubscribed from all emails',
                email,
                ...results
            })
        };

    } catch (error) {
        console.error('[Unsubscribe All] Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Failed to process unsubscription',
                details: error.message
            })
        };
    }
};

/**
 * Unsubscribe from ALL HubSpot email communications
 * Uses the v4 API unsubscribe-all endpoint
 */
async function unsubscribeAllFromHubSpot(email) {
    try {
        const response = await fetch(
            `https://api.hubapi.com/communication-preferences/v4/statuses/${encodeURIComponent(email)}/unsubscribe-all`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    channel: 'EMAIL'
                })
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[HubSpot] Unsubscribe all failed:', errorText);

            // If the contact doesn't exist in HubSpot, that's okay
            if (response.status === 404) {
                console.log('[HubSpot] Contact not found, no action needed:', email);
                return { success: true, message: 'Contact not found in HubSpot' };
            }

            throw new Error(`HubSpot unsubscribe-all failed: ${response.status}`);
        }

        console.log('[HubSpot] Successfully unsubscribed from all emails:', email);
        return { success: true };

    } catch (error) {
        console.error('[HubSpot] Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Add email to ReachInbox blocklist
 * This prevents all future emails from being sent to this address
 */
async function addToReachInboxBlocklist(email) {
    try {
        const response = await fetch(
            'https://api.reachinbox.ai/api/v1/blocklist/add',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${REACHINBOX_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    emails: [email]
                })
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[ReachInbox] Add to blocklist failed:', errorText);
            throw new Error(`ReachInbox blocklist failed: ${response.status}`);
        }

        const result = await response.json();
        console.log('[ReachInbox] Successfully added to blocklist:', email);
        return { success: true, ...result };

    } catch (error) {
        console.error('[ReachInbox] Error:', error);
        return { success: false, error: error.message };
    }
}

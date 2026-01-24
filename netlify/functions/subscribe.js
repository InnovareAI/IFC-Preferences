/**
 * Subscribe Function
 * Re-subscribes a contact to HubSpot email communications
 */

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
const HUBSPOT_SUBSCRIPTION_ID = process.env.HUBSPOT_SUBSCRIPTION_ID || 'default'; // The subscription type ID

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
        const { email, campaign, source } = JSON.parse(event.body);

        if (!email) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Email is required' })
            };
        }

        console.log(`[Subscribe] Processing subscription for: ${email}`);

        // Subscribe to HubSpot
        const hubspotResult = await subscribeToHubSpot(email);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Successfully subscribed',
                email,
                hubspot: hubspotResult
            })
        };

    } catch (error) {
        console.error('[Subscribe] Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Failed to process subscription',
                details: error.message
            })
        };
    }
};

/**
 * Subscribe contact to HubSpot email subscription
 * Uses the v3 Subscription Preferences API
 */
async function subscribeToHubSpot(email) {
    if (!HUBSPOT_API_KEY) {
        console.warn('[HubSpot] API key not configured');
        return { success: false, message: 'HubSpot not configured' };
    }

    try {
        // First, get the subscription types to find the right one
        const subscriptionTypesResponse = await fetch(
            'https://api.hubapi.com/communication-preferences/v3/definitions',
            {
                headers: {
                    'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!subscriptionTypesResponse.ok) {
            const errorText = await subscriptionTypesResponse.text();
            console.error('[HubSpot] Failed to get subscription types:', errorText);
            throw new Error(`Failed to get subscription types: ${subscriptionTypesResponse.status}`);
        }

        const { subscriptionDefinitions } = await subscriptionTypesResponse.json();
        console.log('[HubSpot] Available subscription types:', subscriptionDefinitions?.map(s => ({ id: s.id, name: s.name })));

        // Use the first active subscription type if no specific one is configured
        const subscriptionType = HUBSPOT_SUBSCRIPTION_ID !== 'default'
            ? subscriptionDefinitions?.find(s => s.id === HUBSPOT_SUBSCRIPTION_ID)
            : subscriptionDefinitions?.[0];

        if (!subscriptionType) {
            console.warn('[HubSpot] No subscription type found');
            return { success: false, message: 'No subscription type configured' };
        }

        // Subscribe the contact
        const subscribeResponse = await fetch(
            `https://api.hubapi.com/communication-preferences/v3/subscribe`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    emailAddress: email,
                    subscriptionId: subscriptionType.id,
                    legalBasis: 'CONSENT_WITH_NOTICE',
                    legalBasisExplanation: 'User opted in via email preference center'
                })
            }
        );

        if (!subscribeResponse.ok) {
            const errorText = await subscribeResponse.text();
            console.error('[HubSpot] Subscribe failed:', errorText);

            // Check if it's because they need to use v4 API for re-subscription
            if (subscribeResponse.status === 400 && errorText.includes('opted out')) {
                // Try v4 API for re-subscription
                return await resubscribeWithV4(email, subscriptionType.id);
            }

            throw new Error(`HubSpot subscribe failed: ${subscribeResponse.status}`);
        }

        console.log('[HubSpot] Successfully subscribed:', email);
        return { success: true, subscriptionId: subscriptionType.id };

    } catch (error) {
        console.error('[HubSpot] Error:', error);
        throw error;
    }
}

/**
 * Re-subscribe using v4 API (for contacts who previously opted out)
 */
async function resubscribeWithV4(email, subscriptionId) {
    const response = await fetch(
        `https://api.hubapi.com/communication-preferences/v4/statuses/${encodeURIComponent(email)}/subscribe`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                subscriptionId: subscriptionId,
                channel: 'EMAIL',
                legalBasis: 'CONSENT_WITH_NOTICE',
                legalBasisExplanation: 'User re-subscribed via email preference center'
            })
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        console.error('[HubSpot v4] Re-subscribe failed:', errorText);
        throw new Error(`HubSpot v4 re-subscribe failed: ${response.status}`);
    }

    console.log('[HubSpot v4] Successfully re-subscribed:', email);
    return { success: true, subscriptionId, resubscribed: true };
}

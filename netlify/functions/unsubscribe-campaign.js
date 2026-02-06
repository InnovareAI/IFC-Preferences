/**
 * Unsubscribe Campaign Function
 * Unsubscribes a contact from a specific campaign
 * Routes to HubSpot or ReachInbox based on source param
 */

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
const REACHINBOX_API_KEY = process.env.REACHINBOX_API_KEY;

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    try {
        const { email, campaign, campaignId, source } = JSON.parse(event.body);

        if (!email) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Email is required' })
            };
        }

        console.log(`[Unsubscribe Campaign] Processing for: ${email}, Campaign: ${campaign}, Source: ${source}`);

        const results = {
            hubspot: null,
            reachinbox: null
        };

        if (source === 'reachinbox') {
            // ReachInbox source — only call ReachInbox blocklist
            results.reachinbox = REACHINBOX_API_KEY
                ? await addToReachInboxBlocklist(email)
                : { skipped: true, reason: 'No API key' };
        } else if (source === 'hubspot') {
            // HubSpot source — only call HubSpot
            results.hubspot = HUBSPOT_API_KEY
                ? await unsubscribeFromHubSpot(email, campaignId)
                : { skipped: true, reason: 'No API key' };
        } else {
            // Unknown source — try both (same pattern as unsubscribe-all)
            const [hubspotResult, reachinboxResult] = await Promise.allSettled([
                HUBSPOT_API_KEY ? unsubscribeFromHubSpot(email, campaignId) : Promise.resolve({ skipped: true }),
                REACHINBOX_API_KEY ? addToReachInboxBlocklist(email) : Promise.resolve({ skipped: true })
            ]);

            results.hubspot = hubspotResult.status === 'fulfilled'
                ? hubspotResult.value
                : { success: false, error: hubspotResult.reason?.message };

            results.reachinbox = reachinboxResult.status === 'fulfilled'
                ? reachinboxResult.value
                : { success: false, error: reachinboxResult.reason?.message };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: `Successfully unsubscribed from ${campaign}`,
                email,
                ...results
            })
        };

    } catch (error) {
        console.error('[Unsubscribe Campaign] Error:', error);
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
 * Add email to ReachInbox blocklist
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

async function unsubscribeFromHubSpot(email, campaignId) {
    try {
        // Use the campaignId as the subscriptionId if provided, or find the default one
        let subscriptionId = campaignId;

        if (!subscriptionId) {
            // Get subscription definitions to find a default if none provided
            const definitionsResponse = await fetch(
                'https://api.hubapi.com/communication-preferences/v3/definitions',
                {
                    headers: {
                        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (definitionsResponse.ok) {
                const { subscriptionDefinitions } = await definitionsResponse.json();
                subscriptionId = subscriptionDefinitions?.[0]?.id;
            }
        }

        if (!subscriptionId) {
            return { success: false, message: 'No subscription ID found' };
        }

        const response = await fetch(
            'https://api.hubapi.com/communication-preferences/v3/unsubscribe',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    emailAddress: email,
                    subscriptionId: subscriptionId,
                    legalBasis: 'CONSENT_WITH_NOTICE',
                    legalBasisExplanation: 'User opted out via email preference center'
                })
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[HubSpot] Unsubscribe failed:', errorText);
            throw new Error(`HubSpot unsubscribe failed: ${response.status}`);
        }

        return { success: true, subscriptionId };
    } catch (error) {
        console.error('[HubSpot] Error:', error);
        throw error;
    }
}

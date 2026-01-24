/**
 * Unsubscribe Campaign Function
 * Unsubscribes a contact from a specific campaign/subscription type
 * - HubSpot: Unsubscribe from specific subscription type
 * - ReachInbox: Update lead status to "Unsubscribed" for the campaign
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
        const { email, campaign, campaignId, source } = JSON.parse(event.body);

        if (!email) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Email is required' })
            };
        }

        console.log(`[Unsubscribe Campaign] Processing for: ${email}, campaign: ${campaign}`);

        const results = {
            hubspot: null,
            reachinbox: null
        };

        // Unsubscribe from HubSpot subscription type
        if (HUBSPOT_API_KEY) {
            results.hubspot = await unsubscribeFromHubSpot(email, campaign);
        }

        // Update lead status in ReachInbox
        if (REACHINBOX_API_KEY && campaignId) {
            results.reachinbox = await updateReachInboxLeadStatus(email, campaignId);
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: `Successfully unsubscribed from campaign: ${campaign}`,
                email,
                campaign,
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
 * Unsubscribe from HubSpot subscription type
 * Uses v3 API to unsubscribe from a specific subscription type
 */
async function unsubscribeFromHubSpot(email, campaignName) {
    try {
        // First, get all subscription types to find the matching one
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
            throw new Error(`Failed to get subscription types: ${subscriptionTypesResponse.status}`);
        }

        const { subscriptionDefinitions } = await subscriptionTypesResponse.json();

        // Find matching subscription type by name (case-insensitive partial match)
        const subscriptionType = subscriptionDefinitions?.find(s =>
            s.name.toLowerCase().includes(campaignName.toLowerCase()) ||
            campaignName.toLowerCase().includes(s.name.toLowerCase())
        );

        if (!subscriptionType) {
            console.log('[HubSpot] No matching subscription type found for campaign:', campaignName);
            // Still return success as unsubscribe action was acknowledged
            return { success: true, message: 'Campaign not found in HubSpot, no action taken' };
        }

        // Unsubscribe the contact from this subscription type
        const unsubscribeResponse = await fetch(
            'https://api.hubapi.com/communication-preferences/v3/unsubscribe',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    emailAddress: email,
                    subscriptionId: subscriptionType.id
                })
            }
        );

        if (!unsubscribeResponse.ok) {
            const errorText = await unsubscribeResponse.text();
            console.error('[HubSpot] Unsubscribe failed:', errorText);
            throw new Error(`HubSpot unsubscribe failed: ${unsubscribeResponse.status}`);
        }

        console.log('[HubSpot] Successfully unsubscribed from subscription type:', subscriptionType.name);
        return {
            success: true,
            subscriptionId: subscriptionType.id,
            subscriptionName: subscriptionType.name
        };

    } catch (error) {
        console.error('[HubSpot] Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Update lead status in ReachInbox
 * Sets the lead status to "Unsubscribed" for the specific campaign
 */
async function updateReachInboxLeadStatus(email, campaignId) {
    try {
        // First, we need to get the lead ID from the email and campaign
        const leadsResponse = await fetch(
            `https://api.reachinbox.ai/api/v1/leads?campaignId=${campaignId}&email=${encodeURIComponent(email)}`,
            {
                headers: {
                    'Authorization': `Bearer ${REACHINBOX_API_KEY}`
                }
            }
        );

        if (!leadsResponse.ok) {
            const errorText = await leadsResponse.text();
            console.error('[ReachInbox] Failed to get lead:', errorText);
            throw new Error(`Failed to get lead: ${leadsResponse.status}`);
        }

        const leadsData = await leadsResponse.json();
        const lead = leadsData.data?.find(l => l.email.toLowerCase() === email.toLowerCase());

        if (!lead) {
            console.log('[ReachInbox] Lead not found for email:', email);
            return { success: true, message: 'Lead not found in ReachInbox' };
        }

        // Update the lead status to "Unsubscribed"
        const updateResponse = await fetch(
            'https://api.reachinbox.ai/api/v1/leads',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${REACHINBOX_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    campaignId: campaignId,
                    leadId: lead.id,
                    leadStatus: 'Unsubscribed'
                })
            }
        );

        if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            console.error('[ReachInbox] Failed to update lead status:', errorText);
            throw new Error(`Failed to update lead status: ${updateResponse.status}`);
        }

        console.log('[ReachInbox] Successfully updated lead status to Unsubscribed');
        return { success: true, leadId: lead.id };

    } catch (error) {
        console.error('[ReachInbox] Error:', error);
        return { success: false, error: error.message };
    }
}

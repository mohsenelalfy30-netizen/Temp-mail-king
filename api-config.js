/**
 * Temp Mail King - API Configuration
 * Compatible with Worker version using Path: /messages & Param: email
 */

const WORKER_URL = 'https://api.king-tmail.tech'; 

export async function fetchInbox(emailAddress) {
    if (!emailAddress) {
        console.warn("No email address provided.");
        return [];
    }
    
    const cleanEmail = emailAddress.trim().toLowerCase();
    
    /**
     * Match Worker logic:
     * 1. Use pathname '/messages'
     * 2. Use query parameter 'email'
     */
    const fetchUrl = `${WORKER_URL}/messages?email=${encodeURIComponent(cleanEmail)}`;

    try {
        const response = await fetch(fetchUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            return Array.isArray(data) ? data : [];
        } 
        
        if (response.status === 404) {
            return [];
        }

        console.error(`Server Error: ${response.status}`);
        return [];

    } catch (error) {
        console.error("API Connection Error:", error);
        return [];
    }
}




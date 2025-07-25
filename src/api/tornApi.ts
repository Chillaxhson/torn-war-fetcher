import fetch from 'node-fetch';

const TORN_API_URL = 'https://api.torn.com';

interface TornApiError {
    error: {
        code: number;
        error: string;
    };
}

export async function fetchFactionData(factionID: string, apiKey: string): Promise<any> {
    const url = `${TORN_API_URL}/faction/${factionID}?selections=basic&key=${apiKey}`;
    
    // Blacklisted Faction IDs
    const blacklistedFactions: string[] = []; 
    if (blacklistedFactions.includes(factionID)) {
        throw new Error('This faction is blacklisted.');
    }

    const response = await fetch(url);
    const data = await response.json() as any;

    if (!response.ok || (data as TornApiError).error) {
        const errorDetails = (data as TornApiError).error 
            ? `Code ${'error' in data ? data.error.code : 'N/A'}: ${'error' in data ? data.error.error : 'Unknown API Error'}`
            : `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(`Torn API Error: ${errorDetails}`);
    }

    return data;
} 

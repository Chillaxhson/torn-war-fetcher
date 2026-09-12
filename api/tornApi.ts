import fetch from 'node-fetch';

const TORN_API_URL = 'https://api.torn.com';
const TORNCORTEX_API_URL = 'https://torncortex.com/elimination/api';

interface TornApiError {
    error: {
        code: number;
        error: string;
    };
}

// Fallback elimination teams in case TornCortex is unreachable
export const FALLBACK_TEAMS = [
    { id: 70, name: 'Brain Surgeons', color: '#afdfff', eliminated: false, lives: 50, score: 0 },
    { id: 80, name: 'Conspiracy Theorists', color: '#4095ac', eliminated: false, lives: 50, score: 0 },
    { id: 81, name: 'Inanimate Objects', color: '#b0bbbe', eliminated: true, lives: 0, score: 0 },
    { id: 82, name: 'Gold Dust', color: '#e4b35c', eliminated: false, lives: 50, score: 0 },
    { id: 83, name: 'Reptilians', color: '#839160', eliminated: false, lives: 50, score: 0 },
    { id: 84, name: 'Rocket Scientists', color: '#c74545', eliminated: false, lives: 50, score: 0 },
    { id: 85, name: 'Sticks and Stones', color: '#c17c6b', eliminated: false, lives: 50, score: 0 },
    { id: 86, name: 'APEX', color: '#6a737a', eliminated: false, lives: 50, score: 0 },
    { id: 87, name: 'Touching Grass', color: '#a1b60c', eliminated: false, lives: 50, score: 0 },
    { id: 88, name: 'Nine Lives', color: '#9796c0', eliminated: true, lives: 0, score: 0 },
    { id: 89, name: 'High Voltage', color: '#2c9dfd', eliminated: false, lives: 50, score: 0 },
    { id: 90, name: 'Loose Cannons', color: '#3469a8', eliminated: false, lives: 50, score: 0 }
];

// In-memory cache for elimination member data (TTL: 30 minutes)
interface CachedEliminationMember {
    teamId: number | null;
    teamName: string;
    bsEstimate: number | null;
    attacks?: number;
    fetchedAt: number;
}

const eliminationMemberCache = new Map<string, CachedEliminationMember>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

let cachedTeams: any[] | null = null;
let cachedTeamsAt = 0;
const TEAMS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function fetchFactionData(factionID: string, apiKey: string): Promise<any> {
    const url = `${TORN_API_URL}/faction/${factionID}?selections=basic&key=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json() as any;

    if (!response.ok || (data as TornApiError).error) {
        const errorDetails = (data as TornApiError).error 
            ? `Code ${data.error.code}: ${data.error.error}`
            : `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(`Torn API Error: ${errorDetails}`);
    }

    return data;
}

export async function fetchUserData(apiKey: string): Promise<any> {
    // Try to get battlestats and profile
    let profileData: any = null;
    let battleStatsData: any = null;

    try {
        const url = `${TORN_API_URL}/user/?selections=profile,battlestats&key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json() as any;

        if (data && !data.error) {
            profileData = data;
            battleStatsData = {
                strength: data.strength || 0,
                speed: data.speed || 0,
                defense: data.defense || 0,
                dexterity: data.dexterity || 0,
                total: data.total || (data.strength || 0) + (data.speed || 0) + (data.defense || 0) + (data.dexterity || 0)
            };
        } else if (data && data.error && (data.error.code === 7 || data.error.code === 16)) {
            // Permission error for battlestats (e.g. Public API key), fallback to profile only
            const fallbackUrl = `${TORN_API_URL}/user/?selections=profile&key=${apiKey}`;
            const fallbackRes = await fetch(fallbackUrl);
            profileData = await fallbackRes.json();
        } else if (data && data.error) {
            throw new Error(`Torn API Error: ${data.error.error} (Code ${data.error.code})`);
        }
    } catch (err: any) {
        throw new Error(`Failed to fetch user data: ${err.message}`);
    }

    if (!profileData || profileData.error) {
        throw new Error(profileData?.error?.error || 'Unknown error fetching user profile');
    }

    const userId = profileData.player_id;
    const userName = profileData.name;
    const userLevel = profileData.level;

    // Check elimination team and stats estimate from TornCortex
    let eliminationInfo: any = null;
    if (userId) {
        try {
            const cortexRes = await fetch(`${TORNCORTEX_API_URL}/me?who=${userId}`);
            const cortexData = await cortexRes.json() as any;
            if (cortexData && cortexData.ok && cortexData.you) {
                eliminationInfo = {
                    teamId: cortexData.you.teamId,
                    team: cortexData.you.team,
                    bsEstimate: cortexData.you.bsEstimate,
                    attacks: cortexData.you.attacks,
                    attackRank: cortexData.you.attackRank,
                    attackRankOf: cortexData.you.attackRankOf
                };
            }
        } catch {
            // TornCortex lookup is optional, continue without it
        }
    }

    return {
        id: userId,
        name: userName,
        level: userLevel,
        factionId: profileData.faction?.faction_id || null,
        factionName: profileData.faction?.faction_name || null,
        battleStats: battleStatsData,
        elimination: eliminationInfo
    };
}

export async function fetchEliminationTeams(): Promise<any[]> {
    const now = Date.now();
    if (cachedTeams && (now - cachedTeamsAt < TEAMS_CACHE_TTL_MS)) {
        return cachedTeams;
    }

    try {
        const response = await fetch(`${TORNCORTEX_API_URL}/teams`);
        const data = await response.json() as any;
        if (data && data.ok && Array.isArray(data.teams)) {
            const teamColours: Record<number, string> = {
                70: '#afdfff', 80: '#4095ac', 81: '#b0bbbe', 82: '#e4b35c',
                83: '#839160', 84: '#c74545', 85: '#c17c6b', 86: '#6a737a',
                87: '#a1b60c', 88: '#9796c0', 89: '#2c9dfd', 90: '#3469a8'
            };

            const teams = data.teams.map((t: any) => ({
                id: Number(t.id),
                name: t.name,
                color: teamColours[Number(t.id)] || '#4CAF50',
                eliminated: Boolean(t.eliminated),
                lives: t.lives !== undefined ? t.lives : 50,
                score: t.score !== undefined ? t.score : 0,
                participants: t.participants || 0,
                ours: Boolean(t.ours)
            }));
            cachedTeams = teams;
            cachedTeamsAt = now;
            return teams;
        }
    } catch (e) {
        console.warn('Could not fetch teams from TornCortex, using fallback teams list:', e);
    }

    return FALLBACK_TEAMS;
}

// Fetch single member elimination info with cache
async function getMemberElimination(memberId: string): Promise<CachedEliminationMember> {
    const now = Date.now();
    const cached = eliminationMemberCache.get(memberId);
    if (cached && (now - cached.fetchedAt < CACHE_TTL_MS)) {
        return cached;
    }

    try {
        const res = await fetch(`${TORNCORTEX_API_URL}/me?who=${memberId}`);
        const data = await res.json() as any;
        if (data && data.ok && data.you) {
            const entry: CachedEliminationMember = {
                teamId: data.you.teamId ? Number(data.you.teamId) : null,
                teamName: data.you.team || 'No Team',
                bsEstimate: data.you.bsEstimate ? Number(data.you.bsEstimate) : null,
                attacks: data.you.attacks || 0,
                fetchedAt: now
            };
            eliminationMemberCache.set(memberId, entry);
            return entry;
        }
    } catch {
        // failed or not in elimination
    }

    const notFoundEntry: CachedEliminationMember = {
        teamId: null,
        teamName: 'None',
        bsEstimate: null,
        fetchedAt: now
    };
    eliminationMemberCache.set(memberId, notFoundEntry);
    return notFoundEntry;
}

export async function fetchFactionEliminationMembers(memberIds: string[]): Promise<Record<string, CachedEliminationMember>> {
    const result: Record<string, CachedEliminationMember> = {};
    const toFetch: string[] = [];

    const now = Date.now();
    for (const id of memberIds) {
        const cached = eliminationMemberCache.get(id);
        if (cached && (now - cached.fetchedAt < CACHE_TTL_MS)) {
            result[id] = cached;
        } else {
            toFetch.push(id);
        }
    }

    if (toFetch.length === 0) {
        return result;
    }

    // Try pre-populating from TornCortex /api/board first to minimize individual calls
    try {
        const boardRes = await fetch(`${TORNCORTEX_API_URL}/board?top=5000`);
        const boardData = await boardRes.json() as any;
        if (boardData && boardData.ok && Array.isArray(boardData.ranked)) {
            const boardMap = new Map<number, any>();
            for (const r of boardData.ranked) {
                boardMap.set(Number(r.i), r);
            }

            const stillToFetch: string[] = [];
            for (const id of toFetch) {
                const r = boardMap.get(Number(id));
                if (r) {
                    const entry: CachedEliminationMember = {
                        teamId: Number(r.t),
                        teamName: r.tn || String(r.t),
                        bsEstimate: r.e ? Number(r.e) : null,
                        attacks: r.a || 0,
                        fetchedAt: now
                    };
                    eliminationMemberCache.set(id, entry);
                    result[id] = entry;
                } else {
                    stillToFetch.push(id);
                }
            }
            toFetch.length = 0;
            toFetch.push(...stillToFetch);
        }
    } catch (e) {
        // Continue to individual fetch
    }

    // Fetch remaining in small batches with concurrency limit
    const batchSize = 10;
    for (let i = 0; i < toFetch.length; i += batchSize) {
        const batch = toFetch.slice(i, i + batchSize);
        const batchPromises = batch.map(async (id) => {
            const data = await getMemberElimination(id);
            result[id] = data;
        });
        await Promise.all(batchPromises);
    }

    return result;
}
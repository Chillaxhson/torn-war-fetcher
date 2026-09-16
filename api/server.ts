import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { 
    fetchFactionData, 
    fetchUserData, 
    fetchEliminationTeams, 
    fetchFactionEliminationMembers,
    fetchSpyData,
    fetchElimTeamData,
    normalizeRawTeamData
} from './tornApi.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// The 'dist' directory is in the project root, which is one level above this file's parent directory ('api').
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// User Profile & Battle Stats
app.get('/api/user/me', async (req: Request, res: Response) => {
    const apiKey = req.headers['x-api-key'] as string;
    if (!apiKey) {
        return res.status(401).json({ error: 'API key not provided in X-API-Key header.' });
    }

    try {
        const data = await fetchUserData(apiKey);
        res.json(data);
    } catch (error: any) {
        console.error('Error fetching user data:', error);
        res.status(500).json({ error: 'Failed to fetch user profile from Torn API.', details: error.message });
    }
});

// Faction Data for War Targets (no elimination baggage, enriched with spy data)
app.get('/api/faction/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const apiKey = req.headers['x-api-key'] as string;
    const provider = (req.query.provider as string) || 'ffscouter';
    const skipSpy = req.query.skipSpy === 'true';
    const forceRefresh = req.query.forceRefresh === 'true';
    const tornStatsKey = req.headers['x-tornstats-key'] as string | undefined;
    const ffScouterKey = req.headers['x-ffscouter-key'] as string | undefined;

    if (!apiKey) {
        return res.status(401).json({ error: 'API key not provided in X-API-Key header.' });
    }

    try {
        const factionData = await fetchFactionData(id, apiKey);
        const memberIds = Object.keys(factionData.members || {});
        
        let spyData: Record<string, any> = {};
        if (!skipSpy && memberIds.length > 0) {
            try {
                spyData = await fetchSpyData(id, memberIds, provider, apiKey, tornStatsKey, forceRefresh, ffScouterKey);
            } catch (spyErr) {
                console.error('Failed to fetch spy data for war targets:', spyErr);
            }
        }

        const membersWithStats: Record<string, any> = {};
        for (const [mId, mInfo] of Object.entries(factionData.members || {})) {
            const spy = spyData[mId];
            membersWithStats[mId] = {
                ...(mInfo as any),
                bsEstimate: spy ? spy.estimate : null,
                bsEstimateSource: spy ? spy.source : null,
                fairFight: spy?.fairFight || null,
            };
        }

        res.json({
            ...factionData,
            members: membersWithStats
        });
    } catch (error: any) {
        console.error('Error fetching faction data:', error);
        res.status(500).json({ error: 'Failed to fetch data from Torn API.', details: error.message });
    }
});

// Elimination Teams List
app.get('/api/elimination/teams', async (req: Request, res: Response) => {
    try {
        const teams = await fetchEliminationTeams();
        res.json({ ok: true, teams });
    } catch (error: any) {
        console.error('Error fetching elimination teams:', error);
        res.status(500).json({ error: 'Failed to fetch elimination teams.', details: error.message });
    }
});

// Elimination Members by IDs
app.post('/api/elimination/members', async (req: Request, res: Response) => {
    const { memberIds } = req.body;
    if (!Array.isArray(memberIds)) {
        return res.status(400).json({ error: 'memberIds must be an array of player IDs.' });
    }

    try {
        const memberElimData = await fetchFactionEliminationMembers(memberIds);
        res.json({ ok: true, members: memberElimData });
    } catch (error: any) {
        console.error('Error fetching elimination members:', error);
        res.status(500).json({ error: 'Failed to fetch elimination members data.', details: error.message });
    }
});

// Elimination Team Roster from Torn internal endpoint
app.all('/api/elimination/team-roster', async (req: Request, res: Response) => {
    try {
        const queryOrBody = req.method === 'POST' ? req.body : req.query;
        
        // If client sends raw JSON payload directly to be normalized
        if (queryOrBody.rawJson) {
            let rawData = queryOrBody.rawJson;
            if (typeof rawData === 'string') {
                try {
                    rawData = JSON.parse(rawData);
                } catch {
                    return res.status(400).json({ error: 'Invalid JSON string provided.' });
                }
            }
            const normalized = normalizeRawTeamData(rawData, Number(queryOrBody.p || 1));
            return res.json({ ok: true, ...normalized });
        }

        const teamID = queryOrBody.teamID || queryOrBody.teamId || 89;
        const rfcv = queryOrBody.rfcv as string | undefined;
        const p = Number(queryOrBody.p || queryOrBody.page || 1);
        const showAvailable = Number(queryOrBody.showAvailable || 0);
        const cookie = (queryOrBody.cookie as string) || (req.headers['x-torn-cookie'] as string) || '';
        const fetchAll = queryOrBody.fetchAll === 'true' || queryOrBody.fetchAll === true;

        if (!fetchAll) {
            const data = await fetchElimTeamData({
                teamID,
                rfcv,
                p,
                showAvailable,
                cookie
            });
            return res.json(data);
        }

        // Auto-fetch all pages
        const allMembers: any[] = [];
        let currentPage = 1;
        let totalPages = 1;
        let teamName = '';

        while (currentPage <= totalPages && currentPage <= 30) {
            const pageData = await fetchElimTeamData({
                teamID,
                rfcv,
                p: currentPage,
                showAvailable,
                cookie
            });

            if (pageData.teamName) {
                teamName = pageData.teamName;
            }
            if (pageData.totalPages && pageData.totalPages > totalPages) {
                totalPages = pageData.totalPages;
            }

            if (Array.isArray(pageData.members) && pageData.members.length > 0) {
                allMembers.push(...pageData.members);
            } else {
                break;
            }

            // Small delay to prevent rate-limiting
            if (currentPage < totalPages) {
                await new Promise(resolve => setTimeout(resolve, 300));
            }
            currentPage++;
        }

        // Deduplicate members by userID
        const memberMap = new Map<number, any>();
        for (const m of allMembers) {
            memberMap.set(m.userID, m);
        }
        const uniqueMembers = Array.from(memberMap.values());

        res.json({
            ok: true,
            teamID: Number(teamID),
            teamName,
            total: uniqueMembers.length,
            totalPages,
            members: uniqueMembers
        });
    } catch (error: any) {
        console.error('Error in /api/elimination/team-roster:', error);
        res.status(500).json({ 
            ok: false, 
            error: error.message || 'Failed to fetch elimination team roster.',
            isCloudflare: error.message?.includes('Cloudflare')
        });
    }
});

// Enriched Faction Data with Elimination Info (Used by Elimination Tab)
app.get('/api/elimination/faction/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const apiKey = req.headers['x-api-key'] as string;
    const provider = (req.query.provider as string) || 'ffscouter';
    const skipSpy = req.query.skipSpy === 'true';
    const forceRefresh = req.query.forceRefresh === 'true';
    const tornStatsKey = req.headers['x-tornstats-key'] as string | undefined;
    const ffScouterKey = req.headers['x-ffscouter-key'] as string | undefined;

    if (!apiKey) {
        return res.status(401).json({ error: 'API key not provided in X-API-Key header.' });
    }

    try {
        const factionData = await fetchFactionData(id, apiKey);
        const memberIds = Object.keys(factionData.members || {});
        
        // Enrich members with elimination data
        const eliminationData = await fetchFactionEliminationMembers(memberIds);
        
        // Optionally fetch spy data
        let spyData: Record<string, any> = {};
        if (!skipSpy && memberIds.length > 0) {
            try {
                spyData = await fetchSpyData(id, memberIds, provider, apiKey, tornStatsKey, forceRefresh, ffScouterKey);
            } catch (spyErr) {
                console.error('Failed to fetch spy data:', spyErr);
            }
        }
        
        // Merge elimination data and spy data into members
        const enrichedMembers: Record<string, any> = {};
        for (const [mId, mInfo] of Object.entries(factionData.members || {})) {
            const elimInfo = eliminationData[mId] || {
                teamId: null,
                teamName: 'None',
                bsEstimate: null
            };
            
            // Overlay spy data if available
            const spy = spyData[mId];
            if (spy) {
                elimInfo.bsEstimate = spy.estimate;
                elimInfo.bsEstimateSource = spy.source;
            } else if (!elimInfo.bsEstimateSource) {
                elimInfo.bsEstimateSource = 'TornCortex';
            }

            enrichedMembers[mId] = {
                ...(mInfo as any),
                bsEstimate: elimInfo.bsEstimate,
                bsEstimateSource: elimInfo.bsEstimateSource,
                fairFight: spy?.fairFight || null,
                elimination: elimInfo
            };
        }

        res.json({
            ...factionData,
            members: enrichedMembers
        });
    } catch (error: any) {
        console.error('Error fetching enriched elimination faction data:', error);
        res.status(500).json({ error: 'Failed to fetch elimination faction data.', details: error.message });
    }
});

// For any other request, serve the index.html file
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

const isVercel = process.env.VERCEL;
if (!isVercel && process.env.NODE_ENV !== 'test') {
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
    });
}

export default app;
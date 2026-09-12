import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { 
    fetchFactionData, 
    fetchUserData, 
    fetchEliminationTeams, 
    fetchFactionEliminationMembers,
    fetchSpyData
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
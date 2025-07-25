import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchFactionData } from './tornApi.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());

// Serve static files from the 'dist' directory
const distPath = path.join(__dirname, '../../dist');
app.use(express.static(distPath));


app.get('/api/faction/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
        return res.status(401).json({ error: 'API key not provided in X-API-Key header.' });
    }

    try {
        const data = await fetchFactionData(id, apiKey);
        res.json(data);
    } catch (error: any) {
        console.error('Error fetching faction data:', error);
        res.status(500).json({ error: 'Failed to fetch data from Torn API.', details: error.message });
    }
});

// For any other request, serve the index.html file
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3006;
const SHEET_API_URL = process.env.SHEET_API_URL;

app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'db.json');

// Load or initialize DB (for fallback)
async function loadLocalDB() {
    try {
        const data = await fs.readFile(DB_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (err) {
        const initialDB = { devices: [], history: [], settings: { alertDaysBefore: 3, rechargeAmount: 5, currency: 'MAD' } };
        await fs.writeFile(DB_PATH, JSON.stringify(initialDB, null, 2));
        return initialDB;
    }
}

async function saveLocalDB(data) {
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
}

// Proxy GET data
app.get('/api/data', async (req, res) => {
    if (!SHEET_API_URL || SHEET_API_URL.includes('PASTE_YOUR')) {
        console.log('Using local DB fallback (GET)');
        const db = await loadLocalDB();
        return res.json(db);
    }
    try {
        console.log('Fetching from Google Sheets...');
        const response = await axios.get(SHEET_API_URL);
        console.log('Fetch success');
        res.json(response.data);
    } catch (err) {
        console.error('Fetch error:', err.message);
        res.status(500).json({ error: 'Failed to fetch from Google Sheets' });
    }
});

// Proxy POST action
app.post('/api/action', async (req, res) => {
    if (!SHEET_API_URL || SHEET_API_URL.includes('PASTE_YOUR')) {
        console.log('Using local DB fallback (POST)');
        const { action, device, id, updates, history } = req.body;
        const db = await loadLocalDB();
        switch (action) {
            case 'ADD_DEVICE': db.devices.push(device); break;
            case 'UPDATE_DEVICE':
                db.devices = db.devices.map(d => d.id === id ? { ...d, ...updates, updatedAt: new Date().toISOString() } : d);
                break;
            case 'DELETE_DEVICE':
                db.devices = db.devices.filter(d => d.id !== id);
                db.history = db.history.filter(h => h.gpsDeviceId !== id);
                break;
            case 'ADD_HISTORY': db.history.unshift(history); break;
        }
        await saveLocalDB(db);
        return res.json({ success: true });
    }

    try {
        console.log('Posting to Google Sheets:', req.body.action);
        const response = await axios.post(SHEET_API_URL, req.body, {
            headers: { 'Content-Type': 'application/json' },
            maxRedirects: 5
        });

        console.log('Post success:', response.status);
        res.json(response.data);
    } catch (err) {
        console.error('Update error:', err.message);
        if (err.response) {
            console.error('Response data:', err.response.data);
        }
        res.status(500).json({ error: 'Failed to update Google Sheets' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import * as sheets from './sheets.js';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid'; // I don't need uuid for now, but let's see if it's there. Actually I'll just use simple logic.


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3006;

app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'gps-recharge-secret-key-2024';
const ADMIN_USER = {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'admin123'
};

// Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid or expired token.' });
        req.user = user;
        next();
    });
};


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

// Login Endpoint
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    if (username === ADMIN_USER.username && password === ADMIN_USER.password) {
        const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ success: true, token, user: { username } });
    } else {
        res.status(401).json({ success: false, error: 'Invalid username or password' });
    }
});

// Proxy GET data
app.get('/api/data', authenticateToken, async (req, res) => {

    try {
        console.log('Fetching from Google Sheets...');
        const db = await sheets.getDatabase();
        console.log('Fetch success');
        res.json(db);
    } catch (err) {
        console.error('Fetch error:', err.message);
        // Fallback to local DB?
        console.log('Using local DB fallback due to error');
        const db = await loadLocalDB();
        res.json(db);
    }
});

// Proxy POST action
app.post('/api/action', authenticateToken, async (req, res) => {

    const { action, device, id, updates, history } = req.body;

    try {
        console.log('Processing action:', action);
        let result = { success: true };

        switch (action) {
            case 'ADD_DEVICE':
                await sheets.addDevice(device);
                break;
            case 'UPDATE_DEVICE':
                await sheets.updateDevice(id, updates);
                break;
            case 'DELETE_DEVICE':
                await sheets.deleteDevice(id);
                break;
            case 'ADD_HISTORY':
                await sheets.addHistory(history);
                break;
            case 'UPDATE_SETTINGS':
                await sheets.updateSettings(updates);
                break;
            default:
                console.warn('Unknown action:', action);
        }
        res.json(result);
    } catch (err) {
        console.error('Update error:', err.message);
        res.status(500).json({ error: 'Failed to update Google Sheets', details: err.message });
    }
});

// Setup endpoint - no longer needed for direct API, but kept for compatibility
app.get('/api/setup', async (req, res) => {
    res.json({ message: 'Setup not required for direct integration' });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

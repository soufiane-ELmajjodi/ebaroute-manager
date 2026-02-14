
import { google } from 'googleapis';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import * as currentSheets from './sheets.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// OLD Sheet Configuration
const OLD_SPREADSHEET_ID = '1cPG-9cOVjkypp7onEYrJIkWOqRZ4qsi4JsK2ovvzZNk';
const OLD_SHEETS = {
    clients: 'clientss',
    history: 'history',
    settings: 'settings'
};

// Initialize auth for OLD sheet
const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, 'old_credentials.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const googleSheets = google.sheets({ version: 'v4', auth });

// Helper to map rows to objects
function mapRowToObject(headers, row) {
    const obj = {};
    headers.forEach((header, index) => {
        obj[header] = row[index] || '';
    });
    return obj;
}

async function getOldSheetValues(range) {
    try {
        const response = await googleSheets.spreadsheets.values.get({
            spreadsheetId: OLD_SPREADSHEET_ID,
            range,
        });
        return response.data.values || [];
    } catch (error) {
        console.warn(`Warning: Could not fetch from old sheet range ${range}: ${error.message}`);
        return [];
    }
}

async function fetchOldData() {
    console.log(`Fetching data from OLD Sheet ID: ${OLD_SPREADSHEET_ID}...`);

    // 1. Fetch Clients
    const clientsData = await getOldSheetValues(`${OLD_SHEETS.clients}!A:Z`);
    let devices = [];
    if (clientsData.length > 1) {
        const headers = clientsData[0];
        devices = clientsData.slice(1).map(row => mapRowToObject(headers, row));
    }
    console.log(`Found ${devices.length} devices.`);

    // 2. Fetch History
    const historyData = await getOldSheetValues(`${OLD_SHEETS.history}!A:Z`);
    let history = [];
    if (historyData.length > 1) {
        const headers = historyData[0];
        history = historyData.slice(1).map(row => mapRowToObject(headers, row));
    }
    console.log(`Found ${history.length} history records.`);

    // 3. Fetch Settings
    const settingsData = await getOldSheetValues(`${OLD_SHEETS.settings}!A:Z`);
    let settings = {};
    if (settingsData.length > 1) {
        const headers = settingsData[0];
        settings = mapRowToObject(headers, settingsData[1]);
    }
    console.log(`Found settings.`);

    return { devices, history, settings };
}

async function migrate() {
    try {
        console.log('--- STARTING MIGRATION ---');
        console.log(`Target Sheet ID: ${process.env.GOOGLE_SHEET_ID}`);
        console.log(`Target Client Sheet Name: ${process.env.GOOGLE_SHEET_NAME || 'clientss'}`);

        const oldData = await fetchOldData();

        // Check if we got data
        if (oldData.devices.length === 0 && oldData.history.length === 0) {
            console.log('No data found in old sheet. Aborting migration.');
            return;
        }

        // Write to New Sheet using currentSheets module (which is configured for the NEW sheet)

        console.log('Writing to NEW sheet...');

        // 1. Devices
        for (const device of oldData.devices) {
            try {
                // Check if exists to avoid duplicates (naive check by ID)
                // Note: currentSheets.addDevice blindly appends, so we should check first.
                // But getDatabase is expensive. Let's just try to add.
                // Better: Get current DB state first.
                const db = await currentSheets.getDatabase();
                const exists = db.devices.some(d => d.id === device.id);

                if (!exists) {
                    await currentSheets.addDevice(device);
                    console.log(`Migrated device: ${device.gpsNumber || device.id}`);
                } else {
                    console.log(`Skipping existing device: ${device.gpsNumber || device.id}`);
                }
            } catch (err) {
                console.error(`Failed to migrate device ${device.id}:`, err.message);
            }
        }

        // 2. History
        for (const record of oldData.history) {
            try {
                const db = await currentSheets.getDatabase();
                const exists = db.history.some(h => h.id === record.id); // Assuming history has IDs

                if (!exists) {
                    await currentSheets.addHistory(record);
                    console.log(`Migrated history record: ${record.id}`);
                } else {
                    console.log(`Skipping existing history: ${record.id}`);
                }
            } catch (err) {
                console.error(`Failed to migrate history ${record.id}:`, err.message);
            }
        }

        // 3. Settings
        if (oldData.settings && Object.keys(oldData.settings).length > 0) {
            try {
                await currentSheets.updateSettings(oldData.settings);
                console.log('Migrated settings.');
            } catch (err) {
                console.error('Failed to migrate settings:', err.message);
            }
        }

        console.log('--- MIGRATION COMPLETE ---');

    } catch (error) {
        console.error('Migration failed:', error);
    }
}

migrate();


import { google } from 'googleapis';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- CONFIGURATION ---
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const YOUR_NEW_SHEET_NAME = process.env.GOOGLE_SHEET_NAME || 'clt';

// OLD Sheet Configuration for data migration
const OLD_SPREADSHEET_ID = '1cPG-9cOVjkypp7onEYrJIkWOqRZ4qsi4JsK2ovvzZNk';
const OLD_SHEETS = {
    clients: 'clientss',
    history: 'history',
    settings: 'settings'
};

// --- AUTHENTICATION ---
// 1. Auth for NEW Sheet (using current unexpected credentials)
const authNew = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_CREDENTIALS_PATH || path.join(__dirname, 'credentials.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheetsNew = google.sheets({ version: 'v4', auth: authNew });

// 2. Auth for OLD Sheet (using old credentials)
// We need to check if old_credentials.json exists, otherwise warn
let authOld = null;
let sheetsOld = null;
try {
    authOld = new google.auth.GoogleAuth({
        keyFile: path.join(__dirname, 'old_credentials.json'),
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    sheetsOld = google.sheets({ version: 'v4', auth: authOld });
} catch (e) {
    console.warn("old_credentials.json not found, migration might fail.");
}

// --- DEFINE TABLES ---
const SHEET_DEFINITIONS = {
    [YOUR_NEW_SHEET_NAME]: ['id', 'gpsNumber', 'simNumber', 'clientName', 'lastRechargeDate', 'createdAt', 'updatedAt'],
    history: ['id', 'gpsDeviceId', 'gpsNumber', 'clientName', 'rechargeDate', 'amount', 'createdAt'],
    settings: ['alertDaysBefore', 'rechargeAmount', 'currency']
};

// --- HELPER FUNCTIONS ---
function mapRowToObject(headers, row) {
    const obj = {};
    headers.forEach((header, index) => {
        obj[header] = row[index] || '';
    });
    return obj;
}

// --- MAIN EXECUTION ---
async function runCompleteSetup() {
    console.log('=============================================');
    console.log('   STARTING COMPLETE GOOGLE SHEETS SETUP');
    console.log('=============================================');
    console.log(`Target Spreadsheet ID: ${SPREADSHEET_ID}`);
    console.log(`Target Clients Table:  ${YOUR_NEW_SHEET_NAME}`);

    try {
        // 1. CHECK PERMISSIONS & CREATE TABS
        console.log('\n--- Step 1: Checking Permissions & Creating Tables ---');
        const metadata = await sheetsNew.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
        const existingSheets = metadata.data.sheets.map(s => s.properties.title);
        console.log('Existing tabs found:', existingSheets.join(', '));

        let requests = [];
        for (const [sheetName, headers] of Object.entries(SHEET_DEFINITIONS)) {
            if (!existingSheets.includes(sheetName)) {
                console.log(`> Queuing creation of tab: '${sheetName}'`);
                requests.push({ addSheet: { properties: { title: sheetName } } });
            } else {
                console.log(`> Tab '${sheetName}' already exists.`);
            }
        }

        if (requests.length > 0) {
            await sheetsNew.spreadsheets.batchUpdate({
                spreadsheetId: SPREADSHEET_ID,
                requestBody: { requests }
            });
            console.log('✔ Tabs created successfully.');
        }

        // 2. ADD HEADERS
        console.log('\n--- Step 2: Ensuring Headers Exist ---');
        for (const [sheetName, headers] of Object.entries(SHEET_DEFINITIONS)) {
            const response = await sheetsNew.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: `${sheetName}!1:1`,
            });
            const existingHeaders = response.data.values ? response.data.values[0] : [];

            if (existingHeaders.length === 0) {
                console.log(`> Adding headers to '${sheetName}'...`);
                await sheetsNew.spreadsheets.values.append({
                    spreadsheetId: SPREADSHEET_ID,
                    range: `${sheetName}!1:1`,
                    valueInputOption: 'USER_ENTERED',
                    requestBody: { values: [headers] },
                });
                console.log(`✔ Headers added to '${sheetName}'.`);
            } else {
                console.log(`✔ Headers already present in '${sheetName}'.`);
            }
        }

        // 3. FETCH & MIGRATE OLD DATA
        if (sheetsOld) {
            console.log('\n--- Step 3: Migrating Data from Old Sheet ---');
            console.log(`Fetching from Old ID: ${OLD_SPREADSHEET_ID}`);

            // Fetch Clients
            const oldClientRes = await sheetsOld.spreadsheets.values.get({ spreadsheetId: OLD_SPREADSHEET_ID, range: `${OLD_SHEETS.clients}!A:Z` });
            const oldClients = oldClientRes.data.values || [];

            // Fetch History
            const oldHistoryRes = await sheetsOld.spreadsheets.values.get({ spreadsheetId: OLD_SPREADSHEET_ID, range: `${OLD_SHEETS.history}!A:Z` });
            const oldHistory = oldHistoryRes.data.values || [];

            // Fetch Settings
            const oldSettingsRes = await sheetsOld.spreadsheets.values.get({ spreadsheetId: OLD_SPREADSHEET_ID, range: `${OLD_SHEETS.settings}!A:Z` });
            const oldSettings = oldSettingsRes.data.values || [];

            // WRITE TO NEW SHEETS (only if new sheet is empty-ish)

            // Migrate Clients if new sheet is empty
            const newClientRes = await sheetsNew.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: `${YOUR_NEW_SHEET_NAME}!A:Z` });
            if (!newClientRes.data.values || newClientRes.data.values.length <= 1) {
                if (oldClients.length > 1) { // has data rows
                    const dataRows = oldClients.slice(1);
                    console.log(`> Migrating ${dataRows.length} clients...`);
                    await sheetsNew.spreadsheets.values.append({
                        spreadsheetId: SPREADSHEET_ID,
                        range: `${YOUR_NEW_SHEET_NAME}!A:A`,
                        valueInputOption: 'USER_ENTERED',
                        requestBody: { values: dataRows }
                    });
                    console.log('✔ Clients migrated.');
                }
            } else {
                console.log('> New clients sheet already has data. Skipping migration to prevent duplicates.');
            }

            // Migrate History
            const newHistoryRes = await sheetsNew.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: `history!A:Z` });
            if (!newHistoryRes.data.values || newHistoryRes.data.values.length <= 1) {
                if (oldHistory.length > 1) {
                    const dataRows = oldHistory.slice(1);
                    console.log(`> Migrating ${dataRows.length} history records...`);
                    await sheetsNew.spreadsheets.values.append({
                        spreadsheetId: SPREADSHEET_ID,
                        range: `history!A:A`,
                        valueInputOption: 'USER_ENTERED',
                        requestBody: { values: dataRows }
                    });
                    console.log('✔ History migrated.');
                }
            } else {
                console.log('> New history sheet already has data. Skipping migration.');
            }

            // Migrate Settings
            if (oldSettings.length > 1) {
                const settingsRow = oldSettings[1]; // First data row
                // Check if new settings exist
                const newSettingsRes = await sheetsNew.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: `settings!A:Z` });
                if (!newSettingsRes.data.values || newSettingsRes.data.values.length <= 1) {
                    console.log('> Migrating settings...');
                    await sheetsNew.spreadsheets.values.append({
                        spreadsheetId: SPREADSHEET_ID,
                        range: `settings!A:A`,
                        valueInputOption: 'USER_ENTERED',
                        requestBody: { values: [settingsRow] }
                    });
                    console.log('✔ Settings migrated.');
                }
            }

        } else {
            console.log('\nXXX Skipping data migration: Old credentials not loaded.');
        }

        console.log('\n=============================================');
        console.log('   SETUP COMPLETE! PLEASE REFRESH YOUR SHEET');
        console.log('=============================================');

    } catch (error) {
        console.error('\n!!! CRITICAL ERROR !!!');
        console.error(error.message);
        if (error.code === 403) {
            console.error('\nRunning user: ' + (authNew.getJSON ? (await authNew.getJSON()).client_email : 'unknown'));
            console.error('ACTION REQUIRED: Share the sheet with the email above!');
        }
        if (error.code === 404) {
            console.error('ACTION REQUIRED: Check your Spreadsheet ID in .env');
        }
    }
}

runCompleteSetup();

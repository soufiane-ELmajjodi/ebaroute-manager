import { google } from 'googleapis';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize auth
const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_CREDENTIALS_PATH || path.join(__dirname, 'credentials.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

const SHEET_DEFINITIONS = {
    [process.env.GOOGLE_SHEET_NAME || 'clientss']: ['id', 'gpsNumber', 'simNumber', 'clientName', 'lastRechargeDate', 'createdAt', 'updatedAt'],
    history: ['id', 'gpsDeviceId', 'gpsNumber', 'clientName', 'rechargeDate', 'amount', 'createdAt'],
    settings: ['alertDaysBefore', 'rechargeAmount', 'currency']
};

async function checkAndCreateHeaders() {
    console.log('Checking sheet metadata...');

    try {
        const metadata = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
        const existingSheets = metadata.data.sheets.map(s => s.properties.title);

        for (const [sheetName, headers] of Object.entries(SHEET_DEFINITIONS)) {
            if (!existingSheets.includes(sheetName)) {
                console.log(`Sheet '${sheetName}' does not exist. Creating it...`);
                await sheets.spreadsheets.batchUpdate({
                    spreadsheetId: SPREADSHEET_ID,
                    requestBody: {
                        requests: [{
                            addSheet: {
                                properties: { title: sheetName }
                            }
                        }]
                    }
                });
                console.log(`Sheet '${sheetName}' created.`);
            }

            // Now check/add headers
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: `${sheetName}!1:1`,
            });

            const existingHeaders = response.data.values ? response.data.values[0] : [];

            if (existingHeaders.length === 0) {
                console.log(`Adding headers to ${sheetName}...`);
                await sheets.spreadsheets.values.append({
                    spreadsheetId: SPREADSHEET_ID,
                    range: `${sheetName}!1:1`,
                    valueInputOption: 'USER_ENTERED',
                    requestBody: { values: [headers] },
                });
                console.log(`Headers added to ${sheetName}.`);
            } else {
                console.log(`Headers already exist in ${sheetName}.`);
            }
        }
    } catch (error) {
        console.error('Error in setup:', error.message);
    }
}

checkAndCreateHeaders();

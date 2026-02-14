import { google } from 'googleapis';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_CREDENTIALS_PATH || path.join(__dirname, 'credentials.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

const SHEET_DEFINITIONS = {
    clientss: ['id', 'gpsNumber', 'simNumber', 'clientName', 'lastRechargeDate', 'createdAt', 'updatedAt'],
    history: ['id', 'gpsDeviceId', 'gpsNumber', 'clientName', 'rechargeDate', 'amount', 'createdAt'],
    settings: ['alertDaysBefore', 'rechargeAmount', 'currency']
};

async function reset() {
    console.log('Resetting Google Sheets to match new schema...');
    try {
        for (const [sheetName, headers] of Object.entries(SHEET_DEFINITIONS)) {
            console.log(`Clearing and updating headers for '${sheetName}'...`);

            // Clear entire sheet
            await sheets.spreadsheets.values.clear({
                spreadsheetId: SPREADSHEET_ID,
                range: `${sheetName}!A:Z`,
            });

            // Add new headers
            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: `${sheetName}!1:1`,
                valueInputOption: 'USER_ENTERED',
                requestBody: { values: [headers] },
            });
            console.log(`Sheet '${sheetName}' reset.`);
        }
        console.log('Reset completed successfully!');
    } catch (error) {
        console.error('Reset failed:', error.message);
    }
}

reset();

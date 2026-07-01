import { google } from 'googleapis';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize auth
let auth;
if (process.env.GOOGLE_CREDENTIALS_BASE64) {
    const credentials = JSON.parse(
        Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString()
    );
    auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
} else {
    auth = new google.auth.GoogleAuth({
        keyFile: process.env.GOOGLE_CREDENTIALS_PATH || path.join(__dirname, 'credentials.json'),
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
}

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

// Helper to get all values
async function getSheetValues(range) {
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range,
        });
        return response.data.values || [];
    } catch (error) {
        console.error('Error getting sheet values:', error.message);
        throw error;
    }
}

// Helper to append values
async function appendSheetValues(range, values) {
    try {
        const response = await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [values] },
        });
        return response.data;
    } catch (error) {
        console.error('Error appending sheet values:', error.message);
        throw error;
    }
}

// Convert row array to object (assuming headers)
function mapRowToObject(headers, row) {
    const obj = {};
    headers.forEach((header, index) => {
        obj[header] = row[index] || ''; // Handle missing values
    });
    return obj;
}

// Get full database (mimicking the JSON structure)
export async function getDatabase() {
    try {
        console.log(process.env.GOOGLE_SHEET_NAME, 'GOOGLE_SHEET_NAME');
        const CLIENTS_SHEET = process.env.GOOGLE_SHEET_NAME || 'clientss';
        const clientsData = await getSheetValues(`${CLIENTS_SHEET}!A:Z`);
        console.log(clientsData, 'clientsData');
        const historyData = await getSheetValues('history!A:Z');
        const settingsData = await getSheetValues('settings!A:Z');

        // Devices
        const clientsHeaders = clientsData[0] || [];
        const clientsRows = clientsData.slice(1);
        const devices = clientsRows.map(row => mapRowToObject(clientsHeaders, row));

        // History
        let history = [];
        if (historyData.length > 0) {
            const historyHeaders = historyData[0] || [];
            const historyRows = historyData.slice(1);
            history = historyRows.map(row => mapRowToObject(historyHeaders, row));
        }

        // Settings
        let settings = { alertDaysBefore: 3, rechargeAmount: 5, currency: 'MAD' }; // Fallback
        if (settingsData.length > 1) { // Headers + at least one row
            const settingsHeaders = settingsData[0];
            const settingsRow = settingsData[1];
            settings = mapRowToObject(settingsHeaders, settingsRow);
            // Convert strings to numbers where appropriate
            if (settings.alertDaysBefore) settings.alertDaysBefore = parseInt(settings.alertDaysBefore);
            if (settings.rechargeAmount) settings.rechargeAmount = parseFloat(settings.rechargeAmount);
        }

        return {
            devices,
            history,
            settings
        };
    } catch (error) {
        console.error('Database fetch error:', error);
        throw error;
    }
}

export async function addDevice(device) {
    // We need to match the headers of 'clientss' sheet
    // This implies we need to know the order. 
    // Best practice: Read headers first, then map device object to array.

    const CLIENTS_SHEET = process.env.GOOGLE_SHEET_NAME || 'clientss';
    const headers = (await getSheetValues(`${CLIENTS_SHEET}!1:1`))[0];
    if (!headers) throw new Error(`No headers found in ${CLIENTS_SHEET} sheet`);

    const row = headers.map(header => device[header] || '');
    await appendSheetValues(`${CLIENTS_SHEET}!A:A`, row);
    return { success: true };
}

export async function updateDevice(id, updates) {
    // This is inefficient in Sheets API without a row ID lookup.
    // We iterate to find the row with the ID.
    const CLIENTS_SHEET = process.env.GOOGLE_SHEET_NAME || 'clientss';
    const rows = await getSheetValues(`${CLIENTS_SHEET}!A:Z`);
    const headers = rows[0];
    const idIndex = headers.indexOf('id'); // Assuming 'id' is the column name

    if (idIndex === -1) throw new Error('ID column not found');

    let rowIndex = -1;
    let currentRow = [];

    // existing rows
    for (let i = 1; i < rows.length; i++) {
        if (rows[i][idIndex] === id) {
            rowIndex = i + 1; // 1-based index
            currentRow = rows[i];
            break;
        }
    }

    if (rowIndex === -1) throw new Error('Device not found');

    // Update the row
    const updatedRow = headers.map((header, index) => {
        if (updates.hasOwnProperty(header)) {
            return updates[header];
        }
        return currentRow[index];
    });

    // Write back
    await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${CLIENTS_SHEET}!A${rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [updatedRow] },
    });

    return { success: true };
}

export async function deleteDevice(id) {
    // Sheets API delete requires batchUpdate with sheetId (integer).
    // This is complex because we need to fetch sheet metadata to get sheetId.
    // Alternative: Clear content? Or execute batchUpdate.

    const CLIENTS_SHEET = process.env.GOOGLE_SHEET_NAME || 'clientss';
    const metadata = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const sheet = metadata.data.sheets.find(s => s.properties.title === CLIENTS_SHEET);
    if (!sheet) throw new Error(`${CLIENTS_SHEET} Sheet not found`);
    const sheetId = sheet.properties.sheetId;

    const rows = await getSheetValues(`${CLIENTS_SHEET}!A:Z`);
    const headers = rows[0];
    const idIndex = headers.indexOf('id');

    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
        if (rows[i][idIndex] === id) {
            rowIndex = i; // 0-based index for batchUpdate usually? No, it's 0-based index but startRowIndex.
            break;
        }
    }

    if (rowIndex === -1) throw new Error('Device not found');

    // Delete request
    await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
            requests: [{
                deleteDimension: {
                    range: {
                        sheetId: sheetId,
                        dimension: 'ROWS',
                        startIndex: rowIndex,
                        endIndex: rowIndex + 1
                    }
                }
            }]
        }
    });

    return { success: true };
}

export async function addHistory(historyItem) {
    const headers = (await getSheetValues('history!1:1'))[0];
    if (!headers) throw new Error('No headers in history sheet');

    const row = headers.map(header => historyItem[header] !== undefined ? historyItem[header] : '');
    await appendSheetValues('history!A:A', row);
    return { success: true };
}

export async function updateSettings(settings) {
    const headers = (await getSheetValues('settings!1:1'))[0];
    if (!headers) throw new Error('No headers in settings sheet');

    const row = headers.map(header => settings[header] !== undefined ? settings[header] : '');

    // Check if a row already exists
    const existingData = await getSheetValues('settings!A:Z');

    if (existingData.length <= 1) {
        // Just append if only headers exist
        await appendSheetValues('settings!A:A', row);
    } else {
        // Update the second row (first data row)
        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: 'settings!A2',
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [row] },
        });
    }
    return { success: true };
}

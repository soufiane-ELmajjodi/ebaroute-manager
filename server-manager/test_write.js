
import { google } from 'googleapis';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testWrite() {
    console.log('Testing connection to Google Sheet...');
    console.log('Sheet Name:', process.env.GOOGLE_SHEET_NAME || 'clt');

    const auth = new google.auth.GoogleAuth({
        keyFile: process.env.GOOGLE_CREDENTIALS_PATH || path.join(__dirname, 'credentials.json'),
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // Get the client email to tell the user who needs access
    const client = await auth.getClient();
    console.log('Using Service Account Email:', client.email);

    try {
        console.log('Attempting to append a test row...');
        const sheetName = process.env.GOOGLE_SHEET_NAME || 'clt';

        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: `${sheetName}!A:A`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [['TEST_ID', '123456789', '987654321', 'TEST CLIENT', '2026-01-01', 'DATE', 'DATE']]
            },
        });
        console.log('SUCCESS! A test row was added to your sheet.');
    } catch (error) {
        console.log('\n❌ FAILED TO WRITE TO SHEET');
        console.log('Error Message:', error.message);

        if (error.code === 403 || error.message.includes('permission')) {
            console.log('\n!!! ACTION REQUIRED !!!');
            console.log(`Please go to your Google Sheet and SHARE it with:`);
            console.log(`${client.email}`);
            console.log(`Make sure to select "Editor" role.`);
        }
    }
}

testWrite();

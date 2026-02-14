
import dotenv from 'dotenv';
import { getDatabase } from './sheets.js';

dotenv.config();

console.log('Using Spreadsheet ID:', process.env.GOOGLE_SHEET_ID);
console.log('Using Key File:', process.env.GOOGLE_CREDENTIALS_PATH);

async function checkData() {
    try {
        console.log('Attempting to fetch data...');
        const db = await getDatabase();
        console.log('Successfully fetched data!');
        console.log('Devices count:', db.devices.length);
        console.log('History count:', db.history.length);
        console.log('Settings:', db.settings);

        if (db.devices.length > 0) {
            console.log('First device sample:', db.devices[0]);
        } else {
            console.log('No devices found.');
        }
    } catch (error) {
        console.error('FAILED to fetch data:', error.message);
        if (error.response) {
            console.error('Error details:', error.response.data);
        }
    }
}

checkData();

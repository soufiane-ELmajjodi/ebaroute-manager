import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import * as sheets from './sheets.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'db.json');

async function migrate() {
    console.log('Starting migration from local db.json to Google Sheets...');

    try {
        // Read local DB
        const data = await fs.readFile(DB_PATH, 'utf-8');
        const db = JSON.parse(data);

        // Migrate Settings
        if (db.settings) {
            console.log('Migrating settings...');
            await sheets.updateSettings(db.settings);
            console.log('Settings migrated.');
        }

        // Migrate Devices
        if (db.devices && db.devices.length > 0) {
            console.log(`Migrating ${db.devices.length} devices...`);
            for (const device of db.devices) {
                console.log(`Adding device: ${device.gpsNumber || device.id}`);
                await sheets.addDevice(device);
            }
            console.log('Devices migrated.');
        }

        // Migrate History
        if (db.history && db.history.length > 0) {
            console.log(`Migrating ${db.history.length} history records...`);
            for (const item of db.history) {
                await sheets.addHistory(item);
            }
            console.log('History migrated.');
        }

        console.log('Migration completed successfully!');
    } catch (error) {
        console.error('Migration failed:', error.message);
        if (error.message.includes('ENOENT')) {
            console.error('db.json not found. Nothing to migrate.');
        }
    }
}

migrate();

import * as sheets from './sheets.js';

async function migrate() {
    console.log('Starting final recovery migration...');

    const devices = [
        {
            id: 'h9aslksc1kc',
            gpsNumber: '689548022',
            simNumber: '678437557',
            clientName: 'soufiane elmajjodi',
            lastRechargeDate: '2026-02-10',
            createdAt: '2026-02-10T12:29:46.915Z',
            updatedAt: '2026-02-10T12:29:46.915Z'
        },
        {
            id: 'vjs6c5xq69',
            gpsNumber: 'qewe',
            simNumber: '678437557',
            clientName: 'soufiane elmajjodi',
            lastRechargeDate: '2026-02-10',
            createdAt: '2026-02-10T12:31:02.988Z',
            updatedAt: '2026-02-10T12:31:02.988Z'
        }
    ];

    const history = [
        {
            id: 'lp8jcoorvw',
            gpsDeviceId: 'n8agzyk216',
            gpsNumber: '689548022',
            clientName: 'ahmade elkhraze',
            rechargeDate: '2026-02-09',
            amount: '5',
            createdAt: '2026-02-09T12:31:13.544Z'
        },
        {
            id: 'q1w69v0321c',
            gpsDeviceId: 'n8agzyk216',
            gpsNumber: '689548022',
            clientName: 'ahmade elkhraze',
            rechargeDate: '2026-02-09',
            amount: '5',
            createdAt: '2026-02-09T12:31:39.389Z'
        },
        {
            id: 'nf4jpbelyi',
            gpsDeviceId: 'jz5p630ris',
            gpsNumber: 'qewe',
            clientName: 'soufiane elmajjodi',
            rechargeDate: '2026-02-09',
            amount: '5',
            createdAt: '2026-02-09T12:32:01.020Z'
        },
        {
            id: 'yav7cewcbrq',
            gpsDeviceId: 'jz5p630ris',
            gpsNumber: 'qewe',
            clientName: 'soufiane elmajjodi',
            rechargeDate: '2026-02-09',
            amount: '5',
            createdAt: '2026-02-09T12:32:04.369Z'
        }
    ];

    const settings = {
        alertDaysBefore: 3,
        rechargeAmount: 5,
        currency: 'MAD'
    };

    try {
        console.log('Checking current devices in new sheet...');
        const db = await sheets.getDatabase();

        // Only add devices if they don't exist
        for (const d of devices) {
            if (!db.devices.find(existing => existing.id === d.id)) {
                await sheets.addDevice(d);
                console.log(`Added device: ${d.gpsNumber}`);
            } else {
                console.log(`Device already exists: ${d.gpsNumber}`);
            }
        }

        // Only add history if it's empty or doesn't have these IDs
        for (const h of history) {
            if (!db.history.find(existing => existing.id === h.id)) {
                await sheets.addHistory(h);
                console.log(`Added history record for: ${h.gpsNumber}`);
            } else {
                console.log(`History record already exists: ${h.id}`);
            }
        }

        // Update settings
        await sheets.updateSettings(settings);
        console.log('Settings updated.');

        console.log('Migration completed successfully!');
    } catch (error) {
        console.error('Migration failed:', error.message);
    }
}

migrate();


#!/bin/bash

# Ensure we are in the correct directory
cd "$(dirname "$0")"

echo "Installing dependecies..."
npm install

echo "Creating Tables in Google Sheets..."
node setup-sheets.js

echo "Migrating Old Data..."
node migrate_data.js

echo "Done! Starting Server..."
npm run dev

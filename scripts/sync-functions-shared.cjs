// A deployed function only gets the functions/ folder, but the ranking needs the spot catalogue the app
// ships. This copies those files into functions/shared/ (git-ignored). It runs before every functions
// deploy (firebase.json "predeploy"), so the server always ranks with the catalogue that was deployed with it.
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const target = path.join(root, 'functions', 'shared');
const FILES = ['catalogue.js', 'spots.js', 'seasonSpots.js'];

fs.rmSync(target, { recursive: true, force: true });
fs.mkdirSync(target, { recursive: true });
for (const file of FILES) fs.copyFileSync(path.join(root, 'services', file), path.join(target, file));

// Fails the deploy here, not in production, if the catalogue ever starts needing a file that wasn't copied.
const { catalogueSpots } = require(path.join(target, 'catalogue.js'));
console.log(`functions/shared: ${FILES.length} files, ${catalogueSpots.length} catalogue spots`);

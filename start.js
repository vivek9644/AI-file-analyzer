
const path = require('path');
const fs = require('fs');

console.log('🔍 AI Nexus Studio Startup Check...');

// Check if required directories exist
const publicDir = path.join(__dirname, 'public');
const cssDir = path.join(publicDir, 'css');

if (!fs.existsSync(publicDir)) {
    console.log('📁 Creating public directory...');
    fs.mkdirSync(publicDir, { recursive: true });
}

if (!fs.existsSync(cssDir)) {
    console.log('📁 Creating CSS directory...');
    fs.mkdirSync(cssDir, { recursive: true });
}

// Check if index.html exists
const indexPath = path.join(__dirname, 'index.html');
if (!fs.existsSync(indexPath)) {
    console.error('❌ index.html not found!');
    process.exit(1);
}

console.log('✅ Directory structure verified');
console.log('🚀 Starting server...');

// Start the main server
require('./src/server/index.js');

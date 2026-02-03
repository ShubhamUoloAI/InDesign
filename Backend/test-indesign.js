import { testInDesignConnection } from './services/indesignService.js';
import os from 'os';
import config from './config/config.js';

console.log('=== Adobe InDesign Connection Test ===\n');

console.log('Platform:', os.platform());
console.log('Configured Path:', config.indesignAppPath || 'Not set (will use default)');

// Check default paths
const platform = os.platform();
let defaultPath;
if (platform === 'darwin') {
  defaultPath = '/Applications/Adobe InDesign 2024/Adobe InDesign 2024.app/Contents/MacOS/Adobe InDesign 2024';
} else if (platform === 'win32') {
  defaultPath = 'C:\\Program Files\\Adobe\\Adobe InDesign 2024\\InDesign.exe';
}

if (defaultPath) {
  console.log('Default Path:', defaultPath);
}

console.log('\nTesting connection...\n');

try {
  const isAvailable = await testInDesignConnection();

  if (isAvailable) {
    console.log('✓ Adobe InDesign is available and ready to use!');
    console.log('\nYour backend is configured correctly.');
  } else {
    console.log('✗ Adobe InDesign is not found.');
    console.log('\nPlease ensure Adobe InDesign is installed.');
    console.log('\nIf InDesign is installed in a different location, set the path in your .env file:');
    console.log('INDESIGN_APP_PATH=/path/to/your/InDesign/executable');

    console.log('\nCommon installation paths:');
    console.log('  macOS: /Applications/Adobe InDesign [YEAR]/Adobe InDesign [YEAR].app/Contents/MacOS/Adobe InDesign [YEAR]');
    console.log('  Windows: C:\\Program Files\\Adobe\\Adobe InDesign [YEAR]\\InDesign.exe');

    console.log('\nTo find your InDesign installation:');
    if (platform === 'darwin') {
      console.log('  Run: ls -la /Applications | grep -i indesign');
    } else if (platform === 'win32') {
      console.log('  Run: dir "C:\\Program Files\\Adobe" | findstr InDesign');
    }

    process.exit(1);
  }
} catch (error) {
  console.error('Error testing InDesign connection:', error.message);
  process.exit(1);
}

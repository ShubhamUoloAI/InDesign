#!/usr/bin/env node

import { testInDesignConnection } from './services/indesignService.js';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

console.log('=== InDesign Backend Health Check ===\n');

let exitCode = 0;

// Check 1: Node.js version
console.log('1. Node.js Version');
console.log(`   Version: ${process.version}`);
const nodeMajor = parseInt(process.version.slice(1).split('.')[0]);
if (nodeMajor >= 18) {
  console.log('   ✓ Node.js version is compatible\n');
} else {
  console.log('   ✗ Node.js version should be 18 or higher\n');
  exitCode = 1;
}

// Check 2: Platform
console.log('2. Platform');
console.log(`   OS: ${os.platform()} ${os.release()}`);
console.log(`   Architecture: ${os.arch()}`);
if (os.platform() === 'darwin' || os.platform() === 'win32') {
  console.log('   ✓ Platform is supported for InDesign\n');
} else {
  console.log('   ✗ Platform not supported (Adobe InDesign requires macOS or Windows)\n');
  exitCode = 1;
}

// Check 3: Display Session (macOS)
if (os.platform() === 'darwin') {
  console.log('3. Display Session (macOS)');
  try {
    const { stdout } = await execAsync('who | grep console');
    if (stdout.trim()) {
      console.log('   ✓ User session with display is active');
      console.log(`   ${stdout.trim()}\n`);
    } else {
      console.log('   ⚠️  No console session detected');
      console.log('   InDesign may not launch without a logged-in user\n');
    }
  } catch (error) {
    console.log('   ⚠️  No active display session');
    console.log('   InDesign requires a logged-in user with GUI access\n');
  }
}

// Check 4: InDesign Installation
console.log('4. InDesign Installation');
try {
  const isAvailable = await testInDesignConnection();
  if (isAvailable) {
    console.log('   ✓ Adobe InDesign is installed and accessible\n');
  } else {
    console.log('   ✗ Adobe InDesign not found or not accessible');
    console.log('   Run ./find-indesign.sh to locate your installation\n');
    exitCode = 1;
  }
} catch (error) {
  console.log(`   ✗ Error checking InDesign: ${error.message}\n`);
  exitCode = 1;
}

// Check 5: Temp Directories
console.log('5. Temp Directories');
try {
  const tmpDir = os.tmpdir();
  console.log(`   System temp: ${tmpDir}`);
  console.log('   ✓ Temp directory is accessible\n');
} catch (error) {
  console.log('   ✗ Cannot access temp directory\n');
  exitCode = 1;
}

// Check 6: Memory
console.log('6. System Resources');
const totalMem = os.totalmem();
const freeMem = os.freemem();
const usedMem = totalMem - freeMem;
const memUsagePercent = ((usedMem / totalMem) * 100).toFixed(1);

console.log(`   Total Memory: ${(totalMem / 1024 / 1024 / 1024).toFixed(2)} GB`);
console.log(`   Free Memory: ${(freeMem / 1024 / 1024 / 1024).toFixed(2)} GB`);
console.log(`   Used: ${memUsagePercent}%`);

if (freeMem < 2 * 1024 * 1024 * 1024) { // Less than 2GB free
  console.log('   ⚠️  Low memory available (InDesign requires significant RAM)');
} else {
  console.log('   ✓ Sufficient memory available');
}
console.log('');

// Check 7: InDesign Process
console.log('7. InDesign Process Status');
if (os.platform() === 'darwin') {
  try {
    const { stdout } = await execAsync('pgrep -x "Adobe InDesign"');
    if (stdout.trim()) {
      console.log('   ✓ InDesign is currently running');
      console.log(`   PID: ${stdout.trim()}\n`);
    } else {
      console.log('   ℹ️  InDesign is not currently running (normal - launches on demand)\n');
    }
  } catch (error) {
    console.log('   ℹ️  InDesign is not currently running (normal - launches on demand)\n');
  }
} else if (os.platform() === 'win32') {
  try {
    const { stdout } = await execAsync('tasklist | findstr /i "InDesign.exe"');
    if (stdout.trim()) {
      console.log('   ✓ InDesign is currently running\n');
    } else {
      console.log('   ℹ️  InDesign is not currently running (normal - launches on demand)\n');
    }
  } catch (error) {
    console.log('   ℹ️  InDesign is not currently running (normal - launches on demand)\n');
  }
}

// Summary
console.log('=== Summary ===');
if (exitCode === 0) {
  console.log('✓ All checks passed! Backend is ready to process InDesign files.\n');
  console.log('Start your server with: npm start');
} else {
  console.log('✗ Some checks failed. Please review the issues above.\n');
  console.log('For setup instructions, see: MACOS-SERVER-SETUP.md');
}

process.exit(exitCode);

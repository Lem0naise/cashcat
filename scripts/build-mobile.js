const shell = require('shelljs');

// Config paths
const API_DIR = 'src/app/api';
const API_HIDDEN = 'src/app/_api_ignored';
const AUTH_DIR = 'src/app/auth';           // contains /auth/callback route handler
const AUTH_HIDDEN = 'src/app/_auth_ignored';
const COMPONENT_FILE = 'src/app/components/api-key-manager.tsx';
const COMPONENT_BACKUP = 'src/app/components/api-key-manager.tsx.bak';

console.log('Preparing for Mobile Build...');

// --- HELPER: RESTORE FUNCTION ---
// We use this to fix the files whether the build succeeds OR fails
function restoreFiles() {
  console.log('Restoring original files...');

  // 1. Restore API folder
  if (shell.test('-d', API_HIDDEN)) {
    shell.mv(API_HIDDEN, API_DIR);
  }

  // 2. Restore Auth folder
  if (shell.test('-d', AUTH_HIDDEN)) {
    shell.mv(AUTH_HIDDEN, AUTH_DIR);
  }

  // 3. Restore Component
  if (shell.test('-f', COMPONENT_BACKUP)) {
    if (shell.test('-f', COMPONENT_FILE)) {
      shell.rm(COMPONENT_FILE);
    }
    shell.mv(COMPONENT_BACKUP, COMPONENT_FILE);
  }
}

// --- STEP 1: HIDE API ---
console.log('Hiding API routes...');
if (shell.test('-d', API_DIR)) {
  shell.mv(API_DIR, API_HIDDEN);
}

// --- STEP 2: HIDE AUTH (contains /auth/callback — dynamic, breaks static export) ---
console.log('Hiding Auth routes...');
if (shell.test('-d', AUTH_DIR)) {
  shell.mv(AUTH_DIR, AUTH_HIDDEN);
}

// --- STEP 3: STUB THE COMPONENT ---
console.log('Swapping ApiKeyManager with a dummy stub...');
if (shell.test('-f', COMPONENT_FILE)) {
  shell.mv(COMPONENT_FILE, COMPONENT_BACKUP);
  shell.ShellString(`
    export default function ApiKeyManager() { 
      return null; 
    }
  `).to(COMPONENT_FILE);
} else {
  console.warn('Could not find ApiKeyManager to stub! (Check path)');
}

// --- STEP 4: BUILD ---
console.log('Building static export...');
if (shell.exec('CAPACITOR_BUILD=true npm run build').code !== 0) {
  console.error('Build failed! Restoring files immediately...');
  restoreFiles();
  shell.exit(1);
}

// --- STEP 5: RESTORE ---
restoreFiles();

// --- STEP 6: SYNC ---
console.log('Syncing with Android/iOS...');
shell.exec('npx cap sync');

console.log('Mobile build complete!');
console.log('Run npx cap open android to open Android Studio.');
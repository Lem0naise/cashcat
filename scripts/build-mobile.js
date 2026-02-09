const shell = require('shelljs');

// Config paths
const API_DIR = 'src/app/api';
const API_HIDDEN = 'src/app/_api_ignored';
const COMPONENT_FILE = 'src/app/components/api-key-manager.tsx';
const COMPONENT_BACKUP = 'src/app/components/api-key-manager.tsx.bak';

console.log('🚀 Preparing for Mobile Build...');

// --- HELPER: RESTORE FUNCTION ---
// We use this to fix the files whether the build succeeds OR fails
function restoreFiles() {
  console.log('🧹 Restoring original files...');

  // 1. Restore API folder
  if (shell.test('-d', API_HIDDEN)) {
    shell.mv(API_HIDDEN, API_DIR);
  }

  // 2. Restore Component
  if (shell.test('-f', COMPONENT_BACKUP)) {
    // Delete the dummy stub we created
    if (shell.test('-f', COMPONENT_FILE)) {
        shell.rm(COMPONENT_FILE);
    }
    // Bring back the original code
    shell.mv(COMPONENT_BACKUP, COMPONENT_FILE);
  }
}

// --- STEP 1: HIDE API ---
console.log('🙈 Hiding API routes...');
if (shell.test('-d', API_DIR)) {
  shell.mv(API_DIR, API_HIDDEN);
}

// --- STEP 2: STUB THE COMPONENT ---
console.log('🎭 Swapping ApiKeyManager with a dummy stub...');
if (shell.test('-f', COMPONENT_FILE)) {
  // Backup the real file
  shell.mv(COMPONENT_FILE, COMPONENT_BACKUP);
  
  // Create the dummy file (Returns null so the UI just disappears)
  shell.ShellString(`
    export default function ApiKeyManager() { 
      return null; 
    }
  `).to(COMPONENT_FILE);
} else {
    console.warn('⚠️ Could not find ApiKeyManager to stub! (Check path)');
}

// --- STEP 3: BUILD ---
console.log('🏗️ Building static export...');
// Run the build
if (shell.exec('CAPACTIRO_BUILD=true npm run build').code !== 0) {
  console.error('❌ Build failed! Restoring files immediately...');
  restoreFiles(); // <--- Critical: Fix files before exiting
  shell.exit(1);
}

// --- STEP 4: RESTORE ---
restoreFiles();

// --- STEP 5: SYNC ---
console.log('🔄 Syncing with Android/iOS...');
shell.exec('npx cap sync');

console.log('✅ Mobile build complete!');
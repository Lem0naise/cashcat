const shell = require('shelljs');

// ── Folders to move away during mobile build ──────────────────────────────
// These contain server-only code (Server Actions, Route Handlers) that
// Next.js cannot statically export.
const SERVER_FOLDERS = [
  { src: 'src/app/api', hidden: 'src/app/_api_ignored' },
  { src: 'src/app/auth', hidden: 'src/app/_auth_ignored' },
  { src: 'src/app/actions', hidden: 'src/app/_actions_ignored' },
];

// ── Client components that import server actions ───────────────────────────
// These must be swapped with null stubs so the static build doesn't pull in
// any 'use server' code. They are fully restored after the build.
const STUBS = [
  {
    file: 'src/app/components/api-key-manager.tsx',
    backup: 'src/app/components/api-key-manager.tsx.bak',
    name: 'ApiKeyManager',
  },
  {
    file: 'src/app/components/upgrade-button.tsx',
    backup: 'src/app/components/upgrade-button.tsx.bak',
    name: 'UpgradeButton',
  },
  {
    file: 'src/app/components/waitlist-form.tsx',
    backup: 'src/app/components/waitlist-form.tsx.bak',
    name: 'WaitlistForm',
  },
];

console.log('Preparing for Mobile Build...');

// ── RESTORE (called on success AND failure) ────────────────────────────────
function restoreFiles() {
  console.log('Restoring original files...');

  SERVER_FOLDERS.forEach(({ src, hidden }) => {
    if (shell.test('-d', hidden)) {
      shell.mv(hidden, src);
      console.log(`  Restored ${src}`);
    }
  });

  STUBS.forEach(({ file, backup }) => {
    if (shell.test('-f', backup)) {
      if (shell.test('-f', file)) shell.rm(file);
      shell.mv(backup, file);
      console.log(`  Restored ${file}`);
    }
  });
}

// ── STEP 1: HIDE SERVER FOLDERS ───────────────────────────────────────────
console.log('\nHiding server-only folders...');
SERVER_FOLDERS.forEach(({ src, hidden }) => {
  if (shell.test('-d', src)) {
    shell.mv(src, hidden);
    console.log(`  Hid ${src}`);
  }
});

// ── STEP 2: STUB CLIENT COMPONENTS THAT IMPORT SERVER ACTIONS ─────────────
console.log('\nStubbing components that use Server Actions...');
STUBS.forEach(({ file, backup, name }) => {
  if (shell.test('-f', file)) {
    shell.mv(file, backup);
    shell.ShellString(
      `export function ${name}() { return null; }\nexport default ${name};\n`
    ).to(file);
    console.log(`  Stubbed ${file}`);
  } else {
    console.warn(`  WARNING: Could not find ${file} to stub`);
  }
});

// ── STEP 3: BUILD ─────────────────────────────────────────────────────────
console.log('\nBuilding static export...');
if (shell.exec('CAPACITOR_BUILD=true npm run build').code !== 0) {
  console.error('\nBuild failed! Restoring files immediately...');
  restoreFiles();
  shell.exit(1);
}

// ── STEP 4: RESTORE ───────────────────────────────────────────────────────
restoreFiles();

// ── STEP 5: SYNC ──────────────────────────────────────────────────────────
console.log('\nSyncing with Android/iOS...');
shell.exec('npx cap sync');

console.log('\nMobile build complete!');
console.log('Run: npx cap open android');
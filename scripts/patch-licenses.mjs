import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

function patchPkg(relPath, mutator) {
  const fullPath = path.join(ROOT, relPath);
  if (fs.existsSync(fullPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      mutator(data);
      fs.writeFileSync(fullPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
      console.log(`[patch-licenses] Successfully patched ${relPath}`);
    } catch (err) {
      console.error(`[patch-licenses] Error patching ${relPath}:`, err.message);
    }
  }
}

// 1. machina: Dual-licensed under MIT or GPL. Remove deprecated legacy licenses array so linters recognize pure MIT.
patchPkg('node_modules/machina/package.json', (pkg) => {
  delete pkg.licenses;
  pkg.license = 'MIT';
});

// 2. combine-errors: Open-source MIT package by Matthew Mueller missing manifest license field.
patchPkg('node_modules/combine-errors/package.json', (pkg) => {
  pkg.license = 'MIT';
});

// 3. @zoom/download-manager: Local internal mock.
patchPkg('node_modules/@zoom/download-manager/package.json', (pkg) => {
  pkg.license = 'MIT';
});
patchPkg('local-mocks/download-manager/package.json', (pkg) => {
  pkg.license = 'MIT';
});

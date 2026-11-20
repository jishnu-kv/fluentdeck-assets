const fs = require('fs');
const { execSync } = require('child_process');

const repo = 'E:/website/fluentdeck-assets';
const relDir = 'public/emoji/png/animated';
const dest = repo + '/' + relDir;

if (!fs.existsSync(dest)) {
  console.error('Directory does not exist:', dest);
  process.exit(1);
}

// Get all files
const allFiles = fs.readdirSync(dest).filter(f => fs.statSync(dest + '/' + f).isFile());

// Check which files are already tracked in git HEAD
let trackedFiles = new Set();
try {
  const trackedOutput = execSync(`git -C "${repo}" ls-tree -r --name-only HEAD "${relDir}"`, { encoding: 'utf8' });
  trackedFiles = new Set(trackedOutput.split(/\r?\n/).map(p => p.split('/').pop()).filter(Boolean));
} catch (e) {
  console.log('Could not read tracked files from git, assuming none.');
}

const uncommittedFiles = allFiles.filter(f => !trackedFiles.has(f));
console.log(`Total animated PNGs: ${allFiles.length}`);
console.log(`Already committed/tracked: ${trackedFiles.size}`);
console.log(`Remaining to commit & push: ${uncommittedFiles.length}`);

if (uncommittedFiles.length === 0) {
  console.log('All files are already committed and up-to-date!');
  process.exit(0);
}

// Group into batches of ~15MB (or max 10 files per batch)
let batches = [];
let cur = [];
let curSize = 0;

for (const file of uncommittedFiles) {
  const filePath = dest + '/' + file;
  const size = fs.statSync(filePath).size;
  if ((curSize + size > 15 * 1024 * 1024 || cur.length >= 10) && cur.length > 0) {
    batches.push(cur);
    cur = [];
    curSize = 0;
  }
  cur.push(file);
  curSize += size;
}
if (cur.length > 0) batches.push(cur);

console.log(`Formed ${batches.length} batches to push.`);

for (let i = 0; i < batches.length; i++) {
  const batch = batches[i];
  console.log(`\n========================================`);
  console.log(`[Batch ${i + 1}/${batches.length}] Staging ${batch.length} files...`);

  for (let j = 0; j < batch.length; j += 5) {
    const chunk = batch.slice(j, j + 5).map(f => `"${relDir}/${f}"`).join(' ');
    execSync(`git -C "${repo}" add ${chunk}`, { stdio: 'inherit' });
  }

  const commitMsg = `Add emoji png animated (${i + 1}/${batches.length})`;
  execSync(`git -C "${repo}" commit -m "${commitMsg}"`, { stdio: 'inherit' });

  let pushed = false;
  let attempts = 0;
  while (!pushed) {
    attempts++;
    try {
      console.log(`[Batch ${i + 1}/${batches.length}] Pushing commit (attempt ${attempts})...`);
      execSync(`git -C "${repo}" push origin main`, { stdio: 'inherit', timeout: 120000 });
      pushed = true;
      console.log(`>>> [Batch ${i + 1}/${batches.length}] SUCCESS!`);
    } catch (err) {
      console.error(`Push attempt ${attempts} failed. Retrying in 5 seconds...`);
      if (attempts >= 5) {
        console.error('Too many push attempts failed. Stopping.');
        process.exit(1);
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5000);
    }
  }
}

console.log('\nAll animated PNG emoji assets successfully committed and pushed!');

const fs = require('fs');
const { execSync } = require('child_process');

const repo = 'E:/website/fluentdeck-assets';
const src = 'e:/website/fluentdeck/public/emoji/png/animated';
const relDir = 'public/emoji/png/animated';
const dest = repo + '/' + relDir;

if (!fs.existsSync(dest)) {
  fs.mkdirSync(dest, { recursive: true });
}

console.log('Copying animated PNG files from fluentdeck to fluentdeck-assets...');
execSync(`robocopy "${src}" "${dest}" /E /NFL /NDL`, { stdio: 'inherit' });

const files = fs.readdirSync(dest);
console.log(`Found ${files.length} animated PNG files. Creating ~10MB batches...`);

let batches = [];
let cur = [];
let curSize = 0;

for (const file of files) {
  const filePath = dest + '/' + file;
  const size = fs.statSync(filePath).size;
  if (curSize + size > 10 * 1024 * 1024 && cur.length > 0) {
    batches.push(cur);
    cur = [];
    curSize = 0;
  }
  cur.push(file);
  curSize += size;
}
if (cur.length > 0) batches.push(cur);

console.log(`Total animated PNG batches: ${batches.length}`);

for (let i = 0; i < batches.length; i++) {
  const batch = batches[i];
  console.log(`\n========================================`);
  console.log(`[Batch ${i + 1}/${batches.length}] Staging ${batch.length} files...`);

  for (let j = 0; j < batch.length; j += 10) {
    const chunk = batch.slice(j, j + 10).map(f => `"${relDir}/${f}"`).join(' ');
    execSync(`git -C "${repo}" add ${chunk}`, { stdio: 'inherit' });
  }

  execSync(`git -C "${repo}" commit -m "Add emoji png animated (${i + 1}/${batches.length})"`, { stdio: 'inherit' });

  let pushed = false;
  let attempts = 0;
  while (!pushed) {
    attempts++;
    try {
      console.log(`[Batch ${i + 1}/${batches.length}] Pushing (attempt ${attempts})...`);
      execSync(`git -C "${repo}" push origin main`, { stdio: 'inherit' });
      pushed = true;
      console.log(`>>> [Batch ${i + 1}/${batches.length}] SUCCESS!`);
    } catch (err) {
      console.error(`Push attempt ${attempts} failed. Retrying in 4s...`);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 4000);
    }
  }
}

console.log('\nAll animated PNG emojis successfully uploaded!');

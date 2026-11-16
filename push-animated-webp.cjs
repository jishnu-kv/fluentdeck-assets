const fs = require('fs');
const { execSync } = require('child_process');

const repo = 'E:/website/fluentdeck-assets';
const dir = 'public/emoji/webp/animated';
const fullDir = repo + '/' + dir;

// Read untracked / uncommitted files in git status
const statusOutput = execSync(`git -C "${repo}" status -s --porcelain`, { encoding: 'utf8' });
const untrackedLines = statusOutput.split('\n').filter(l => l.startsWith('?? ') && l.includes(dir));
const files = untrackedLines.map(l => l.replace('?? ', '').trim().replace(dir + '/', ''));

console.log(`Remaining animated webp files to push: ${files.length}`);

let batches = [];
let cur = [];
let curSize = 0;

for (const file of files) {
  const filePath = fullDir + '/' + file;
  if (!fs.existsSync(filePath)) continue;
  const size = fs.statSync(filePath).size;
  if (curSize + size > 12 * 1024 * 1024 && cur.length > 0) {
    batches.push(cur);
    cur = [];
    curSize = 0;
  }
  cur.push(file);
  curSize += size;
}
if (cur.length > 0) batches.push(cur);

console.log(`Starting push of remaining ${batches.length} batches (~12MB each)...`);

for (let i = 0; i < batches.length; i++) {
  const batch = batches[i];
  console.log(`[Batch ${i + 1}/${batches.length}] Staging ${batch.length} files...`);

  for (let j = 0; j < batch.length; j += 15) {
    const chunk = batch.slice(j, j + 15).map(f => `"${dir}/${f}"`).join(' ');
    execSync(`git -C "${repo}" add ${chunk}`, { stdio: 'inherit' });
  }

  execSync(`git -C "${repo}" commit -m "Add emoji webp animated batch (part ${i + 1}/${batches.length})"`, { stdio: 'inherit' });

  let pushed = false;
  let attempts = 0;
  while (!pushed && attempts < 5) {
    attempts++;
    try {
      console.log(`[Batch ${i + 1}/${batches.length}] Pushing to origin main (attempt ${attempts})...`);
      execSync(`git -C "${repo}" push origin main`, { stdio: 'inherit' });
      pushed = true;
    } catch (err) {
      console.error(`Push attempt ${attempts} failed, waiting 5 seconds...`);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5000);
    }
  }

  if (!pushed) {
    console.error(`FATAL: Failed to push batch ${i + 1}`);
    process.exit(1);
  }
}

console.log('All remaining animated webp emojis successfully uploaded!');

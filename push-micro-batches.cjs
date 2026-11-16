const fs = require('fs');
const { execSync } = require('child_process');

const repo = 'E:/website/fluentdeck-assets';
const dir = 'public/emoji/webp/animated';
const fullDir = repo + '/' + dir;

const statusOutput = execSync(`git -C "${repo}" status -s --porcelain`, { encoding: 'utf8' });
const untrackedLines = statusOutput.split('\n').filter(l => l.startsWith('?? ') && l.includes(dir));
const files = untrackedLines.map(l => l.replace('?? ', '').trim().replace(dir + '/', ''));

console.log(`Remaining animated webp files: ${files.length}`);

// Use smaller 5MB batches so push completes in ~2-4s and never hits 408 timeout
let batches = [];
let cur = [];
let curSize = 0;

for (const file of files) {
  const filePath = fullDir + '/' + file;
  if (!fs.existsSync(filePath)) continue;
  const size = fs.statSync(filePath).size;
  if (curSize + size > 5 * 1024 * 1024 && cur.length > 0) {
    batches.push(cur);
    cur = [];
    curSize = 0;
  }
  cur.push(file);
  curSize += size;
}
if (cur.length > 0) batches.push(cur);

console.log(`Pushing ${batches.length} micro-batches (~5MB each)...`);

for (let i = 0; i < batches.length; i++) {
  const batch = batches[i];
  console.log(`[Batch ${i + 1}/${batches.length}] Staging ${batch.length} files...`);

  for (let j = 0; j < batch.length; j += 10) {
    const chunk = batch.slice(j, j + 10).map(f => `"${dir}/${f}"`).join(' ');
    execSync(`git -C "${repo}" add ${chunk}`, { stdio: 'pipe' });
  }

  execSync(`git -C "${repo}" commit -m "Add emoji webp animated (${i + 1}/${batches.length})"`, { stdio: 'pipe' });

  let pushed = false;
  let attempts = 0;
  while (!pushed && attempts < 5) {
    attempts++;
    try {
      console.log(`[Batch ${i + 1}/${batches.length}] Pushing (attempt ${attempts})...`);
      execSync(`git -C "${repo}" push origin main`, { stdio: 'pipe' });
      pushed = true;
      console.log(`[Batch ${i + 1}/${batches.length}] OK!`);
    } catch (err) {
      console.error(`Push attempt ${attempts} failed, waiting 4s...`);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 4000);
    }
  }

  if (!pushed) {
    console.error(`FATAL: Failed batch ${i + 1}`);
    process.exit(1);
  }
}

console.log('All animated webp emojis successfully uploaded!');

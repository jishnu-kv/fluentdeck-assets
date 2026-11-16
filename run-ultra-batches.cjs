const fs = require('fs');
const { execSync } = require('child_process');
const cwd = 'E:/website/fluentdeck-assets';

const batches = JSON.parse(fs.readFileSync(cwd + '/ultra-batches.json', 'utf8'));

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log(`Starting upload of ${batches.length} ultra-micro batches (1-3 files, ~1.5MB each)...`);
  for (let i = 0; i < batches.length; i++) {
    const b = batches[i];
    console.log(`\n[Batch ${i + 1}/${batches.length}] (${b.files.length} files, ${b.sizeMB} MB)`);
    
    // Add files
    for (const f of b.files) {
      execSync(`git add "${f}"`, { cwd });
    }
    
    // Commit
    const commitMsg = `Add emoji webp animated ultra-batch ${i + 1} of ${batches.length}`;
    execSync(`git commit -m "${commitMsg}"`, { cwd });
    
    // Push with retries
    let pushed = false;
    for (let attempt = 1; attempt <= 6; attempt++) {
      try {
        console.log(`Pushing batch ${i + 1} (attempt ${attempt})...`);
        execSync('git push origin main', { cwd, stdio: 'inherit', timeout: 60000 });
        pushed = true;
        console.log(`Successfully pushed batch ${i + 1}!`);
        break;
      } catch (err) {
        console.warn(`Push failed on attempt ${attempt}: ${err.message}`);
        await sleep(3000 * attempt);
      }
    }
    
    if (!pushed) {
      console.error(`Failed to push batch ${i + 1} after 6 attempts. Stopping.`);
      process.exit(1);
    }
    
    await sleep(500);
  }
  console.log('\n=== All remaining WebP animated batches pushed successfully! ===');
}

run();

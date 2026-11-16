const fs = require('fs');
const { execSync } = require('child_process');
const cwd = 'E:/website/fluentdeck-assets';

const batches = JSON.parse(fs.readFileSync(cwd + '/auto-batches.json', 'utf8'));

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log(`Starting upload of ${batches.length} batches...`);
  for (let i = 0; i < batches.length; i++) {
    const b = batches[i];
    console.log(`\n[Batch ${i + 1}/${batches.length}] (${b.files.length} files, ${b.sizeMB} MB)`);
    
    // Add files
    for (const f of b.files) {
      execSync(`git add "${f}"`, { cwd, stdio: 'inherit' });
    }
    
    // Commit
    const commitMsg = `Add emoji webp animated batch ${i + 1} of ${batches.length}`;
    execSync(`git commit -m "${commitMsg}"`, { cwd, stdio: 'inherit' });
    
    // Push with retries
    let pushed = false;
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        console.log(`Pushing batch ${i + 1} (attempt ${attempt})...`);
        execSync('git push origin main', { cwd, stdio: 'inherit', timeout: 90000 });
        pushed = true;
        console.log(`Successfully pushed batch ${i + 1}!`);
        break;
      } catch (err) {
        console.warn(`Push failed on attempt ${attempt}: ${err.message}`);
        await sleep(4000);
      }
    }
    
    if (!pushed) {
      console.error(`CRITICAL: Failed to push batch ${i + 1} after 5 attempts. Stopping.`);
      process.exit(1);
    }
    
    await sleep(1000);
  }
  console.log('\n=== All remaining WebP animated batches pushed successfully! ===');
}

run();

import { exec as execCallback } from 'child_process';
import util from 'util';

const exec = util.promisify(execCallback);
const SYNC_INTERVAL_MS = 30000;

async function checkAndSync() {
    try {
        const execOptions = { maxBuffer: 1024 * 1024 * 10 }; // 10MB limit
        
        // Check for any modified or untracked files
        const { stdout: statusOut } = await exec('git status --porcelain', execOptions);
        
        if (statusOut.trim().length === 0) {
            console.log(`[${new Date().toLocaleTimeString()}] No changes detected. Waiting...`);
            return;
        }

        console.log(`[${new Date().toLocaleTimeString()}] Changes detected. Syncing with GitHub...`);
        
        await exec('git add .', execOptions);
        await exec('git commit -m "Auto-sync: Admin Panel Update"', execOptions);
        
        console.log(`[${new Date().toLocaleTimeString()}] Pushing to remote...`);
        await exec('git push origin main', execOptions);
        
        console.log(`[${new Date().toLocaleTimeString()}] Successfully synced to GitHub!`);
    } catch (error) {
        console.error(`[${new Date().toLocaleTimeString()}] Auto-sync error:`, error.message);
    }
}

console.log(`Starting Auto-Sync process. Checking for changes every ${SYNC_INTERVAL_MS / 1000} seconds...`);
// Run immediately, then set interval
checkAndSync();
setInterval(checkAndSync, SYNC_INTERVAL_MS);

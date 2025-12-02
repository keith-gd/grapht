const util = require('util');
const exec = util.promisify(require('child_process').exec);
const path = require('path');
const axios = require('axios');
const fs = require('fs');
const os = require('os');

// Configuration
const CONFIG_PATH = path.join(os.homedir(), '.agent-analytics', 'config.json');
let config = {};

try {
  config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
} catch (e) {
  console.error('Could not read config. Run agent-analytics init first.');
  process.exit(1);
}

const API_URL = `${config.backend_url}/v1/commits`;
const API_KEY = config.api_key;
const DEVELOPER_ID = config.developer_id;

async function backfillCommits(days = 30) {
  console.log(`🔄 Backfilling git commits for the last ${days} days...`);
  
  try {
    // Get commits from the last N days
    // Format: hash|timestamp|author|email|message
    const since = `${days} days ago`;
    const { stdout } = await exec(`git log --since="${since}" --pretty=format:"%H|%ct|%an|%ae|%s"`);
    
    const commits = stdout.split('\n').filter(line => line.trim() !== '');
    console.log(`Found ${commits.length} commits.`);
    
    let processed = 0;
    let success = 0;
    
    for (const line of commits) {
      const [hash, timestamp, author, email, ...msgParts] = line.split('|');
      const message = msgParts.join('|'); // Rejoin message if it contained pipes
      
      // Get stats
      let filesChanged = 0;
      let linesAdded = 0;
      let linesDeleted = 0;
      
      try {
        // Get numstat for this commit
        const { stdout: stats } = await exec(`git show --numstat --format="" ${hash}`);
        if (stats.trim()) {
          const lines = stats.trim().split('\n');
          filesChanged = lines.length;
          lines.forEach(l => {
            const [added, deleted] = l.split('\t');
            if (added !== '-') linesAdded += parseInt(added) || 0;
            if (deleted !== '-') linesDeleted += parseInt(deleted) || 0;
          });
        }
      } catch (err) {
        // Ignore errors getting stats (e.g. merge commits)
      }
      
      const payload = {
        commit_hash: hash,
        commit_message: message,
        author_name: author,
        author_email: email,
        timestamp: parseInt(timestamp),
        files_changed: filesChanged,
        lines_added: linesAdded,
        lines_deleted: linesDeleted,
        agent_assisted: false, // We can't easily determine this for past commits
        developer_id: DEVELOPER_ID,
        project_id: process.cwd()
      };
      
      try {
        await axios.post(API_URL, payload, {
          headers: { 
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json' 
          }
        });
        process.stdout.write('.');
        success++;
      } catch (error) {
        // console.error(`Failed to log ${hash}:`, error.message);
        process.stdout.write('x');
      }
      
      processed++;
    }
    
    console.log(`\n✅ Backfill complete: ${success}/${processed} commits logged.`);
    
  } catch (error) {
    console.error('❌ Error backfilling commits:', error.message);
  }
}

// Run if executed directly
const days = process.argv[2] ? parseInt(process.argv[2]) : 30;
backfillCommits(days);




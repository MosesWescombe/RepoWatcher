const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const channel = 'C084YDZ9CU9'; // Slack channel ID
const slackWebhookUrl = 'https://hooks.slack.com/services/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';

// Repository URL and local directory
const repos = [
    { url: 'https://github.com/TheThingsNetwork/lorawan-devices.git', name: 'TTS-Decoders' },
    { url: 'https://github.com/Milesight-IoT/SensorDecoders.git', name: 'Milesight-Decoders' }
];
const lastCommitFile = path.join(__dirname, 'last_commit.json'); // File to store the last commit date

async function sendMessage(message) {
    try {
        const response = await axios.post(
            slackWebhookUrl,
            {
                channel: channel,
                text: message
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );
        console.log('Message sent:', response.data);
    } catch (error) {
        console.error('Error sending message:', error.response?.data || error.message);
    }
}

function updateRepo(repo) {
    try {
        const repoDir = `repos/${repo.name}`;
        // Check if the repository is already cloned
        if (!fs.existsSync(repoDir)) {
            // Clone the repository with override
            execSync(`git clone ${repo.url} ${repoDir} --depth 1 --single-branch`, { stdio: 'inherit' });
            console.log(`${repo.name} Repository cloned.`);
        } else {
            // If already cloned, pull the latest changes
            execSync(`git -C ${repoDir} pull`, { stdio: 'inherit' });
        }

        checkForChanges(repo);
    } catch (error) {
        console.error('Error updating repository:', error.message);
    }
}

function updateRepos() {
    repos.forEach((repo) => {
        try {
            updateRepo(repo);
        } catch (error) {
            console.error('Error updating repository:', error.message);
        }
    });
}

function getLastCommitDate(name) {
    try {
        if (fs.existsSync(lastCommitFile)) {
            const data = JSON.parse(fs.readFileSync(lastCommitFile, 'utf-8'));
            if (data[name]) {
                return new Date(data[name]);
            }
        }
        return null; // No data for this repository
    } catch (error) {
        console.error('Error reading last commit file:', error.message);
        return null;
    }
}

function saveLastCommitDate(name, date) {
    try {
        let data = {};
        if (fs.existsSync(lastCommitFile)) {
            data = JSON.parse(fs.readFileSync(lastCommitFile, 'utf-8'));
        }
        data[name] = date.toISOString();
        fs.writeFileSync(lastCommitFile, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
        console.error('Error saving last commit date:', error.message);
    }
}

function checkForChanges(repo) {
    const lastCommitDate = getLastCommitDate(repo.name);

    // Get the latest commit date from the cloned repository
    const latestCommitDate = getLatestCommitDate(repo.name);

    if (latestCommitDate && (!lastCommitDate || latestCommitDate > lastCommitDate)) {
        console.log(`${repo.name}: New changes detected!`);
        sendMessage(`${repo.name} - Repository has new changes.`);
        saveLastCommitDate(repo.name, latestCommitDate);
    } else {
        console.log(`${repo.name}: No new changes.`);
    }
}

function getLatestCommitDate(dir) {
    try {
        // Get the latest commit date
        const log = execSync(`git -C repos/${dir} log -1 --format="%cd" --date=iso`, { encoding: 'utf-8' });
        return new Date(log.trim());
    } catch (error) {
        console.error('Error getting latest commit date:', error.message);
        return null;
    }
}

// Clone the repository and start checking for changes every 24 hours
updateRepos();
setInterval(updateRepos, 15000); // 24 hours in milliseconds

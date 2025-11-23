// Check authentication on page load
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    const currentUser = sessionStorage.getItem('currentUser');
    if (!currentUser) {
        // Redirect to login page
        window.location.href = 'index.html';
        return;
    }
    
    // Display current user
    const userDisplay = document.getElementById('currentUserDisplay');
    userDisplay.textContent = `Logged in as: ${currentUser}`;
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    logoutBtn.style.display = 'inline-block';
    logoutBtn.addEventListener('click', function() {
        sessionStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    });
    
    // Set default date to today
    const dateInput = document.getElementById('entryDate');
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
    dateInput.max = today; // Don't allow future dates
    
    // Today button
    const todayBtn = document.getElementById('todayBtn');
    todayBtn.addEventListener('click', function() {
        dateInput.value = today;
    });
    
    const sliders = document.querySelectorAll('.slider');
    const valueDisplays = document.querySelectorAll('.slider-value');
    
    sliders.forEach((slider, index) => {
        slider.addEventListener('input', function() {
            valueDisplays[index].textContent = this.value;
        });
    });
    
    // Handle form submission
    const form = document.getElementById('trackerForm');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        saveEntry();
    });
    
    // Settings panel toggle
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsPanel = document.getElementById('settingsPanel');
    settingsBtn.addEventListener('click', function() {
        settingsPanel.style.display = settingsPanel.style.display === 'none' ? 'block' : 'none';
    });
    
    // Load saved settings
    loadSettings();
    
    // Save settings
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    saveSettingsBtn.addEventListener('click', function() {
        saveSettings();
    });
    
    // Sync users to CSV button
    const syncUsersBtn = document.getElementById('syncUsersBtn');
    if (syncUsersBtn) {
        syncUsersBtn.addEventListener('click', async function() {
            syncUsersBtn.disabled = true;
            syncUsersBtn.textContent = 'Syncing...';
            try {
                await syncUsersToCSV();
                showMessage('Users synced to CSV successfully!', 'success');
            } catch (error) {
                showMessage('Error syncing users: ' + error.message, 'error');
            } finally {
                syncUsersBtn.disabled = false;
                syncUsersBtn.textContent = '🔄 Sync Users to CSV';
            }
        });
    }
    
    // Load and display history and stats
    loadHistoryAndStats();
    
    // Refresh history button
    const refreshHistoryBtn = document.getElementById('refreshHistoryBtn');
    refreshHistoryBtn.addEventListener('click', function() {
        loadHistoryAndStats();
    });
});

async function saveEntry() {
    const currentUser = sessionStorage.getItem('currentUser');
    if (!currentUser) {
        showMessage('Please login first', 'error');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
        return;
    }
    
    const sleep = document.getElementById('sleep').value;
    const food = document.getElementById('food').value;
    const exercise = document.getElementById('exercise').value;
    const feeling = document.getElementById('feeling').value;
    
    // Get selected date from date picker
    const dateInput = document.getElementById('entryDate');
    const date = dateInput.value || new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    if (!date) {
        showMessage('Please select a date', 'error');
        return;
    }
    
    // Validate that we have a username
    if (!currentUser || currentUser.trim() === '') {
        showMessage('User session expired. Please login again.', 'error');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
        return;
    }
    
    // Create CSV row with username (ensure username is included)
    const csvRow = `${date},${currentUser.trim()},${sleep},${food},${exercise},${feeling}\n`;
    
    // Get GitHub settings
    const githubConfig = getGitHubConfig();
    
    if (githubConfig.username && githubConfig.repo && githubConfig.token) {
        // Save to GitHub
        try {
            showMessage(`Saving entry for ${date} to GitHub...`, 'success');
            console.log('Saving to GitHub with date:', date);
            console.log('CSV row:', csvRow);
            await saveToGitHub(csvRow, date, githubConfig);
            showMessage(`Entry for ${date} saved to GitHub successfully!`, 'success');
            // Refresh history after saving
            setTimeout(() => {
                loadHistoryAndStats();
            }, 500);
        } catch (error) {
            console.error('Error saving to GitHub:', error);
            console.error('Error details:', error.message, error.stack);
            showMessage('Error saving to GitHub: ' + error.message, 'error');
            // Fallback to localStorage
            saveToLocalStorage(csvRow, date, currentUser);
            showMessage('Entry saved locally only. Check console for GitHub error details.', 'error');
            // Refresh history after saving
            setTimeout(() => {
                loadHistoryAndStats();
            }, 500);
        }
    } else {
        // Fallback to localStorage if GitHub not configured
        saveToLocalStorage(csvRow, date, currentUser);
        showMessage('Entry saved locally. Configure GitHub settings to save to repository.', 'success');
        // Refresh history after saving
        setTimeout(() => {
            loadHistoryAndStats();
        }, 500);
    }
    
    // Reset sliders to default (5)
    document.getElementById('sleep').value = 5;
    document.getElementById('food').value = 5;
    document.getElementById('exercise').value = 5;
    document.getElementById('feeling').value = 5;
    
    // Update display values
    document.getElementById('sleep-value').textContent = 5;
    document.getElementById('food-value').textContent = 5;
    document.getElementById('exercise-value').textContent = 5;
    document.getElementById('feeling-value').textContent = 5;
    
    // Reset date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('entryDate').value = today;
}

function saveToLocalStorage(csvRow, date, username) {
    // Check if CSV file exists in localStorage, if not create header
    let csvContent = localStorage.getItem('gradia_data');
    if (!csvContent) {
        csvContent = 'Date,Username,Sleep,Food,Exercise,Feeling\n';
    }
    
    // Parse existing CSV to check for duplicate dates for this user
    const lines = csvContent.trim().split('\n');
    const header = lines[0];
    const dataLines = lines.slice(1);
    
    // Check if entry for today already exists for this user
    const existingIndex = dataLines.findIndex(line => {
        const parts = line.split(',');
        return parts[0] === date && parts[1] === username;
    });
    
    if (existingIndex !== -1) {
        // Update existing entry
        dataLines[existingIndex] = csvRow.trim();
        csvContent = header + '\n' + dataLines.join('\n') + '\n';
    } else {
        // Add new row
        csvContent += csvRow;
    }
    
    localStorage.setItem('gradia_data', csvContent);
}

async function saveToGitHub(csvRow, date, config) {
    const filePath = 'gradia_data.csv';
    const apiUrl = `https://api.github.com/repos/${config.username}/${config.repo}/contents/${filePath}`;
    
    // First, try to get the existing file to get its SHA
    let existingContent = '';
    let sha = null;
    
    try {
        const getResponse = await fetch(apiUrl, {
            headers: {
                'Authorization': `token ${config.token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (getResponse.ok) {
            const fileData = await getResponse.json();
            existingContent = atob(fileData.content.replace(/\n/g, ''));
            sha = fileData.sha;
        }
    } catch (error) {
        // File doesn't exist yet, that's okay
        console.log('File does not exist, will create new one');
    }
    
    // Get current user
    const currentUser = sessionStorage.getItem('currentUser');
    
    // Parse existing CSV or create new
    let csvContent = existingContent || 'Date,Username,Sleep,Food,Exercise,Feeling\n';
    const lines = csvContent.trim().split('\n');
    let header = lines[0];
    
    // Update header if it's the old format
    if (!header.includes('Username')) {
        header = 'Date,Username,Sleep,Food,Exercise,Feeling';
        // Migrate old data if needed
        const oldDataLines = lines.slice(1);
        const newDataLines = oldDataLines.map(line => {
            const parts = line.split(',');
            if (parts.length === 5) {
                // Old format: Date,Sleep,Food,Exercise,Feeling
                return `${parts[0]},unknown,${parts[1]},${parts[2]},${parts[3]},${parts[4]}`;
            }
            return line;
        });
        csvContent = header + '\n' + newDataLines.join('\n') + '\n';
    }
    
    const dataLines = csvContent.trim().split('\n').slice(1).filter(line => line.trim() !== '');
    
    console.log('Current data lines in CSV:', dataLines.length);
    console.log('Looking for entry with date:', date, 'and user:', currentUser);
    
    // Check if entry for the selected date already exists for this user
    const existingIndex = dataLines.findIndex(line => {
        const parts = line.split(',');
        // Handle both old format (5 columns) and new format (6 columns)
        if (parts.length === 5) {
            // Old format without username - check by date only
            const match = parts[0] === date;
            if (match) console.log('Found old format entry for date:', date);
            return match;
        } else if (parts.length === 6) {
            // New format with username
            const match = parts[0] === date && parts[1] === currentUser;
            if (match) console.log('Found existing entry for date:', date, 'user:', currentUser);
            return match;
        }
        return false;
    });
    
    // Validate the CSV row has correct number of columns
    const rowParts = csvRow.trim().split(',');
    if (rowParts.length !== 6) {
        console.error('CSV row has incorrect number of columns:', rowParts.length, 'Expected 6');
        console.error('CSV row:', csvRow);
        throw new Error('Failed to create valid CSV row. Please try again.');
    }
    
    if (existingIndex !== -1) {
        // Update existing entry
        console.log(`Updating existing entry at index ${existingIndex} for date ${date}`);
        dataLines[existingIndex] = csvRow.trim();
        csvContent = header + '\n' + dataLines.join('\n') + '\n';
    } else {
        // Add new row - ensure proper formatting
        console.log(`Adding new entry for date ${date}`);
        // Remove trailing newline from csvContent if it exists, then add the new row
        const trimmedContent = csvContent.trim();
        csvContent = trimmedContent + '\n' + csvRow.trim() + '\n';
    }
    
    console.log('Final CSV will have', csvContent.split('\n').length - 1, 'data rows');
    
    // Encode content to base64
    const encodedContent = btoa(unescape(encodeURIComponent(csvContent)));
    
    // Prepare the request body
    const body = {
        message: `Update daily routine tracker - ${date}`,
        content: encodedContent,
        branch: 'main'
    };
    
    if (sha) {
        body.sha = sha;
    }
    
    // Update/create the file
    const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${config.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save to GitHub');
    }
    
    return await response.json();
}

function getGitHubConfig() {
    // Try to get from localStorage, but use hardcoded defaults if not available
    // This ensures it works even after cache clear
    return {
        username: localStorage.getItem('github_username') || 'neroquarthaz',
        repo: localStorage.getItem('github_repo') || 'gradia',
        token: localStorage.getItem('github_token') || '' // Token still needs to be set
    };
}

function saveSettings() {
    const username = document.getElementById('githubUsername').value.trim();
    const repo = document.getElementById('githubRepo').value.trim();
    const token = document.getElementById('githubToken').value.trim();
    
    if (username && repo && token) {
        localStorage.setItem('github_username', username);
        localStorage.setItem('github_repo', repo);
        localStorage.setItem('github_token', token);
        showMessage('Settings saved successfully!', 'success');
        document.getElementById('settingsPanel').style.display = 'none';
    } else {
        showMessage('Please fill in all fields', 'error');
    }
}

function loadSettings() {
    const config = getGitHubConfig();
    if (config.username) {
        document.getElementById('githubUsername').value = config.username;
    }
    if (config.repo) {
        document.getElementById('githubRepo').value = config.repo;
    }
    if (config.token) {
        document.getElementById('githubToken').value = config.token;
    }
}

function showMessage(text, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    
    setTimeout(() => {
        messageDiv.className = 'message';
    }, 3000);
}

// Load history and stats
async function loadHistoryAndStats() {
    const currentUser = sessionStorage.getItem('currentUser');
    if (!currentUser) {
        return;
    }
    
    try {
        // Load CSV data
        const csvData = await getCSVFromGitHub();
        const userEntries = parseUserEntries(csvData, currentUser);
        
        // Display user entries count
        document.getElementById('userEntries').textContent = userEntries.length;
        
        // Display history
        displayHistory(userEntries);
        
        // Load and display total users
        const totalUsers = await getTotalUsers();
        document.getElementById('totalUsers').textContent = totalUsers;
        
    } catch (error) {
        console.error('Error loading history:', error);
        document.getElementById('historyContainer').innerHTML = 
            '<p class="loading-text">Error loading history. Please try again.</p>';
    }
}

// Get CSV data from GitHub or localStorage
async function getCSVFromGitHub() {
    const githubConfig = getGitHubConfig();
    
    // Check localStorage first
    const localData = localStorage.getItem('gradia_data');
    
    // If GitHub is configured, try to get from GitHub
    if (githubConfig.username && githubConfig.repo && githubConfig.token) {
        try {
            const apiUrl = `https://api.github.com/repos/${githubConfig.username}/${githubConfig.repo}/contents/gradia_data.csv`;
            const response = await fetch(apiUrl, {
                headers: {
                    'Authorization': `token ${githubConfig.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (response.ok) {
                const fileData = await response.json();
                const content = atob(fileData.content.replace(/\n/g, ''));
                // Update localStorage with latest data
                localStorage.setItem('gradia_data', content);
                return content;
            }
        } catch (error) {
            console.error('Error fetching CSV from GitHub:', error);
        }
    }
    
    // Fallback to localStorage
    return localData || 'Date,Username,Sleep,Food,Exercise,Feeling\n';
}

// Parse user entries from CSV
function parseUserEntries(csvContent, username) {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) {
        return [];
    }
    
    const header = lines[0].split(',');
    const entries = [];
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const parts = line.split(',');
        
        // Handle both old format (5 columns) and new format (6 columns)
        let date, entryUsername, sleep, food, exercise, feeling;
        
        if (parts.length === 5) {
            // Old format: Date,Sleep,Food,Exercise,Feeling
            date = parts[0];
            entryUsername = 'unknown';
            sleep = parts[1];
            food = parts[2];
            exercise = parts[3];
            feeling = parts[4];
        } else if (parts.length === 6) {
            // New format: Date,Username,Sleep,Food,Exercise,Feeling
            date = parts[0];
            entryUsername = parts[1];
            sleep = parts[2];
            food = parts[3];
            exercise = parts[4];
            feeling = parts[5];
        } else {
            continue; // Skip invalid lines
        }
        
        // Only include entries for the current user
        if (entryUsername === username) {
            entries.push({
                date,
                sleep: parseInt(sleep) || 0,
                food: parseInt(food) || 0,
                exercise: parseInt(exercise) || 0,
                feeling: parseInt(feeling) || 0
            });
        }
    }
    
    // Sort by date (newest first)
    entries.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    return entries;
}

// Display history entries
function displayHistory(entries) {
    const container = document.getElementById('historyContainer');
    
    if (entries.length === 0) {
        container.innerHTML = '<p class="no-entries">No entries yet. Start tracking your daily routine!</p>';
        return;
    }
    
    let html = '';
    entries.forEach(entry => {
        const date = new Date(entry.date).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
        
        html += `
            <div class="history-entry">
                <div class="history-date">${date}</div>
                <div class="history-metrics">
                    <div class="history-metric">
                        <span class="history-metric-label">Sleep</span>
                        <span class="history-metric-value">${entry.sleep}</span>
                    </div>
                    <div class="history-metric">
                        <span class="history-metric-label">Food</span>
                        <span class="history-metric-value">${entry.food}</span>
                    </div>
                    <div class="history-metric">
                        <span class="history-metric-label">Exercise</span>
                        <span class="history-metric-value">${entry.exercise}</span>
                    </div>
                    <div class="history-metric">
                        <span class="history-metric-label">Feeling</span>
                        <span class="history-metric-value">${entry.feeling}</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Get total number of users
async function getTotalUsers() {
    const githubConfig = getGitHubConfig();
    
    // Check localStorage first
    const localUsersJson = localStorage.getItem('gradia_users');
    let users = localUsersJson ? JSON.parse(localUsersJson) : {};
    
    // If GitHub is configured, try to get from GitHub
    if (githubConfig.username && githubConfig.repo && githubConfig.token) {
        try {
            const apiUrl = `https://api.github.com/repos/${githubConfig.username}/${githubConfig.repo}/contents/gradia_users.json`;
            const response = await fetch(apiUrl, {
                headers: {
                    'Authorization': `token ${githubConfig.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (response.ok) {
                const fileData = await response.json();
                const content = atob(fileData.content.replace(/\n/g, ''));
                const githubUsers = JSON.parse(content);
                // Merge users
                users = { ...users, ...githubUsers };
                // Update localStorage
                localStorage.setItem('gradia_users', JSON.stringify(users));
            }
        } catch (error) {
            console.error('Error fetching users from GitHub:', error);
        }
    }
    
    return Object.keys(users).length;
}

// Sync users from JSON to CSV (for existing users)
async function syncUsersToCSV() {
    const githubConfig = getGitHubConfig();
    
    if (!githubConfig.token) {
        throw new Error('GitHub token not set. Please set it in Settings first.');
    }
    
    // Get users from JSON
    const users = await getUsersFromGitHub();
    
    if (Object.keys(users).length === 0) {
        throw new Error('No users found to sync');
    }
    
    // Convert to CSV and save
    const csvContent = convertUsersToCSV(users);
    await saveUsersToGitHubFile('users.csv', csvContent, githubConfig);
    
    return true;
}

// Helper function to convert users to CSV (shared with auth.js logic)
function convertUsersToCSV(users) {
    let csv = 'Username,PasswordHash,CreatedAt\n';
    
    for (const username in users) {
        const user = users[username];
        csv += `${username},${user.password},${user.createdAt || new Date().toISOString()}\n`;
    }
    
    return csv;
}

// Helper function to save file to GitHub (shared with auth.js logic)
async function saveUsersToGitHubFile(filename, content, config) {
    if (!config.token) {
        throw new Error('GitHub token not set');
    }
    
    const apiUrl = `https://api.github.com/repos/${config.username}/${config.repo}/contents/${filename}`;
    
    // Try to get existing file
    let sha = null;
    try {
        const getResponse = await fetch(apiUrl, {
            headers: {
                'Authorization': `token ${config.token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (getResponse.ok) {
            const fileData = await getResponse.json();
            sha = fileData.sha;
        }
    } catch (error) {
        // File doesn't exist yet
    }
    
    const encodedContent = btoa(unescape(encodeURIComponent(content)));
    const body = {
        message: `Sync users to CSV - ${new Date().toISOString()}`,
        content: encodedContent,
        branch: 'main'
    };
    
    if (sha) {
        body.sha = sha;
    }
    
    const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${config.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to save ${filename}`);
    }
    
    return await response.json();
}

// Get users from GitHub (shared function)
async function getUsersFromGitHub() {
    const githubConfig = getGitHubConfig();
    let users = {};
    
    if (githubConfig.username && githubConfig.repo) {
        try {
            let apiUrl = `https://api.github.com/repos/${githubConfig.username}/${githubConfig.repo}/contents/gradia_users.json`;
            let headers = {
                'Accept': 'application/vnd.github.v3+json'
            };
            
            if (githubConfig.token) {
                headers['Authorization'] = `token ${githubConfig.token}`;
            }
            
            let response = await fetch(apiUrl, { headers });
            
            if (response.ok) {
                const fileData = await response.json();
                const content = atob(fileData.content.replace(/\n/g, ''));
                users = JSON.parse(content);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    }
    
    // Fallback to localStorage
    if (Object.keys(users).length === 0) {
        const localUsersJson = localStorage.getItem('gradia_users');
        users = localUsersJson ? JSON.parse(localUsersJson) : {};
    }
    
    return users;
}


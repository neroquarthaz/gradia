// Check authentication on page load
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    const currentUser = sessionStorage.getItem('currentUser');
    if (!currentUser) {
        // Redirect to login page
        window.location.href = 'login.html';
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
        window.location.href = 'login.html';
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
});

async function saveEntry() {
    const currentUser = sessionStorage.getItem('currentUser');
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    
    const sleep = document.getElementById('sleep').value;
    const food = document.getElementById('food').value;
    const exercise = document.getElementById('exercise').value;
    const feeling = document.getElementById('feeling').value;
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Create CSV row with username
    const csvRow = `${date},${currentUser},${sleep},${food},${exercise},${feeling}\n`;
    
    // Get GitHub settings
    const githubConfig = getGitHubConfig();
    
    if (githubConfig.username && githubConfig.repo && githubConfig.token) {
        // Save to GitHub
        try {
            showMessage('Saving to GitHub...', 'success');
            await saveToGitHub(csvRow, date, githubConfig);
            showMessage('Entry saved to GitHub successfully!', 'success');
        } catch (error) {
            console.error('Error saving to GitHub:', error);
            showMessage('Error saving to GitHub: ' + error.message, 'error');
            // Fallback to localStorage
            saveToLocalStorage(csvRow, date, currentUser);
        }
    } else {
        // Fallback to localStorage if GitHub not configured
        saveToLocalStorage(csvRow, date, currentUser);
        showMessage('Entry saved locally. Configure GitHub settings to save to repository.', 'success');
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
    
    const dataLines = csvContent.trim().split('\n').slice(1);
    
    // Check if entry for today already exists for this user
    const existingIndex = dataLines.findIndex(line => {
        const parts = line.split(',');
        return parts[0] === date && parts[1] === currentUser;
    });
    
    if (existingIndex !== -1) {
        // Update existing entry
        dataLines[existingIndex] = csvRow.trim();
        csvContent = header + '\n' + dataLines.join('\n') + '\n';
    } else {
        // Add new row
        csvContent += csvRow;
    }
    
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
    return {
        username: localStorage.getItem('github_username') || '',
        repo: localStorage.getItem('github_repo') || '',
        token: localStorage.getItem('github_token') || ''
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


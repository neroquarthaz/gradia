// Authentication logic
document.addEventListener('DOMContentLoaded', function() {
    // Tab switching
    const loginTab = document.getElementById('loginTab');
    const signupTab = document.getElementById('signupTab');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    
    loginTab.addEventListener('click', function() {
        loginTab.classList.add('active');
        signupTab.classList.remove('active');
        loginForm.style.display = 'block';
        signupForm.style.display = 'none';
    });
    
    signupTab.addEventListener('click', function() {
        signupTab.classList.add('active');
        loginTab.classList.remove('active');
        signupForm.style.display = 'block';
        loginForm.style.display = 'none';
    });
    
    // Login form submission
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        
        if (!username || !password) {
            showMessage('Please enter both username and password', 'error');
            return;
        }
        
        // Disable button and show loading
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Logging in...';
        
        try {
            showMessage('Logging in...', 'success');
            const success = await authenticateUser(username, password);
            if (success) {
                // Store current user
                sessionStorage.setItem('currentUser', username);
                showMessage('Login successful! Redirecting...', 'success');
                // Small delay to show success message
                setTimeout(() => {
                    window.location.href = 'tracker.html';
                }, 500);
            } else {
                showMessage('Invalid username or password', 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        } catch (error) {
            console.error('Login error:', error);
            showMessage('Error during login: ' + error.message, 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });
    
    // Sign up form submission
    signupForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const username = document.getElementById('signupUsername').value.trim();
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (!username || !password) {
            showMessage('Please fill in all fields', 'error');
            return;
        }
        
        if (password !== confirmPassword) {
            showMessage('Passwords do not match', 'error');
            return;
        }
        
        if (password.length < 4) {
            showMessage('Password must be at least 4 characters', 'error');
            return;
        }
        
        try {
            const success = await createUser(username, password);
            if (success) {
                showMessage('Account created successfully! Please login.', 'success');
                // Switch to login tab
                setTimeout(() => {
                    loginTab.click();
                    document.getElementById('loginUsername').value = username;
                }, 1500);
            } else {
                showMessage('Username already exists', 'error');
            }
        } catch (error) {
            console.error('Signup error:', error);
            showMessage('Error creating account: ' + error.message, 'error');
        }
    });
});

// Hash password using Web Crypto API
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// Get users from GitHub (prioritize GitHub, fallback to localStorage)
async function getUsersFromGitHub() {
    const githubConfig = getGitHubConfig();
    let users = {};
    
    // Try to get from GitHub first (even without token for public repos)
    if (githubConfig.username && githubConfig.repo) {
        try {
            // Try with token first (for private repos or write access)
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
                // Update localStorage with GitHub data
                localStorage.setItem('gradia_users', JSON.stringify(users));
                console.log('Loaded users from GitHub:', Object.keys(users).length);
            } else if (response.status === 404) {
                // File doesn't exist yet, try CSV
                console.log('JSON file not found, trying CSV...');
                users = await getUsersFromCSV();
            } else {
                // Try CSV as fallback
                console.log('Error fetching JSON, trying CSV...');
                users = await getUsersFromCSV();
            }
        } catch (error) {
            console.error('Error fetching users from GitHub JSON:', error);
            // Try CSV as fallback
            users = await getUsersFromCSV();
        }
    }
    
    // If no users from GitHub, try CSV
    if (Object.keys(users).length === 0) {
        users = await getUsersFromCSV();
    }
    
    // Fallback to localStorage if nothing else works
    if (Object.keys(users).length === 0) {
        const localUsersJson = localStorage.getItem('gradia_users');
        users = localUsersJson ? JSON.parse(localUsersJson) : {};
    }
    
    return users;
}

// Get users from CSV file
async function getUsersFromCSV() {
    const githubConfig = getGitHubConfig();
    let users = {};
    
    if (!githubConfig.username || !githubConfig.repo) {
        return users;
    }
    
    try {
        let apiUrl = `https://api.github.com/repos/${githubConfig.username}/${githubConfig.repo}/contents/users.csv`;
        let headers = {
            'Accept': 'application/vnd.github.v3+json'
        };
        
        if (githubConfig.token) {
            headers['Authorization'] = `token ${githubConfig.token}`;
        }
        
        const response = await fetch(apiUrl, { headers });
        
        if (response.ok) {
            const fileData = await response.json();
            const content = atob(fileData.content.replace(/\n/g, ''));
            const lines = content.trim().split('\n');
            
            // Skip header line
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                
                const parts = line.split(',');
                if (parts.length >= 2) {
                    const username = parts[0].trim();
                    const passwordHash = parts[1].trim();
                    const createdAt = parts[2] ? parts[2].trim() : new Date().toISOString();
                    
                    users[username] = {
                        password: passwordHash,
                        createdAt: createdAt
                    };
                }
            }
            
            console.log('Loaded users from CSV:', Object.keys(users).length);
        }
    } catch (error) {
        console.error('Error fetching users from CSV:', error);
    }
    
    return users;
}

// Save users to GitHub (both JSON and CSV)
async function saveUsersToGitHub(users) {
    const githubConfig = getGitHubConfig();
    const usersJson = JSON.stringify(users, null, 2);
    
    // Also save to localStorage as backup
    localStorage.setItem('gradia_users', usersJson);
    
    if (!githubConfig.username || !githubConfig.repo) {
        return true; // Just saved to localStorage
    }
    
    // Save to JSON file
    if (githubConfig.token) {
        try {
            await saveUsersToGitHubFile('gradia_users.json', usersJson, githubConfig);
        } catch (error) {
            console.error('Error saving users JSON to GitHub:', error);
        }
    }
    
    // Save to CSV file
    try {
        const csvContent = convertUsersToCSV(users);
        if (githubConfig.token) {
            await saveUsersToGitHubFile('users.csv', csvContent, githubConfig);
        }
    } catch (error) {
        console.error('Error saving users CSV to GitHub:', error);
    }
    
    return true;
}

// Convert users object to CSV format
function convertUsersToCSV(users) {
    let csv = 'Username,PasswordHash,CreatedAt\n';
    
    for (const username in users) {
        const user = users[username];
        csv += `${username},${user.password},${user.createdAt || new Date().toISOString()}\n`;
    }
    
    return csv;
}

// Save users file to GitHub
async function saveUsersToGitHubFile(filename, content, config) {
    if (!config.token) {
        return; // Need token to write
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
        message: `Update users list - ${new Date().toISOString()}`,
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

// Authenticate user
async function authenticateUser(username, password) {
    try {
        const users = await getUsersFromGitHub();
        const hashedPassword = await hashPassword(password);
        
        console.log('Attempting to authenticate:', username);
        console.log('Users found:', Object.keys(users));
        
        if (users[username]) {
            console.log('User found, comparing passwords...');
            console.log('Stored hash:', users[username].password);
            console.log('Input hash:', hashedPassword);
            
            if (users[username].password === hashedPassword) {
                console.log('Password match!');
                return true;
            } else {
                console.log('Password mismatch');
            }
        } else {
            console.log('User not found');
        }
        
        return false;
    } catch (error) {
        console.error('Authentication error:', error);
        throw error;
    }
}

// Create new user
async function createUser(username, password) {
    const users = await getUsersFromGitHub();
    
    if (users[username]) {
        return false; // Username already exists
    }
    
    const hashedPassword = await hashPassword(password);
    users[username] = {
        password: hashedPassword,
        createdAt: new Date().toISOString()
    };
    
    await saveUsersToGitHub(users);
    return true;
}

// Get GitHub config (shared function)
// Try to get from localStorage, but also try hardcoded defaults
function getGitHubConfig() {
    // First try localStorage (for admin token)
    const storedUsername = localStorage.getItem('github_username');
    const storedRepo = localStorage.getItem('github_repo');
    const storedToken = localStorage.getItem('github_token');
    
    // Use hardcoded defaults if not in localStorage (so it works after cache clear)
    // These should match your actual GitHub repo
    return {
        username: storedUsername || 'neroquarthaz',
        repo: storedRepo || 'gradia',
        token: storedToken || '' // Token still needs to be set by admin
    };
}

function showMessage(text, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    
    setTimeout(() => {
        messageDiv.className = 'message';
    }, 3000);
}


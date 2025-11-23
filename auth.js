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
        
        if (!username || !password) {
            showMessage('Please enter both username and password', 'error');
            return;
        }
        
        try {
            const success = await authenticateUser(username, password);
            if (success) {
                // Store current user
                sessionStorage.setItem('currentUser', username);
                // Redirect to main page
                window.location.href = 'tracker.html';
            } else {
                showMessage('Invalid username or password', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            showMessage('Error during login: ' + error.message, 'error');
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

// Get users from GitHub
async function getUsersFromGitHub() {
    const githubConfig = getGitHubConfig();
    
    if (!githubConfig.username || !githubConfig.repo || !githubConfig.token) {
        // Fallback to localStorage
        const usersJson = localStorage.getItem('gradia_users');
        return usersJson ? JSON.parse(usersJson) : {};
    }
    
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
            return JSON.parse(content);
        } else {
            // File doesn't exist, return empty object
            return {};
        }
    } catch (error) {
        console.error('Error fetching users:', error);
        // Fallback to localStorage
        const usersJson = localStorage.getItem('gradia_users');
        return usersJson ? JSON.parse(usersJson) : {};
    }
}

// Save users to GitHub
async function saveUsersToGitHub(users) {
    const githubConfig = getGitHubConfig();
    const usersJson = JSON.stringify(users, null, 2);
    
    // Also save to localStorage as backup
    localStorage.setItem('gradia_users', usersJson);
    
    if (!githubConfig.username || !githubConfig.repo || !githubConfig.token) {
        return true; // Just saved to localStorage
    }
    
    try {
        const apiUrl = `https://api.github.com/repos/${githubConfig.username}/${githubConfig.repo}/contents/gradia_users.json`;
        
        // Try to get existing file
        let sha = null;
        try {
            const getResponse = await fetch(apiUrl, {
                headers: {
                    'Authorization': `token ${githubConfig.token}`,
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
        
        const encodedContent = btoa(unescape(encodeURIComponent(usersJson)));
        const body = {
            message: 'Update users list',
            content: encodedContent,
            branch: 'main'
        };
        
        if (sha) {
            body.sha = sha;
        }
        
        const response = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${githubConfig.token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to save users');
        }
        
        return true;
    } catch (error) {
        console.error('Error saving users to GitHub:', error);
        // At least saved to localStorage
        return true;
    }
}

// Authenticate user
async function authenticateUser(username, password) {
    const users = await getUsersFromGitHub();
    const hashedPassword = await hashPassword(password);
    
    if (users[username] && users[username].password === hashedPassword) {
        return true;
    }
    
    return false;
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
function getGitHubConfig() {
    return {
        username: localStorage.getItem('github_username') || '',
        repo: localStorage.getItem('github_repo') || '',
        token: localStorage.getItem('github_token') || ''
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


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

// Get users from GitHub
async function getUsersFromGitHub() {
    const githubConfig = getGitHubConfig();
    
    // Always check localStorage first for immediate access
    const localUsersJson = localStorage.getItem('gradia_users');
    let users = localUsersJson ? JSON.parse(localUsersJson) : {};
    
    // If GitHub is configured, try to sync with GitHub
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
                // Merge: GitHub takes precedence, but keep local if GitHub doesn't have it
                users = { ...users, ...githubUsers };
                // Update localStorage with merged data
                localStorage.setItem('gradia_users', JSON.stringify(users));
            }
        } catch (error) {
            console.error('Error fetching users from GitHub:', error);
            // Continue with localStorage data
        }
    }
    
    return users;
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


# Gradia - Daily Routine Tracker

A simple and beautiful daily routine tracker web application that helps you track your daily habits and automatically saves data to your GitHub repository.

## Features

- **4 Interactive Sliders**: Track Sleep, Food, Exercise, and How You Felt Yesterday
- **0-10 Scale**: Easy-to-use sliders for quick evaluation
- **GitHub Integration**: Automatically saves data directly to your GitHub repository
- **Modern UI**: Beautiful, responsive design that works on all devices

## Setup Instructions

### 1. Create a GitHub Personal Access Token

1. Go to [GitHub Settings > Developer settings > Personal access tokens > Tokens (classic)](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Give it a name (e.g., "Gradia Tracker")
4. Select the `repo` scope (this allows the token to update files in your repositories)
5. Click "Generate token"
6. **Copy the token immediately** (you won't be able to see it again!)

### 2. Configure the Website

1. Open the website (locally or on GitHub Pages)
2. Click the "⚙️ Settings" button at the bottom
3. Enter your:
   - **GitHub Username**: Your GitHub username (e.g., `neroquarthaz`)
   - **Repository Name**: The repository name (e.g., `betproject`)
   - **Personal Access Token**: The token you just created
4. Click "Save Settings"

### 3. Start Tracking

1. Adjust the sliders for each category (0-10)
2. Click "Save Entry"
3. Your data will be automatically saved to `gradia_data.csv` in your GitHub repository!

## How It Works

When you click "Save Entry":
- The data is sent to GitHub's API
- The `gradia_data.csv` file in your repository is updated
- If an entry for today already exists, it will be updated
- New entries are appended to the CSV file

## Hosting on GitHub Pages

1. Push all files to your GitHub repository
2. Go to Settings > Pages in your repository
3. Select the branch (usually `main`) and folder (`/root`)
4. Your site will be available at `https://yourusername.github.io/repository-name/`

## Files

- `index.html` - Main HTML structure
- `styles.css` - Styling and design
- `script.js` - Functionality and GitHub API integration
- `gradia_data.csv` - Data file (automatically updated)

## Data Format

The CSV file contains the following columns:
- Date (YYYY-MM-DD)
- Sleep (0-10)
- Food (0-10)
- Exercise (0-10)
- Feeling (0-10)

## Security Note

Your GitHub token is stored in your browser's localStorage. This is secure for personal use, but remember:
- Never share your token
- If you suspect your token is compromised, revoke it and create a new one
- The token only has access to repositories you grant it access to


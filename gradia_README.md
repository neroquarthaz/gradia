# Gradia - Daily Routine Tracker

A simple and beautiful daily routine tracker web application that helps you track your daily habits.

## Features

- **4 Interactive Sliders**: Track Sleep, Food, Exercise, and How You Felt Yesterday
- **0-10 Scale**: Easy-to-use sliders for quick evaluation
- **CSV Export**: Automatically downloads your data as CSV for easy tracking
- **Modern UI**: Beautiful, responsive design that works on all devices

## How to Use

1. Open `index.html` in your web browser
2. Adjust the sliders for each category (0-10)
3. Click "Save Entry" to record your daily routine
4. The data will be automatically downloaded as `gradia_data.csv`

## Hosting on GitHub Pages

1. Push all files to your GitHub repository
2. Go to Settings > Pages in your repository
3. Select the branch (usually `main`) and folder (`/root`)
4. Your site will be available at `https://yourusername.github.io/repository-name/`

## Files

- `index.html` - Main HTML structure
- `styles.css` - Styling and design
- `script.js` - Functionality and CSV generation

## Data Format

The CSV file contains the following columns:
- Date (YYYY-MM-DD)
- Sleep (0-10)
- Food (0-10)
- Exercise (0-10)
- Feeling (0-10)


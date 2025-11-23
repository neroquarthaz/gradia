// Update slider values in real-time
document.addEventListener('DOMContentLoaded', function() {
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
});

function saveEntry() {
    const sleep = document.getElementById('sleep').value;
    const food = document.getElementById('food').value;
    const exercise = document.getElementById('exercise').value;
    const feeling = document.getElementById('feeling').value;
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Create CSV row
    const csvRow = `${date},${sleep},${food},${exercise},${feeling}\n`;
    
    // Check if CSV file exists in localStorage, if not create header
    let csvContent = localStorage.getItem('gradia_data');
    if (!csvContent) {
        csvContent = 'Date,Sleep,Food,Exercise,Feeling\n';
    }
    
    // Parse existing CSV to check for duplicate dates
    const lines = csvContent.trim().split('\n');
    const header = lines[0];
    const dataLines = lines.slice(1);
    
    // Check if entry for today already exists
    const existingIndex = dataLines.findIndex(line => line.startsWith(date));
    
    if (existingIndex !== -1) {
        // Update existing entry
        dataLines[existingIndex] = csvRow.trim();
        csvContent = header + '\n' + dataLines.join('\n') + '\n';
        showMessage('Entry updated successfully!', 'success');
    } else {
        // Add new row
        csvContent += csvRow;
        showMessage('Entry saved successfully!', 'success');
    }
    
    localStorage.setItem('gradia_data', csvContent);
    
    // Download CSV file
    downloadCSV(csvContent);
    
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

function downloadCSV(csvContent) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'gradia_data.csv');
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function showMessage(text, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    
    setTimeout(() => {
        messageDiv.className = 'message';
    }, 3000);
}


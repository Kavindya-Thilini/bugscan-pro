// Import libraries
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { scanWebsite } = require('./scanner');

// Create app
const app = express();

// Path to bugs data file
const bugsFilePath = path.join(__dirname, '../data/bugs.json');

// Middleware
app.use(cors());
app.use(express.json());

// Serve the frontend folder
app.use(express.static(path.join(__dirname, '../frontend')));

// Scan route
app.post('/scan', async (req, res) => {
    const { url } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: 'No URL provided' });
    }

    try {
        const bugs = await scanWebsite(url);
        res.json({ bugs });
    } catch (error) {
        res.status(500).json({ error: `Scan failed: ${error.message}` });
    }
});

// Route: Save a scan result
app.post('/save', (req, res) => {
    const { url, bugs } = req.body;
    
    // Read existing data
    const data = JSON.parse(fs.readFileSync(bugsFilePath, 'utf8'));
    
    // Add new scan
    data.push({
        url: url,
        date: new Date().toISOString(),
        bugCount: bugs.length,
        bugs: bugs
    });
    
    // Write back to file
    fs.writeFileSync(bugsFilePath, JSON.stringify(data, null, 2));
    
    res.json({ message: 'Scan saved successfully', totalScans: data.length });
});

// Route: Get all saved scans
app.get('/history', (req, res) => {
    const data = JSON.parse(fs.readFileSync(bugsFilePath, 'utf8'));
    res.json(data);
});

// Route: Delete a saved scan by index
app.delete('/history/:index', (req, res) => {
    const index = parseInt(req.params.index);
    
    // Read existing data
    const data = JSON.parse(fs.readFileSync(bugsFilePath, 'utf8'));
    
    // Check if index is valid
    if (index < 0 || index >= data.length) {
        return res.status(404).json({ error: 'Scan not found' });
    }
    
    // Remove the scan
    data.splice(index, 1);
    
    // Write back to file
    fs.writeFileSync(bugsFilePath, JSON.stringify(data, null, 2));
    
    res.json({ message: 'Scan deleted successfully', totalScans: data.length });
});

// Route: Update a saved scan (add manual bugs)
app.put('/history/:index', (req, res) => {
    const index = parseInt(req.params.index);
    const { bugs } = req.body;
    
    const data = JSON.parse(fs.readFileSync(bugsFilePath, 'utf8'));
    
    if (index < 0 || index >= data.length) {
        return res.status(404).json({ error: 'Scan not found' });
    }
    
    data[index].bugs = bugs;
    data[index].bugCount = bugs.length;
    data[index].date = new Date().toISOString();
    
    fs.writeFileSync(bugsFilePath, JSON.stringify(data, null, 2));
    
    res.json({ message: 'Scan updated successfully' });
});

// Start server
app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
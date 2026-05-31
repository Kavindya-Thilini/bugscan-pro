// Import libraries
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { scanWebsite } = require('./scanner');
const app = express();
const bugsFilePath = path.join(__dirname, '../data/bugs.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));
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

app.post('/save', (req, res) => {
    const { url, bugs } = req.body;
    
    const data = JSON.parse(fs.readFileSync(bugsFilePath, 'utf8'));
    
    data.push({
        url: url,
        date: new Date().toISOString(),
        bugCount: bugs.length,
        bugs: bugs
    });
    
    fs.writeFileSync(bugsFilePath, JSON.stringify(data, null, 2));
    
    res.json({ message: 'Scan saved successfully', totalScans: data.length });
});

app.get('/history', (req, res) => {
    const data = JSON.parse(fs.readFileSync(bugsFilePath, 'utf8'));
    res.json(data);
});

app.delete('/history/:index', (req, res) => {
    const index = parseInt(req.params.index); 
    const data = JSON.parse(fs.readFileSync(bugsFilePath, 'utf8'));
    
    if (index < 0 || index >= data.length) {
        return res.status(404).json({ error: 'Scan not found' });
    }
    
    data.splice(index, 1);
    
    fs.writeFileSync(bugsFilePath, JSON.stringify(data, null, 2));
    
    res.json({ message: 'Scan deleted successfully', totalScans: data.length });
});

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

app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});

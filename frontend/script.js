// Toast Notification System
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icons[type]}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 3000);
}

function showConfirm(message, onConfirm) {
    const container = document.getElementById('toastContainer');
    
    const toast = document.createElement('div');
    toast.className = 'toast toast-confirm';
    toast.innerHTML = `
        <span class="toast-icon">⚠️</span>
        <div>
            <span class="toast-message">${message}</span>
            <div class="toast-actions">
                <button class="toast-btn toast-btn-yes" id="confirmYes">Yes, Delete</button>
                <button class="toast-btn toast-btn-no" id="confirmNo">Cancel</button>
            </div>
        </div>
    `;
    
    container.appendChild(toast);
    
    toast.querySelector('#confirmYes').addEventListener('click', () => {
        toast.remove();
        onConfirm();
    });
    
    toast.querySelector('#confirmNo').addEventListener('click', () => {
        toast.remove();
    });
    
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 8000);
}

let currentUrl = '';
let scannedBugs = [];
let manualBugs = [];
let allSavedScans = [];
let currentScanIndex = -1; 

async function startScan() {
    const url = document.getElementById('urlInput').value.trim();
    
    if (!url) {
        showToast('Please enter a URL', 'warning');
        return;
    }

    currentUrl = url;
    currentScanIndex = -1;
    scannedBugs = [];
    manualBugs = [];
    
    document.getElementById('loadingBar').classList.add('active');
    document.getElementById('scanBtn').disabled = true;
    document.getElementById('scanBtn').textContent = '⏳ Scanning...';
    document.getElementById('resultsArea').innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div><p>Scanning ' + url + '...</p></div>';
    document.getElementById('statsRow').style.display = 'none';
    document.getElementById('bugCountLabel').textContent = '';

    try {
        const response = await fetch('http://localhost:3000/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: url })
        });

        const data = await response.json();
        scannedBugs = data.bugs || [];
        
        displayAllBugs();
        
    } catch (error) {
        document.getElementById('resultsArea').innerHTML = 
            '<div class="empty-state"><div class="empty-icon">❌</div><p>Error: ' + error.message + '</p><p style="font-size:12px;">Is the server running on port 3000?</p></div>';
    } finally {
        document.getElementById('loadingBar').classList.remove('active');
        document.getElementById('scanBtn').disabled = false;
        document.getElementById('scanBtn').textContent = '▶ Start Scan';
    }
}

function addManualBug() {
    const title = document.getElementById('manualTitle').value.trim();
    const description = document.getElementById('manualDescription').value.trim();
    const severity = document.getElementById('manualSeverity').value;
    
    if (!title || !description) {
        showToast('Please fill in both title and description', 'warning');
        return;
    }

    if (!currentUrl) {
        showToast('Please scan a URL first before adding manual bugs.', 'warning');
        return;
    }
    
    manualBugs.push({
        type: title,
        severity: severity,
        description: description,
        location: 'Manual Report — ' + currentUrl
    });
    
    document.getElementById('manualTitle').value = '';
    document.getElementById('manualDescription').value = '';
    
    displayAllBugs();

    if (currentScanIndex >= 0) {
        updateScan(currentScanIndex);
    }
}

function deleteManualBug(index) {
    if (index < 0 || index >= manualBugs.length) return;
    
    manualBugs.splice(index, 1);
    displayAllBugs();
    
    if (currentScanIndex >= 0) {
        updateScan(currentScanIndex);
        showToast('Manual bug deleted and scan updated.', 'success');
    } else {
        showToast('Manual bug deleted.', 'success');
    }
}

function displayAllBugs() {
    const allBugs = [...scannedBugs, ...manualBugs];
    const resultsArea = document.getElementById('resultsArea');
    const statsRow = document.getElementById('statsRow');
    const bugCountLabel = document.getElementById('bugCountLabel');
    
    if (allBugs.length === 0) {
        resultsArea.innerHTML = '<div class="empty-state"><div class="empty-icon">✅</div><p>No bugs found! ' + currentUrl + ' looks clean.</p></div>';
        statsRow.style.display = 'none';
        bugCountLabel.textContent = '';
        return;
    }

    let critical = 0, high = 0, medium = 0, low = 0;
    
    allBugs.forEach(bug => {
        if (bug.severity === 'Critical') critical++;
        if (bug.severity === 'High') high++;
        if (bug.severity === 'Medium') medium++;
        if (bug.severity === 'Low') low++;
    });

    statsRow.style.display = 'grid';
    document.getElementById('statTotal').textContent = allBugs.length;
    document.getElementById('statCritical').textContent = critical;
    document.getElementById('statHigh').textContent = high;
    document.getElementById('statMedium').textContent = medium;
    bugCountLabel.textContent = allBugs.length + ' bug(s) found';

    let html = '<div class="bug-list">';
    let manualIndex = 0;
    
    allBugs.forEach((bug, i) => {
        const severityLower = bug.severity.toLowerCase();
        const iconMap = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' };
        const icon = iconMap[severityLower] || '⚪';
        const badgeClass = 'badge-' + severityLower;
        const cardClass = 'bug-' + severityLower;
        const isManual = bug.location && bug.location.startsWith('Manual Report');
        const currentManualIndex = isManual ? manualIndex++ : -1;
        
        html += `
            <div class="bug-card ${cardClass}">
                <div class="bug-icon">${icon}</div>
                <div class="bug-info">
                    ${isManual ? '<span class="tag">MANUAL</span> ' : ''}
                    <h4>${escapeHtml(bug.type)}</h4>
                    <p>${escapeHtml(bug.description)}</p>
                    <div class="bug-location">📍 ${escapeHtml(bug.location)}</div>
                </div>
                <div style="display: flex; flex-direction: column; gap: 6px; align-items: flex-end;">
                    <div class="bug-severity-badge ${badgeClass}">${bug.severity}</div>
                    ${isManual ? `<button class="btn-delete-bug" onclick="deleteManualBug(${currentManualIndex})">🗑 Remove </button>` : ''}
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    resultsArea.innerHTML = html;
}

async function saveScan() {
    if (!currentUrl || (scannedBugs.length === 0 && manualBugs.length === 0)) {
        showToast('No bugs to save. Run a scan first.', 'warning');
        return;
    }
    
    const allBugs = [...scannedBugs, ...manualBugs];
    
    try {
        const response = await fetch('http://localhost:3000/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: currentUrl, bugs: allBugs })
        });
        
        const data = await response.json();
        showToast('Scan saved! Total scans stored: ' + data.totalScans, 'success');
    } catch (error) {
        showToast('Failed to save: ' + error.message, 'error');
    }
}

async function loadHistory() {
    try {
        const response = await fetch('http://localhost:3000/history');
        const scans = await response.json();
        
        if (scans.length === 0) {
            showToast('No saved scans yet.', 'info');
            return;
        }
        
        allSavedScans = scans;
        
        let html = '<div class="bug-list">';
        scans.forEach((scan, index) => {
            html += `
                <div class="bug-card" style="border-left: 3px solid var(--accent);">
                    <div class="bug-icon" style="background: var(--accent-glow); color: var(--accent);">📋</div>
                    <div class="bug-info">
                        <h4>Scan #${index + 1}: ${escapeHtml(scan.url)}</h4>
                        <p>${new Date(scan.date).toLocaleString()}</p>
                        <div class="bug-location">🐞 ${scan.bugCount} bug(s) found</div>
                    </div>
                    <div class="history-actions">
                        <button class="btn btn-sm btn-load" onclick="restoreScan(${index})">↩ Load</button>
                        <button class="btn btn-sm btn-clear" onclick="deleteScan(${index})">🗑 Delete</button>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        
        document.getElementById('resultsArea').innerHTML = html;
        document.getElementById('statsRow').style.display = 'none';
        document.getElementById('bugCountLabel').textContent = scans.length + ' saved scan(s)';
    } catch (error) {
        showToast('Failed to load history: ' + error.message, 'error');
    }
}

function restoreScan(index) {
    const scan = allSavedScans[index];
    currentUrl = scan.url;
    currentScanIndex = index; 
    document.getElementById('urlInput').value = scan.url;
    
    scannedBugs = scan.bugs.filter(b => !b.location || !b.location.startsWith('Manual Report'));
    manualBugs = scan.bugs.filter(b => b.location && b.location.startsWith('Manual Report'));
    
    displayAllBugs();
}


function deleteScan(index) {
    showConfirm('Are you sure you want to delete this scan?', async () => {
        try {
            if (index === currentScanIndex) {
                clearResults();
            }
            
            const response = await fetch(`http://localhost:3000/history/${index}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            showToast('Scan deleted! Remaining scans: ' + data.totalScans, 'success');
            
            loadHistory();
        } catch (error) {
            showToast('Failed to delete: ' + error.message, 'error');
        }
    });
}

async function updateScan(index) {
    const allBugs = [...scannedBugs, ...manualBugs];
    
    try {
        const response = await fetch(`http://localhost:3000/history/${index}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bugs: allBugs })
        });
        
        await response.json();
    } catch (error) {
        showToast('Failed to update scan: ' + error.message, 'error');
    }
}


function clearResults() {
    currentUrl = '';
    scannedBugs = [];
    manualBugs = [];
    document.getElementById('resultsArea').innerHTML = '<div class="empty-state"><div class="empty-icon">🔎</div><p>Enter a URL and scan, or add a manual bug report</p></div>';
    document.getElementById('statsRow').style.display = 'none';
    document.getElementById('bugCountLabel').textContent = '';
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

const puppeteer = require('puppeteer');

async function scanWebsite(url) {
    
     let bugsFound = [];
 
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    page.on('console', message => {
        if (message.type() === 'error') {
            bugsFound.push({
                type: 'Console Error',
                severity: 'Critical',
                description: message.text(),
                location: 'Browser Console'
            });
        }
    });

    console.log(`Scanning: ${url}`);
    await page.goto(url, { waitUntil: 'load' });

    const brokenImages = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('img'));
        return images
            .filter(img => img.naturalWidth === 0)
            .map(img => img.src || 'no source');
    });

    brokenImages.forEach(src => {
        bugsFound.push({
            type: 'Broken Image',
            severity: 'High',
            description: `Image failed to load: ${src}`,
            location: 'Page Body'
        });
    });

    const missingAlt = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('img'));
        return images
            .filter(img => !img.alt || img.alt.trim() === '')
            .map(img => img.src || 'no source');
    });

    missingAlt.forEach(src => {
        bugsFound.push({
            type: 'Missing Alt Text',
            severity: 'Medium',
            description: `Image has no alt text: ${src}`,
            location: 'Page Body'
        });
    });

    console.log('Checking for broken links...');
    
    const links = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a[href]'));
        return anchors.map(a => a.href);
    });

    const uniqueLinks = [...new Set(links)];
    const linksToCheck = uniqueLinks.slice(0, 20);

    for (const link of linksToCheck) {
        if (!link.startsWith('http')) continue;
        
        try {
            const response = await fetch(link, { 
                method: 'HEAD',
                timeout: 5000 
            });
            
            if (response.status >= 400) {
                bugsFound.push({
                    type: 'Broken Link',
                    severity: 'Critical',
                    description: `Link returns error ${response.status}: ${link}`,
                    location: 'Page Links'
                });
            }
        } catch (error) {
            bugsFound.push({
                type: 'Broken Link',
                severity: 'Critical',
                description: `Link unreachable: ${link}`,
                location: 'Page Links'
            });
        }
    }

    await browser.close();

    console.log(`Scan complete. Found ${bugsFound.length} bugs.`);
    return bugsFound;
}

module.exports = { scanWebsite };


<line_number>1</line_number>
// Real Web Scraper with Puppeteer
const puppeteer = require('puppeteer');
const fs = require('fs');

class SmartWebScraper {
    constructor() {
        this.browser = null;
        this.isInitialized = false;
    }

    async initialize() {
        try {
            this.browser = await puppeteer.launch({
                headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor'
                ]
            });
            this.isInitialized = true;
            console.log('🕷️ Smart Web Scraper initialized');
            return true;
        } catch (error) {
            console.error('❌ Web Scraper initialization failed:', error);
            return false;
        }
    }

    async scrapeWebsite(url, options = {}) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            const page = await this.browser.newPage();
            
            // Set user agent to avoid blocking
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            
            // Set viewport
            await page.setViewport({ width: 1920, height: 1080 });

            // Navigate to the page
            await page.goto(url, { 
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            // Handle dynamic content if requested
            if (options.dynamicContent) {
                await page.waitForTimeout(3000);
                await this.scrollToLoadContent(page);
            }

            // Extract data
            const result = await page.evaluate(() => {
                return {
                    title: document.title,
                    url: window.location.href,
                    content: document.body.innerText.substring(0, 5000), // Limit content
                    links: Array.from(document.querySelectorAll('a')).map(a => ({
                        href: a.href,
                        text: a.innerText.trim()
                    })).filter(link => link.href && link.text),
                    images: Array.from(document.querySelectorAll('img')).map(img => ({
                        src: img.src,
                        alt: img.alt
                    })),
                    metadata: {
                        description: document.querySelector('meta[name="description"]')?.content || '',
                        keywords: document.querySelector('meta[name="keywords"]')?.content || '',
                        author: document.querySelector('meta[name="author"]')?.content || ''
                    }
                };
            });

            // Close the page
            await page.close();

            return {
                success: true,
                data: result,
                timestamp: new Date().toISOString(),
                processingTime: Date.now()
            };

        } catch (error) {
            console.error('❌ Web scraping failed:', error);
            return {
                success: false,
                error: error.message,
                url: url
            };
        }
    }

    async scrollToLoadContent(page) {
        await page.evaluate(() => {
            return new Promise((resolve) => {
                let totalHeight = 0;
                const distance = 100;
                const timer = setInterval(() => {
                    const scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;

                    if(totalHeight >= scrollHeight){
                        clearInterval(timer);
                        resolve();
                    }
                }, 100);
            });
        });
    }

    async scrapeMultiplePages(urls, options = {}) {
        const results = [];
        
        for (const url of urls) {
            const result = await this.scrapeWebsite(url, options);
            results.push(result);
            
            // Add delay between requests to be respectful
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        return results;
    }

    async extractTableData(url) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            const page = await this.browser.newPage();
            await page.goto(url, { waitUntil: 'networkidle2' });

            const tables = await page.evaluate(() => {
                const tableElements = document.querySelectorAll('table');
                return Array.from(tableElements).map((table, index) => {
                    const rows = Array.from(table.querySelectorAll('tr'));
                    return {
                        tableIndex: index,
                        data: rows.map(row => {
                            const cells = Array.from(row.querySelectorAll('td, th'));
                            return cells.map(cell => cell.innerText.trim());
                        })
                    };
                });
            });

            await page.close();

            return {
                success: true,
                tables: tables,
                count: tables.length
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async takeScreenshot(url, options = {}) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            const page = await this.browser.newPage();
            await page.setViewport({ 
                width: options.width || 1920, 
                height: options.height || 1080 
            });
            
            await page.goto(url, { waitUntil: 'networkidle2' });

            const screenshot = await page.screenshot({
                fullPage: options.fullPage || false,
                type: options.format || 'png'
            });

            await page.close();

            return {
                success: true,
                screenshot: screenshot,
                format: options.format || 'png'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.isInitialized = false;
            console.log('🕷️ Web Scraper closed');
        }
    }
}

module.exports = SmartWebScraper;

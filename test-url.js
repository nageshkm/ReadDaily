// Test direct fetch with improved headers
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testDirectFetch() {
  try {
    const url = 'https://www.profgalloway.com/marrying-up-and-marrying-down/';
    console.log('Testing direct fetch:', url);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0'
      }
    });
    
    console.log('Status:', response.status, response.statusText);
    
    if (response.ok) {
      const html = await response.text();
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      console.log('Title found:', titleMatch ? titleMatch[1] : 'Not found');
    }
    
  } catch (error) {
    console.error('Fetch error:', error.message);
  }
}

testDirectFetch();
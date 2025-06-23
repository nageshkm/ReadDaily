// Test URL extraction for profgalloway.com
import { urlMetadataService } from './server/url-metadata.js';

async function testUrl() {
  try {
    const url = 'https://www.profgalloway.com/marrying-up-and-marrying-down/';
    console.log('Testing URL:', url);
    
    const result = await urlMetadataService.extractMetadata(url);
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testUrl();
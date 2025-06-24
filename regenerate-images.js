import { db } from './server/db.js';
import { articles } from './shared/schema.js';
import { urlMetadataService } from './server/url-metadata.js';
import { eq } from 'drizzle-orm';

async function regenerateAllImages() {
  console.log('Starting image regeneration for all articles...');
  
  try {
    // Get all articles from database
    const allArticles = await db.select().from(articles);
    console.log(`Found ${allArticles.length} articles to process`);
    
    let processed = 0;
    let updated = 0;
    
    for (const article of allArticles) {
      try {
        console.log(`Processing article ${processed + 1}/${allArticles.length}: ${article.title}`);
        
        // Extract fresh metadata including new image
        const metadata = await urlMetadataService.extractMetadata(article.sourceUrl);
        
        if (metadata && metadata.image && metadata.image !== article.imageUrl) {
          // Update article with new image
          await db
            .update(articles)
            .set({ 
              imageUrl: metadata.image,
              title: metadata.title || article.title, // Also update title if better
              description: metadata.description || article.description
            })
            .where(eq(articles.id, article.id));
          
          console.log(`✓ Updated image for: ${article.title}`);
          updated++;
        } else {
          console.log(`- No new image found for: ${article.title}`);
        }
        
        processed++;
        
        // Add small delay to avoid overwhelming external services
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`Error processing article ${article.id}:`, error.message);
        processed++;
        continue;
      }
    }
    
    console.log(`\nCompleted! Processed ${processed} articles, updated ${updated} images.`);
    
  } catch (error) {
    console.error('Error during image regeneration:', error);
  }
}

// Run the regeneration
regenerateAllImages().then(() => {
  console.log('Image regeneration script completed');
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
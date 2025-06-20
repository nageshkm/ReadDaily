import { db } from "./db";
import { users, articles, articleReads } from "@shared/schema";
import { eq, sql, and, notInArray } from "drizzle-orm";

async function fixReadHistory() {
  console.log("Starting read history cleanup...");
  
  try {
    // Get all users with read articles
    const allUsers = await db.select().from(users);
    
    // Get all existing article IDs
    const existingArticles = await db.select({ id: articles.id }).from(articles);
    const existingArticleIds = existingArticles.map(a => a.id);
    
    console.log(`Found ${existingArticleIds.length} existing articles`);
    
    for (const user of allUsers) {
      if (user.readArticles && Array.isArray(user.readArticles)) {
        const originalCount = user.readArticles.length;
        
        // Filter out articles that no longer exist
        const validReadArticles = user.readArticles.filter((ra: any) => 
          existingArticleIds.includes(ra.articleId)
        );
        
        if (validReadArticles.length !== originalCount) {
          console.log(`User ${user.email}: Cleaning ${originalCount - validReadArticles.length} invalid references`);
          
          // Update user's read articles
          await db.update(users)
            .set({ readArticles: validReadArticles })
            .where(eq(users.id, user.id));
        }
      }
    }
    
    // Clean up orphaned article reads from analytics
    if (existingArticleIds.length > 0) {
      const orphanedReads = await db.delete(articleReads)
        .where(notInArray(articleReads.articleId, existingArticleIds));
      
      console.log("Cleaned up orphaned article reads");
    }
    
    console.log("Read history cleanup completed successfully");
    
  } catch (error) {
    console.error("Error during read history cleanup:", error);
    throw error;
  }
}

// Run the fix
fixReadHistory()
  .then(() => {
    console.log("Fix completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fix failed:", error);
    process.exit(1);
  });
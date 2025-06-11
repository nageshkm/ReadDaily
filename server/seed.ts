import { db } from "./db";
import { categories, articles } from "@shared/schema";
import categoriesData from "../client/src/data/categories.json";
import articlesData from "../client/src/data/articles.json";

async function seed() {
  console.log("Seeding database...");
  
  try {
    // Insert categories
    for (const category of categoriesData) {
      await db.insert(categories).values(category).onConflictDoNothing();
    }
    console.log("Categories seeded");

    // Insert articles
    for (const article of articlesData) {
      await db.insert(articles).values(article).onConflictDoNothing();
    }
    console.log("Articles seeded");
    
    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

seed();
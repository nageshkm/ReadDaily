# Reading Habit App - Core MVP Specification for Replit Implementation

## Overview

This document outlines the specifications for a minimal viable product (MVP) of a reading habit app to be implemented in Replit using React. The app will deliver three curated articles daily to users across configurable categories, with manual content management via JSON files. The primary goal is to help users build a daily reading habit through streak tracking and consistent content delivery.

## 1. Core Features

### 1.1. Data Structure

#### 1.1.1. Categories
- Stored in a JSON file (`categories.json`)
- Structure:
```json
[
  {
    "id": "tech",
    "name": "Technology",
    "description": "Latest in tech and innovation"
  },
  {
    "id": "science",
    "name": "Science",
    "description": "Scientific discoveries and research"
  }
]
```

#### 1.1.2. Articles
- Stored in a JSON file (`articles.json`)
- Structure:
```json
[
  {
    "id": "article-001",
    "title": "The Future of AI",
    "content": "Full article text goes here...",
    "summary": "Brief summary of the article",
    "sourceUrl": "https://original-source.com/article",
    "imageUrl": "https://image-source.com/image.jpg",
    "estimatedReadingTime": 5,
    "categoryId": "tech",
    "publishDate": "2025-06-10",
    "featured": true
  }
]
```

#### 1.1.3. User Data
- Stored in a JSON file (`users.json`) for the MVP
- Structure:
```json
[
  {
    "id": "user-001",
    "name": "John Doe",
    "joinDate": "2025-06-10",
    "lastActive": "2025-06-10",
    "preferences": {
      "categories": ["tech", "science"]
    },
    "readArticles": [
      {
        "articleId": "article-001",
        "readDate": "2025-06-10"
      }
    ],
    "streakData": {
      "currentStreak": 3,
      "lastReadDate": "2025-06-10",
      "longestStreak": 5
    }
  }
]
```

### 1.2. User Experience Flow

#### 1.2.1. First-Time User Experience
1. User enters their name
2. User selects preferred categories from available options
3. User is directed to the home screen with their first set of articles

#### 1.2.2. Returning User Experience
1. App recognizes user by stored name
2. User is directed to the home screen with their daily articles
3. Streak information is prominently displayed

#### 1.2.3. Daily Article Delivery
- Three articles are presented to the user each day
- Articles are selected based on:
  - User's category preferences
  - Publication date (current day)
  - Featured status (prioritized)
- If fewer than 3 articles are available for the current day, the system can fall back to recent articles not yet read by the user

### 1.3. Reading Experience

#### 1.3.1. Article View
- Clean, distraction-free reading interface
- Displays:
  - Article title
  - Source (with link to original)
  - Estimated reading time
  - Featured image (if available)
  - Full article content
  - "Mark as Read" button

#### 1.3.2. Reading Tracking
- User marks articles as read after completion
- System records:
  - Which articles have been read
  - When they were read
  - Updates streak information accordingly

#### 1.3.3. Streak Calculation
- A streak day is counted when at least one article is read
- Streak is broken if no articles are read for an entire day
- Streak counter is prominently displayed on the home screen

## 2. Technical Implementation

### 2.1. Project Structure

```
/
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── components/
│   │   ├── Header.js
│   │   ├── Footer.js
│   │   ├── ArticleCard.js
│   │   ├── ArticleView.js
│   │   ├── StreakDisplay.js
│   │   ├── UserOnboarding.js
│   │   └── CategorySelection.js
│   ├── data/
│   │   ├── articles.json
│   │   ├── categories.json
│   │   └── users.json
│   ├── utils/
│   │   ├── articleUtils.js
│   │   ├── streakUtils.js
│   │   └── storageUtils.js
│   ├── pages/
│   │   ├── Home.js
│   │   ├── Article.js
│   │   ├── Onboarding.js
│   │   └── History.js
│   ├── App.js
│   ├── index.js
│   └── styles.css
├── package.json
└── README.md
```

### 2.2. Key React Components

#### 2.2.1. App.js
- Main application component
- Handles routing between pages
- Manages global state (user info, articles, etc.)

#### 2.2.2. Home.js
- Displays the three daily articles
- Shows streak information
- Provides navigation to article view

#### 2.2.3. Article.js
- Displays full article content
- Handles "Mark as Read" functionality
- Updates user data when article is completed

#### 2.2.4. UserOnboarding.js
- Collects user name
- Facilitates category selection
- Creates initial user record

#### 2.2.5. StreakDisplay.js
- Visualizes current streak
- Shows streak history/stats

### 2.3. Data Management

#### 2.3.1. Local Storage
- User identification and preferences stored in browser's localStorage
- Reading history and streak data also stored locally

#### 2.3.2. JSON File Management
- For the MVP, JSON files will be manually updated to add new articles and categories
- In a production environment, this would be replaced with a proper database and admin interface

#### 2.3.3. Article Selection Logic
```javascript
// Pseudocode for daily article selection
function getDailyArticles(user) {
  const today = new Date().toISOString().split('T')[0];
  const userCategories = user.preferences.categories;
  const readArticleIds = user.readArticles.map(item => item.articleId);
  
  // Get today's featured articles in user's categories
  let dailyArticles = articles
    .filter(article => 
      article.publishDate === today && 
      userCategories.includes(article.categoryId) &&
      article.featured &&
      !readArticleIds.includes(article.id)
    )
    .slice(0, 3);
  
  // If we don't have 3 featured articles, add non-featured ones
  if (dailyArticles.length < 3) {
    const nonFeatured = articles
      .filter(article => 
        article.publishDate === today && 
        userCategories.includes(article.categoryId) &&
        !article.featured &&
        !readArticleIds.includes(article.id)
      )
      .slice(0, 3 - dailyArticles.length);
    
    dailyArticles = [...dailyArticles, ...nonFeatured];
  }
  
  // If still fewer than 3, add recent unread articles
  if (dailyArticles.length < 3) {
    const recentArticles = articles
      .filter(article => 
        article.publishDate < today &&
        userCategories.includes(article.categoryId) &&
        !readArticleIds.includes(article.id)
      )
      .sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate))
      .slice(0, 3 - dailyArticles.length);
    
    dailyArticles = [...dailyArticles, ...recentArticles];
  }
  
  return dailyArticles;
}
```

#### 2.3.4. Streak Calculation Logic
```javascript
// Pseudocode for streak calculation
function updateStreak(user) {
  const today = new Date().toISOString().split('T')[0];
  const lastReadDate = user.streakData.lastReadDate;
  
  // If this is the first read of the day
  if (lastReadDate !== today) {
    // Check if streak is maintained (read yesterday or first time)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    if (lastReadDate === yesterdayStr || user.readArticles.length === 1) {
      // Streak continues or starts
      user.streakData.currentStreak += 1;
      
      // Update longest streak if needed
      if (user.streakData.currentStreak > user.streakData.longestStreak) {
        user.streakData.longestStreak = user.streakData.currentStreak;
      }
    } else {
      // Streak broken
      user.streakData.currentStreak = 1;
    }
    
    // Update last read date
    user.streakData.lastReadDate = today;
  }
  
  return user;
}
```

## 3. Implementation Notes for Replit

### 3.1. Setup Instructions

1. Create a new React app in Replit
   ```bash
   create_react_app reading_habit_app
   cd reading_habit_app
   ```

2. Install necessary dependencies
   ```bash
   npm install react-router-dom
   ```

3. Create the project structure as outlined above

4. Initialize the JSON files in the `src/data/` directory

### 3.2. Development Approach

1. Start with user identification and onboarding
2. Implement the home screen with article cards
3. Build the article reading view
4. Add streak tracking functionality
5. Implement category filtering
6. Test with sample data

### 3.3. Testing

For the MVP, manually test:
- User onboarding flow
- Daily article delivery
- Article reading experience
- Streak tracking accuracy
- Category filtering

## 4. Future Enhancements (Post-MVP)

- Proper backend with database instead of JSON files
- Admin interface for content management
- User authentication
- Social sharing features
- Reading statistics and insights
- Offline reading capability
- Push notifications for daily reminders

## 5. Content Management Process

For the MVP, follow this process to update content:

1. Create new articles in the `articles.json` file following the structure provided
2. Ensure each article has a unique ID and is assigned to an existing category
3. Set the publication date to control when articles appear to users
4. Mark featured articles to prioritize them in the daily selection
5. Add new categories to the `categories.json` file as needed

This manual process will allow for testing the core functionality while deferring the development of a proper content management system to a later phase.

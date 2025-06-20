# ReadDaily - Social Reading Habit Application
## Complete Technical Specification

### Overview
ReadDaily is a full-stack social reading habit application that transforms digital content into personalized, engaging articles with intelligent platform-specific content extraction and advanced user analytics. Users can share articles via URL with commentary, like and comment on shared content, and track reading streaks across devices.

**Live URL**: [readdaily.co](https://readdaily.co)

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Google OAuth 2.0
- **AI Services**: OpenAI GPT-4o for content analysis and categorization
- **Content Extraction**: Custom service with platform-specific handlers
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: TanStack Query (React Query v5)
- **Routing**: Wouter
- **Deployment**: Replit Deployments

---

## 1. Client-Side Architecture

### Core Components

#### Pages
- **Landing** (`/landing`): Welcome page with Google OAuth sign-in
- **Home** (`/`, `/today`): Main feed showing recommended and user articles
- **History** (`/history`): User's reading history with filtering
- **Profile** (`/profile`): User analytics, preferences, and account management
- **Admin** (`/admin`): Admin panel for user analytics (admin users only)
- **ArticleShare** (`/article/*`): Legacy article sharing routes

#### Key Components
- **Header**: Navigation bar with user profile and sign-out
- **ArticleCard**: Displays article with metadata, social actions, and reading status
- **ArticleView**: Full-screen article reader with mark-as-read functionality
- **ShareArticleForm**: URL submission form with commentary
- **StreakDisplay**: Shows current reading streak and daily progress
- **UserOnboarding**: Google OAuth integration and category selection
- **SuccessFeedback**: Celebratory modal after completing articles

### State Management
- **Local Storage**: User data persistence, article caching, session management
- **TanStack Query**: Server state management, caching, and synchronization
- **React State**: Component-level state for UI interactions

### Authentication Flow
1. User visits landing page
2. Google OAuth sign-in via `@react-oauth/google`
3. JWT token parsing and user creation/retrieval
4. Local storage persistence with server synchronization
5. Session management with activity tracking

### Responsive Design
- **Mobile-first**: Bottom navigation bar for mobile devices
- **Desktop**: Top navigation with sidebar-style layout
- **Breakpoints**: Tailwind responsive utilities (`sm:`, `md:`, `lg:`)

---

## 2. Server-Side Architecture

### API Routes Structure

#### Authentication
- `POST /api/auth/signin` - Google OAuth sign-in
- `POST /api/auth/signout` - End user session
- `POST /api/auth/activity` - Update user activity timestamp

#### Articles
- `GET /api/articles/my` - User's shared articles
- `GET /api/articles/recommended` - All articles except user's own
- `GET /api/articles/:id/details` - Article details with social data
- `POST /api/articles/share` - Share new article with URL extraction
- `POST /api/articles/:id/read` - Mark article as read
- `POST /api/articles/:id/like` - Like/unlike article
- `POST /api/articles/:id/comment` - Add comment to article

#### Users
- `GET /api/users/:id` - Get user profile
- `DELETE /api/users/:id` - Delete user account
- `POST /api/users/:id/sync` - Sync local data with server

#### Analytics
- `GET /api/analytics/user` - User's reading analytics
- `GET /api/analytics/all` - All users analytics (admin only)

#### Configuration
- `GET /api/config` - Client configuration (Google OAuth client ID)

### Core Services

#### URL Metadata Extraction (`url-metadata.ts`)
**Platform-Specific Handlers:**

**Twitter/X Integration:**
- Uses Twitter oEmbed API (`https://publish.twitter.com/oembed`)
- Extracts actual tweet text instead of generic usernames
- Comprehensive HTML decoding and entity parsing
- Handles emojis, links, and Unicode characters
- Fallback to X platform icon for images

**YouTube Integration:**
- Supports both full URLs and short URLs (youtu.be)
- Extracts video titles and thumbnails
- Uses `ytdl-core` for metadata extraction
- Categorizes as 'technology' by default
- 10-minute estimated reading time

**General URL Handling:**
- Fetches HTML and parses meta tags
- Open Graph and Twitter Card support
- AI-powered content analysis and categorization
- Image extraction with multiple fallback strategies
- Content safety filtering

#### Content Extractor (`content-extractor.ts`)
- Full article content extraction from URLs
- HTML parsing and cleaning
- Reading time calculation
- Author and publish date extraction
- AI-powered content structuring

#### User Synchronization (`user-sync.ts`)
- Merges local storage data with database
- Handles reading history migration
- Streak calculation and maintenance
- Cross-device data consistency

#### Analytics Service (`analytics.ts`)
- Session tracking with 30-minute timeout
- Article read events with device info
- User engagement metrics
- Admin dashboard data aggregation

### Database Integration
- **Drizzle ORM**: Type-safe database queries
- **Connection Pooling**: `@neondatabase/serverless` with WebSocket support
- **Migrations**: Schema changes via `npm run db:push`
- **Transactions**: ACID compliance for data integrity

---

## 3. Database Structure

### Core Tables

#### `users`
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  join_date TEXT NOT NULL,
  last_active TEXT NOT NULL,
  preferences TEXT NOT NULL,        -- JSON: {"categories": ["tech", "health"]}
  read_articles TEXT NOT NULL,      -- JSON: [{"articleId": "123", "readDate": "2025-01-01"}]
  streak_data TEXT NOT NULL,        -- JSON: {"currentStreak": 5, "lastReadDate": "2025-01-01", "longestStreak": 10}
  articles_shared TEXT DEFAULT '[]' -- JSON: ["article-id-1", "article-id-2"]
);
```

#### `articles`
```sql
CREATE TABLE articles (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  source_url TEXT NOT NULL,
  image_url TEXT NOT NULL,
  estimated_reading_time INTEGER NOT NULL,
  category_id TEXT NOT NULL REFERENCES categories(id),
  publish_date TEXT NOT NULL,
  featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  recommended_by TEXT REFERENCES users(id),
  recommended_at TEXT,
  user_commentary TEXT,
  likes_count INTEGER DEFAULT 0
);
```

#### `categories`
```sql
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL
);
```

**Default Categories:**
- technology, business, health, science, general, entertainment

### Social Features Tables

#### `article_likes`
```sql
CREATE TABLE article_likes (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  liked_at TEXT NOT NULL
);
```

#### `article_comments`
```sql
CREATE TABLE article_comments (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  commented_at TEXT NOT NULL
);
```

### Analytics Tables

#### `user_sessions`
```sql
CREATE TABLE user_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_start TIMESTAMP DEFAULT NOW(),
  session_end TIMESTAMP,
  last_activity TIMESTAMP DEFAULT NOW(),
  device_info TEXT,
  ip_address TEXT
);
```

#### `article_reads`
```sql
CREATE TABLE article_reads (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  read_at TIMESTAMP DEFAULT NOW(),
  session_id TEXT REFERENCES user_sessions(id) ON DELETE SET NULL,
  device_info TEXT
);
```

---

## 4. Key Features & Implementation

### URL Content Extraction
**Enhanced Platform Support:**
- **Twitter/X**: Real tweet text extraction via oEmbed API
- **YouTube**: Video titles and thumbnails via ytdl-core
- **General URLs**: Meta tag parsing with AI categorization
- **Content Safety**: AI-powered filtering for inappropriate content

### Reading Streak System
- **Daily Goals**: Configurable articles per day
- **Streak Calculation**: Consecutive days with reading activity
- **Cross-Device Sync**: Maintains streaks across all devices
- **Historical Tracking**: Longest streak and daily progress

### Social Features
- **Article Sharing**: URL submission with personal commentary
- **Like System**: Heart-based reactions with counts
- **Comments**: Threaded discussions on shared articles
- **Feed Algorithm**: Personalized recommendations based on preferences

### Analytics & Insights
- **Reading Metrics**: Articles read, time spent, categories
- **Engagement Tracking**: Likes, comments, shares
- **Session Analytics**: Device info, activity patterns
- **Admin Dashboard**: User engagement and platform metrics

### Cross-Device Synchronization
- **Local Storage**: Offline-first with automatic sync
- **Conflict Resolution**: Server data takes precedence
- **Data Migration**: Seamless transfer from local to cloud storage
- **Session Management**: Activity tracking across devices

---

## 5. Security & Performance

### Authentication Security
- **Google OAuth 2.0**: Industry-standard authentication
- **JWT Validation**: Server-side token verification
- **Session Management**: Automatic timeout and cleanup
- **CSRF Protection**: Request validation and headers

### Data Privacy
- **User Consent**: Clear data usage policies
- **Local Storage**: User control over data persistence
- **Account Deletion**: Complete data removal on request
- **Analytics Anonymization**: IP address hashing

### Performance Optimizations
- **React Query Caching**: Aggressive caching with smart invalidation
- **Image Optimization**: Lazy loading and responsive images
- **Database Indexing**: Optimized queries with proper indexes
- **Content Extraction**: Concurrent processing with rate limiting

### Error Handling
- **Graceful Degradation**: Fallbacks for failed services
- **User Feedback**: Clear error messages and recovery options
- **Logging**: Comprehensive error tracking and monitoring
- **Retry Logic**: Automatic retry for transient failures

---

## 6. Deployment & Infrastructure

### Production Environment
- **Platform**: Replit Deployments
- **Domain**: Custom domain (readdaily.co)
- **Database**: Neon PostgreSQL (serverless)
- **CDN**: Automatic asset optimization
- **SSL**: Automatic HTTPS with certificate management

### Environment Variables
```env
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
GOOGLE_CLIENT_ID=609187760603-...
NODE_ENV=production
```

### Build Process
- **Vite Build**: Optimized production bundle
- **TypeScript Compilation**: Type checking and transpilation
- **Asset Optimization**: Minification and compression
- **Health Checks**: Automatic deployment verification

### Monitoring & Maintenance
- **Error Tracking**: Console error monitoring
- **Performance Metrics**: Core web vitals tracking
- **Database Monitoring**: Query performance and connection health
- **User Analytics**: Engagement and retention metrics

---

## 7. Development Workflow

### Local Development
```bash
npm install
npm run dev  # Starts both frontend and backend
npm run db:push  # Deploy schema changes
```

### Code Organization
```
├── client/src/
│   ├── components/     # Reusable UI components
│   ├── pages/         # Route components
│   ├── hooks/         # Custom React hooks
│   └── lib/           # Utilities and configurations
├── server/
│   ├── routes.ts      # API endpoint definitions
│   ├── storage.ts     # Database interface
│   ├── analytics.ts   # Analytics service
│   └── *.ts          # Feature-specific services
├── shared/
│   └── schema.ts      # Shared types and database schema
└── migrations/        # Database migration files
```

### Testing Strategy
- **Type Safety**: Full TypeScript coverage
- **API Testing**: Manual testing with curl/Postman
- **User Testing**: Cross-device functionality verification
- **Performance Testing**: Load testing for content extraction

---

## 8. Future Enhancements

### Planned Features
- **Mobile App**: React Native implementation
- **Content Scheduling**: Automated daily article delivery
- **Advanced Analytics**: Reading speed and comprehension metrics
- **Social Groups**: Team-based reading challenges
- **Content Curation**: AI-powered article recommendations
- **Offline Reading**: Service worker for offline access

### Scalability Considerations
- **Microservices**: Service decomposition for scale
- **Caching Layer**: Redis for session and content caching
- **CDN Integration**: Global content delivery
- **Load Balancing**: Multi-instance deployment
- **Database Sharding**: Horizontal scaling strategies

---

## 9. API Documentation

### Authentication Required
All endpoints except `/api/config` require user authentication via session or local storage user ID.

### Response Formats
```typescript
// Success Response
{
  "data": any,
  "message": string
}

// Error Response
{
  "error": string,
  "details": any
}
```

### Rate Limiting
- Content extraction: 1 request per second per user
- API endpoints: 100 requests per minute per user
- Analytics updates: 1 request per 5 minutes per user

---

This specification provides a complete technical overview of the ReadDaily application, covering all architectural decisions, implementation details, and operational considerations. The application successfully combines social features with personal habit tracking, powered by intelligent content extraction and cross-device synchronization.
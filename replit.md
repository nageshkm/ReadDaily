# ReadDaily - Social Reading Habit Application

## Overview

ReadDaily is a full-stack Progressive Web App (PWA) designed to help users build daily reading habits through curated content. The application transforms digital content into personalized, engaging articles with intelligent platform-specific content extraction, push notifications, and advanced user analytics. Users can discover recommended articles, share content with commentary, track reading streaks, and build a social reading community. The PWA features offline-ready architecture, native app-like experience, and real-time notifications.

## System Architecture

The application follows a modern full-stack architecture with clear separation between client and server concerns:

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite build system
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query v5) for server state with local storage for persistence
- **UI Components**: Tailwind CSS with shadcn/ui component library
- **Authentication**: Google OAuth 2.0 integration via @react-oauth/google

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript for type safety
- **Database**: PostgreSQL with Drizzle ORM for schema management
- **Session Management**: Express sessions with PostgreSQL storage
- **Content Processing**: Custom content extraction service with OpenAI integration

### Database Design
- **ORM**: Drizzle with PostgreSQL dialect
- **Schema**: Centralized schema definitions in `shared/schema.ts`
- **Migrations**: Automated migration system via drizzle-kit
- **Tables**: Users, articles, categories, article reads, likes, comments, and user sessions

## Key Components

### User Management
- **Authentication Flow**: Google OAuth with automatic user creation/migration
- **User Sync Service**: Handles local data migration during sign-in
- **Session Analytics**: Tracks user sessions, activity, and engagement metrics
- **Data Persistence**: Local storage for offline capability with server synchronization

### Content Management
- **Article Extraction**: Intelligent content extraction from URLs with platform-specific handlers
- **AI Categorization**: OpenAI GPT-4o for content analysis and categorization
- **Metadata Service**: Automated title, description, and image extraction
- **Content Safety**: Domain-based blocking for inappropriate content

### Reading Experience
- **Streak Tracking**: Daily reading goals with streak maintenance
- **Progress Analytics**: Reading time estimation and completion tracking
- **Social Features**: Article sharing, commenting, and liking system
- **Personalization**: Category-based recommendations and content filtering

### Admin Features
- **Content Management**: Admin panel for featured article curation
- **User Analytics**: Comprehensive user behavior and engagement metrics
- **Content Moderation**: Tools for managing shared content quality

## Data Flow

### Authentication Flow
1. User visits landing page and initiates Google OAuth
2. Server validates credentials and creates/finds user account
3. Local storage data is migrated to server during sign-in
4. Session is created and tracked for analytics
5. User is redirected to main application with synchronized data

### Content Discovery Flow
1. Server provides recommended articles based on user preferences
2. Featured articles are curated by admin users
3. User reading history influences future recommendations
4. Articles are cached locally for offline access

### Reading Flow
1. User selects article from recommendations or featured content
2. Full article content is loaded with reading time estimation
3. Reading progress is tracked and stored locally
4. Completion triggers streak updates and success feedback
5. Social actions (likes, comments) are synchronized with server

### Content Sharing Flow
1. User submits URL through sharing form
2. Server extracts metadata and content using AI services
3. Content is categorized and added to user's shared articles
4. Shared content appears in community recommendations
5. Other users can discover and interact with shared content

## External Dependencies

### Core Services
- **OpenAI API**: Content extraction, summarization, and categorization
- **Google OAuth**: User authentication and profile management
- **SendGrid**: Email notifications (configured but optional)

### Development Tools
- **Replit**: Primary development and deployment platform
- **Vite**: Frontend build system and development server
- **ESBuild**: Production build optimization for server-side code

### Third-party Libraries
- **UI Framework**: Radix UI primitives with Tailwind CSS styling
- **Data Fetching**: TanStack Query for intelligent caching and synchronization
- **Form Handling**: React Hook Form with Zod validation
- **Date Management**: date-fns for date formatting and manipulation

## Deployment Strategy

### Development Environment
- **Platform**: Replit with Node.js 20 runtime
- **Database**: PostgreSQL 16 with automated provisioning
- **Hot Reload**: Vite development server with HMR support
- **Environment**: Development mode with debug logging enabled

### Production Deployment
- **Target**: Replit Autoscale deployment
- **Build Process**: Vite frontend build + ESBuild server bundling
- **Database**: Production PostgreSQL with connection pooling
- **SSL**: Automatic HTTPS enforcement in production
- **Monitoring**: Built-in analytics and session tracking

### Configuration Management
- **Environment Variables**: Separate development and production configs
- **Secrets**: Replit secrets for API keys and database URLs
- **Build**: Automated build process with dependency optimization

## User Preferences

Preferred communication style: Simple, everyday language.
No toast notifications for like/unlike actions - user dislikes them.
No success feedback popup after reading articles - completely removed per user request.

## Changelog

### June 24, 2025
- Initial setup
- Implemented Progressive Web App (PWA) features:
  - Web App Manifest for installable app experience
  - Service Worker for background functionality
  - Firebase Cloud Messaging for push notifications
  - Native Web Share API integration
  - Notification system for article likes
  - FCM token management in user profiles
- Enhanced URL extraction with retry mechanism for blocked domains
- Fixed like button functionality across all tabs with instant optimistic updates
- Completely removed success feedback popup per user request
- Added proper like/unlike toggle behavior with visual feedback
- Added database constraint to prevent duplicate likes
- Fixed server response to return actual likesCount from database
- Hidden likes display feature (who liked the article) per user request
- Changed layout from 2 tabs to single infinite scroll:
  - Removed Featured/Community tabs
  - Featured articles now appear at top with star indicator
  - Community shares follow below with visual separator
  - Single continuous scroll experience
- Updated mobile UI for better mobile experience:
  - Compact article cards with image on left, content on right
  - Reduced text sizes and spacing on mobile
  - Hidden user commentary on mobile for cleaner view
  - Smaller social action buttons on mobile
  - Better proportion fitting 3-3.5 articles per mobile screen
- Moved Share Article button from home page to profile page under My Reading section
- Added tagline "Read interesting articles everyday" to header below ReadDaily logo
- Updated article images to use object-contain instead of object-cover for proper scaling
- Added quotation marks around user commentary display for better visual distinction
- Updated image containers to span full height of article cards for better visual balance
- Added WhatsApp group invitation for new users in onboarding flow to build community engagement
- Added WhatsApp community join option to profile page for all users to access anytime
- Implemented bottom toast prompt encouraging users to share articles after reading and scrolling
  - Appears once per day maximum per user
  - Triggers when user reads an article and then scrolls on the page
  - Dismissible with CTA to navigate to sharing page in profile
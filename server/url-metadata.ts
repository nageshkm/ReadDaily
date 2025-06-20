import OpenAI from "openai";

// Only block explicit pornographic domains
const BLOCKED_DOMAINS = [
  // Adult content - only explicit pornographic sites
  'pornhub.com', 'xvideos.com', 'redtube.com', 'youporn.com', 'xnxx.com',
  'tube8.com', 'spankbang.com', 'beeg.com', 'tnaflix.com', 'xhamster.com',
  'porn.com', 'sex.com', 'adult.com', 'xxx.com', 'chaturbate.com',
  'cam4.com', 'livejasmin.com', 'stripchat.com', 'bongacams.com',
  'onlyfans.com', 'manyvids.com', 'clips4sale.com', 'adultfriendfinder.com',
  'brazzers.com', 'realitykings.com', 'bangbros.com', 'naughtyamerica.com'
];

// Removed keyword filtering - rely only on domain blocking and AI safety check

interface UrlMetadata {
  title: string;
  description: string;
  image: string;
  domain: string;
  isValid: boolean;
  category: string;
  estimatedReadTime: number;
}

export class UrlMetadataService {
  private openai: OpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async extractMetadata(url: string): Promise<UrlMetadata | null> {
    try {
      // Validate URL
      const parsedUrl = new URL(url);
      const domain = parsedUrl.hostname.toLowerCase();

      // Check for blocked domains
      if (this.isBlockedDomain(domain)) {
        console.log(`Blocked domain: ${domain}`);
        return null;
      }

      // Handle Twitter/X and YouTube specially
      if (domain.includes('twitter.com') || domain.includes('x.com')) {
        return await this.extractTwitterMetadata(url, parsedUrl);
      }
      
      if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
        return await this.extractYouTubeMetadata(url, parsedUrl);
      }

      // Standard extraction for other platforms
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.log(`Failed to fetch URL: ${response.status}`);
        return null;
      }

      const html = await response.text();
      const metadata = this.parseHtmlMetadata(html);

      // Safety check - analyze content for inappropriate material
      const isSafe = await this.isContentSafe(metadata.title, metadata.description, url);
      if (!isSafe) {
        console.log(`Content safety check failed for: ${url}`);
        return null;
      }

      // Use OpenAI to categorize and estimate reading time
      const aiAnalysis = await this.analyzeContent(metadata.title, metadata.description, domain);

      return {
        ...metadata,
        domain,
        isValid: true,
        category: aiAnalysis.category,
        estimatedReadTime: aiAnalysis.estimatedReadTime
      };

    } catch (error) {
      console.error('Error extracting metadata:', error);
      return null;
    }
  }



  private async extractTwitterMetadata(url: string, parsedUrl: URL): Promise<UrlMetadata | null> {
    try {
      // First try Twitter's oEmbed API to get actual tweet content
      const tweetData = await this.fetchTwitterOEmbed(url);
      if (tweetData) {
        return tweetData;
      }

      // Fallback to HTML scraping if oEmbed fails
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.log(`Failed to fetch Twitter URL: ${response.status}`);
        return null;
      }

      const html = await response.text();
      
      // Extract tweet text from Open Graph description
      let tweetText = this.extractFromHtml(html, [
        /<meta property="og:description" content="([^"]*)"[^>]*>/i,
        /<meta name="twitter:description" content="([^"]*)"[^>]*>/i,
        /<meta name="description" content="([^"]*)"[^>]*>/i
      ]) || '';

      // Clean up the extracted text
      tweetText = tweetText
        .replace(/See new posts.*$/, '')
        .replace(/\s*on X$/, '')
        .replace(/\s*\| X$/, '')
        .replace(/\s*- X \(formerly Twitter\)$/, '')
        .replace(/\s*on Twitter$/, '')
        .replace(/\s*\.\.\.$/, '')
        .replace(/^"/, '')
        .replace(/"$/, '')
        .trim();

      // Only fall back to username if absolutely no content was found
      if (!tweetText) {
        const usernameMatch = url.match(/(?:twitter\.com|x\.com)\/([^\/\?]+)/i);
        const username = usernameMatch ? usernameMatch[1] : 'User';
        tweetText = `Post by @${username}`;
      }

      // Extract images with priority: tweet images -> user profile pic -> X logo
      let image = '';
      
      // First try to get tweet images
      image = this.extractFromHtml(html, [
        /<meta property="og:image" content="([^"]*)"[^>]*>/i,
        /<meta name="twitter:image" content="([^"]*)"[^>]*>/i,
        /<meta name="twitter:image:src" content="([^"]*)"[^>]*>/i
      ]) || '';

      // If no tweet image, try to get user profile picture
      if (!image) {
        image = this.extractFromHtml(html, [
          /<img[^>]*class="[^"]*profile[^"]*"[^>]*src="([^"]*)"[^>]*>/i,
          /<img[^>]*src="([^"]*)"[^>]*class="[^"]*profile[^"]*"[^>]*>/i
        ]) || '';
      }

      // Fallback to X logo (using a public X logo URL)
      if (!image) {
        image = 'https://abs.twimg.com/icons/apple-touch-icon-192x192.png';
      }

      return {
        title: this.cleanText(tweetText),
        description: 'Twitter/X Post',
        image: this.normalizeImageUrl(image),
        domain: parsedUrl.hostname.toLowerCase(),
        isValid: true,
        category: 'general',
        estimatedReadTime: 1
      };

    } catch (error) {
      console.error('Error extracting Twitter metadata:', error);
      return null;
    }
  }

  private async extractYouTubeMetadata(url: string, parsedUrl: URL): Promise<UrlMetadata | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.log(`Failed to fetch YouTube URL: ${response.status}`);
        return null;
      }

      const html = await response.text();
      
      // Extract video title
      const videoTitle = this.extractFromHtml(html, [
        /<meta property="og:title" content="([^"]*)"[^>]*>/i,
        /<meta name="twitter:title" content="([^"]*)"[^>]*>/i,
        /<title[^>]*>([^<]*)<\/title>/i
      ]) || 'YouTube Video';

      // Extract video thumbnail
      let thumbnail = this.extractFromHtml(html, [
        /<meta property="og:image" content="([^"]*)"[^>]*>/i,
        /<meta name="twitter:image" content="([^"]*)"[^>]*>/i
      ]) || '';

      // If no thumbnail found, try to construct it from video ID
      if (!thumbnail) {
        const videoId = this.extractYouTubeVideoId(url);
        if (videoId) {
          thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        }
      }

      // Extract description
      const description = this.extractFromHtml(html, [
        /<meta property="og:description" content="([^"]*)"[^>]*>/i,
        /<meta name="twitter:description" content="([^"]*)"[^>]*>/i,
        /<meta name="description" content="([^"]*)"[^>]*>/i
      ]) || 'YouTube Video';

      return {
        title: this.cleanText(videoTitle),
        description: this.cleanText(description),
        image: this.normalizeImageUrl(thumbnail),
        domain: parsedUrl.hostname.toLowerCase(),
        isValid: true,
        category: 'technology',
        estimatedReadTime: 5
      };

    } catch (error) {
      console.error('Error extracting YouTube metadata:', error);
      return null;
    }
  }

  private extractYouTubeVideoId(url: string): string | null {
    const patterns = [
      /[?&]v=([^&]+)/,  // youtube.com/watch?v=ID
      /youtu\.be\/([^?&]+)/,  // youtu.be/ID
      /embed\/([^?&]+)/  // youtube.com/embed/ID
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  }

  private async fetchTwitterOEmbed(url: string): Promise<UrlMetadata | null> {
    try {
      // Use Twitter's oEmbed API to get tweet content
      const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=1`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(oembedUrl, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.log(`Twitter oEmbed failed: ${response.status}`);
        return null;
      }

      const oembedData = await response.json();
      
      if (oembedData.html) {
        // Properly decode the JSON-escaped HTML
        let decodedHtml = '';
        try {
          // Parse the HTML as JSON string to handle proper unescaping
          decodedHtml = JSON.parse('"' + oembedData.html.replace(/"/g, '\\"') + '"');
        } catch {
          // Fallback to manual replacement if JSON parsing fails
          decodedHtml = oembedData.html
            .replace(/\\u003C/g, '<')
            .replace(/\\u003E/g, '>')
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\');
        }
        
        // Extract tweet text from the <p> tag - use both greedy and non-greedy matches
        let tweetText = '';
        const patterns = [
          /<p[^>]*lang="[^"]*"[^>]*>(.*?)<\/p>/,
          /<p[^>]*dir="[^"]*"[^>]*>(.*?)<\/p>/,
          /<p[^>]*>(.*?)<\/p>/,
          /<p[^>]*>([^<]*)</
        ];
        
        for (const pattern of patterns) {
          const match = decodedHtml.match(pattern);
          if (match && match[1] && match[1].trim()) {
            tweetText = match[1];
            break;
          }
        }

        // Clean up the extracted text comprehensively
        if (tweetText) {
          tweetText = tweetText
            // Handle break tags and spacing
            .replace(/<br\s*\/?>/gi, ' ')
            .replace(/\s*<\/p>\s*<p[^>]*>\s*/gi, ' ')
            
            // Remove links but keep their text content for context
            .replace(/<a[^>]*href="[^"]*"[^>]*>([^<]*)<\/a>/gi, '$1')
            .replace(/<a[^>]*>([^<]*)<\/a>/gi, '$1')
            
            // Remove all other HTML tags
            .replace(/<[^>]*>/g, '')
            
            // Decode HTML entities
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&#39;/g, "'")
            .replace(/&nbsp;/g, ' ')
            .replace(/&mdash;/g, '—')
            .replace(/&hellip;/g, '…')
            
            // Handle Unicode escape sequences for emojis
            .replace(/\\u([\dA-Fa-f]{4})/g, (match, hex) => {
              try {
                return String.fromCharCode(parseInt(hex, 16));
              } catch {
                return match;
              }
            })
            
            // Clean up URLs and trailing elements
            .replace(/https:\/\/t\.co\/\w+/g, '')
            .replace(/pic\.twitter\.com\/\w+/g, '')
            .replace(/twitter\.com\/\w+/g, '')
            
            // Normalize whitespace
            .replace(/\s+/g, ' ')
            .trim();
        }

        // Extract author name from oEmbed data
        const authorName = oembedData.author_name || '';
        
        // Use actual tweet text if we successfully extracted it
        if (tweetText && tweetText.length > 5) {
          return {
            title: this.cleanText(tweetText),
            description: `Tweet by ${authorName}`,
            image: 'https://abs.twimg.com/icons/apple-touch-icon-192x192.png',
            domain: new URL(url).hostname.toLowerCase(),
            isValid: true,
            category: 'general',
            estimatedReadTime: 1
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching Twitter oEmbed:', error);
      return null;
    }
  }

  private isBlockedDomain(domain: string): boolean {
    const cleanDomain = domain.toLowerCase().replace(/^www\./, '');
    return BLOCKED_DOMAINS.some(blocked => {
      const cleanBlocked = blocked.toLowerCase().replace(/^www\./, '');
      return cleanDomain === cleanBlocked || 
             cleanDomain.endsWith('.' + cleanBlocked) ||
             cleanBlocked.endsWith('.' + cleanDomain);
    });
  }

  // Removed keyword filtering function - now only using domain blocking

  private async isContentSafe(title: string, description: string, url: string): Promise<boolean> {
    try {
      // Minimal content filtering - allow all content except what's blocked by domain
      // Most content filtering now handled by domain blocking only
      return true;
    } catch (error) {
      console.error('Error checking content safety:', error);
      // Default to safe if AI check fails, but log for monitoring
      return true;
    }
  }

  private parseHtmlMetadata(html: string): { title: string; description: string; image: string } {
    const title = this.extractFromHtml(html, [
      /<meta property="og:title" content="([^"]*)"[^>]*>/i,
      /<meta name="twitter:title" content="([^"]*)"[^>]*>/i,
      /<title[^>]*>([^<]*)<\/title>/i
    ]) || 'Untitled Article';

    const description = this.extractFromHtml(html, [
      /<meta property="og:description" content="([^"]*)"[^>]*>/i,
      /<meta name="twitter:description" content="([^"]*)"[^>]*>/i,
      /<meta name="description" content="([^"]*)"[^>]*>/i
    ]) || 'No description available';

    const image = this.extractHeadlineImage(html);

    return {
      title: this.cleanText(title),
      description: this.cleanText(description),
      image: image
    };
  }

  private extractHeadlineImage(html: string): string {
    // Try multiple strategies to find the best headline image
    const strategies = [
      // 1. Open Graph and Twitter Card images (highest priority)
      () => this.extractFromHtml(html, [
        /<meta property="og:image" content="([^"]*)"[^>]*>/i,
        /<meta name="twitter:image" content="([^"]*)"[^>]*>/i,
        /<meta name="twitter:image:src" content="([^"]*)"[^>]*>/i
      ]),
      
      // 2. Article-specific meta tags
      () => this.extractFromHtml(html, [
        /<meta name="article:image" content="([^"]*)"[^>]*>/i,
        /<meta property="article:image" content="([^"]*)"[^>]*>/i,
        /<meta name="image" content="([^"]*)"[^>]*>/i
      ]),
      
      // 3. Schema.org structured data
      () => this.extractStructuredDataImage(html),
      
      // 4. Common article image patterns
      () => this.extractArticleImages(html),
      
      // 5. First suitable image in content
      () => this.extractContentImages(html)
    ];

    for (const strategy of strategies) {
      const image = strategy();
      if (image && this.isValidImageUrl(image)) {
        return this.normalizeImageUrl(image);
      }
    }

    // Return null if no valid image found - let the frontend handle the fallback
    return '';
  }

  private extractStructuredDataImage(html: string): string | null {
    // Look for JSON-LD structured data
    const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
    if (jsonLdMatch) {
      try {
        const data = JSON.parse(jsonLdMatch[1]);
        if (data.image) {
          return Array.isArray(data.image) ? data.image[0] : data.image;
        }
      } catch (e) {
        // Ignore JSON parsing errors
      }
    }
    return null;
  }

  private extractArticleImages(html: string): string | null {
    // Look for images with article-related classes or attributes
    const patterns = [
      /<img[^>]*class="[^"]*(?:hero|featured|article|headline|main|banner)[^"]*"[^>]*src="([^"]*)"[^>]*>/i,
      /<img[^>]*src="([^"]*)"[^>]*class="[^"]*(?:hero|featured|article|headline|main|banner)[^"]*"[^>]*>/i,
      /<figure[^>]*class="[^"]*(?:hero|featured|article|headline|main)[^"]*"[^>]*>[\s\S]*?<img[^>]*src="([^"]*)"[^>]*>[\s\S]*?<\/figure>/i,
      /<div[^>]*class="[^"]*(?:hero|featured|article|headline|main)[^"]*"[^>]*>[\s\S]*?<img[^>]*src="([^"]*)"[^>]*>[\s\S]*?<\/div>/i
    ];
    
    return this.extractFromHtml(html, patterns);
  }

  private extractContentImages(html: string): string | null {
    // Extract all img tags and find the first one that looks substantial
    const imgMatches = html.match(/<img[^>]*src="([^"]*)"[^>]*>/gi);
    if (imgMatches) {
      for (const imgTag of imgMatches) {
        const srcMatch = imgTag.match(/src="([^"]*)"/i);
        if (srcMatch && srcMatch[1]) {
          const src = srcMatch[1];
          // Skip small images, icons, and common ad/tracking images
          if (this.isLikelyContentImage(imgTag, src)) {
            return src;
          }
        }
      }
    }
    return null;
  }

  private isLikelyContentImage(imgTag: string, src: string): boolean {
    const lowercaseSrc = src.toLowerCase();
    const lowercaseTag = imgTag.toLowerCase();
    
    // Skip common non-content images
    const skipPatterns = [
      /icon/i, /logo/i, /avatar/i, /profile/i, 
      /ad[s]?[-_]/i, /tracking/i, /pixel/i, /beacon/i,
      /social/i, /share/i, /button/i, /arrow/i,
      /loading/i, /spinner/i, /placeholder/i,
      /1x1/i, /\.gif$/i
    ];
    
    if (skipPatterns.some(pattern => pattern.test(lowercaseSrc) || pattern.test(lowercaseTag))) {
      return false;
    }
    
    // Check for minimum size indicators
    const widthMatch = imgTag.match(/width="?(\d+)"?/i);
    const heightMatch = imgTag.match(/height="?(\d+)"?/i);
    
    if (widthMatch && heightMatch) {
      const width = parseInt(widthMatch[1]);
      const height = parseInt(heightMatch[1]);
      // Skip very small images
      if (width < 200 || height < 100) {
        return false;
      }
    }
    
    return true;
  }

  private isValidImageUrl(url: string): boolean {
    if (!url) return false;
    
    // Check if it's a valid URL format
    try {
      new URL(url.startsWith('http') ? url : `https:${url}`);
    } catch {
      return false;
    }
    
    // Check if it has image extension or is from known image services
    const imagePatterns = [
      /\.(jpg|jpeg|png|gif|webp|svg)($|\?)/i,
      /imgur\.com/i,
      /cloudinary\.com/i,
      /amazonaws\.com/i,
      /googleusercontent\.com/i,
      /wp\.com/i,
      /wordpress\.com/i,
      /medium\.com/i,
      /substack\.com/i
    ];
    
    return imagePatterns.some(pattern => pattern.test(url));
  }

  private normalizeImageUrl(url: string): string {
    if (!url) return '';
    
    // Handle protocol-relative URLs
    if (url.startsWith('//')) {
      return `https:${url}`;
    }
    
    // Handle relative URLs (would need base URL, skip for now)
    if (!url.startsWith('http')) {
      return url.startsWith('/') ? url : `/${url}`;
    }
    
    // Clean up query parameters that might break the image
    try {
      const urlObj = new URL(url);
      // Remove common tracking parameters but keep image size parameters
      const paramsToKeep = ['w', 'h', 'width', 'height', 'quality', 'format', 'crop', 'fit'];
      const newParams = new URLSearchParams();
      
      const params = Array.from(urlObj.searchParams.entries());
      for (const [key, value] of params) {
        if (paramsToKeep.includes(key.toLowerCase())) {
          newParams.set(key, value);
        }
      }
      
      urlObj.search = newParams.toString();
      return urlObj.toString();
    } catch {
      return url;
    }
  }

  private extractFromHtml(html: string, patterns: RegExp[]): string | null {
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  }

  private cleanText(text: string): string {
    return text
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .trim();
  }

  private async analyzeContent(title: string, description: string, domain: string): Promise<{ category: string; estimatedReadTime: number }> {
    try {
      const prompt = `Analyze this article and provide a category and estimated reading time.

Title: ${title}
Description: ${description}
Domain: ${domain}

Categorize this article into one of these categories: "technology", "business", "health", "productivity", "general", "education"

Estimate reading time based on typical article length for this type of content (3-15 minutes).

Respond with JSON in this exact format:
{
  "category": "category_name",
  "estimatedReadTime": number_in_minutes
}`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      // Map categories to match frontend schema
      const categoryMap: { [key: string]: string } = {
        'tech': 'technology',
        'science': 'technology',
        'general': 'general',
        'productivity': 'productivity',
        'business': 'business',
        'health': 'health',
        'education': 'education'
      };

      const mappedCategory = categoryMap[result.category] || result.category || 'general';
      
      return {
        category: mappedCategory,
        estimatedReadTime: Math.max(1, Math.min(15, result.estimatedReadTime || 5))
      };

    } catch (error) {
      console.error('Error analyzing content with AI:', error);
      return {
        category: 'business',
        estimatedReadTime: 5
      };
    }
  }
}

export const urlMetadataService = new UrlMetadataService();
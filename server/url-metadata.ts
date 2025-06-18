import OpenAI from "openai";

// Blocked domains for safety
const BLOCKED_DOMAINS = [
  'pornhub.com', 'xvideos.com', 'redtube.com', 'youporn.com',
  'tube8.com', 'spankbang.com', 'xnxx.com', 'beeg.com',
  'tnaflix.com', 'xhamster.com', 'porn.com', 'sex.com',
  'adult.com', 'xxx.com', 'gambling.com', 'casino.com',
  'bet365.com', 'pokerstars.com', 'darkweb.com', 'onion.com'
];

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

      // Fetch the webpage
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

  private isBlockedDomain(domain: string): boolean {
    return BLOCKED_DOMAINS.some(blocked => 
      domain.includes(blocked) || blocked.includes(domain)
    );
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
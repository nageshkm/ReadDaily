import OpenAI from "openai";

interface ExtractedContent {
  title: string;
  content: string;
  author?: string;
  publishDate?: string;
  readingTime: number;
  isExtractable: boolean;
}

export class ContentExtractorService {
  private openai: OpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async extractArticleContent(url: string): Promise<ExtractedContent | null> {
    try {
      // Fetch the webpage
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.log(`Failed to fetch ${url}: ${response.status}`);
        return null;
      }

      const html = await response.text();
      
      // Extract content using multiple strategies
      return this.parseArticleContent(html, url);
    } catch (error) {
      console.error(`Error extracting content from ${url}:`, error);
      return null;
    }
  }

  private parseArticleContent(html: string, url: string): ExtractedContent {
    // Extract title
    const title = this.extractTitle(html);
    
    // Extract main content
    const content = this.extractMainContent(html);
    
    // Extract metadata
    const author = this.extractAuthor(html);
    const publishDate = this.extractPublishDate(html);
    
    // Calculate reading time
    const readingTime = this.calculateReadingTime(content);
    
    // Determine if content is substantial enough
    const isExtractable = content.length > 500 && this.hasStructuredContent(content);

    return {
      title,
      content,
      author,
      publishDate,
      readingTime,
      isExtractable
    };
  }

  private extractTitle(html: string): string {
    const patterns = [
      /<meta property="og:title" content="([^"]*)"[^>]*>/i,
      /<meta name="twitter:title" content="([^"]*)"[^>]*>/i,
      /<title[^>]*>([^<]*)<\/title>/i,
      /<h1[^>]*>([^<]*)<\/h1>/i
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        return this.cleanText(match[1]);
      }
    }

    return 'Untitled Article';
  }

  private extractMainContent(html: string): string {
    // Try structured content selectors first
    const structuredContent = this.extractStructuredContent(html);
    if (structuredContent) {
      return structuredContent;
    }

    // Fallback to paragraph extraction
    return this.extractParagraphContent(html);
  }

  private extractStructuredContent(html: string): string | null {
    // Look for common article content containers
    const contentSelectors = [
      // Article tags
      /<article[^>]*>([\s\S]*?)<\/article>/i,
      // Common content class names
      /<div[^>]*class="[^"]*(?:article|content|post|entry|story)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<main[^>]*>([\s\S]*?)<\/main>/i,
      // Schema.org structured data
      /<div[^>]*itemtype="[^"]*Article"[^>]*>([\s\S]*?)<\/div>/i
    ];

    for (const selector of contentSelectors) {
      const match = html.match(selector);
      if (match && match[1]) {
        const content = this.extractTextFromHtml(match[1]);
        if (content.length > 500) {
          return content;
        }
      }
    }

    return null;
  }

  private extractParagraphContent(html: string): string {
    // Extract all paragraphs and filter out navigation/footer content
    const paragraphs = html.match(/<p[^>]*>[\s\S]*?<\/p>/gi) || [];
    
    let content = '';
    for (const p of paragraphs) {
      const text = this.extractTextFromHtml(p);
      
      // Skip short paragraphs or navigation elements
      if (text.length > 50 && !this.isNavigationContent(text)) {
        content += text + '\n\n';
      }
    }

    return content.trim();
  }

  private extractTextFromHtml(html: string): string {
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<header[\s\S]*?<\/header>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<aside[\s\S]*?<\/aside>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private isNavigationContent(text: string): boolean {
    const navPatterns = [
      /^(home|about|contact|menu|search|login|register|subscribe)$/i,
      /^(next|previous|more|read more|continue reading)$/i,
      /^(share|like|comment|follow)$/i,
      /^(cookie|privacy|terms|policy)$/i
    ];

    return navPatterns.some(pattern => pattern.test(text.trim()));
  }

  private extractAuthor(html: string): string | undefined {
    const patterns = [
      /<meta name="author" content="([^"]*)"[^>]*>/i,
      /<meta property="article:author" content="([^"]*)"[^>]*>/i,
      /<span[^>]*class="[^"]*author[^"]*"[^>]*>([^<]*)<\/span>/i,
      /<div[^>]*class="[^"]*byline[^"]*"[^>]*>[\s\S]*?([A-Z][a-z]+ [A-Z][a-z]+)[\s\S]*?<\/div>/i
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        return this.cleanText(match[1]);
      }
    }

    return undefined;
  }

  private extractPublishDate(html: string): string | undefined {
    const patterns = [
      /<meta property="article:published_time" content="([^"]*)"[^>]*>/i,
      /<time[^>]*datetime="([^"]*)"[^>]*>/i,
      /<meta name="date" content="([^"]*)"[^>]*>/i
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return undefined;
  }

  private calculateReadingTime(content: string): number {
    const wordsPerMinute = 200;
    const wordCount = content.split(/\s+/).length;
    return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
  }

  private hasStructuredContent(content: string): boolean {
    // Check if content has multiple paragraphs and reasonable structure
    const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);
    return paragraphs.length >= 3 && content.length > 1000;
  }

  private cleanText(text: string): string {
    return text
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

export const contentExtractor = new ContentExtractorService();
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
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 10000
      });

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

    const image = this.extractFromHtml(html, [
      /<meta property="og:image" content="([^"]*)"[^>]*>/i,
      /<meta name="twitter:image" content="([^"]*)"[^>]*>/i,
      /<meta name="twitter:image:src" content="([^"]*)"[^>]*>/i
    ]) || 'https://via.placeholder.com/400x200?text=Article';

    return {
      title: this.cleanText(title),
      description: this.cleanText(description),
      image: image.startsWith('http') ? image : `https:${image}`
    };
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

Categorize this article into one of these categories: "tech", "business", "health", "science"

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
      
      return {
        category: result.category || 'business',
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
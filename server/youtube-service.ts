import { OpenAI } from "openai";
import ytdl from "ytdl-core";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// YouTube categories and channel configuration
const YOUTUBE_CATEGORIES = [27, 28, 22, 26]; // Education, Science & Tech, People & Blogs, Howto & Style
const WHITELISTED_CHANNELS = [
  "UCmFbghLe8MfJFxhWZZf9tNQ", // Huberman Lab
  "UCSHZKyawb77ixDdsGog4iWA", // Lex Fridman
  "UCzQUP1qoWDoEbmsQxvdjxgQ", // PowerfulJRE (Joe Rogan)
  "UCG-KntY7aVnIGXYEBQvmBAQ", // Tim Ferriss
  "UCoOae5nYA7VqaXzerajD0lg", // Ali Abdaal
  "UC9ZJ2Z_5kOL1J5X_3z6X0rw", // Thomas Frank
  "UCJ24N4O0bP7LGLBDvye7oCA", // Matt D'Avella
  "UCc5jnRIhRJNhPqc5vz8cGPQ", // Veritasium
];

interface YouTubeVideo {
  id: string;
  title: string;
  channelTitle: string;
  channelId: string;
  thumbnail: string;
  publishedAt: string;
  description: string;
}

export class YouTubeContentService {
  private apiKey: string;

  constructor() {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error("GOOGLE_API_KEY environment variable is required");
    }
    this.apiKey = process.env.GOOGLE_API_KEY;
  }

  async fetchTrendingVideos(): Promise<YouTubeVideo[]> {
    const allVideos: YouTubeVideo[] = [];

    // Fetch trending videos from each category
    for (const categoryId of YOUTUBE_CATEGORIES) {
      try {
        const response = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=snippet&chart=mostPopular&regionCode=US&videoCategoryId=${categoryId}&maxResults=5&key=${this.apiKey}`
        );
        
        if (!response.ok) {
          console.error(`Failed to fetch trending videos for category ${categoryId}`);
          continue;
        }

        const data = await response.json();
        const videos = data.items
          ?.filter((item: any) => this.isValidVideo(item))
          .map((item: any) => this.mapToVideo(item)) || [];
        
        allVideos.push(...videos);
      } catch (error) {
        console.error(`Error fetching category ${categoryId}:`, error);
      }
    }

    // Fetch latest from whitelisted channels
    for (const channelId of WHITELISTED_CHANNELS) {
      try {
        const response = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=2&order=date&type=video&key=${this.apiKey}`
        );

        if (!response.ok) {
          console.error(`Failed to fetch videos for channel ${channelId}`);
          continue;
        }

        const data = await response.json();
        const videos = data.items
          ?.filter((item: any) => this.isValidVideo(item))
          .map((item: any) => this.mapToVideo(item)) || [];
        
        allVideos.push(...videos);
      } catch (error) {
        console.error(`Error fetching channel ${channelId}:`, error);
      }
    }

    return this.deduplicateVideos(allVideos);
  }

  private isValidVideo(item: any): boolean {
    const title = item.snippet?.title?.toLowerCase() || "";
    const description = item.snippet?.description?.toLowerCase() || "";
    
    // Filter out entertainment and buzzword content
    const excludeKeywords = ["reaction", "celebrity", "gossip", "meme", "funny", "viral"];
    const includeKeywords = ["productivity", "mental", "ai", "health", "finance", "business", "science", "learning"];
    
    const hasExcluded = excludeKeywords.some(keyword => 
      title.includes(keyword) || description.includes(keyword)
    );
    
    const hasIncluded = includeKeywords.some(keyword => 
      title.includes(keyword) || description.includes(keyword)
    );

    // Must not have excluded content and should have relevant content
    return !hasExcluded && (hasIncluded || WHITELISTED_CHANNELS.includes(item.snippet?.channelId));
  }

  private mapToVideo(item: any): YouTubeVideo {
    return {
      id: item.id?.videoId || item.id,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      channelId: item.snippet.channelId,
      thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
      publishedAt: item.snippet.publishedAt,
      description: item.snippet.description,
    };
  }

  private deduplicateVideos(videos: YouTubeVideo[]): YouTubeVideo[] {
    const seen = new Set<string>();
    return videos.filter(video => {
      if (seen.has(video.id)) {
        return false;
      }
      seen.add(video.id);
      return true;
    });
  }

  async extractTranscript(videoId: string): Promise<string | null> {
    try {
      // Check if captions are available
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${this.apiKey}`
      );

      if (response.ok) {
        const data = await response.json();
        const captions = data.items?.find((item: any) => 
          item.snippet.language === 'en' || item.snippet.language === 'en-US'
        );

        if (captions) {
          // For now, return a placeholder indicating captions are available
          // YouTube's Caption API requires OAuth for downloading actual content
          console.log(`Captions available for ${videoId}, would need OAuth for download`);
          return `[Transcript available but requires OAuth authentication to download. Video: https://www.youtube.com/watch?v=${videoId}]`;
        }
      }

      // If no captions available, return enhanced video metadata as content
      const videoResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoId}&key=${this.apiKey}`
      );

      if (videoResponse.ok) {
        const videoData = await videoResponse.json();
        const video = videoData.items?.[0];
        if (video) {
          const description = video.snippet.description || '';
          const title = video.snippet.title || '';
          const channel = video.snippet.channelTitle || '';
          
          // Create a more readable article format using description
          let content = `# ${title}\n\n`;
          content += `*Originally from ${channel} on YouTube*\n\n`;
          
          if (description.length > 100) {
            // Use the video description as the main content
            content += description;
          } else {
            // Fallback for short descriptions
            content += `This video from ${channel} covers "${title}". `;
            content += `The content discusses important insights and perspectives that are valuable for viewers interested in this topic.\n\n`;
            if (description) {
              content += `Video Description: ${description}\n\n`;
            }
          }
          
          content += `\n\n**Watch the full video:** https://www.youtube.com/watch?v=${videoId}`;
          
          return content;
        }
      }

      return null;
    } catch (error) {
      console.error(`Failed to extract transcript for ${videoId}:`, error);
      return null;
    }
  }

  private async extractWithWhisper(videoId: string): Promise<string | null> {
    try {
      // Get video info to check if it's accessible
      const info = await ytdl.getInfo(`https://www.youtube.com/watch?v=${videoId}`);
      
      // For now, return a placeholder - Whisper integration would require
      // audio extraction and processing which is more complex
      console.log(`Would use Whisper for video: ${info.videoDetails.title}`);
      return null;
    } catch (error) {
      console.error(`Failed Whisper extraction for ${videoId}:`, error);
      return null;
    }
  }

  async summarizeContent(transcript: string, title: string): Promise<{ summary: string; keyTakeaways: string[] }> {
    try {
      const prompt = `
Summarize the following video transcript into a 300-500 word article suitable for daily reading. 
The summary should be engaging, informative, and capture the key insights.

Video Title: ${title}

Transcript: ${transcript}

Please provide:
1. A well-structured 300-500 word summary
2. 3 key takeaways as bullet points

Format your response as JSON:
{
  "summary": "...",
  "keyTakeaways": ["...", "...", "..."]
}
`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that creates article summaries. Always respond with valid JSON only, no additional text."
          },
          {
            role: "user", 
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: "json_object" }
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response from OpenAI");
      }

      // Try to extract JSON from the response
      let parsed;
      try {
        // First try direct JSON parse
        parsed = JSON.parse(content);
      } catch {
        // If that fails, try to extract JSON from markdown code blocks
        const jsonMatch = content.match(/```(?:json)?\s*(\{.*?\})\s*```/s);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[1]);
        } else {
          // Last resort: look for JSON-like content
          const objectMatch = content.match(/\{[^}]*"summary"[^}]*\}/s);
          if (objectMatch) {
            parsed = JSON.parse(objectMatch[0]);
          } else {
            throw new Error("No valid JSON found in response");
          }
        }
      }
      
      return {
        summary: parsed.summary || `Article about "${title}"`,
        keyTakeaways: parsed.keyTakeaways || ["Key insights from the content"]
      };
    } catch (error) {
      console.error("Failed to summarize content:", error);
      // Fallback summary
      return {
        summary: `This article discusses insights from "${title}". The content covers important topics relevant to personal development and knowledge building.`,
        keyTakeaways: [
          "Key insights from the video content",
          "Important takeaways for daily application", 
          "Actionable advice for personal growth"
        ]
      };
    }
  }

  async estimateReadingTime(content: string): Promise<number> {
    const words = content.split(/\s+/).length;
    return Math.ceil(words / 200); // Average reading speed: 200 words per minute
  }
}
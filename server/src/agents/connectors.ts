/**
 * Modular connectors for external data sources.
 * All connectors accept optional location parameters for geo-targeted results.
 * Each returns a normalized array of raw trend items.
 *
 * When real API keys are not configured, connectors return empty arrays
 * and the system falls back to SMICulateTrends().
 */

import axios from "axios";

export interface RawTrendItem {
  name: string;
  platforms: string[];
  score: number;
  explanation: string;
  source: string;
  category?: string;
  url?: string;
  location?: string;
}

// ─── Google Trends ──────────────────────────────────────────────────
export async function fetchGoogleTrends(countryCode?: string): Promise<RawTrendItem[]> {
  // TODO: implement using Google Trends API or SerpAPI
  // When implemented, pass `geo: countryCode` to scope results
  return [];
}

// ─── YouTube Trending ───────────────────────────────────────────────
export async function fetchYouTubeTrending(countryCode?: string): Promise<RawTrendItem[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return [];

  try {
    const resp = await axios.get("https://www.googleapis.com/youtube/v3/videos", {
      params: {
        part: "snippet,statistics",
        chart: "mostPopular",
        regionCode: countryCode || "US",
        maxResults: 10,
        key: apiKey,
      },
      timeout: 10000,
    });

    return (resp.data?.items || []).map((item: any) => ({
      name: item.snippet?.title || "Unknown",
      platforms: ["YouTube"],
      score: Math.min(100, Math.round(Number(item.statistics?.viewCount || 0) / 100000)),
      explanation: item.snippet?.description?.slice(0, 200) || "",
      source: "youtube",
      category: "viral_video",
      url: `https://youtube.com/watch?v=${item.id}`,
      location: countryCode,
    }));
  } catch (err: any) {
    console.warn("[Connectors] YouTube API error:", err.message);
    return [];
  }
}

// ─── Facebook Graph API ─────────────────────────────────────────────
export async function fetchFacebookTrending(countryCode?: string): Promise<RawTrendItem[]> {
  const accessToken = process.env.FACEBOOK_API_KEY;
  if (!accessToken) return [];

  try {
    // Fetch popular public posts via Graph API search
    // Uses the /me/feed for Page tokens or public page search
    const resp = await axios.get("https://graph.facebook.com/v19.0/me/feed", {
      params: {
        fields: "message,story,created_time,shares,reactions.summary(true),comments.summary(true),permalink_url,type",
        limit: 15,
        access_token: accessToken,
      },
      timeout: 10000,
    });

    return (resp.data?.data || [])
      .filter((post: any) => post.message || post.story)
      .map((post: any) => {
        const reactions = post.reactions?.summary?.total_count || 0;
        const comments = post.comments?.summary?.total_count || 0;
        const shares = post.shares?.count || 0;
        const engagement = reactions + comments * 2 + shares * 3;

        return {
          name: (post.message || post.story || "").slice(0, 120),
          platforms: ["Facebook"],
          score: Math.min(100, Math.round(engagement / 10)),
          explanation: `${reactions} reactions, ${comments} comments, ${shares} shares`,
          source: "facebook",
          category: post.type === "video" ? "viral_video" : "topic",
          url: post.permalink_url,
          location: countryCode,
        };
      });
  } catch (err: any) {
    console.warn("[Connectors] Facebook API error:", err.message);
    return [];
  }
}

// ─── Facebook Page Insights (trending content from specific pages) ──
export async function fetchFacebookPagePosts(pageId: string, countryCode?: string): Promise<RawTrendItem[]> {
  const accessToken = process.env.FACEBOOK_API_KEY;
  if (!accessToken) return [];

  try {
    const resp = await axios.get(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
      params: {
        fields: "message,created_time,shares,reactions.summary(true),comments.summary(true),permalink_url,type",
        limit: 10,
        access_token: accessToken,
      },
      timeout: 10000,
    });

    return (resp.data?.data || [])
      .filter((post: any) => post.message)
      .map((post: any) => {
        const reactions = post.reactions?.summary?.total_count || 0;
        const comments = post.comments?.summary?.total_count || 0;
        const shares = post.shares?.count || 0;
        const engagement = reactions + comments * 2 + shares * 3;

        return {
          name: post.message.slice(0, 120),
          platforms: ["Facebook"],
          score: Math.min(100, Math.round(engagement / 10)),
          explanation: `${reactions} reactions, ${comments} comments, ${shares} shares`,
          source: "facebook_page",
          category: post.type === "video" ? "viral_video" : "topic",
          url: post.permalink_url,
          location: countryCode,
        };
      });
  } catch (err: any) {
    console.warn("[Connectors] Facebook Page API error:", err.message);
    return [];
  }
}

// ─── Instagram Hashtags / Reels ─────────────────────────────────────
export async function fetchInstagramHashtags(countryCode?: string): Promise<RawTrendItem[]> {
  // TODO: implement using Instagram Graph API or third-party service
  // Scope by location when available
  return [];
}

// ─── Way2News Integration ───────────────────────────────────────────
export async function fetchWay2News(countryCode?: string, language?: string): Promise<RawTrendItem[]> {
  const apiKey = process.env.WAY2NEWS_API_KEY;
  if (!apiKey) return SMICulateNews(countryCode);

  try {
    // Way2News API integration
    // Supports: breaking, local, regional, national, international categories
    const resp = await axios.get("https://api.way2news.com/v1/trending", {
      params: {
        country: countryCode || "IN",
        language: language || "en",
        limit: 15,
      },
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: 10000,
    });

    return (resp.data?.articles || []).map((article: any) => ({
      name: article.title || "Unknown",
      platforms: ["Way2News", "News"],
      score: article.trendScore || 50,
      explanation: article.summary || article.description || "",
      source: "way2news",
      category: "news",
      url: article.url,
      location: countryCode,
    }));
  } catch (err: any) {
    console.warn("[Connectors] Way2News API error:", err.message);
    return SMICulateNews(countryCode);
  }
}

// ─── Generic News Aggregator ────────────────────────────────────────
export async function fetchNewsHeadlines(countryCode?: string): Promise<RawTrendItem[]> {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) return [];

  try {
    const resp = await axios.get("https://newsapi.org/v2/top-headlines", {
      params: {
        country: (countryCode || "us").toLowerCase(),
        pageSize: 10,
      },
      headers: { "X-Api-Key": apiKey },
      timeout: 10000,
    });

    return (resp.data?.articles || []).map((article: any) => ({
      name: article.title || "Unknown",
      platforms: ["Google", "News"],
      score: 60,
      explanation: article.description || "",
      source: "newsapi",
      category: "news",
      url: article.url,
      location: countryCode,
    }));
  } catch (err: any) {
    console.warn("[Connectors] NewsAPI error:", err.message);
    return [];
  }
}

// ─── Smart Search: Person / Topic / Location / Latest News ──────────
export async function searchByQuery(
  query: string,
  countryCode?: string,
  language?: string
): Promise<RawTrendItem[]> {
  const results: RawTrendItem[] = [];

  // 1. YouTube Search — person interviews, press conferences, latest videos
  const ytKey = process.env.YOUTUBE_API_KEY;
  if (ytKey) {
    try {
      const resp = await axios.get("https://www.googleapis.com/youtube/v3/search", {
        params: {
          part: "snippet",
          q: query,
          type: "video",
          order: "date",
          regionCode: countryCode || "US",
          maxResults: 8,
          key: ytKey,
        },
        timeout: 10000,
      });
      for (const item of resp.data?.items || []) {
        results.push({
          name: item.snippet?.title || query,
          platforms: ["YouTube"],
          score: 70,
          explanation: item.snippet?.description?.slice(0, 200) || "",
          source: "youtube_search",
          category: "viral_video",
          url: `https://youtube.com/watch?v=${item.id?.videoId}`,
          location: countryCode,
        });
      }
    } catch (err: any) {
      console.warn("[Search] YouTube search error:", err.message);
    }
  }

  // 2. NewsAPI Search — latest news articles about the query
  const newsKey = process.env.NEWS_API_KEY;
  if (newsKey) {
    try {
      const resp = await axios.get("https://newsapi.org/v2/everything", {
        params: {
          q: query,
          sortBy: "publishedAt",
          language: (language || "en").slice(0, 2),
          pageSize: 8,
        },
        headers: { "X-Api-Key": newsKey },
        timeout: 10000,
      });
      for (const article of resp.data?.articles || []) {
        results.push({
          name: article.title || query,
          platforms: ["News"],
          score: 65,
          explanation: article.description || "",
          source: "newsapi_search",
          category: "news",
          url: article.url,
          location: countryCode,
        });
      }
    } catch (err: any) {
      console.warn("[Search] NewsAPI search error:", err.message);
    }
  }

  // 3. Facebook Search — posts matching the query
  const fbToken = process.env.FACEBOOK_API_KEY;
  if (fbToken) {
    try {
      const resp = await axios.get("https://graph.facebook.com/v19.0/me/feed", {
        params: {
          fields: "message,created_time,shares,reactions.summary(true),comments.summary(true),permalink_url",
          limit: 10,
          access_token: fbToken,
        },
        timeout: 10000,
      });
      const queryLower = query.toLowerCase();
      for (const post of resp.data?.data || []) {
        if (post.message && post.message.toLowerCase().includes(queryLower)) {
          const reactions = post.reactions?.summary?.total_count || 0;
          const comments = post.comments?.summary?.total_count || 0;
          const shares = post.shares?.count || 0;
          results.push({
            name: post.message.slice(0, 120),
            platforms: ["Facebook"],
            score: Math.min(100, Math.round((reactions + comments * 2 + shares * 3) / 10)),
            explanation: `${reactions} reactions, ${comments} comments, ${shares} shares`,
            source: "facebook_search",
            category: "topic",
            url: post.permalink_url,
            location: countryCode,
          });
        }
      }
    } catch (err: any) {
      console.warn("[Search] Facebook search error:", err.message);
    }
  }

  // Deduplicate by title
  const seen = new Set<string>();
  return results.filter((r) => {
    const key = r.name.toLowerCase().slice(0, 50);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── SMICulation / Fallbacks ─────────────────────────────────────────
export async function SMICulateTrends(countryCode?: string): Promise<RawTrendItem[]> {
  const location = countryCode || "Global";
  return [
    { name: "AI Video Remix", platforms: ["YouTube", "Instagram"], score: 82, explanation: "Short-form remixes of AI-generated clips are gaining traction.", source: "SMICulation", category: "viral_video", location },
    { name: "Startup Layoffs 2026", platforms: ["X", "Reddit", "News"], score: 74, explanation: "Ongoing tech layoffs driving conversation about job security.", source: "SMICulation", category: "news", location },
    { name: "Championship Upset", platforms: ["YouTube", "X"], score: 69, explanation: "Unexpected result in major sports event driving highlights.", source: "SMICulation", category: "topic", location },
    { name: "Street Food Challenge", platforms: ["Instagram", "YouTube"], score: 78, explanation: "Creators showcasing local street food in viral format.", source: "SMICulation", category: "viral_video", location },
    { name: "Green Energy Debate", platforms: ["News", "X", "YouTube"], score: 65, explanation: "Policy announcements sparking social media discussion.", source: "SMICulation", category: "news", location },
  ];
}

function SMICulateNews(countryCode?: string): RawTrendItem[] {
  const location = countryCode || "Global";
  return [
    { name: "Breaking: Tech Policy Update", platforms: ["Way2News", "News"], score: 72, explanation: "New regulations affecting social media platforms.", source: "way2news_SMIC", category: "news", location },
    { name: "Local Weather Alert", platforms: ["Way2News", "News"], score: 58, explanation: "Extreme weather conditions driving awareness content.", source: "way2news_SMIC", category: "news", location },
    { name: "Sports Championship Finals", platforms: ["Way2News", "News", "YouTube"], score: 80, explanation: "Major tournament driving massive engagement.", source: "way2news_SMIC", category: "news", location },
  ];
}

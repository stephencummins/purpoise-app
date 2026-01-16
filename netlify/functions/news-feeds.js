const axios = require('axios');

// RSS feed sources
const RSS_FEEDS = [
  {
    name: 'The Guardian',
    url: 'https://www.theguardian.com/uk/rss',
    category: 'UK News'
  },
  {
    name: 'BBC News',
    url: 'https://feeds.bbci.co.uk/news/rss.xml',
    category: 'UK News'
  },
  {
    name: 'Reuters',
    url: 'https://www.reutersagency.com/feed/',
    category: 'World News'
  },
  {
    name: 'The New York Times',
    url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml',
    category: 'US News'
  },
  {
    name: 'Paddo.dev',
    url: 'https://paddo.dev/rss.xml',
    category: 'AI & Tech'
  }
];

// Simple XML parser for RSS feeds
function parseRSS(xml) {
  const items = [];

  // Match all <item> tags
  const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g);

  if (!itemMatches) return items;

  itemMatches.forEach(item => {
    // Extract title
    const titleMatch = item.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/);
    const title = titleMatch ? titleMatch[1].trim() : '';

    // Extract link
    const linkMatch = item.match(/<link>(.*?)<\/link>/);
    const link = linkMatch ? linkMatch[1].trim() : '';

    // Extract description
    const descMatch = item.match(/<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/description>/);
    let description = descMatch ? descMatch[1].trim() : '';

    // Extract image before cleaning HTML
    let image = null;
    // Try multiple image sources (media:content, enclosure, img tags in description)
    const mediaContentMatch = item.match(/<media:content[^>]*url=["']([^"']*)["']/i);
    const mediaThumbnailMatch = item.match(/<media:thumbnail[^>]*url=["']([^"']*)["']/i);
    const enclosureMatch = item.match(/<enclosure[^>]*url=["']([^"']*)["'][^>]*type=["']image/i);
    const imgMatch = description.match(/<img[^>]*src=["']([^"']*)["']/i);

    if (mediaContentMatch) {
      image = mediaContentMatch[1];
    } else if (mediaThumbnailMatch) {
      image = mediaThumbnailMatch[1];
    } else if (enclosureMatch) {
      image = enclosureMatch[1];
    } else if (imgMatch) {
      image = imgMatch[1];
    }

    // Clean HTML tags from description
    description = description.replace(/<[^>]*>/g, '').substring(0, 200);

    // Extract pubDate
    const dateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
    const pubDate = dateMatch ? new Date(dateMatch[1]) : new Date();

    if (title && link) {
      items.push({
        title,
        link,
        description,
        image,
        pubDate: pubDate.toISOString(),
        timestamp: pubDate.getTime()
      });
    }
  });

  return items;
}

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const allArticles = [];

    // Check if content is Trump-related
    const isTrumpRelated = (text) => {
      if (!text) return false;
      const lowerText = text.toLowerCase();
      const trumpKeywords = [
        'trump', 'donald trump', 'potus', 'president trump',
        'mar-a-lago', 'maga', 'make america great'
      ];
      return trumpKeywords.some(keyword => lowerText.includes(keyword));
    };

    // Check if content is sports-related
    const isSportsRelated = (text) => {
      if (!text) return false;
      const lowerText = text.toLowerCase();
      const sportsKeywords = [
        'football', 'soccer', 'cricket', 'rugby', 'tennis', 'basketball',
        'baseball', 'golf', 'boxing', 'formula 1', 'f1', 'nfl', 'nba',
        'premier league', 'champions league', 'world cup', 'olympics',
        'match', 'tournament', 'championship', 'league', 'goal', 'score',
        'player', 'team', 'coach', 'stadium', 'fixture', 'playoff'
      ];
      return sportsKeywords.some(keyword => lowerText.includes(keyword));
    };

    // Check if content is AI-related
    const isAIRelated = (text, source) => {
      // All Paddo.dev articles are AI-related
      if (source === 'Paddo.dev') return true;

      if (!text) return false;
      const lowerText = text.toLowerCase();

      // Use word boundary regex for short keywords to avoid false positives
      // e.g., 'ai' shouldn't match 'said', 'rain', 'britain'
      const aiPatterns = [
        /\bai\b/,                    // "AI" as whole word only
        /\bml\b/,                    // "ML" as whole word only
        /\bllm\b/,                   // "LLM" as whole word only
        /\bnlp\b/,                   // "NLP" as whole word only
        /\bgpt[-\s]?\d*/,            // GPT, GPT-4, GPT 4, etc.
        /artificial intelligence/,
        /machine learning/,
        /deep learning/,
        /neural network/,
        /chatgpt/,
        /\bclaude\b/,               // Claude AI (whole word)
        /\bgemini\b/,               // Gemini AI (whole word)
        /large language model/,
        /openai/,
        /anthropic/,
        /generative ai/,
        /gen[\s-]?ai/,
        /diffusion model/,
        /transformer model/,
        /computer vision/,
        /copilot/,
        /midjourney/,
        /stable diffusion/,
        /dall-?e/,
        /\bsora\b/,
        /hugging\s?face/
      ];

      return aiPatterns.some(pattern => pattern.test(lowerText));
    };

    // Check if content is Anthropic/Claude-related (for prioritization)
    const isAnthropicRelated = (text) => {
      if (!text) return false;
      const lowerText = text.toLowerCase();
      const anthropicPatterns = [
        /anthropic/,
        /\bclaude\b/,
        /claude\s*\d/,           // Claude 3, Claude 4, etc.
        /claude\s*(opus|sonnet|haiku)/i,
        /artifacts/,             // Claude's Artifacts feature
        /dario\s*amodei/,        // CEO
        /daniela\s*amodei/       // President
      ];
      return anthropicPatterns.some(pattern => pattern.test(lowerText));
    };

    // Fetch all RSS feeds in parallel
    const feedPromises = RSS_FEEDS.map(async (feed) => {
      try {
        const response = await axios.get(feed.url, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; PurpoiseNewsAggregator/1.0)'
          }
        });

        const items = parseRSS(response.data);

        // Add source information to each article and check for Trump/sports/AI/Anthropic content
        return items.slice(0, 10).map(item => {
          const combinedText = item.title + ' ' + item.description;
          return {
            ...item,
            source: feed.name,
            category: feed.category,
            isTrump: isTrumpRelated(item.title) || isTrumpRelated(item.description),
            isSports: isSportsRelated(item.title) || isSportsRelated(item.description),
            isAI: isAIRelated(combinedText, feed.name),
            isAnthropic: isAnthropicRelated(combinedText)
          };
        });
      } catch (error) {
        console.error(`Error fetching ${feed.name}:`, error.message);
        return [];
      }
    });

    const results = await Promise.all(feedPromises);

    // Flatten and combine all articles
    results.forEach(articles => {
      allArticles.push(...articles);
    });

    // Sort by timestamp (newest first)
    allArticles.sort((a, b) => b.timestamp - a.timestamp);

    // Return top 50 most recent articles
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        articles: allArticles.slice(0, 50),
        lastUpdated: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('News feeds error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

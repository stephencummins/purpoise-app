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

        // Add source information to each article and check for Trump content
        return items.slice(0, 10).map(item => ({
          ...item,
          source: feed.name,
          category: feed.category,
          isTrump: isTrumpRelated(item.title) || isTrumpRelated(item.description)
        }));
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

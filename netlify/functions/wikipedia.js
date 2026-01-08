const axios = require('axios');

// Helper function to clean up HTML and extract text
function cleanHTML(html) {
  if (!html) return '';
  // Remove script and style tags
  let clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  // Keep links but make them absolute
  clean = clean.replace(/href="\/wiki\//g, 'href="https://en.wikipedia.org/wiki/');
  clean = clean.replace(/href="\/w\//g, 'href="https://en.wikipedia.org/w/');
  return clean.trim();
}

// Parse Wikipedia Main Page sections
function parseWikipediaMainPage(html) {
  const result = {
    featuredArticle: null,
    inTheNews: [],
    didYouKnow: [],
    onThisDay: []
  };

  try {
    // Extract Featured Article (From today's featured article)
    const featuredMatch = html.match(/<div[^>]*id="mp-tfa"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i);
    if (featuredMatch) {
      const featuredContent = featuredMatch[1];
      const titleMatch = featuredContent.match(/<b><a[^>]*title="([^"]*)"[^>]*>([^<]*)<\/a><\/b>/);
      const title = titleMatch ? titleMatch[2] : 'Featured Article';
      const link = titleMatch ? `https://en.wikipedia.org/wiki/${titleMatch[1].replace(/\s/g, '_')}` : null;

      // Extract first paragraph
      const paragraphMatch = featuredContent.match(/<p[^>]*>([\s\S]*?)<\/p>/);
      const content = paragraphMatch ? cleanHTML(paragraphMatch[1]) : cleanHTML(featuredContent.substring(0, 500));

      result.featuredArticle = {
        title,
        content,
        link
      };
    }

    // Extract In the News
    const newsMatch = html.match(/<div[^>]*id="mp-itn"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i);
    if (newsMatch) {
      const newsContent = newsMatch[1];
      const listMatch = newsContent.match(/<ul[^>]*>([\s\S]*?)<\/ul>/);
      if (listMatch) {
        const items = listMatch[1].match(/<li[^>]*>([\s\S]*?)<\/li>/g);
        if (items) {
          result.inTheNews = items.slice(0, 5).map(item => cleanHTML(item.replace(/<li[^>]*>|<\/li>/g, '')));
        }
      }
    }

    // Extract Did You Know
    const dykMatch = html.match(/<div[^>]*id="mp-dyk"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i);
    if (dykMatch) {
      const dykContent = dykMatch[1];
      const listMatch = dykContent.match(/<ul[^>]*>([\s\S]*?)<\/ul>/);
      if (listMatch) {
        const items = listMatch[1].match(/<li[^>]*>([\s\S]*?)<\/li>/g);
        if (items) {
          result.didYouKnow = items.slice(0, 5).map(item => cleanHTML(item.replace(/<li[^>]*>|<\/li>/g, '')));
        }
      }
    }

    // Extract On This Day
    const otdMatch = html.match(/<div[^>]*id="mp-otd"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i);
    if (otdMatch) {
      const otdContent = otdMatch[1];
      const listMatch = otdContent.match(/<ul[^>]*>([\s\S]*?)<\/ul>/);
      if (listMatch) {
        const items = listMatch[1].match(/<li[^>]*>([\s\S]*?)<\/li>/g);
        if (items) {
          result.onThisDay = items.slice(0, 5).map(item => cleanHTML(item.replace(/<li[^>]*>|<\/li>/g, '')));
        }
      }
    }

  } catch (error) {
    console.error('Error parsing Wikipedia content:', error);
  }

  return result;
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
    // Fetch Wikipedia Main Page
    const response = await axios.get('https://en.wikipedia.org/wiki/Main_Page', {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PurpoiseApp/1.0)'
      }
    });

    // Parse the HTML content
    const content = parseWikipediaMainPage(response.data);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ...content,
        lastUpdated: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Wikipedia fetch error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message,
        message: 'Failed to fetch Wikipedia content'
      })
    };
  }
};

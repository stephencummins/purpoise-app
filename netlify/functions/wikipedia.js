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
    const featuredMatch = html.match(/<div[^>]*id="mp-tfa"[^>]*class="[^"]*">([\s\S]*?)<div class="tfa-recent"/i);
    if (featuredMatch) {
      let featuredContent = featuredMatch[1];

      // Extract title from first bold link
      let titleMatch = featuredContent.match(/<b><a[^>]*title="([^"]*)"[^>]*>(.*?)<\/a><\/b>/);
      let title = 'Featured Article';
      let titleForLink = null;

      if (titleMatch) {
        titleForLink = titleMatch[1];
        // Remove HTML tags from title (like <i> tags)
        title = titleMatch[2].replace(/<[^>]*>/g, '').trim();
      }

      const link = titleForLink ? `https://en.wikipedia.org/wiki/${encodeURIComponent(titleForLink)}` : null;

      // Extract the main paragraph (after removing image div)
      let textContent = featuredContent.replace(/<div[^>]*id="mp-tfa-img"[^>]*>[\s\S]*?<\/div>\s*<\/div>/g, '');
      const paragraphMatch = textContent.match(/<p>([\s\S]*?)<\/p>/);

      let content = '';
      if (paragraphMatch) {
        content = cleanHTML(paragraphMatch[1]);
        // Remove the "This article is part of..." footer
        content = content.replace(/\s*\([^)]*This\s+article[^)]*\)\s*$/i, '').trim();
      }

      result.featuredArticle = {
        title,
        content: content.length > 1000 ? content.substring(0, 1000).trim() + '...' : content,
        link
      };
    }

    // Extract In the News
    const newsMatch = html.match(/<div[^>]*id="mp-itn"[^>]*>([\s\S]*?)(?=<div[^>]*id="|$)/i);
    if (newsMatch) {
      const newsContent = newsMatch[1];

      // Try to extract the featured news image
      let newsImage = null;
      const imageMatch = newsContent.match(/<img[^>]*src="([^"]*)"[^>]*>/i);
      if (imageMatch) {
        let imgSrc = imageMatch[1];
        // Make image URL absolute if it's relative
        if (imgSrc.startsWith('//')) {
          imgSrc = 'https:' + imgSrc;
        } else if (imgSrc.startsWith('/')) {
          imgSrc = 'https://en.wikipedia.org' + imgSrc;
        }
        newsImage = imgSrc;
      }

      // Extract all list items more robustly
      const listMatches = newsContent.match(/<li[^>]*>([\s\S]*?)<\/li>/g);
      if (listMatches) {
        result.inTheNews = listMatches.slice(0, 6).map(item => {
          const cleaned = item.replace(/<li[^>]*>|<\/li>/g, '').trim();
          return cleanHTML(cleaned);
        }).filter(item => item.length > 10); // Filter out empty or very short items
      }

      // Add image if found
      if (newsImage) {
        result.newsImage = newsImage;
      }
    }

    // Extract Did You Know
    const dykMatch = html.match(/<div[^>]*id="mp-dyk"[^>]*>([\s\S]*?)(?=<div[^>]*id="|$)/i);
    if (dykMatch) {
      const dykContent = dykMatch[1];
      const listMatches = dykContent.match(/<li[^>]*>([\s\S]*?)<\/li>/g);
      if (listMatches) {
        result.didYouKnow = listMatches.slice(0, 6).map(item => {
          const cleaned = item.replace(/<li[^>]*>|<\/li>/g, '').trim();
          return cleanHTML(cleaned);
        }).filter(item => item.length > 10);
      }
    }

    // Extract On This Day
    const otdMatch = html.match(/<div[^>]*id="mp-otd"[^>]*class="[^"]*">([\s\S]*?)<div class="hlist otd-footer"/i);
    if (otdMatch) {
      const otdContent = otdMatch[1];
      // Find all list items within <ul> tags
      const ulMatch = otdContent.match(/<ul>([\s\S]*?)<\/ul>/);
      if (ulMatch) {
        const listMatches = ulMatch[1].match(/<li>([\s\S]*?)<\/li>/g);
        if (listMatches) {
          result.onThisDay = listMatches.slice(0, 5).map(item => {
            const cleaned = item.replace(/<li>|<\/li>/g, '').trim();
            return cleanHTML(cleaned);
          }).filter(item => item.length > 30); // Filter very short items
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

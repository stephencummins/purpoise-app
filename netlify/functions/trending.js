const axios = require('axios');

// Check if content is Trump-related
function isTrumpRelated(text) {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  const trumpKeywords = [
    'trump', 'donald trump', 'potus', 'president trump',
    'mar-a-lago', 'maga', 'make america great'
  ];
  return trumpKeywords.some(keyword => lowerText.includes(keyword));
}

// Check if content is sports-related
function isSportsRelated(text) {
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
}

// Fetch Google Trends (using trending searches RSS)
async function getGoogleTrends() {
  try {
    const response = await axios.get('https://trends.google.com/trends/trendingsearches/daily/rss?geo=US', {
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    const items = [];
    const itemMatches = response.data.match(/<item>([\s\S]*?)<\/item>/g);

    if (itemMatches) {
      itemMatches.slice(0, 10).forEach(item => {
        const titleMatch = item.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/);
        const linkMatch = item.match(/<ht:news_item_url>(.*?)<\/ht:news_item_url>/);
        const trafficMatch = item.match(/<ht:approx_traffic>([^<]+)<\/ht:approx_traffic>/);

        if (titleMatch) {
          const title = titleMatch[1].trim();
          items.push({
            title,
            link: linkMatch ? linkMatch[1] : `https://trends.google.com/trends/trendingsearches/daily`,
            source: 'Google Trends',
            traffic: trafficMatch ? trafficMatch[1] : '',
            isTrump: isTrumpRelated(title),
            isSports: isSportsRelated(title)
          });
        }
      });
    }

    return items;
  } catch (error) {
    console.error('Google Trends error:', error.message);
    return [];
  }
}

// Fetch Reddit hot posts
async function getRedditHot() {
  try {
    const response = await axios.get('https://www.reddit.com/r/popular/hot.json?limit=15', {
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    const items = response.data.data.children.map(post => ({
      title: post.data.title,
      link: `https://reddit.com${post.data.permalink}`,
      source: 'Reddit',
      subreddit: post.data.subreddit,
      score: post.data.score,
      isTrump: isTrumpRelated(post.data.title),
      isSports: isSportsRelated(post.data.title)
    }));

    return items;
  } catch (error) {
    console.error('Reddit error:', error.message);
    return [];
  }
}

// Fetch YouTube trending
async function getYouTubeTrending() {
  try {
    // Note: This scrapes YouTube trending page - may be fragile
    const response = await axios.get('https://www.youtube.com/feed/trending', {
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    const items = [];
    // Extract video data from page (simplified - YouTube uses dynamic loading)
    const scriptMatches = response.data.match(/var ytInitialData = ({.*?});/);

    if (scriptMatches) {
      try {
        const data = JSON.parse(scriptMatches[1]);
        const tabs = data?.contents?.twoColumnBrowseResultsRenderer?.tabs || [];

        for (const tab of tabs) {
          const contents = tab?.tabRenderer?.content?.richGridRenderer?.contents || [];

          for (const item of contents.slice(0, 10)) {
            const video = item?.richItemRenderer?.content?.videoRenderer;
            if (video) {
              const title = video.title?.runs?.[0]?.text || '';
              const videoId = video.videoId;

              if (title && videoId) {
                items.push({
                  title,
                  link: `https://www.youtube.com/watch?v=${videoId}`,
                  source: 'YouTube',
                  isTrump: isTrumpRelated(title),
                  isSports: isSportsRelated(title)
                });
              }
            }
          }

          if (items.length > 0) break;
        }
      } catch (parseError) {
        console.error('YouTube parse error:', parseError.message);
      }
    }

    return items;
  } catch (error) {
    console.error('YouTube error:', error.message);
    return [];
  }
}

exports.handler = async (event, context) => {
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
    // Fetch all trending sources in parallel
    const [googleTrends, redditHot, youtubeTrending] = await Promise.all([
      getGoogleTrends(),
      getRedditHot(),
      getYouTubeTrending()
    ]);

    // Combine all trending items
    const allTrending = [
      ...googleTrends,
      ...redditHot,
      ...youtubeTrending
    ];

    // Separate Trump content from regular trending
    const regularTrending = allTrending.filter(item => !item.isTrump);
    const trumpDump = allTrending.filter(item => item.isTrump);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        trending: regularTrending,
        trumpDump: trumpDump,
        lastUpdated: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Trending error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

const axios = require('axios');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Latest editions from oceanofpdf.com/magazines-newspapers/
    // Note: These are the most recent available editions (may be a few days behind)
    const newspaperUrls = [
      {
        name: 'The Guardian',
        pdfLink: 'https://oceanofpdf.com/authors/the-guardian/pdf-the-guardian-26-december-2025-download/',
        date: '26 December 2025'
      },
      {
        name: 'The Washington Post',
        pdfLink: 'https://oceanofpdf.com/authors/the-washington-post/pdf-the-washington-post-december-25-2025-download/',
        date: '25 December 2025'
      },
      {
        name: 'The New York Times',
        pdfLink: 'https://oceanofpdf.com/authors/the-new-york-times/pdf-the-new-york-times-december-25-2025-download/',
        date: '25 December 2025'
      },
      {
        name: 'The New Yorker',
        pdfLink: 'https://oceanofpdf.com/authors/the-new-yorker/pdf-the-new-yorker-december-29-january-05-2026-download/',
        date: '29 December 2025 - 5 January 2026'
      }
    ];

    // Fetch cover images by scraping each page
    const results = await Promise.all(newspaperUrls.map(async (paper) => {
      try {
        const response = await axios.get(paper.pdfLink, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        const html = response.data;
        let coverImage = null;

        // Try to find the cover image - look for Open Graph image first
        const ogImageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
        if (ogImageMatch) {
          coverImage = ogImageMatch[1];
        }

        // Alternative: look for the main content image
        if (!coverImage) {
          const imgMatch = html.match(/<img[^>]+class="[^"]*attachment-[^"]*"[^>]+src="([^"]+)"/i);
          if (imgMatch) {
            coverImage = imgMatch[1];
          }
        }

        // Alternative: look for any large image in the content
        if (!coverImage) {
          const contentImgMatch = html.match(/<img[^>]+src="([^"]+)"[^>]*>/i);
          if (contentImgMatch) {
            coverImage = contentImgMatch[1];
          }
        }

        return {
          name: paper.name,
          pdfLink: paper.pdfLink,
          coverImage,
          date: paper.date,
          available: true
        };
      } catch (error) {
        console.error(`Error fetching ${paper.name} cover:`, error.message);
        return {
          name: paper.name,
          pdfLink: paper.pdfLink,
          coverImage: null,
          date: paper.date,
          available: true
        };
      }
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        newspapers: results,
        lastUpdated: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Error in newspapers function:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch newspapers',
        details: error.message
      })
    };
  }
};

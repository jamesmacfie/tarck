// Cloudflare Pages Function to scrape NZ Post tracking page
// This handles CORS issues and extracts tracking data from HTML

interface Env {
  // Add any environment variables here if needed
}

interface TrackingData {
  trackingId: string;
  status?: string;
  details?: string;
  events?: Array<{
    date?: string;
    time?: string;
    location?: string;
    description?: string;
  }>;
  lastUpdated: string;
}

function parseTrackingHTML(html: string, trackId: string): TrackingData {
  const data: TrackingData = {
    trackingId: trackId,
    lastUpdated: new Date().toISOString(),
    events: []
  };

  try {
    // Look for tracking status in various possible formats
    // NZ Post typically shows status in specific divs or spans

    // Try to find status heading or main status text
    const statusMatch = html.match(/<h[1-3][^>]*class="[^"]*status[^"]*"[^>]*>([^<]+)<\/h[1-3]>/i) ||
                       html.match(/<div[^>]*class="[^"]*status[^"]*"[^>]*>([^<]+)<\/div>/i) ||
                       html.match(/<span[^>]*class="[^"]*status[^"]*"[^>]*>([^<]+)<\/span>/i);

    if (statusMatch) {
      data.status = statusMatch[1].trim();
    }

    // Try to find detailed description
    const detailsMatch = html.match(/<div[^>]*class="[^"]*details?[^"]*"[^>]*>([^<]+)<\/div>/i) ||
                        html.match(/<p[^>]*class="[^"]*description[^"]*"[^>]*>([^<]+)<\/p>/i);

    if (detailsMatch) {
      data.details = detailsMatch[1].trim();
    }

    // Try to extract event history/timeline
    // Look for table rows or list items that contain tracking events
    const eventPattern = /<tr[^>]*>[\s\S]*?<td[^>]*>([^<]+)<\/td>[\s\S]*?<td[^>]*>([^<]+)<\/td>[\s\S]*?<td[^>]*>([^<]+)<\/td>[\s\S]*?<\/tr>/gi;
    let eventMatch;

    while ((eventMatch = eventPattern.exec(html)) !== null) {
      data.events?.push({
        date: eventMatch[1].trim(),
        time: eventMatch[2].trim(),
        description: eventMatch[3].trim()
      });
    }

    // Alternative: Look for list items
    if (!data.events || data.events.length === 0) {
      const listItemPattern = /<li[^>]*class="[^"]*event[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;
      let listMatch;

      while ((listMatch = listItemPattern.exec(html)) !== null) {
        const itemHtml = listMatch[1];
        const dateMatch = itemHtml.match(/<span[^>]*class="[^"]*date[^"]*"[^>]*>([^<]+)<\/span>/i);
        const timeMatch = itemHtml.match(/<span[^>]*class="[^"]*time[^"]*"[^>]*>([^<]+)<\/span>/i);
        const descMatch = itemHtml.match(/<span[^>]*class="[^"]*desc[^"]*"[^>]*>([^<]+)<\/span>/i);

        data.events?.push({
          date: dateMatch ? dateMatch[1].trim() : undefined,
          time: timeMatch ? timeMatch[1].trim() : undefined,
          description: descMatch ? descMatch[1].trim() : itemHtml.replace(/<[^>]+>/g, '').trim()
        });
      }
    }

    // If we still don't have status, try to find any prominent text
    if (!data.status) {
      const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
      if (h1Match && !h1Match[1].includes('Track')) {
        data.status = h1Match[1].trim();
      }
    }

  } catch (error) {
    console.error('Error parsing HTML:', error);
  }

  return data;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request } = context;

  // Only allow GET requests
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Get query parameters
  const url = new URL(request.url);
  const trackId = url.searchParams.get('trackid');

  // Validate required parameters
  if (!trackId) {
    return new Response(
      JSON.stringify({ error: 'Missing required parameter: trackid' }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    );
  }

  try {
    // Fetch the NZ Post tracking page HTML
    const nzPostUrl = `https://www.nzpost.co.nz/tools/tracking?trackid=${encodeURIComponent(trackId)}`;

    const response = await fetch(nzPostUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) {
      throw new Error(`NZ Post website returned status ${response.status}`);
    }

    const html = await response.text();

    // Parse the HTML to extract tracking data
    const data = parseTrackingHTML(html, trackId);

    // Return the data with CORS headers
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
};

// Handle CORS preflight requests
export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
};

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
    // Extract estimated delivery date
    const eddMatch = html.match(/HistoryCard_estimatedDeliveryDate[^>]*>([^<]+)<\/span>/i);
    if (eddMatch) {
      data.status = `Estimated delivery: ${eddMatch[1].trim()}`;
    }

    // Extract main status (subtitle1 - most recent/important event)
    const mainStatusMatch = html.match(/<h6[^>]*class="[^"]*MuiTypography-subtitle1[^"]*">([^<]+)<\/h6>/i);
    if (mainStatusMatch) {
      const statusText = mainStatusMatch[1].trim();
      // If we already have EDD in status, append main status
      if (data.status) {
        data.details = statusText;
      } else {
        data.status = statusText;
      }
    }

    // Extract all events from the HistoryCard
    // Pattern 1: Main event (subtitle1) with full details
    const mainEventPattern = /<h6[^>]*MuiTypography-subtitle1[^>]*>([^<]+)<\/h6>[\s\S]*?<p[^>]*MuiTypography-body2[^>]*>([^<]+)<span[^>]*HistoryCard_arrowHead[\s\S]*?<p[^>]*MuiTypography-body2[^>]*>([^<]+)<\/p>/i;
    const mainEventMatch = html.match(mainEventPattern);

    if (mainEventMatch) {
      const dateTimeLocation = mainEventMatch[2].trim();
      data.events?.push({
        description: mainEventMatch[1].trim(),
        date: dateTimeLocation,
        time: '', // Combined in date field
        location: mainEventMatch[3].trim()
      });
    }

    // Pattern 2: Secondary events (subtitle2)
    const secondaryEventPattern = /<h6[^>]*MuiTypography-subtitle2[^>]*>([^<]+)<\/h6>[\s\S]*?<span[^>]*MuiTypography-caption[^>]*>([^<]+)<\/span>/gi;
    let secondaryMatch;

    while ((secondaryMatch = secondaryEventPattern.exec(html)) !== null) {
      data.events?.push({
        description: secondaryMatch[1].trim(),
        date: secondaryMatch[2].trim(),
        time: '',
        location: ''
      });
    }

    // If we couldn't extract status from EDD or main status, try to find the tracking number title
    if (!data.status) {
      const titleMatch = html.match(/<h6[^>]*HistoryCard_historyCardTitle[^>]*>([^<]+)<\/h6>/i);
      if (titleMatch) {
        data.status = 'Tracking active';
      } else {
        data.status = 'Tracking information found';
      }
    }

    // Extract "About this parcel" information
    const aboutParcelMatch = html.match(/About this parcel<\/h6>([\s\S]*?)<\/div>\s*<\/div>\s*<div[^>]*HistoryCard_historyCardBottomCta/i);
    if (aboutParcelMatch) {
      const aboutHtml = aboutParcelMatch[1];

      // Check for Courier
      if (aboutHtml.includes('Courier')) {
        data.details = (data.details ? data.details + ' | ' : '') + 'Courier delivery';
      }

      // Check for Signature required
      if (aboutHtml.includes('Signature required')) {
        data.details = (data.details ? data.details + ' | ' : '') + 'Signature required';
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

// Cloudflare Pages Function to proxy NZ Post tracking API
// This handles CORS issues when calling the API from the browser

interface Env {
  // Add any environment variables here if needed
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request } = context;

  // Only allow GET requests
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Get query parameters
  const url = new URL(request.url);
  const apiKey = url.searchParams.get('api_key');
  const trackId = url.searchParams.get('trackid');

  // Validate required parameters
  if (!apiKey || !trackId) {
    return new Response(
      JSON.stringify({ error: 'Missing required parameters: api_key and trackid' }),
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
    // Call NZ Post API
    const nzPostUrl = `http://api.nzpost.co.nz/tracking/track?api_key=${encodeURIComponent(apiKey)}&trackid=${encodeURIComponent(trackId)}&format=json`;

    const response = await fetch(nzPostUrl, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`NZ Post API returned status ${response.status}`);
    }

    const data = await response.json();

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

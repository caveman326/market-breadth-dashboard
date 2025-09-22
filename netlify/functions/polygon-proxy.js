// netlify/functions/polygon-proxy.js
exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      }
    };
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const { endpoint } = event.queryStringParameters || {};
  
  if (!endpoint) {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Missing endpoint parameter' })
    };
  }

  // Your Polygon.io API key from environment variables
  const apiKey = process.env.POLYGON_API_KEY;
  
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'API key not configured' })
    };
  }

  try {
    // Construct the full Polygon.io URL
    const polygonUrl = `https://api.polygon.io${endpoint}${endpoint.includes('?') ? '&' : '?'}apikey=${apiKey}`;
    
    console.log('Fetching:', polygonUrl.replace(apiKey, 'HIDDEN'));
    
    const response = await fetch(polygonUrl);
    
    if (!response.ok) {
      throw new Error(`Polygon API returned ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60' // Cache for 1 minute
      },
      body: JSON.stringify(data)
    };
    
  } catch (error) {
    console.error('Polygon proxy error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Failed to fetch data from Polygon.io',
        details: error.message 
      })
    };
  }
};

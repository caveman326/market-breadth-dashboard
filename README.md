# Market Breadth Analytics Dashboard

A real-time market breadth dashboard that displays S&P 500 market breadth metrics using live data from Polygon.io.

## Features

- **Real-time Market Data**: Live S&P 500, VIX, and stock data
- **Market Breadth Gauge**: Visual representation of market breadth percentage
- **Sector Analysis**: Breadth analysis across 11 market sectors
- **Historical Charts**: Price and breadth history with multiple timeframes
- **Responsive Design**: Works on desktop and mobile devices
- **Iframe Ready**: Optimized for embedding in newsletters and websites

## Deployment to Netlify

### Quick Deploy (Drag & Drop)

1. Go to [netlify.com](https://netlify.com) and sign up/login
2. Drag the entire `market-breadth-dashboard` folder to the deploy area
3. Your site will get a random URL like `magical-cupcake-123456.netlify.app`

### GitHub Integration (Recommended)

1. Create a new GitHub repository
2. Upload all files from this folder to the repository
3. In Netlify, click "New site from Git"
4. Connect your GitHub account and select the repository
5. Netlify will auto-deploy on every GitHub push

## Environment Configuration

**Important**: You must configure your Polygon.io API key as an environment variable:

1. In your Netlify dashboard, go to: **Site settings → Environment variables**
2. Add a new variable:
   - **Key**: `POLYGON_API_KEY`
   - **Value**: `SW0j1P2cj5KDrnmRj2YYqnuKhQKeml4e`
3. Save and redeploy your site

## Testing Your Deployment

After deployment, test these URLs:

- **Main Dashboard**: `https://your-site-name.netlify.app`
- **API Proxy Test**: `https://your-site-name.netlify.app/.netlify/functions/polygon-proxy?endpoint=/v2/aggs/ticker/SPY/range/1/day/2023-01-01/2024-01-01`

## Embedding in Beehiiv

To embed in your Beehiiv newsletter:

```html
<iframe 
  src="https://your-site-name.netlify.app" 
  width="100%" 
  height="800px" 
  frameborder="0">
</iframe>
```

## File Structure

```
market-breadth-dashboard/
├── index.html              # Main dashboard file
├── netlify/
│   └── functions/
│       └── polygon-proxy.js # API proxy function
├── netlify.toml            # Netlify configuration
└── README.md               # This file
```

## Technical Details

- **Frontend**: Vanilla HTML/CSS/JavaScript with Chart.js and LightweightCharts
- **Backend**: Netlify Functions (serverless)
- **API**: Polygon.io for real-time market data
- **Deployment**: Netlify with automatic HTTPS and CDN

## Troubleshooting

### If charts aren't loading:
1. Check browser Developer Tools (F12) for JavaScript errors
2. Verify API calls in Network tab
3. Ensure environment variable is set correctly

### If API proxy isn't working:
1. Check Netlify Function logs: Site settings → Functions → View logs
2. Verify `POLYGON_API_KEY` environment variable
3. Test the proxy endpoint directly

### If iframe is blocked:
1. Check browser console for X-Frame-Options errors
2. Verify Beehiiv domain is allowed in Content-Security-Policy

## Cost

- **Netlify**: Free tier includes 100GB bandwidth and 125,000 function calls/month
- **Polygon.io**: Uses your existing API plan
- **Total**: FREE (within limits)

## Support

For technical issues with the dashboard, check the browser console for error messages. For Polygon.io API issues, refer to their documentation at [polygon.io/docs](https://polygon.io/docs).

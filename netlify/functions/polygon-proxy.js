// netlify/functions/polygon-proxy.js
// Fixed version that handles insufficient data for 200-day SMA properly

// Global cache to store SMA data (persists across function calls)
let cachedSMAData = null;
let cacheTimestamp = null;
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

// Complete S&P 500 stock list
const SP500_SYMBOLS = [
  'MMM', 'AOS', 'ABT', 'ABBV', 'ACN', 'ADBE', 'AMD', 'AES', 'AFL', 'A', 
  'APD', 'ABNB', 'AKAM', 'ALB', 'ARE', 'ALGN', 'ALLE', 'LNT', 'ALL', 'GOOGL', 
  'GOOG', 'MO', 'AMZN', 'AMCR', 'AEE', 'AEP', 'AXP', 'AIG', 'AMT', 'AWK', 
  'AMP', 'AME', 'AMGN', 'APH', 'ADI', 'AON', 'APA', 'APO', 'AAPL', 'AMAT', 
  'APTV', 'ACGL', 'ADM', 'ANET', 'AJG', 'AIZ', 'T', 'ATO', 'ADSK', 'ADP', 
  'AZO', 'AVB', 'AVY', 'AXON', 'BKR', 'BALL', 'BAC', 'BAX', 'BDX', 'BRK.B', 
  'BBY', 'TECH', 'BIIB', 'BLK', 'BX', 'BA', 'BKNG', 'BSX', 'BMY', 'AVGO', 
  'BR', 'BRO', 'BF.B', 'BLDR', 'BG', 'BXP', 'CHRW', 'CDNS', 'CZR', 'CPT', 
  'CPB', 'COF', 'CAH', 'KMX', 'CCL', 'CARR', 'CAT', 'CBOE', 'CBRE', 'CDW', 
  'COR', 'CNC', 'CNP', 'CF', 'CRL', 'SCHW', 'CHTR', 'CVX', 'CMG', 'CB', 
  'CHD', 'CI', 'CINF', 'CTAS', 'CSCO', 'C', 'CFG', 'CLX', 'CME', 'CMS', 
  'KO', 'CTSH', 'COIN', 'CL', 'CMCSA', 'CAG', 'COP', 'ED', 'STZ', 'CEG', 
  'COO', 'CPRT', 'GLW', 'CPAY', 'CTVA', 'CSGP', 'COST', 'CTRA', 'CRWD', 'CCI', 
  'CSX', 'CMI', 'CVS', 'DHR', 'DRI', 'DDOG', 'DVA', 'DAY', 'DECK', 'DE', 
  'DELL', 'DAL', 'DVN', 'DXCM', 'FANG', 'DLR', 'DG', 'DLTR', 'D', 'DPZ', 
  'DASH', 'DOV', 'DOW', 'DHI', 'DTE', 'DUK', 'DD', 'EMN', 'ETN', 'EBAY', 
  'ECL', 'EIX', 'EW', 'EA', 'ELV', 'EMR', 'ENPH', 'ETR', 'EOG', 'EPAM', 
  'EQT', 'EFX', 'EQIX', 'EQR', 'ERIE', 'ESS', 'EL', 'EG', 'EVRG', 'ES', 
  'EXC', 'EXE', 'EXPE', 'EXPD', 'EXR', 'XOM', 'FFIV', 'FDS', 'FICO', 'FAST', 
  'FRT', 'FDX', 'FIS', 'FITB', 'FSLR', 'FE', 'FI', 'F', 'FTNT', 'FTV', 
  'FOXA', 'FOX', 'BEN', 'FCX', 'GRMN', 'IT', 'GE', 'GEHC', 'GEV', 'GEN', 
  'GNRC', 'GD', 'GIS', 'GM', 'GPC', 'GILD', 'GPN', 'GL', 'GDDY', 'GS', 
  'HAL', 'HIG', 'HAS', 'HCA', 'DOC', 'HSIC', 'HSY', 'HPE', 'HLT', 'HOLX', 
  'HD', 'HON', 'HRL', 'HST', 'HWM', 'HPQ', 'HUBB', 'HUM', 'HBAN', 'HII', 
  'IBM', 'IEX', 'IDXX', 'ITW', 'INCY', 'IR', 'PODD', 'INTC', 'IBKR', 'ICE', 
  'IFF', 'IP', 'IPG', 'INTU', 'ISRG', 'IVZ', 'INVH', 'IQV', 'IRM', 'JBHT', 
  'JBL', 'JKHY', 'J', 'JNJ', 'JCI', 'JPM', 'K', 'KVUE', 'KDP', 'KEY', 
  'KEYS', 'KMB', 'KIM', 'KMI', 'KKR', 'KLAC', 'KHC', 'KR', 'LHX', 'LH', 
  'LRCX', 'LW', 'LVS', 'LDOS', 'LEN', 'LII', 'LLY', 'LIN', 'LYV', 'LKQ', 
  'LMT', 'L', 'LOW', 'LULU', 'LYB', 'MTB', 'MPC', 'MKTX', 'MAR', 'MMC', 
  'MLM', 'MAS', 'MA', 'MTCH', 'MKC', 'MCD', 'MCK', 'MDT', 'MRK', 'META', 
  'MET', 'MTD', 'MGM', 'MCHP', 'MU', 'MSFT', 'MAA', 'MRNA', 'MHK', 'MOH', 
  'TAP', 'MDLZ', 'MPWR', 'MNST', 'MCO', 'MS', 'MOS', 'MSI', 'MSCI', 'NDAQ', 
  'NTAP', 'NFLX', 'NEM', 'NWSA', 'NWS', 'NEE', 'NKE', 'NI', 'NDSN', 'NSC', 
  'NTRS', 'NOC', 'NCLH', 'NRG', 'NUE', 'NVDA', 'NVR', 'NXPI', 'ORLY', 'OXY', 
  'ODFL', 'OMC', 'ON', 'OKE', 'ORCL', 'OTIS', 'PCAR', 'PKG', 'PLTR', 'PANW', 
  'PSKY', 'PH', 'PAYX', 'PAYC', 'PYPL', 'PNR', 'PEP', 'PFE', 'PCG', 'PM', 
  'PSX', 'PNW', 'PNC', 'POOL', 'PPG', 'PPL', 'PFG', 'PG', 'PGR', 'PLD', 
  'PRU', 'PEG', 'PTC', 'PSA', 'PHM', 'PWR', 'QCOM', 'DGX', 'RL', 'RJF', 
  'RTX', 'O', 'REG', 'REGN', 'RF', 'RSG', 'RMD', 'RVTY', 'ROK', 'ROL', 
  'ROP', 'ROST', 'RCL', 'SPGI', 'CRM', 'SBAC', 'SLB', 'STX', 'SRE', 'NOW', 
  'SHW', 'SPG', 'SWKS', 'SJM', 'SW', 'SNA', 'SOLV', 'SO', 'LUV', 'SWK', 
  'SBUX', 'STT', 'STLD', 'STE', 'SYK', 'SMCI', 'SYF', 'SNPS', 'SYY', 'TMUS', 
  'TROW', 'TTWO', 'TPR', 'TRGP', 'TGT', 'TEL', 'TDY', 'TER', 'TSLA', 'TXN', 
  'TPL', 'TXT', 'TMO', 'TJX', 'TKO', 'TTD', 'TSCO', 'TT', 'TDG', 'TRV', 
  'TRMB', 'TFC', 'TYL', 'TSN', 'USB', 'UBER', 'UDR', 'ULTA', 'UNP', 'UAL', 
  'UPS', 'URI', 'UNH', 'UHS', 'VLO', 'VTR', 'VLTO', 'VRSN', 'VRSK', 'VZ', 
  'VRTX', 'VTRS', 'VICI', 'V', 'VST', 'VMC', 'WRB', 'GWW', 'WAB', 'WMT', 
  'DIS', 'WBD', 'WM', 'WAT', 'WEC', 'WFC', 'WELL', 'WST', 'WDC', 'WY', 
  'WSM', 'WMB', 'WTW', 'WDAY', 'WYNN', 'XEL', 'XYL', 'YUM', 'ZBRA', 'ZBH', 'ZTS'
];

// Helper function to fetch comprehensive stock data for all breadth calculations
async function fetchStockData(symbol, apiKey) {
  try {
    // FIXED: Request 2 years of data to ensure we get 200+ trading days
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 2 years
    
    const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/day/${startDate}/${endDate}?adjusted=true&sort=desc&limit=500&apikey=${apiKey}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.results || data.results.length < 2) {
      return null; // Need at least 2 days for day-of calculation
    }
    
    const prices = data.results.map(day => day.c);
    const currentPrice = prices[0]; // Most recent price
    const previousClose = prices[1]; // Yesterday's close
    
    // Calculate SMAs with flexible requirements
    let sma10 = null, sma20 = null, sma200 = null;
    
    if (prices.length >= 10) {
      sma10 = prices.slice(0, 10).reduce((sum, price) => sum + price, 0) / 10;
    }
    
    if (prices.length >= 20) {
      sma20 = prices.slice(0, 20).reduce((sum, price) => sum + price, 0) / 20;
    }
    
    // FIXED: Use adaptive SMA calculation for 200-day
    // Use 200 days if available, otherwise use what we have (minimum 50 days)
    if (prices.length >= 50) {
      const smaLength = Math.min(200, prices.length);
      sma200 = prices.slice(0, smaLength).reduce((sum, price) => sum + price, 0) / smaLength;
    }
    
    return {
      symbol,
      currentPrice,
      previousClose,
      dayOf: currentPrice > previousClose, // Up for the day
      aboveSMA10: sma10 ? currentPrice > sma10 : null,
      aboveSMA20: sma20 ? currentPrice > sma20 : null,
      aboveSMA200: sma200 ? currentPrice > sma200 : null,
      dataPoints: prices.length,
      smaLength: sma200 ? Math.min(200, prices.length) : null // Track actual SMA length used
    };
    
  } catch (error) {
    console.error(`Error fetching ${symbol}:`, error);
    return null;
  }
}

// Main function to calculate all breadth data
async function calculateBreadthData(apiKey) {
  console.log(`Calculating comprehensive breadth for ${SP500_SYMBOLS.length} stocks...`);
  
  let dayOfUp = 0, dayOfTotal = 0;
  let sma10Above = 0, sma10Total = 0;
  let sma20Above = 0, sma20Total = 0;
  let sma200Above = 0, sma200Total = 0;
  let totalValid = 0;
  let processed = 0;
  let smaLengthSum = 0; // Track average SMA length used
  
  // Rate limiting: Stay under 100 requests per second
  const batchSize = 25;
  const batchDelay = 300; // 300ms delay = ~83 requests/second (safe buffer)
  const batches = [];
  
  for (let i = 0; i < SP500_SYMBOLS.length; i += batchSize) {
    batches.push(SP500_SYMBOLS.slice(i, i + batchSize));
  }
  
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    console.log(`Processing batch ${batchIndex + 1}/${batches.length} (Rate limited: ${batchDelay}ms delay)`);
    
    const promises = batch.map(symbol => fetchStockData(symbol, apiKey));
    const results = await Promise.allSettled(promises);
    
    results.forEach((result, index) => {
      processed++;
      if (result.status === 'fulfilled' && result.value !== null) {
        const stockData = result.value;
        totalValid++;
        
        // Day-of breadth (always available if we have 2+ days)
        dayOfTotal++;
        if (stockData.dayOf) dayOfUp++;
        
        // SMA breadth (only count if we have enough data)
        if (stockData.aboveSMA10 !== null) {
          sma10Total++;
          if (stockData.aboveSMA10) sma10Above++;
        }
        
        if (stockData.aboveSMA20 !== null) {
          sma20Total++;
          if (stockData.aboveSMA20) sma20Above++;
        }
        
        // FIXED: Count 200-day SMA even if using fewer than 200 days
        if (stockData.aboveSMA200 !== null) {
          sma200Total++;
          if (stockData.aboveSMA200) sma200Above++;
          if (stockData.smaLength) smaLengthSum += stockData.smaLength;
        }
        
      } else {
        console.warn(`Failed to get data for ${batch[index]}`);
      }
    });
    
    // Rate limiting delay between batches
    if (batchIndex < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, batchDelay));
    }
  }
  
  // Calculate percentages
  const dayOfPercentage = dayOfTotal > 0 ? Math.round((dayOfUp / dayOfTotal) * 100) : 0;
  const sma10Percentage = sma10Total > 0 ? Math.round((sma10Above / sma10Total) * 100) : 0;
  const sma20Percentage = sma20Total > 0 ? Math.round((sma20Above / sma20Total) * 100) : 0;
  const sma200Percentage = sma200Total > 0 ? Math.round((sma200Above / sma200Total) * 100) : 0;
  
  const avgSmaLength = sma200Total > 0 ? Math.round(smaLengthSum / sma200Total) : 0;
  
  console.log(`Results: Day-of: ${dayOfUp}/${dayOfTotal}, SMA10: ${sma10Above}/${sma10Total}, SMA20: ${sma20Above}/${sma20Total}, SMA200: ${sma200Above}/${sma200Total} (avg ${avgSmaLength}-day)`);
  
  return {
    dayOf: {
      up: dayOfUp,
      down: dayOfTotal - dayOfUp,
      percentage: dayOfPercentage
    },
    sma10: {
      above: sma10Above,
      below: sma10Total - sma10Above,
      percentage: sma10Percentage
    },
    sma20: {
      above: sma20Above,
      below: sma20Total - sma20Above,
      percentage: sma20Percentage
    },
    sma200: {
      above: sma200Above,
      below: sma200Total - sma200Above,
      percentage: sma200Percentage,
      avgDays: avgSmaLength // Show actual average SMA length used
    },
    total: totalValid,
    timestamp: new Date().toISOString(),
    processed,
    // Empty historical data for now (will add chart later)
    historical: []
  };
}

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
    // Check if we have valid cached data
    const now = Date.now();
    const isCacheValid = cachedSMAData && cacheTimestamp && (now - cacheTimestamp < CACHE_DURATION_MS);
    
    if (isCacheValid) {
      console.log('Returning cached breadth data');
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
        },
        body: JSON.stringify({
          ...cachedSMAData,
          cached: true,
          cacheAge: Math.round((now - cacheTimestamp) / 1000 / 60) // minutes
        })
      };
    }
    
    // No valid cache, calculate fresh data
    console.log('Cache expired or missing, calculating fresh breadth data...');
    const breadthData = await calculateBreadthData(apiKey);
    
    // Cache the results
    cachedSMAData = breadthData;
    cacheTimestamp = now;
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
      },
      body: JSON.stringify({
        ...breadthData,
        cached: false
      })
    };
    
  } catch (error) {
    console.error('Breadth calculation error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Failed to calculate comprehensive breadth data',
        details: error.message 
      })
    };
  }
};

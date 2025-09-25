// netlify/functions/polygon-proxy.js
// Enhanced version with market indices and fixed 200-day SMA

// Global cache to store data
let cachedBreadthData = null;
let cachedIndicesData = null;
let cacheTimestamp = null;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes for indices, 1 hour for breadth

// Complete S&P 500 stock list (keeping your original list)
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

// Helper function to fetch comprehensive stock data for breadth calculations
async function fetchStockData(symbol, apiKey) {
  try {
    // FIXED: Get 365 calendar days to ensure 200+ trading days
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/day/${startDate}/${endDate}?adjusted=true&sort=desc&limit=300&apikey=${apiKey}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.results || data.results.length < 2) {
      return null;
    }
    
    const prices = data.results.map(day => day.c);
    const currentPrice = prices[0];
    const previousClose = prices[1];
    
    // Calculate SMAs with available data
    let sma10 = null, sma20 = null, sma200 = null;
    
    if (prices.length >= 10) {
      sma10 = prices.slice(0, 10).reduce((sum, price) => sum + price, 0) / 10;
    }
    
    if (prices.length >= 20) {
      sma20 = prices.slice(0, 20).reduce((sum, price) => sum + price, 0) / 20;
    }
    
    // FIXED: More flexible 200-day calculation
    if (prices.length >= 200) {
      sma200 = prices.slice(0, 200).reduce((sum, price) => sum + price, 0) / 200;
    } else if (prices.length >= 100) {
      // Fallback: Use available data if we have at least 100 days
      sma200 = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    }
    
    return {
      symbol,
      currentPrice,
      previousClose,
      dayOf: currentPrice > previousClose,
      aboveSMA10: sma10 ? currentPrice > sma10 : null,
      aboveSMA20: sma20 ? currentPrice > sma20 : null,
      aboveSMA200: sma200 ? currentPrice > sma200 : null,
      dataPoints: prices.length
    };
    
  } catch (error) {
    console.error(`Error fetching ${symbol}:`, error);
    return null;
  }
}

// Function to fetch market indices data (SPY, QQQ, IWM)
async function fetchMarketIndices(apiKey) {
  const indices = ['SPY', 'QQQ', 'IWM']; // Major market indices
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const promises = indices.map(async (symbol) => {
    try {
      const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/day/${startDate}/${endDate}?adjusted=true&apikey=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (!data.results || data.results.length < 2) return null;
      
      const prices = data.results.map(d => d.c);
      const current = prices[prices.length - 1];
      const yesterday = prices[prices.length - 2];
      const weekAgo = prices[Math.max(0, prices.length - 6)];
      const monthAgo = prices[0];
      
      // Get high/low for the period
      const periodHigh = Math.max(...prices);
      const periodLow = Math.min(...prices);
      
      return {
        symbol,
        current: current.toFixed(2),
        dayChange: ((current / yesterday - 1) * 100).toFixed(2),
        weekChange: ((current / weekAgo - 1) * 100).toFixed(2),
        monthChange: ((current / monthAgo - 1) * 100).toFixed(2),
        periodHigh: periodHigh.toFixed(2),
        periodLow: periodLow.toFixed(2),
        sparkline: prices.slice(-10) // Last 10 days for mini chart
      };
    } catch (error) {
      console.error(`Error fetching ${symbol}:`, error);
      return null;
    }
  });
  
  const results = await Promise.all(promises);
  const validResults = results.filter(r => r !== null);
  
  // Calculate relative performance
  const spy = validResults.find(r => r.symbol === 'SPY');
  const qqq = validResults.find(r => r.symbol === 'QQQ');
  const iwm = validResults.find(r => r.symbol === 'IWM');
  
  // Market regime analysis
  const analysis = analyzeMarketRegime(spy, qqq, iwm);
  
  return {
    spy,
    qqq,
    iwm,
    analysis,
    timestamp: new Date().toISOString()
  };
}

// Analyze market regime based on indices
function analyzeMarketRegime(spy, qqq, iwm) {
  const signals = [];
  let regime = 'Neutral';
  
  if (qqq && spy) {
    const techRelative = parseFloat(qqq.weekChange) - parseFloat(spy.weekChange);
    if (techRelative > 2) {
      signals.push({
        type: 'bullish',
        message: 'Tech leading market (+' + techRelative.toFixed(1) + '%)'
      });
    } else if (techRelative < -2) {
      signals.push({
        type: 'bearish',
        message: 'Tech lagging market (' + techRelative.toFixed(1) + '%)'
      });
    }
  }
  
  if (iwm && spy) {
    const smallCapRelative = parseFloat(iwm.weekChange) - parseFloat(spy.weekChange);
    if (smallCapRelative > 1) {
      signals.push({
        type: 'bullish',
        message: 'Small caps outperforming (+' + smallCapRelative.toFixed(1) + '%)'
      });
    } else if (smallCapRelative < -3) {
      signals.push({
        type: 'bearish',
        message: 'Flight to quality (' + smallCapRelative.toFixed(1) + '%)'
      });
    }
  }
  
  // Determine overall regime
  const bullCount = signals.filter(s => s.type === 'bullish').length;
  const bearCount = signals.filter(s => s.type === 'bearish').length;
  
  if (bullCount > bearCount) regime = 'Buyers In Control';
  else if (bearCount > bullCount) regime = 'Defensive Tone';
  else regime = 'Choppy Action';
  
  return { regime, signals };
}

// Main function to calculate all breadth data
async function calculateBreadthData(apiKey) {
  console.log(`Calculating breadth for ${SP500_SYMBOLS.length} stocks...`);
  
  let dayOfUp = 0, dayOfTotal = 0;
  let sma10Above = 0, sma10Total = 0;
  let sma20Above = 0, sma20Total = 0;
  let sma200Above = 0, sma200Total = 0;
  let totalValid = 0;
  let processed = 0;
  
  // Rate limiting: batch processing
  const batchSize = 25;
  const batchDelay = 300;
  const batches = [];
  
  for (let i = 0; i < SP500_SYMBOLS.length; i += batchSize) {
    batches.push(SP500_SYMBOLS.slice(i, i + batchSize));
  }
  
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    console.log(`Processing batch ${batchIndex + 1}/${batches.length}`);
    
    const promises = batch.map(symbol => fetchStockData(symbol, apiKey));
    const results = await Promise.allSettled(promises);
    
    results.forEach((result, index) => {
      processed++;
      if (result.status === 'fulfilled' && result.value !== null) {
        const stockData = result.value;
        totalValid++;
        
        // Day-of breadth
        dayOfTotal++;
        if (stockData.dayOf) dayOfUp++;
        
        // SMA breadth
        if (stockData.aboveSMA10 !== null) {
          sma10Total++;
          if (stockData.aboveSMA10) sma10Above++;
        }
        
        if (stockData.aboveSMA20 !== null) {
          sma20Total++;
          if (stockData.aboveSMA20) sma20Above++;
        }
        
        if (stockData.aboveSMA200 !== null) {
          sma200Total++;
          if (stockData.aboveSMA200) sma200Above++;
        }
        
      } else {
        console.warn(`Failed to get data for ${batch[index]}`);
      }
    });
    
    // Rate limiting delay
    if (batchIndex < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, batchDelay));
    }
  }
  
  // Calculate percentages
  const dayOfPercentage = dayOfTotal > 0 ? Math.round((dayOfUp / dayOfTotal) * 100) : 0;
  const sma10Percentage = sma10Total > 0 ? Math.round((sma10Above / sma10Total) * 100) : 0;
  const sma20Percentage = sma20Total > 0 ? Math.round((sma20Above / sma20Total) * 100) : 0;
  const sma200Percentage = sma200Total > 0 ? Math.round((sma200Above / sma200Total) * 100) : 0;
  
  console.log(`Results: Day-of: ${dayOfUp}/${dayOfTotal}, SMA200: ${sma200Above}/${sma200Total}`);
  
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
      percentage: sma200Percentage
    },
    total: totalValid,
    timestamp: new Date().toISOString(),
    processed
  };
}

// Main handler
exports.handler = async (event, context) => {
  // Handle CORS
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

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const apiKey = process.env.POLYGON_API_KEY;
  
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'API key not configured' })
    };
  }

  // Check what type of data is requested
  const queryParams = event.queryStringParameters || {};
  const dataType = queryParams.type || 'all'; // 'indices', 'breadth', or 'all'

  try {
    let responseData = {};
    
    // Fetch market indices (always fresh, 5-min cache)
    if (dataType === 'indices' || dataType === 'all') {
      const now = Date.now();
      const indicesCacheValid = cachedIndicesData && cacheTimestamp && 
                               (now - cacheTimestamp < CACHE_DURATION_MS);
      
      if (indicesCacheValid && dataType === 'indices') {
        responseData.indices = cachedIndicesData;
        responseData.cached = true;
      } else {
        console.log('Fetching fresh indices data...');
        const indicesData = await fetchMarketIndices(apiKey);
        cachedIndicesData = indicesData;
        cacheTimestamp = now;
        responseData.indices = indicesData;
        responseData.cached = false;
      }
    }
    
    // Fetch breadth data (1-hour cache)
    if (dataType === 'breadth' || dataType === 'all') {
      const now = Date.now();
      const breadthCacheValid = cachedBreadthData && cacheTimestamp && 
                                (now - cacheTimestamp < CACHE_DURATION_MS * 12); // 1 hour
      
      if (breadthCacheValid) {
        responseData.breadth = cachedBreadthData;
        responseData.breadthCached = true;
      } else {
        console.log('Calculating fresh breadth data...');
        const breadthData = await calculateBreadthData(apiKey);
        cachedBreadthData = breadthData;
        responseData.breadth = breadthData;
        responseData.breadthCached = false;
      }
    }
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300' // 5 minutes
      },
      body: JSON.stringify(responseData)
    };
    
  } catch (error) {
    console.error('API error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Failed to fetch market data',
        details: error.message 
      })
    };
  }
};

// netlify/functions/polygon-proxy.js
// Smart function that auto-collects historical data on first run

// Global cache to store SMA data (persists across function calls)
let cachedSMAData = null;
let cacheTimestamp = null;
let historicalData = [];
let historicalDataLoaded = false;
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

// Generate array of last 30 trading days (for initial historical data)
function getLast30TradingDays() {
  const days = [];
  const today = new Date();
  let currentDate = new Date(today);
  
  while (days.length < 30) {
    // Skip weekends
    if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
      days.push(currentDate.toISOString().split('T')[0]);
    }
    currentDate.setDate(currentDate.getDate() - 1);
  }
  
  return days.reverse(); // Oldest to newest
}

// Helper function to fetch comprehensive stock data for all breadth calculations
async function fetchStockData(symbol, apiKey) {
  try {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 250 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 250 days for 200-day SMA
    
    const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/day/${startDate}/${endDate}?adjusted=true&sort=desc&limit=250&apikey=${apiKey}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.results || data.results.length < 201) {
      return null; // Not enough data for 200-day SMA
    }
    
    const prices = data.results.map(day => day.c);
    const currentPrice = prices[0]; // Most recent price
    const previousClose = prices[1]; // Yesterday's close
    
    // Calculate all SMAs
    const sma10 = prices.slice(0, 10).reduce((sum, price) => sum + price, 0) / 10;
    const sma20 = prices.slice(0, 20).reduce((sum, price) => sum + price, 0) / 20;
    const sma200 = prices.slice(0, 200).reduce((sum, price) => sum + price, 0) / 200;
    
    return {
      symbol,
      currentPrice,
      previousClose,
      dayOf: currentPrice > previousClose, // Up for the day
      aboveSMA10: currentPrice > sma10,
      aboveSMA20: currentPrice > sma20,
      aboveSMA200: currentPrice > sma200
    };
    
  } catch (error) {
    console.error(`Error fetching ${symbol}:`, error);
    return null;
  }
}

// Calculate breadth for a specific date (for historical data)
async function calculateBreadthForDate(date, apiKey) {
  console.log(`Calculating breadth for ${date}...`);
  
  let dayOfUp = 0, sma10Above = 0, sma20Above = 0, sma200Above = 0;
  let totalValid = 0;
  
  // Get data for all stocks on this date (smaller batches for historical)
  const batchSize = 10;
  const batches = [];
  
  for (let i = 0; i < SP500_SYMBOLS.length; i += batchSize) {
    batches.push(SP500_SYMBOLS.slice(i, i + batchSize));
  }
  
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    
    const promises = batch.map(async (symbol) => {
      try {
        // Get 250 days of data ending on this date to calculate SMAs
        const startDate = new Date(date);
        startDate.setDate(startDate.getDate() - 250);
        const startDateStr = startDate.toISOString().split('T')[0];
        
        const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/day/${startDateStr}/${date}?adjusted=true&sort=desc&limit=250&apikey=${apiKey}`;
        
        const response = await fetch(url);
        if (!response.ok) return null;
        
        const data = await response.json();
        if (!data.results || data.results.length < 201) return null;
        
        const prices = data.results.map(day => day.c);
        const currentPrice = prices[0];
        const previousClose = prices[1];
        
        // Calculate SMAs
        const sma10 = prices.slice(0, 10).reduce((sum, price) => sum + price, 0) / 10;
        const sma20 = prices.slice(0, 20).reduce((sum, price) => sum + price, 0) / 20;
        const sma200 = prices.slice(0, 200).reduce((sum, price) => sum + price, 0) / 200;
        
        return {
          dayOf: currentPrice > previousClose,
          aboveSMA10: currentPrice > sma10,
          aboveSMA20: currentPrice > sma20,
          aboveSMA200: currentPrice > sma200
        };
        
      } catch (error) {
        return null;
      }
    });
    
    const results = await Promise.allSettled(promises);
    
    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value !== null) {
        const stockData = result.value;
        totalValid++;
        
        if (stockData.dayOf) dayOfUp++;
        if (stockData.aboveSMA10) sma10Above++;
        if (stockData.aboveSMA20) sma20Above++;
        if (stockData.aboveSMA200) sma200Above++;
      }
    });
    
    // Rate limiting for historical data collection
    if (batchIndex < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return {
    date,
    dayOf: totalValid > 0 ? Math.round((dayOfUp / totalValid) * 100) : 0,
    sma10: totalValid > 0 ? Math.round((sma10Above / totalValid) * 100) : 0,
    sma20: totalValid > 0 ? Math.round((sma20Above / totalValid) * 100) : 0,
    sma200: totalValid > 0 ? Math.round((sma200Above / totalValid) * 100) : 0,
    totalStocks: totalValid
  };
}

// Initialize historical data (runs once on first deployment)
async function initializeHistoricalData(apiKey) {
  if (historicalDataLoaded && historicalData.length > 0) {
    return historicalData;
  }
  
  console.log('Initializing historical breadth data (first time setup)...');
  console.log('This will take a few minutes but only happens once.');
  
  const tradingDays = getLast30TradingDays(); // Start with 30 days for faster initial setup
  const newHistoricalData = [];
  
  for (let i = 0; i < tradingDays.length; i++) {
    const date = tradingDays[i];
    console.log(`Historical progress: ${i + 1}/${tradingDays.length} (${Math.round((i + 1) / tradingDays.length * 100)}%)`);
    
    try {
      const breadthData = await calculateBreadthForDate(date, apiKey);
      newHistoricalData.push(breadthData);
    } catch (error) {
      console.error(`Failed to get historical data for ${date}:`, error);
    }
  }
  
  historicalData = newHistoricalData;
  historicalDataLoaded = true;
  
  console.log(`Historical data initialized with ${historicalData.length} days`);
  return historicalData;
}

// Main function to calculate all breadth data
async function calculateBreadthData(apiKey) {
  console.log(`Calculating comprehensive breadth for ${SP500_SYMBOLS.length} stocks...`);
  
  let dayOfUp = 0, sma10Above = 0, sma20Above = 0, sma200Above = 0;
  let totalValid = 0;
  let processed = 0;
  
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
        
        if (stockData.dayOf) dayOfUp++;
        if (stockData.aboveSMA10) sma10Above++;
        if (stockData.aboveSMA20) sma20Above++;
        if (stockData.aboveSMA200) sma200Above++;
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
  const dayOfPercentage = totalValid > 0 ? Math.round((dayOfUp / totalValid) * 100) : 0;
  const sma10Percentage = totalValid > 0 ? Math.round((sma10Above / totalValid) * 100) : 0;
  const sma20Percentage = totalValid > 0 ? Math.round((sma20Above / totalValid) * 100) : 0;
  const sma200Percentage = totalValid > 0 ? Math.round((sma200Above / totalValid) * 100) : 0;
  
  const breadthData = {
    dayOf: {
      up: dayOfUp,
      down: totalValid - dayOfUp,
      percentage: dayOfPercentage
    },
    sma10: {
      above: sma10Above,
      below: totalValid - sma10Above,
      percentage: sma10Percentage
    },
    sma20: {
      above: sma20Above,
      below: totalValid - sma20Above,
      percentage: sma20Percentage
    },
    sma200: {
      above: sma200Above,
      below: totalValid - sma200Above,
      percentage: sma200Percentage
    },
    total: totalValid,
    timestamp: new Date().toISOString(),
    processed
  };
  
  // Update historical data with today's breadth
  const today = new Date().toISOString().split('T')[0];
  const existingIndex = historicalData.findIndex(entry => entry.date === today);
  
  const todayData = {
    date: today,
    dayOf: dayOfPercentage,
    sma10: sma10Percentage,
    sma20: sma20Percentage,
    sma200: sma200Percentage,
    totalStocks: totalValid
  };
  
  if (existingIndex >= 0) {
    historicalData[existingIndex] = todayData;
  } else {
    historicalData.push(todayData);
  }
  
  // Keep only last 200 days
  historicalData = historicalData.slice(-200);
  
  return breadthData;
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
    // Initialize historical data if needed (first time only)
    if (!historicalDataLoaded) {
      await initializeHistoricalData(apiKey);
    }
    
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
          historical: historicalData,
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
        historical: historicalData,
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

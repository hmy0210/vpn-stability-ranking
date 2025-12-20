/**
 * ============================================
 * VPN Price Scraper
 * Automated VPN pricing data collection
 * ============================================
 * 
 * Features:
 * - Daily price scraping for 15 VPNs
 * - ScraperAPI integration for reliable data
 * - Fallback to direct scraping
 * - Historical price tracking
 * 
 * Setup:
 * 1. Get ScraperAPI key from https://www.scraperapi.com/
 * 2. Add key to config.gs
 * 3. Set up daily trigger
 * 
 * Repository: https://github.com/yourusername/vpn-stability-ranking
 */

// ==================== Configuration ====================
// Configuration loaded from config.gs
const PRICE_CONFIG = {
  SPREADSHEET_ID: typeof CONFIG !== 'undefined' ? CONFIG.SPREADSHEET_ID : '',
  SHEET_NAME: typeof CONFIG !== 'undefined' ? CONFIG.SHEETS.PRICE_HISTORY : 'VPN料金履歴',
  SCRAPER_API_KEY: typeof SCRAPER_CONFIG !== 'undefined' ? SCRAPER_CONFIG.API_KEY : '',
  USE_SCRAPER_API: true
};

// VPN pricing URLs and selectors
const VPN_PRICING = [
  {
    name: 'NordVPN',
    url: 'https://nordvpn.com/pricing/',
    method: 'scraperapi',
    currency: 'USD'
  },
  {
    name: 'ExpressVPN',
    url: 'https://www.expressvpn.com/order',
    method: 'scraperapi',
    currency: 'USD'
  },
  {
    name: 'Surfshark',
    url: 'https://surfshark.com/pricing',
    method: 'scraperapi',
    currency: 'USD'
  },
  {
    name: 'MillenVPN',
    url: 'https://millenvpn.jp/',
    method: 'fallback',
    currency: 'JPY',
    fallbackPrice: 360
  },
  {
    name: 'ProtonVPN',
    url: 'https://protonvpn.com/pricing',
    method: 'scraperapi',
    currency: 'USD'
  }
  // Add more VPNs as needed
];

// ==================== Main: Scrape All Prices ====================
function scrapeAllVPNPrices() {
  Logger.log('==========================================');
  Logger.log('VPN Price Scraping Started');
  Logger.log(`Timestamp: ${new Date().toLocaleString('ja-JP')}`);
  Logger.log('==========================================');
  Logger.log('');
  
  const ss = SpreadsheetApp.openById(PRICE_CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(PRICE_CONFIG.SHEET_NAME);
  
  if (!sheet) {
    Logger.log(`❌ Sheet not found: ${PRICE_CONFIG.SHEET_NAME}`);
    return;
  }
  
  const results = [];
  
  VPN_PRICING.forEach((vpn, index) => {
    Logger.log(`[${index + 1}/${VPN_PRICING.length}] Scraping: ${vpn.name}`);
    
    try {
      const priceData = scrapeVPNPrice(vpn);
      
      if (priceData) {
        results.push(priceData);
        Logger.log(`  ✅ Price: ${priceData.currency} ${priceData.price} (${priceData.method})`);
      } else {
        Logger.log(`  ❌ Scraping failed`);
      }
      
      // Wait 2 seconds between requests
      Utilities.sleep(2000);
      
    } catch (error) {
      Logger.log(`  ❌ Error: ${error.message}`);
    }
  });
  
  // Save results
  if (results.length > 0) {
    savePricesToSheet(sheet, results);
    
    Logger.log('');
    Logger.log('==========================================');
    Logger.log(`✅ Completed: ${results.length}/${VPN_PRICING.length} prices scraped`);
    Logger.log('==========================================');
  }
}

// ==================== Scrape Single VPN Price ====================
function scrapeVPNPrice(vpn) {
  let price = null;
  let method = vpn.method;
  let isFallback = false;
  
  // Try ScraperAPI first
  if (PRICE_CONFIG.USE_SCRAPER_API && PRICE_CONFIG.SCRAPER_API_KEY) {
    try {
      price = scrapeWithScraperAPI(vpn.url, vpn.name);
      method = 'scraperapi';
    } catch (error) {
      Logger.log(`  ⚠️ ScraperAPI failed: ${error.message}`);
    }
  }
  
  // Try direct scraping if ScraperAPI failed
  if (!price) {
    try {
      price = scrapeDirectly(vpn.url, vpn.name);
      method = 'direct';
    } catch (error) {
      Logger.log(`  ⚠️ Direct scraping failed: ${error.message}`);
    }
  }
  
  // Use fallback price if provided
  if (!price && vpn.fallbackPrice) {
    price = vpn.fallbackPrice;
    method = 'fallback';
    isFallback = true;
    Logger.log(`  ℹ️ Using fallback price`);
  }
  
  if (price) {
    return {
      timestamp: new Date(),
      vpnName: vpn.name,
      price: price,
      currency: vpn.currency,
      method: method,
      isFallback: isFallback
    };
  }
  
  return null;
}

// ==================== Scrape with ScraperAPI ====================
function scrapeWithScraperAPI(url, vpnName) {
  if (!PRICE_CONFIG.SCRAPER_API_KEY) {
    throw new Error('ScraperAPI key not configured');
  }
  
  const scraperUrl = `http://api.scraperapi.com?api_key=${PRICE_CONFIG.SCRAPER_API_KEY}&url=${encodeURIComponent(url)}`;
  
  const response = UrlFetchApp.fetch(scraperUrl, {
    muteHttpExceptions: true
  });
  
  if (response.getResponseCode() !== 200) {
    throw new Error(`HTTP ${response.getResponseCode()}`);
  }
  
  const html = response.getContentText();
  
  // Parse price from HTML (VPN-specific logic)
  return parsePriceFromHTML(html, vpnName);
}

// ==================== Direct Scraping ====================
function scrapeDirectly(url, vpnName) {
  const response = UrlFetchApp.fetch(url, {
    muteHttpExceptions: true,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });
  
  if (response.getResponseCode() !== 200) {
    throw new Error(`HTTP ${response.getResponseCode()}`);
  }
  
  const html = response.getContentText();
  
  return parsePriceFromHTML(html, vpnName);
}

// ==================== Parse Price from HTML ====================
function parsePriceFromHTML(html, vpnName) {
  // VPN-specific price extraction logic
  
  // ExpressVPN - JSON data extraction
  if (vpnName === 'ExpressVPN') {
    const match = html.match(/"monthly_price":"(\d+\.\d+)"/);
    if (match) {
      return parseFloat(match[1]);
    }
  }
  
  // Generic price pattern matching
  // Matches: $12.95, $9.99, etc.
  const pricePatterns = [
    /\$(\d+\.?\d*)/,
    /(\d+\.?\d*)\s*(?:USD|ドル)/i,
    /¥(\d+)/,
    /(\d+)\s*円/
  ];
  
  for (const pattern of pricePatterns) {
    const match = html.match(pattern);
    if (match) {
      return parseFloat(match[1]);
    }
  }
  
  return null;
}

// ==================== Save to Sheet ====================
function savePricesToSheet(sheet, results) {
  results.forEach(result => {
    sheet.appendRow([
      result.timestamp,
      result.vpnName,
      result.price,
      result.currency,
      result.method,
      result.isFallback ? 'はい' : 'いいえ'
    ]);
  });
  
  Logger.log(`📊 Saved ${results.length} prices to sheet`);
}

// ==================== Setup Function ====================
function setupPriceSheet() {
  Logger.log('Setting up Price History sheet...');
  
  const ss = SpreadsheetApp.openById(PRICE_CONFIG.SPREADSHEET_ID);
  
  let sheet = ss.getSheetByName(PRICE_CONFIG.SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(PRICE_CONFIG.SHEET_NAME);
  }
  
  const headers = [
    'タイムスタンプ',
    'VPN名',
    '価格',
    '通貨',
    '取得方法',
    'フォールバック'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#4285f4')
    .setFontColor('#ffffff');
  
  Logger.log('✅ Sheet setup complete');
}

// ==================== Test Function ====================
function testPriceScraping() {
  Logger.log('Testing price scraping...');
  
  const testVPN = VPN_PRICING[0];
  
  Logger.log(`Testing: ${testVPN.name}`);
  
  const result = scrapeVPNPrice(testVPN);
  
  Logger.log('Result:');
  Logger.log(JSON.stringify(result, null, 2));
  
  Logger.log('✅ Test complete');
}

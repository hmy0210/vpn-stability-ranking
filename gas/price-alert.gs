/**
 * ============================================
 * VPN Price Alert System
 * Automated price change detection and alerts
 * ============================================
 * 
 * Features:
 * - Detects 5%+ price changes
 * - Auto-posts to Twitter (optional)
 * - Historical price comparison
 * 
 * Setup:
 * 1. Configure Twitter API in config.gs (optional)
 * 2. Set up daily trigger after price scraping
 * 
 * Repository: https://github.com/yourusername/vpn-stability-ranking
 */

// ==================== Configuration ====================
const ALERT_CONFIG = {
  SPREADSHEET_ID: typeof CONFIG !== 'undefined' ? CONFIG.SPREADSHEET_ID : '',
  SHEET_NAME: typeof CONFIG !== 'undefined' ? CONFIG.SHEETS.PRICE_HISTORY : 'VPN料金履歴',
  PRICE_THRESHOLD: 5, // Alert if price changes by 5% or more
  USE_TWITTER: typeof TWITTER_CONFIG !== 'undefined' && TWITTER_CONFIG.CONSUMER_KEY !== 'YOUR_CONSUMER_KEY'
};

// ==================== Main: Check Price Changes ====================
function checkPriceChanges() {
  Logger.log('==========================================');
  Logger.log('Price Change Detection Started');
  Logger.log(`Timestamp: ${new Date().toLocaleString('ja-JP')}`);
  Logger.log('==========================================');
  Logger.log('');
  
  const ss = SpreadsheetApp.openById(ALERT_CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(ALERT_CONFIG.SHEET_NAME);
  
  if (!sheet || sheet.getLastRow() <= 1) {
    Logger.log('❌ No price data available');
    return;
  }
  
  const priceChanges = detectPriceChanges(sheet);
  
  if (priceChanges.length > 0) {
    Logger.log(`🔔 Detected ${priceChanges.length} significant price changes`);
    
    priceChanges.forEach(change => {
      Logger.log('');
      Logger.log(`VPN: ${change.vpnName}`);
      Logger.log(`  Old: ${change.currency} ${change.oldPrice}`);
      Logger.log(`  New: ${change.currency} ${change.newPrice}`);
      Logger.log(`  Change: ${change.percentChange > 0 ? '+' : ''}${change.percentChange.toFixed(1)}%`);
      
      // Post to Twitter if enabled
      if (ALERT_CONFIG.USE_TWITTER) {
        postPriceAlertToTwitter(change);
      }
    });
    
    Logger.log('');
    Logger.log('==========================================');
    Logger.log('✅ Price change detection complete');
    Logger.log('==========================================');
  } else {
    Logger.log('ℹ️ No significant price changes detected');
  }
}

// ==================== Detect Price Changes ====================
function detectPriceChanges(sheet) {
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getValues();
  
  // Group by VPN
  const vpnPrices = {};
  
  data.forEach(row => {
    const vpnName = row[1];
    const timestamp = new Date(row[0]);
    const price = row[2];
    const currency = row[3];
    const isFallback = row[5] === 'はい';
    
    // Skip fallback prices
    if (isFallback) return;
    
    if (!vpnPrices[vpnName]) {
      vpnPrices[vpnName] = [];
    }
    
    vpnPrices[vpnName].push({
      timestamp: timestamp,
      price: price,
      currency: currency
    });
  });
  
  // Detect changes
  const changes = [];
  
  Object.keys(vpnPrices).forEach(vpnName => {
    const prices = vpnPrices[vpnName];
    
    if (prices.length < 2) return;
    
    // Sort by timestamp
    prices.sort((a, b) => b.timestamp - a.timestamp);
    
    const latest = prices[0];
    const previous = prices[1];
    
    // Check if currency matches
    if (latest.currency !== previous.currency) return;
    
    // Calculate change
    const change = ((latest.price - previous.price) / previous.price) * 100;
    
    // Check threshold
    if (Math.abs(change) >= ALERT_CONFIG.PRICE_THRESHOLD) {
      changes.push({
        vpnName: vpnName,
        oldPrice: previous.price,
        newPrice: latest.price,
        currency: latest.currency,
        percentChange: change,
        changeType: change > 0 ? '値上げ' : '値下げ'
      });
    }
  });
  
  return changes;
}

// ==================== Post to Twitter ====================
function postPriceAlertToTwitter(change) {
  if (!ALERT_CONFIG.USE_TWITTER) {
    Logger.log('  ℹ️ Twitter posting disabled');
    return;
  }
  
  const emoji = change.percentChange < 0 ? '⬇️' : '⬆️';
  const symbol = change.currency === 'JPY' ? '¥' : change.currency === 'USD' ? '$' : '€';
  
  const tweet = `${emoji} ${change.vpnName} 価格${change.changeType}

${symbol}${change.oldPrice} → ${symbol}${change.newPrice}
変動: ${change.percentChange > 0 ? '+' : ''}${change.percentChange.toFixed(1)}%

#VPN #価格変動`;
  
  try {
    // This would call the Twitter posting function
    // postToTwitter(tweet);
    Logger.log(`  🐦 Would post to Twitter: ${tweet.substring(0, 50)}...`);
  } catch (error) {
    Logger.log(`  ❌ Twitter posting failed: ${error.message}`);
  }
}

// ==================== Test Function ====================
function testPriceChangeDetection() {
  Logger.log('Testing price change detection...');
  
  checkPriceChanges();
  
  Logger.log('✅ Test complete');
}

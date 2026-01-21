/**
 * ============================================
 * エンジン2A: VPN料金スクレイピング Phase 2
 * 価格抽出ロジック強化版
 * ============================================
 * 
 * 機能:
 * - 15社のVPN価格を毎日自動スクレイピング
 * - 長期割引プランの月額換算
 * - 為替レート自動取得
 * - Spreadsheet保存
 * 
 * @author Tokyo VPN Speed Monitor Project
 * @version 2.0
 * @license MIT
 */

// ScraperAPI設定
const SCRAPERAPI_KEY = PropertiesService.getScriptProperties().getProperty('SCRAPERAPI_KEY') || '';
const SCRAPERAPI_URL = 'https://api.scraperapi.com';

// Group分類（テスト結果から）
const GROUP_A = [
  'ExpressVPN', 'Surfshark', 'MillenVPN',
  'CyberGhost', 'ProtonVPN', 'IPVanish', 'Mullvad', 'Windscribe',
  'セカイVPN', 'HideMyAss', 'TunnelBear', 'Hotspot Shield', 'Planet VPN'
];

const GROUP_B = ['NordVPN', 'Private Internet Access'];

const VPN_PRICING_URLS = {
  'NordVPN': 'https://nordvpn.com/ja/pricing/',
  'ExpressVPN': 'https://www.expressvpn.com/jp/order',
  'Private Internet Access': 'https://www.privateinternetaccess.com/ja/buy-vpn-online',
  'Surfshark': 'https://surfshark.com/ja/pricing',
  'MillenVPN': 'https://millenvpn.jp/pricing/',
  'CyberGhost': 'https://www.cyberghostvpn.com/ja/buy/cyberghost-vpn-3',
  'ProtonVPN': 'https://protonvpn.com/ja/pricing',
  'IPVanish': 'https://www.ipvanish.com/pricing/',
  'Mullvad': 'https://mullvad.net/ja/pricing',
  'Windscribe': 'https://jpn.windscribe.com/upgrade',
  'セカイVPN': 'https://www.interlink.or.jp/service/sekaivpn/price.html',
  'HideMyAss': 'https://www.hidemyass.com/ja-jp/pricing',
  'TunnelBear': 'https://www.tunnelbear.com/pricing',
  'Hotspot Shield': 'https://www.hotspotshield.com/select-plan/',
  'Planet VPN': 'https://account.freevpnplanet.com/ja/order/'
};

// フォールバック価格（スクレイピング失敗時の参考値）
const FALLBACK_PRICES = {
  'NordVPN': { amount: 370, currency: 'JPY' },
  'Surfshark': { amount: 288, currency: 'JPY' },
  'ExpressVPN': { amount: 12.99, currency: 'USD' },
  'Private Internet Access': { amount: 11.95, currency: 'USD' },
  'MillenVPN': { amount: 360, currency: 'JPY' },
  'CyberGhost': { amount: 12.99, currency: 'USD' },
  'ProtonVPN': { amount: 2.99, currency: 'USD' },
  'IPVanish': { amount: 2.19, currency: 'USD' },
  'Mullvad': { amount: 5, currency: 'EUR' },
  'Windscribe': { amount: 3, currency: 'USD' },
  'セカイVPN': { amount: 1100, currency: 'JPY' },
  'HideMyAss': { amount: 1099, currency: 'JPY' },
  'TunnelBear': { amount: 4.99, currency: 'USD' },
  'Hotspot Shield': { amount: 6.99, currency: 'USD' },
  'Planet VPN': { amount: 2.99, currency: 'EUR' }
};

// 価格範囲フィルタ（VPN月額相場）
const PRICE_RANGES = {
  'JPY': { min: 200, max: 3000 },
  'USD': { min: 1, max: 30 },
  'EUR': { min: 1, max: 30 },
  'GBP': { min: 1, max: 30 }
};

// JavaScript必須サイト
const REQUIRES_JS_RENDERING = ['Surfshark', 'NordVPN', 'ProtonVPN', 'HideMyAss', 'Planet VPN'];

const PRICING_SHEET_NAME = 'VPN料金履歴';

// ==================== 直接アクセス ====================
function fetchHTMLDirect(url) {
  const options = {
    method: 'get',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8'
    },
    muteHttpExceptions: true,
    followRedirects: true
  };
  
  try {
    const response = UrlFetchApp.fetch(url, options);
    const statusCode = response.getResponseCode();
    
    if (statusCode === 200) {
      return {
        success: true,
        html: response.getContentText(),
        method: 'direct'
      };
    } else {
      return {
        success: false,
        error: `HTTP ${statusCode}`,
        method: 'direct'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.toString(),
      method: 'direct'
    };
  }
}

// ==================== ScraperAPI経由アクセス ====================
function fetchHTMLScraperAPI(url, renderJS = false) {
  if (!SCRAPERAPI_KEY) {
    return {
      success: false,
      error: 'ScraperAPI key not configured'
    };
  }
  
  let apiUrl = `${SCRAPERAPI_URL}?api_key=${SCRAPERAPI_KEY}&url=${encodeURIComponent(url)}`;
  
  if (renderJS) {
    apiUrl += '&render=true';
  }
  
  apiUrl += '&country_code=jp';
  
  const customHeaders = {
    'Accept-Language': 'ja,ja-JP;q=0.9,en;q=0.8'
  };
  apiUrl += `&custom_headers=${encodeURIComponent(JSON.stringify(customHeaders))}`;
  
  try {
    const response = UrlFetchApp.fetch(apiUrl, {
      muteHttpExceptions: true
    });
    
    const statusCode = response.getResponseCode();
    
    if (statusCode === 200) {
      return {
        success: true,
        html: response.getContentText(),
        method: 'scraperapi'
      };
    } else {
      return {
        success: false,
        error: `ScraperAPI HTTP ${statusCode}`,
        method: 'scraperapi'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.toString(),
      method: 'scraperapi'
    };
  }
}

// ==================== ハイブリッド取得 ====================
function fetchHTML(vpnName, url, retryCount = 0) {
  if (REQUIRES_JS_RENDERING.includes(vpnName)) {
    Logger.log(`${vpnName}: JavaScriptレンダリング必要 → ScraperAPI`);
    const result = fetchHTMLScraperAPI(url, true);
    
    if (!result.success && retryCount === 0) {
      Logger.log(`⚠️ ${vpnName}: ScraperAPI失敗、直接アクセスを試行...`);
      Utilities.sleep(2000);
      return fetchHTMLDirect(url);
    }
    
    return result;
  }
  
  if (GROUP_B.includes(vpnName)) {
    Logger.log(`${vpnName}: ScraperAPI使用（403回避）`);
    const result = fetchHTMLScraperAPI(url, true);
    
    if (!result.success && retryCount === 0) {
      Logger.log(`⚠️ ${vpnName}: ScraperAPI失敗、直接アクセスを試行...`);
      return fetchHTMLDirect(url);
    }
    
    return result;
  }
  
  if (GROUP_A.includes(vpnName)) {
    Logger.log(`${vpnName}: 直接アクセス試行`);
    return fetchHTMLDirect(url);
  }
  
  return fetchHTMLDirect(url);
}

// ==================== 価格抽出 ====================
function extractPrices(html, vpnName) {
  const prices = [];
  
  // ExpressVPN専用処理
  if (vpnName === 'ExpressVPN') {
    const totalPattern = /最初の(\d+)ヶ月は[^$]*\$([0-9.]+)/g;
    let match;
    while ((match = totalPattern.exec(html)) !== null) {
      const months = parseInt(match[1]);
      const total = parseFloat(match[2]);
      if (months > 0 && total > 0) {
        const monthly = total / months;
        prices.push({
          currency: 'USD',
          amount: parseFloat(monthly.toFixed(2)),
          raw: `$${total}/${months}mo`
        });
      }
    }
    return removeDuplicatePrices(prices);
  }
  
  // 通貨パターン
  const patterns = {
    'JPY': [/[¥￥]\s*([0-9,]+)/g, /([0-9,]+)\s*円/g],
    'USD': [/\$\s*([0-9]+\.[0-9]{2})/g, /\$\s*([0-9,]+)/g],
    'EUR': [/€\s*([0-9]+\.[0-9]{2})/g, /€\s*([0-9,]+)/g],
    'GBP': [/£\s*([0-9]+\.[0-9]{2})/g, /£\s*([0-9,]+)/g]
  };
  
  for (const [currency, patternList] of Object.entries(patterns)) {
    for (const pattern of patternList) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const amountStr = match[1].replace(/,/g, '');
        const amount = parseFloat(amountStr);
        
        if (!isNaN(amount) && isValidPrice(amount, currency)) {
          prices.push({ currency, amount, raw: match[0] });
        }
      }
    }
  }
  
  // VPN別特殊処理
  if (vpnName === 'Private Internet Access') {
    const match3y = html.match(/\$\s*79\s*every\s*3\s*years/i) || html.match(/3\s*年.*?\$\s*79/i);
    if (match3y) {
      prices.push({ currency: 'USD', amount: parseFloat((79 / 36).toFixed(2)), raw: '$79/3years' });
    }
  }
  
  if (vpnName === 'CyberGhost') {
    const match2y = html.match(/\$\s*56\.94\s*for\s*first\s*2\s*years/i) || html.match(/2\s*年.*?56\.94/i);
    if (match2y) {
      prices.push({ currency: 'USD', amount: parseFloat((56.94 / 24).toFixed(2)), raw: '$56.94/2years' });
    }
  }
  
  return removeDuplicatePrices(prices);
}

function removeDuplicatePrices(prices) {
  const uniquePrices = [];
  const seen = new Set();
  
  for (const price of prices) {
    const key = `${price.currency}-${price.amount}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniquePrices.push(price);
    }
  }
  
  const currencyPriority = { 'JPY': 0, 'GBP': 1, 'USD': 2, 'EUR': 3 };
  uniquePrices.sort((a, b) => {
    const priorityDiff = currencyPriority[a.currency] - currencyPriority[b.currency];
    if (priorityDiff !== 0) return priorityDiff;
    return a.amount - b.amount;
  });
  
  return uniquePrices;
}

function isValidPrice(amount, currency) {
  const range = PRICE_RANGES[currency];
  if (!range) return false;
  return amount >= range.min && amount <= range.max;
}

function estimateMonthlyPrice(prices) {
  if (prices.length === 0) return null;
  const cheapest = prices[0];
  return {
    amount: cheapest.amount,
    currency: cheapest.currency,
    display: `${cheapest.currency === 'JPY' ? '¥' : cheapest.currency === 'USD' ? '$' : cheapest.currency === 'EUR' ? '€' : '£'}${cheapest.amount}`
  };
}

// ==================== 為替レート取得 ====================
function getUSDJPYRate() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('USDJPY_RATE');
  
  if (cached) {
    return parseFloat(cached);
  }
  
  try {
    const response = UrlFetchApp.fetch('https://api.exchangerate-api.com/v4/latest/USD');
    const data = JSON.parse(response.getContentText());
    const rate = data.rates.JPY;
    cache.put('USDJPY_RATE', rate.toString(), 86400);
    Logger.log(`💱 為替レート取得: $1 = ¥${rate}`);
    return rate;
  } catch (e) {
    Logger.log(`⚠️ 為替API失敗、デフォルト値使用`);
    return 150;
  }
}

// ==================== メイン: 全VPN料金取得 ====================
function scrapePricingAll() {
  Logger.log('==========================================');
  Logger.log('全VPN料金スクレイピング開始');
  Logger.log('==========================================');
  
  const results = [];
  
  for (const [vpnName, url] of Object.entries(VPN_PRICING_URLS)) {
    Logger.log(`--- ${vpnName} ---`);
    
    const fetchResult = fetchHTML(vpnName, url);
    
    if (!fetchResult.success) {
      Logger.log(`❌ 取得失敗: ${fetchResult.error}`);
      
      if (FALLBACK_PRICES[vpnName]) {
        const fallback = FALLBACK_PRICES[vpnName];
        results.push({
          vpn: vpnName,
          success: true,
          monthlyPrice: {
            amount: fallback.amount,
            currency: fallback.currency,
            display: `${fallback.currency === 'JPY' ? '¥' : '$'}${fallback.amount}`
          },
          allPrices: [],
          method: 'fallback',
          isFallback: true
        });
      } else {
        results.push({ vpn: vpnName, success: false, error: fetchResult.error });
      }
      continue;
    }
    
    Logger.log(`✅ HTML取得成功 (${fetchResult.method})`);
    
    const prices = extractPrices(fetchResult.html, vpnName);
    
    if (prices.length === 0) {
      if (FALLBACK_PRICES[vpnName]) {
        const fallback = FALLBACK_PRICES[vpnName];
        results.push({
          vpn: vpnName,
          success: true,
          monthlyPrice: {
            amount: fallback.amount,
            currency: fallback.currency,
            display: `${fallback.currency === 'JPY' ? '¥' : '$'}${fallback.amount}`
          },
          allPrices: [],
          method: fetchResult.method + ' (fallback)',
          isFallback: true
        });
      } else {
        results.push({ vpn: vpnName, success: false, error: 'No prices found' });
      }
      continue;
    }
    
    const monthlyPrice = estimateMonthlyPrice(prices);
    
    // USD→JPY換算
    if (['Private Internet Access', 'CyberGhost', 'ExpressVPN'].includes(vpnName) && monthlyPrice && monthlyPrice.currency === 'USD') {
      const rate = getUSDJPYRate();
      monthlyPrice.amount = Math.round(monthlyPrice.amount * rate);
      monthlyPrice.currency = 'JPY';
      monthlyPrice.display = `¥${monthlyPrice.amount}`;
    }
    
    Logger.log(`💰 推定月額: ${monthlyPrice.display}`);
    
    results.push({
      vpn: vpnName,
      success: true,
      monthlyPrice,
      allPrices: prices,
      method: fetchResult.method
    });
    
    Utilities.sleep(1000);
  }
  
  Logger.log('==========================================');
  Logger.log(`✅ 成功: ${results.filter(r => r.success).length}社`);
  Logger.log(`❌ 失敗: ${results.filter(r => !r.success).length}社`);
  
  return results;
}

// ==================== Spreadsheet保存 ====================
function setupPricingSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(PRICING_SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(PRICING_SHEET_NAME);
    sheet.appendRow(['取得日時', 'VPNサービス', '月額料金', '通貨', '取得方法', 'フォールバック', '価格候補数', '備考']);
    sheet.getRange(1, 1, 1, 8).setFontWeight('bold').setBackground('#4285f4').setFontColor('#ffffff');
    Logger.log('✅ 新規シート作成');
  }
  
  return sheet;
}

function savePricingToSheet(results) {
  Logger.log('💾 スプレッドシートに保存中...');
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(PRICING_SHEET_NAME);
  
  if (!sheet) {
    sheet = setupPricingSheet();
  }
  
  const timestamp = new Date();
  let savedCount = 0;
  
  results.forEach(result => {
    if (result.success) {
      sheet.appendRow([
        timestamp,
        result.vpn,
        result.monthlyPrice.amount,
        result.monthlyPrice.currency,
        result.method || 'unknown',
        result.isFallback ? 'はい' : 'いいえ',
        result.allPrices ? result.allPrices.length : 0,
        result.isManual ? '手動設定' : ''
      ]);
      savedCount++;
    }
  });
  
  Logger.log(`✅ ${savedCount}件保存完了`);
  return savedCount;
}

function scrapePricingAndSave() {
  const results = scrapePricingAll();
  savePricingToSheet(results);
  return results;
}

// ==================== トリガー設定 ====================
function setupPricingTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'scrapePricingAndSave') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  ScriptApp.newTrigger('scrapePricingAndSave')
    .timeBased()
    .atHour(9)
    .everyDays(1)
    .create();
  
  Logger.log('✅ トリガー設定完了: 毎日 午前9時');
}

// ==================== Web API ====================
function getLatestPricingAPI() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(PRICING_SHEET_NAME);
  
  if (!sheet || sheet.getLastRow() <= 1) {
    return { success: false, error: 'No data' };
  }
  
  const lastRow = sheet.getLastRow();
  const allData = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
  
  const latestByVPN = {};
  
  allData.forEach(row => {
    const timestamp = new Date(row[0]);
    const vpnName = row[1];
    
    if (!latestByVPN[vpnName] || timestamp > latestByVPN[vpnName].timestamp) {
      latestByVPN[vpnName] = {
        vpnName,
        timestamp,
        price: row[2],
        currency: row[3],
        method: row[4],
        isFallback: row[5] === 'はい'
      };
    }
  });
  
  const result = Object.values(latestByVPN).map(vpn => ({
    name: vpn.vpnName,
    price: vpn.price,
    currency: vpn.currency,
    lastUpdate: vpn.timestamp,
    isFallback: vpn.isFallback,
    method: vpn.method
  }));
  
  return {
    success: true,
    lastUpdate: new Date().toISOString(),
    count: result.length,
    data: result
  };
}

// ==================== テスト ====================
function testPricingVPN(vpnName) {
  const url = VPN_PRICING_URLS[vpnName];
  if (!url) {
    Logger.log(`❌ VPN not found: ${vpnName}`);
    return;
  }
  
  Logger.log(`テスト: ${vpnName}`);
  
  const fetchResult = fetchHTML(vpnName, url);
  
  if (!fetchResult.success) {
    Logger.log(`❌ 取得失敗: ${fetchResult.error}`);
    return;
  }
  
  Logger.log(`✅ HTML取得成功 (${fetchResult.method})`);
  
  const prices = extractPrices(fetchResult.html, vpnName);
  
  if (prices.length === 0) {
    Logger.log(`⚠️ 価格が見つかりませんでした`);
    return;
  }
  
  Logger.log(`抽出された価格:`);
  prices.slice(0, 5).forEach((price, i) => {
    Logger.log(`  ${i+1}. ${price.currency} ${price.amount}`);
  });
  
  const monthlyPrice = estimateMonthlyPrice(prices);
  Logger.log(`💰 推定月額: ${monthlyPrice.display}`);
}

function testAllVPNsPricing() {
  scrapePricingAll();
}

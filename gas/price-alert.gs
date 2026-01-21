/**
 * ============================================
 * エンジン2A改善: 価格変動アラート
 * 前日比で価格が変動したら自動Twitter投稿
 * ============================================
 * 
 * 機能:
 * - 価格変動チェック（5%以上の変動を検出）
 * - Twitter自動投稿
 * - Spreadsheet保存
 * 
 * @author Tokyo VPN Speed Monitor Project
 * @version 1.0
 * @license MIT
 */

const PRICE_ALERT_SHEET_NAME = 'VPN料金履歴';

// ==========================================
// 価格変動チェック & アラート
// ==========================================

/**
 * 価格変動をチェックしてアラートを送信
 * @returns {Array} 検出された価格変動
 */
function checkPriceChangesAndAlert() {
  Logger.log('==========================================');
  Logger.log('価格変動チェック開始');
  Logger.log(`実行時刻: ${new Date().toLocaleString('ja-JP')}`);
  Logger.log('==========================================');
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(PRICE_ALERT_SHEET_NAME);
  
  if (!sheet || sheet.getLastRow() < 3) {
    Logger.log('⚠️ データ不足: 比較できる過去データがありません');
    return [];
  }
  
  const lastRow = sheet.getLastRow();
  const data = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
  
  // VPNごとに最新2件を取得
  const vpnLatestPrices = {};
  
  data.reverse().forEach(row => {
    const [timestamp, vpnName, price, currency, method, fallback, candidates, notes] = row;
    
    if (!vpnLatestPrices[vpnName]) {
      vpnLatestPrices[vpnName] = [];
    }
    
    if (vpnLatestPrices[vpnName].length < 2) {
      vpnLatestPrices[vpnName].push({
        timestamp: timestamp,
        price: price,
        currency: currency,
        method: method
      });
    }
  });
  
  // 価格変動をチェック
  const priceChanges = [];
  
  Object.keys(vpnLatestPrices).forEach(vpnName => {
    const prices = vpnLatestPrices[vpnName];
    
    if (prices.length < 2) {
      Logger.log(`${vpnName}: データ不足（1件のみ）`);
      return;
    }
    
    const latest = prices[0];
    const previous = prices[1];
    
    // 通貨が異なる場合はスキップ
    if (latest.currency !== previous.currency) {
      Logger.log(`${vpnName}: 通貨変更（${previous.currency} → ${latest.currency}）`);
      return;
    }
    
    // 価格変動を計算
    const priceDiff = latest.price - previous.price;
    const percentChange = ((priceDiff / previous.price) * 100).toFixed(1);
    
    Logger.log(`${vpnName}: ${previous.currency} ${previous.price} → ${latest.price} (${percentChange > 0 ? '+' : ''}${percentChange}%)`);
    
    // 値下がりのみアラート（5%以上）
    if (priceDiff < 0 && Math.abs(percentChange) >= 5) {
      priceChanges.push({
        vpnName: vpnName,
        previousPrice: previous.price,
        currentPrice: latest.price,
        currency: latest.currency,
        percentChange: percentChange,
        priceDiff: Math.abs(priceDiff)
      });
    }
  });
  
  Logger.log('');
  Logger.log(`価格変動検出: ${priceChanges.length}件`);
  
  // アラート送信
  if (priceChanges.length > 0) {
    priceChanges.forEach(change => {
      sendPriceAlert(change);
    });
  } else {
    Logger.log('ℹ️ 有意な価格変動なし');
  }
  
  return priceChanges;
}

// ==========================================
// 価格アラートTwitter投稿
// ==========================================

/**
 * 価格アラートを送信
 * @param {Object} priceChange - 価格変動情報
 */
function sendPriceAlert(priceChange) {
  Logger.log('--- 価格変動アラート ---');
  Logger.log(`VPN: ${priceChange.vpnName}`);
  Logger.log(`価格: ${priceChange.currency} ${priceChange.previousPrice} → ${priceChange.currentPrice}`);
  Logger.log(`変動: ${priceChange.percentChange}%`);
  
  const tweet = generatePriceAlertTweet(priceChange);
  
  Logger.log('📝 Twitter投稿内容:');
  Logger.log(tweet);
  
  try {
    if (typeof postToTwitter === 'function') {
      const result = postToTwitter(tweet);
      if (result) {
        Logger.log('✅ Twitter投稿成功');
      } else {
        Logger.log('⚠️ Twitter投稿失敗');
      }
    } else {
      Logger.log('⚠️ postToTwitter関数が見つかりません');
    }
  } catch (error) {
    Logger.log(`❌ Twitter投稿エラー: ${error}`);
  }
}

/**
 * 価格アラートツイートを生成
 * @param {Object} priceChange - 価格変動情報
 * @returns {string} ツイート内容
 */
function generatePriceAlertTweet(priceChange) {
  const currencySymbol = {
    'JPY': '¥',
    'USD': '$',
    'EUR': '€',
    'GBP': '£'
  }[priceChange.currency] || priceChange.currency;
  
  const tweet = `🔥 ${priceChange.vpnName} 価格変動！

${currencySymbol}${priceChange.previousPrice} → ${currencySymbol}${priceChange.currentPrice}
（${Math.abs(priceChange.percentChange)}% OFF）

今がチャンス！

詳細▶️ https://www.blstweb.jp/network/vpn/tokyo-vpn-speed-monitor/

#VPN #${priceChange.vpnName.replace(/\s+/g, '')} #セール情報`;
  
  return tweet;
}

// ==========================================
// 統合実行
// ==========================================

/**
 * スクレイピング → 価格変動チェック統合実行
 */
function scrapePricingAndCheckAlerts() {
  Logger.log('==========================================');
  Logger.log('料金スクレイピング＆価格変動チェック');
  Logger.log('==========================================');
  
  // 1. 料金スクレイピング実行
  Logger.log('【Step 1】料金スクレイピング');
  if (typeof scrapePricingAndSave === 'function') {
    scrapePricingAndSave();
  } else {
    Logger.log('❌ scrapePricingAndSave関数が見つかりません');
    return;
  }
  
  Logger.log('');
  Logger.log('【Step 2】価格変動チェック');
  
  Utilities.sleep(3000);
  
  // 2. 価格変動チェック
  checkPriceChangesAndAlert();
  
  Logger.log('');
  Logger.log('✅ 完了');
}

// ==========================================
// トリガー設定
// ==========================================

/**
 * 価格アラートトリガーを設定
 */
function setupPriceAlertTriggers() {
  Logger.log('==========================================');
  Logger.log('価格アラートトリガー設定');
  Logger.log('==========================================');
  
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'scrapePricingAndSave' ||
        trigger.getHandlerFunction() === 'scrapePricingAndCheckAlerts') {
      ScriptApp.deleteTrigger(trigger);
      Logger.log('🗑️ 既存トリガー削除');
    }
  });
  
  ScriptApp.newTrigger('scrapePricingAndCheckAlerts')
    .timeBased()
    .atHour(9)
    .everyDays(1)
    .create();
  
  Logger.log('✅ トリガー設定完了: 毎日 午前9時');
}

// ==========================================
// テスト
// ==========================================

/**
 * 価格変動アラートテスト
 */
function testPriceAlert() {
  checkPriceChangesAndAlert();
}

/**
 * モックデータでテスト
 */
function testPriceAlertWithMockData() {
  Logger.log('==========================================');
  Logger.log('価格変動アラート モックテスト');
  Logger.log('==========================================');
  
  const mockChange = {
    vpnName: 'NordVPN',
    previousPrice: 500,
    currentPrice: 370,
    currency: 'JPY',
    percentChange: -26.0,
    priceDiff: 130
  };
  
  Logger.log('モックデータ:');
  Logger.log(JSON.stringify(mockChange, null, 2));
  
  sendPriceAlert(mockChange);
}

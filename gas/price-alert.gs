/**
 * エンジン2A改善: 価格変動アラート
 * 前日比で価格が変動したら自動Twitter投稿
 */

const PRICE_ALERT_SHEET_NAME = 'VPN料金履歴';

// ==========================================
// 価格変動チェック & アラート
// ==========================================

function checkPriceChangesAndAlert() {
  Logger.log('==========================================');
  Logger.log('価格変動チェック開始');
  Logger.log(`実行時刻: ${new Date().toLocaleString('ja-JP')}`);
  Logger.log('==========================================');
  Logger.log('');
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(PRICE_ALERT_SHEET_NAME);
  
  if (!sheet || sheet.getLastRow() < 3) {
    Logger.log('⚠️ データ不足: 比較できる過去データがありません');
    return;
  }
  
  // 最新2回分のデータを取得
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
  Logger.log('==========================================');
  Logger.log(`価格変動検出: ${priceChanges.length}件`);
  Logger.log('==========================================');
  Logger.log('');
  
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

function sendPriceAlert(priceChange) {
  Logger.log('--- 価格変動アラート ---');
  Logger.log(`VPN: ${priceChange.vpnName}`);
  Logger.log(`価格: ${priceChange.currency} ${priceChange.previousPrice} → ${priceChange.currentPrice}`);
  Logger.log(`変動: ${priceChange.percentChange}%`);
  Logger.log('');
  
  // Twitter投稿メッセージ生成
  const tweet = generatePriceAlertTweet(priceChange);
  
  Logger.log('📝 Twitter投稿内容:');
  Logger.log(tweet);
  Logger.log('');
  
  // Twitter投稿
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
  
  Logger.log('');
}

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

#VPN #${priceChange.vpnName} #セール情報`;
  
  return tweet;
}

// ==========================================
// 統合実行: スクレイピング → 価格変動チェック
// ==========================================

function scrapePricingAndCheckAlerts() {
  Logger.log('==========================================');
  Logger.log('料金スクレイピング＆価格変動チェック');
  Logger.log('==========================================');
  Logger.log('');
  
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
  Logger.log('');
  
  // スクレイピング直後は最新データが反映されているのでチェック
  Utilities.sleep(3000); // 3秒待機
  
  // 2. 価格変動チェック
  checkPriceChangesAndAlert();
  
  Logger.log('');
  Logger.log('==========================================');
  Logger.log('完了');
  Logger.log('==========================================');
}

// ==========================================
// トリガー設定（既存のトリガーを置き換え）
// ==========================================

function setupPriceAlertTriggers() {
  Logger.log('==========================================');
  Logger.log('価格アラートトリガー設定');
  Logger.log('==========================================');
  Logger.log('');
  
  // 既存のトリガーを削除
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'scrapePricingAndSave' ||
        trigger.getHandlerFunction() === 'scrapePricingAndCheckAlerts') {
      ScriptApp.deleteTrigger(trigger);
      Logger.log('🗑️ 既存トリガー削除');
    }
  });
  
  // 新しいトリガー: スクレイピング＋価格変動チェック
  ScriptApp.newTrigger('scrapePricingAndCheckAlerts')
    .timeBased()
    .atHour(9)
    .everyDays(1)
    .create();
  
  Logger.log('✅ トリガー設定完了');
  Logger.log('実行タイミング: 毎日 午前9時');
  Logger.log('処理内容: 料金スクレイピング → 価格変動チェック → Twitter投稿');
  Logger.log('');
  Logger.log('==========================================');
}

// ==========================================
// テスト
// ==========================================

function testPriceAlert() {
  Logger.log('==========================================');
  Logger.log('価格変動アラート テスト');
  Logger.log('==========================================');
  Logger.log('');
  
  checkPriceChangesAndAlert();
}

// 手動テスト用: 特定の価格変動をシミュレート
function testPriceAlertWithMockData() {
  Logger.log('==========================================');
  Logger.log('価格変動アラート モックテスト');
  Logger.log('==========================================');
  Logger.log('');
  
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
  Logger.log('');
  
  sendPriceAlert(mockChange);
}
/**
 * ============================================
 * MailPoet セミ自動化システム
 * API不要：週次ダイジェストをSpreadsheet生成
 * ============================================
 * 
 * @author Tokyo VPN Speed Monitor Project
 * @version 1.0
 * @license MIT
 */

const WEEKLY_DIGEST_SHEET_NAME = '週次ダイジェスト';

// ==========================================
// メイン: 週次ダイジェスト生成
// ==========================================

function generateWeeklyDigest() {
  Logger.log('==========================================');
  Logger.log('週次ダイジェスト生成');
  Logger.log(`実行時刻: ${new Date().toLocaleString('ja-JP')}`);
  Logger.log('==========================================');
  
  const newsData = getWeeklyNews();
  const speedData = getWeeklySpeedRanking();
  const priceData = getWeeklyPriceChanges();
  
  saveWeeklyDigest(newsData, speedData, priceData);
  
  const emailData = generateEmailBody(newsData, speedData, priceData);
  
  if (newsData.length > 0) {
    markNewsAsMailSent(newsData.map(news => news.link));
  }
  
  Logger.log('');
  Logger.log('✅ 週次ダイジェスト生成完了');
  Logger.log('📧 件名: ' + emailData.subject);
  
  return emailData;
}

// ==========================================
// 過去1週間のニュース取得
// ==========================================

function getWeeklyNews() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('VPNニュース履歴');
  
  if (!sheet || sheet.getLastRow() <= 1) return [];
  
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 7).getValues();
  
  const weeklyNews = data
    .filter(row => new Date(row[0]) >= oneWeekAgo && row[6] !== 'はい')
    .map(row => ({
      timestamp: row[0],
      keyword: row[1],
      link: row[2],
      title: row[3],
      pubDate: row[4]
    }));
  
  // 不適切なニュースを除外
  const excludePatterns = [/ポルノ/, /アダルト/, /エロ/, /広告なしで/, /無料で/, /매일경제/, /マクリン/, /VOI\.ID/];
  const enterpriseKeywords = ['企業向け', '法人向け', 'ハイブリッドワーク', 'sase', 'ztna', 'ゼロトラスト'];
  
  const filteredNews = weeklyNews.filter(news => {
    const title = news.title;
    if (excludePatterns.some(p => p.test(title))) return false;
    if (enterpriseKeywords.some(k => title.toLowerCase().includes(k.toLowerCase()))) return false;
    return true;
  });
  
  filteredNews.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  
  return filteredNews.slice(0, 5);
}

// ==========================================
// 配信済みフラグを更新
// ==========================================

function markNewsAsMailSent(newsLinks) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('VPNニュース履歴');
  
  if (!sheet || sheet.getLastRow() <= 1) return;
  
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 7).getValues();
  
  newsLinks.forEach(link => {
    for (let i = 0; i < data.length; i++) {
      if (data[i][2] === link) {
        sheet.getRange(i + 2, 7).setValue('はい');
        break;
      }
    }
  });
}

// ==========================================
// 週間速度ランキング取得
// ==========================================

function getWeeklySpeedRanking() {
  const VPN_API_URL = PropertiesService.getScriptProperties().getProperty('VPN_API_URL') || '';
  
  if (!VPN_API_URL) return [];
  
  try {
    const response = UrlFetchApp.fetch(VPN_API_URL + '?type=ranking&region=JP');
    const data = JSON.parse(response.getContentText());
    
    if (data.data && data.data.length > 0) {
      return data.data.slice(0, 3);
    }
  } catch (error) {
    Logger.log(`⚠️ 速度ランキング取得エラー: ${error}`);
  }
  
  return [];
}

// ==========================================
// 週間価格変動取得
// ==========================================

function getWeeklyPriceChanges() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('VPN料金履歴');
  
  if (!sheet || sheet.getLastRow() <= 1) return [];
  
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 8).getValues();
  
  const vpnPrices = {};
  
  data.forEach(row => {
    const timestamp = new Date(row[0]);
    const vpnName = row[1];
    const price = row[2];
    const currency = row[3];
    
    if (!vpnPrices[vpnName]) {
      vpnPrices[vpnName] = { name: vpnName, currency: currency, prices: [] };
    }
    
    vpnPrices[vpnName].prices.push({ timestamp, price });
  });
  
  const changes = [];
  
  Object.keys(vpnPrices).forEach(vpnName => {
    const vpn = vpnPrices[vpnName];
    if (vpn.prices.length < 2) return;
    
    vpn.prices.sort((a, b) => a.timestamp - b.timestamp);
    
    const oldest = vpn.prices[0];
    const latest = vpn.prices[vpn.prices.length - 1];
    
    if (oldest.price !== latest.price) {
      const priceDiff = latest.price - oldest.price;
      const percentChange = ((priceDiff / oldest.price) * 100).toFixed(1);
      
      if (Math.abs(percentChange) >= 5) {
        changes.push({
          vpnName: vpnName,
          oldPrice: oldest.price,
          newPrice: latest.price,
          currency: vpn.currency,
          percentChange: percentChange
        });
      }
    }
  });
  
  return changes;
}

// ==========================================
// メール本文生成
// ==========================================

function generateEmailBody(newsData, speedData, priceData) {
  const today = new Date();
  const dateStr = `${today.getMonth() + 1}/${today.getDate()}`;
  const weekNum = Math.ceil(today.getDate() / 7);
  
  const subject = `【VPN Weekly】今週のニュース＆ランキング（${today.getMonth() + 1}月第${weekNum}週）`;
  
  let previewText = '';
  if (newsData.length > 0) {
    previewText = `速報：${newsData[0].title.substring(0, 30)}...`;
  } else if (speedData.length > 0) {
    previewText = `今週の最速VPNは${speedData[0].name}！`;
  } else {
    previewText = '今週のVPN速度ランキング＆価格変動情報をお届け';
  }
  
  let body = `[subscriber:email]様,

リモートアクセス&VPNのメルマガをご購読いただきありがとうございます。

━━━━━━━━━━━━━━━━━━━━
📰 今週のVPNニュース（${dateStr}週）
━━━━━━━━━━━━━━━━━━━━

`;
  
  if (newsData.length > 0) {
    newsData.forEach((news, i) => {
      body += `${i + 1}. ${news.title}\n   ${news.link}\n\n`;
    });
  } else {
    body += '今週は大きなニュースはありませんでした。\n\n';
  }
  
  body += `━━━━━━━━━━━━━━━━━━━━
🏆 今週の速度ランキング
━━━━━━━━━━━━━━━━━━━━

`;
  
  if (speedData.length > 0) {
    const medals = ['🥇', '🥈', '🥉'];
    speedData.forEach((vpn, i) => {
      body += `${medals[i]} ${vpn.name}: ${Math.round(vpn.download)} Mbps\n`;
    });
    body += `\n詳細ランキング▶️ https://www.blstweb.jp/network/vpn/vpn-speed-ranking/\n\n`;
  }
  
  body += `━━━━━━━━━━━━━━━━━━━━
💰 価格変動情報
━━━━━━━━━━━━━━━━━━━━

`;
  
  if (priceData.length > 0) {
    priceData.forEach(change => {
      const symbol = change.currency === 'JPY' ? '¥' : change.currency === 'USD' ? '$' : '€';
      const emoji = change.percentChange < 0 ? '🔥' : '⚠️';
      body += `${emoji} ${change.vpnName}: ${symbol}${change.oldPrice} → ${symbol}${change.newPrice} (${change.percentChange}%)\n`;
    });
  } else {
    body += '今週は価格変動はありませんでした。\n';
  }
  
  body += `
━━━━━━━━━━━━━━━━━━━━

📊 最新データは常時更新中
https://www.blstweb.jp/network/vpn/tokyo-vpn-speed-monitor/

━━━━━━━━━━━━━━━━━━━━`;
  
  return { subject, previewText, body };
}

// ==========================================
// Spreadsheet保存
// ==========================================

function saveWeeklyDigest(newsData, speedData, priceData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(WEEKLY_DIGEST_SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(WEEKLY_DIGEST_SHEET_NAME);
    sheet.appendRow(['生成日時', 'ニュース件数', 'TOP3 VPN', '価格変動件数', '件名', 'サブテキスト', 'メール本文']);
    sheet.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#4285f4').setFontColor('#ffffff');
  }
  
  const topVPNs = speedData.map(v => v.name).join(', ');
  const emailData = generateEmailBody(newsData, speedData, priceData);
  
  sheet.appendRow([new Date(), newsData.length, topVPNs, priceData.length, emailData.subject, emailData.previewText, emailData.body]);
}

// ==========================================
// トリガー設定
// ==========================================

function setupWeeklyDigestTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'generateWeeklyDigest') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  ScriptApp.newTrigger('generateWeeklyDigest')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(9)
    .create();
  
  Logger.log('✅ トリガー設定完了: 毎週月曜 午前9時');
}

function testWeeklyDigest() {
  generateWeeklyDigest();
}

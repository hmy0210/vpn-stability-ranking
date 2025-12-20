/**
 * ============================================
 * VPN News Monitor
 * Automated VPN news aggregation
 * ============================================
 * 
 * Features:
 * - Google News RSS monitoring
 * - Keyword-based filtering
 * - Duplicate detection
 * - Historical tracking
 * 
 * Setup:
 * 1. Set up 6-hour trigger
 * 2. Customize keywords in config
 * 
 * Repository: https://github.com/yourusername/vpn-stability-ranking
 */

// Configuration
const NEWS_CONFIG = {
  SPREADSHEET_ID: typeof CONFIG !== 'undefined' ? CONFIG.SPREADSHEET_ID : '',
  SHEET_NAME: typeof CONFIG !== 'undefined' ? CONFIG.SHEETS.NEWS_HISTORY : 'VPNニュース履歴',
  
  KEYWORDS: [
    'VPN 規制',
    'VPN セキュリティ',
    'VPNブロック',
    'VPN 速度',
    'VPN 比較'
  ],
  
  MAX_AGE_DAYS: 7
};

function monitorVPNNews() {
  Logger.log('==========================================');
  Logger.log('VPN News Monitoring Started');
  Logger.log(`Timestamp: ${new Date().toLocaleString('ja-JP')}`);
  Logger.log('==========================================');
  
  const ss = SpreadsheetApp.openById(NEWS_CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(NEWS_CONFIG.SHEET_NAME);
  
  if (!sheet) {
    Logger.log('❌ Sheet not found');
    return;
  }
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - NEWS_CONFIG.MAX_AGE_DAYS);
  
  const newArticles = [];
  
  NEWS_CONFIG.KEYWORDS.forEach(keyword => {
    Logger.log(`Searching: ${keyword}`);
    
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=ja&gl=JP&ceid=JP:ja`;
    
    try {
      const xml = UrlFetchApp.fetch(rssUrl).getContentText();
      const items = parseRSS(xml);
      
      items.forEach(item => {
        if (new Date(item.pubDate) >= cutoffDate && !isDuplicate(sheet, item.link)) {
          newArticles.push({
            timestamp: new Date(),
            keyword: keyword,
            link: item.link,
            title: item.title,
            pubDate: item.pubDate
          });
        }
      });
      
      Logger.log(`  Found ${items.length} articles`);
      
    } catch (error) {
      Logger.log(`  ❌ Error: ${error.message}`);
    }
    
    Utilities.sleep(1000);
  });
  
  if (newArticles.length > 0) {
    newArticles.forEach(article => {
      sheet.appendRow([
        article.timestamp,
        article.keyword,
        article.link,
        article.title,
        article.pubDate
      ]);
    });
    
    Logger.log(`📰 Saved ${newArticles.length} new articles`);
  } else {
    Logger.log('ℹ️ No new articles');
  }
  
  Logger.log('==========================================');
}

function parseRSS(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  
  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    
    const title = extractTag(itemXml, 'title');
    const link = extractTag(itemXml, 'link');
    const pubDate = extractTag(itemXml, 'pubDate');
    
    if (title && link) {
      items.push({ title, link, pubDate });
    }
  }
  
  return items;
}

function extractTag(xml, tag) {
  const regex = new RegExp(`<${tag}>(.*?)<\/${tag}>`, 's');
  const match = xml.match(regex);
  return match ? match[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : '';
}

function isDuplicate(sheet, link) {
  if (sheet.getLastRow() <= 1) return false;
  
  const data = sheet.getRange(2, 3, sheet.getLastRow() - 1, 1).getValues();
  return data.some(row => row[0] === link);
}

function setupNewsSheet() {
  const ss = SpreadsheetApp.openById(NEWS_CONFIG.SPREADSHEET_ID);
  let sheet = ss.getSheetByName(NEWS_CONFIG.SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(NEWS_CONFIG.SHEET_NAME);
  }
  
  const headers = ['タイムスタンプ', 'キーワード', 'リンク', 'タイトル', '公開日'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers])
    .setFontWeight('bold').setBackground('#4285f4').setFontColor('#ffffff');
  
  Logger.log('✅ News sheet setup complete');
}

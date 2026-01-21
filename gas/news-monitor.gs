/**
 * ============================================
 * エンジン2B Phase 2: VPNニュース監視
 * フィルター強化: 信頼性の低いニュースを厳格に除外
 * Google News RSS + 強化版信頼性フィルター
 * ============================================
 * 
 * @author Tokyo VPN Speed Monitor Project
 * @version 2.0
 * @license MIT
 */

const NEWS_SHEET_NAME = 'VPNニュース履歴';

const VPN_NEWS_KEYWORDS = [
  'VPN China blocked',
  'VPN ban',
  'VPN regulation',
  'VPN crackdown',
  'VPN 規制',
  'VPN 中国',
  'VPNブロック'
];

const GOOGLE_NEWS_RSS_BASE = 'https://news.google.com/rss/search?q=';

const TRUSTED_MEDIA_NAMES = [
  '日本経済新聞', '日経', 'Nikkei', '朝日新聞', '読売新聞', '毎日新聞', '産経新聞', 'NHK',
  '共同通信', '時事通信', 'ITmedia', 'INTERNET Watch', 'Impress Watch', 'GIGAZINE',
  'TechCrunch', 'WIRED', 'CNET', 'ZDNet', 'Engadget', 'ASCII', 'マイナビニュース',
  'ダイヤモンド・オンライン', '東洋経済オンライン', 'Business Insider Japan',
  'Reuters', 'ロイター', 'Bloomberg', 'ブルームバーグ', 'Forbes JAPAN',
  'Yahoo!ニュース', 'NewsPicks', 'トレンドマイクロ', 'カスペルスキー', 'IPA', 'JPCERT',
  'PR TIMES', 'BBC', 'CNN', 'The Guardian', 'New York Times', 'Wall Street Journal',
  'ExpressVPN', 'NordVPN', 'Surfshark', 'ProtonVPN', 'CyberGhost', 'Mullvad', 'MillenVPN'
];

const EXCLUDED_MEDIA_NAMES = [
  'note', 'blog', 'Blog', 'ブログ', 'Ameba', 'アメブロ', 'FC2', 'livedoor',
  'はてな', 'Hatena', 'WordPress', 'Medium', 'coki', 'biggo.jp', 'VOI.ID',
  'HelenTech', 'マキナレコード', 'ログミー', '매일경제', 'マクリン', 'VOI'
];

const NEWS_FRESHNESS_DAYS = 30;

// ==========================================
// メイン: VPNニュース監視
// ==========================================

function monitorVPNNews() {
  Logger.log('==========================================');
  Logger.log('VPNニュース監視');
  Logger.log(`実行時刻: ${new Date().toLocaleString('ja-JP')}`);
  Logger.log('==========================================');
  
  const allNews = [];
  
  VPN_NEWS_KEYWORDS.forEach(keyword => {
    try {
      const news = fetchNewsForKeyword(keyword);
      if (news.length > 0) {
        allNews.push(...news);
      }
    } catch (error) {
      Logger.log(`❌ エラー (${keyword}): ${error}`);
    }
    Utilities.sleep(2000);
  });
  
  const uniqueNews = removeDuplicateNews(allNews);
  const trustedNews = uniqueNews.filter(news => isTrustedSource(news) && isVPNRelated(news.title));
  const recentNews = trustedNews.filter(news => isNewsRecent(news.pubDate));
  const newNews = filterNewNews(recentNews);
  
  Logger.log(`新規ニュース: ${newNews.length}件`);
  
  if (newNews.length > 0) {
    const tweetsToPost = newNews.slice(0, 5);
    const tweetsToSaveOnly = newNews.slice(5);
    
    tweetsToPost.forEach((news, index) => {
      processNewsItem(news, true);
      if (index < tweetsToPost.length - 1) Utilities.sleep(5000);
    });
    
    tweetsToSaveOnly.forEach(news => processNewsItem(news, false));
  }
  
  return newNews;
}

// ==========================================
// Google News RSS取得
// ==========================================

function fetchNewsForKeyword(keyword) {
  const rssUrl = GOOGLE_NEWS_RSS_BASE + encodeURIComponent(keyword) + '&hl=ja&gl=JP&ceid=JP:ja';
  
  try {
    const response = UrlFetchApp.fetch(rssUrl, { muteHttpExceptions: true });
    if (response.getResponseCode() !== 200) return [];
    return parseGoogleNewsRSS(response.getContentText(), keyword);
  } catch (error) {
    return [];
  }
}

function parseGoogleNewsRSS(xml, keyword) {
  const news = [];
  
  try {
    const document = XmlService.parse(xml);
    const root = document.getRootElement();
    const channel = root.getChild('channel');
    const items = channel.getChildren('item').slice(0, 5);
    
    items.forEach(item => {
      news.push({
        keyword: keyword,
        title: item.getChildText('title'),
        link: item.getChildText('link'),
        pubDate: new Date(item.getChildText('pubDate')),
        description: item.getChildText('description') || '',
        timestamp: new Date()
      });
    });
  } catch (error) {
    Logger.log(`XMLパースエラー: ${error}`);
  }
  
  return news;
}

// ==========================================
// フィルター関数
// ==========================================

function removeDuplicateNews(newsArray) {
  const seen = new Set();
  return newsArray.filter(news => {
    if (seen.has(news.link)) return false;
    seen.add(news.link);
    return true;
  });
}

function isTrustedSource(news) {
  const mediaName = extractMediaNameFromTitle(news.title);
  if (!mediaName) return false;
  
  for (const excluded of EXCLUDED_MEDIA_NAMES) {
    if (mediaName.includes(excluded)) return false;
  }
  
  for (const trusted of TRUSTED_MEDIA_NAMES) {
    if (mediaName.includes(trusted) || trusted.includes(mediaName)) return true;
  }
  
  return false;
}

function extractMediaNameFromTitle(title) {
  const patterns = [/ - (.+)$/, / ― (.+)$/, / \| (.+)$/, / 【(.+)】$/];
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) return match[1].trim();
  }
  return null;
}

function isVPNRelated(title) {
  const titleLower = title.toLowerCase();
  
  const vpnRelatedTerms = ['vpn', '位置情報', '位置偽装', 'ip偽装', 'geo-blocking', 'ジオブロック', '地域制限', 'プロキシ'];
  if (!vpnRelatedTerms.some(term => titleLower.includes(term.toLowerCase()))) return false;
  
  const enterpriseKeywords = ['企業', '法人', '社内', 'リモートワーク', 'テレワーク', 'ゼロトラスト', 'sase', 'sd-wan'];
  if (enterpriseKeywords.some(keyword => titleLower.includes(keyword.toLowerCase()))) return false;
  
  return true;
}

function isNewsRecent(pubDate) {
  const diffDays = (new Date() - new Date(pubDate)) / (1000 * 60 * 60 * 24);
  return diffDays <= NEWS_FRESHNESS_DAYS;
}

function filterNewNews(newsArray) {
  const sheet = getNewsSheet();
  if (sheet.getLastRow() <= 1) return newsArray;
  
  const existingLinks = new Set(sheet.getRange(2, 3, sheet.getLastRow() - 1, 1).getValues().flat().filter(Boolean));
  return newsArray.filter(news => !existingLinks.has(news.link));
}

// ==========================================
// ニュース処理
// ==========================================

function processNewsItem(news, shouldTweet = true) {
  saveNewsToSheet(news, shouldTweet);
  
  if (shouldTweet) {
    const tweet = `🚨 VPN関連ニュース

${news.title.length > 80 ? news.title.substring(0, 77) + '...' : news.title}

詳細▶️ ${news.link}

#VPN #セキュリティニュース`;
    
    if (typeof postToTwitter === 'function') {
      postToTwitter(tweet);
    }
  }
}

// ==========================================
// Spreadsheet操作
// ==========================================

function getNewsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(NEWS_SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(NEWS_SHEET_NAME);
    sheet.appendRow(['タイムスタンプ', 'キーワード', 'リンク', 'タイトル', '公開日', 'Twitter投稿', 'メルマガ配信']);
    sheet.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#4285f4').setFontColor('#ffffff');
  }
  
  return sheet;
}

function saveNewsToSheet(news, wasTweeted = true) {
  getNewsSheet().appendRow([news.timestamp, news.keyword, news.link, news.title, news.pubDate, wasTweeted ? 'はい' : 'スキップ', '']);
}

// ==========================================
// トリガー設定
// ==========================================

function setupNewsMonitorTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'monitorVPNNews') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  ScriptApp.newTrigger('monitorVPNNews').timeBased().everyHours(6).create();
  Logger.log('✅ トリガー設定完了: 6時間ごと');
}

function testNewsMonitor() {
  monitorVPNNews();
}

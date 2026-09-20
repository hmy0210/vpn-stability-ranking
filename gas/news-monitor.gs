/**
 * 【修正版】エンジン2B Phase 2: VPNニュース監視
 * フィルター強化: 信頼性の低いニュースを厳格に除外
 * Google News RSS + 強化版信頼性フィルター
 */

// ==========================================
// 設定
// ==========================================

const NEWS_SHEET_NAME = 'VPNニュース履歴';

// 監視するキーワード
const VPN_NEWS_KEYWORDS = [
  'VPN China blocked',
  'VPN ban',
  'VPN regulation',
  'VPN crackdown',
  'VPN 規制',
  'VPN 中国',
  'VPNブロック'
];

// Google News RSSのベースURL
const GOOGLE_NEWS_RSS_BASE = 'https://news.google.com/rss/search?q=';

// 信頼できるメディアのホワイトリスト（タイトル末尾のメディア名）
const TRUSTED_MEDIA_NAMES = [
  // 日本の主要メディア
  '日本経済新聞', '日経', 'Nikkei',
  '朝日新聞', 'Asahi',
  '読売新聞', 'Yomiuri',
  '毎日新聞', 'Mainichi',
  '産経新聞', 'Sankei',
  'NHK',
  '共同通信', 'Kyodo',
  '時事通信', 'Jiji',
  
  // テック系メディア
  'ITmedia', 'ITメディア',
  'INTERNET Watch', 'Internet Watch',
  'Impress Watch',
  'GIGAZINE', 'ギガジン',
  'TechCrunch', 'テッククランチ',
  'WIRED', 'ワイアード',
  'CNET', 'シーネット',
  'ZDNet', 'ZDNET Japan',
  'Engadget', 'エンガジェット',
  'ASCII',
  'マイナビニュース',
  'ケータイ Watch',
  
  // ビジネス系
  'ダイヤモンド・オンライン', 'Diamond',
  '東洋経済オンライン',
  'Business Insider Japan',
  'Reuters', 'ロイター',
  'Bloomberg', 'ブルームバーグ',
  'Forbes JAPAN', 'フォーブス',
  'Yahoo!ニュース',
  'NewsPicks', 'ニューズピックス',
  
  // セキュリティ専門
  'トレンドマイクロ', 'Trend Micro',
  'www.trendmicro.com',
  'カスペルスキー', 'Kaspersky',
  'IPA',
  'JPCERT',
  
  // 公式・PR
  'PR TIMES',
  
  // 海外主要メディア
  'BBC',
  'CNN',
  'The Guardian',
  'New York Times', 'NYT',
  'Wall Street Journal', 'WSJ',
  'Washington Post',
  'Associated Press', 'AP',
  
  // VPNサービス（公式情報として信頼）
  'ExpressVPN',
  'NordVPN',
  'Surfshark',
  'Private Internet Access', 'PIA',
  'ProtonVPN', 'Proton VPN',
  'CyberGhost',
  'IPVanish',
  'Mullvad',
  'Windscribe',
  'TunnelBear',
  'Hotspot Shield',
  'HideMyAss', 'HMA',
  'MillenVPN',
  'セカイVPN'
];

// 除外するメディア名（個人ブログ・まとめサイト等）
const EXCLUDED_MEDIA_NAMES = [
  'note',
  'blog', 'Blog', 'ブログ',
  'Ameba', 'アメブロ',
  'FC2',
  'livedoor',
  'はてな', 'Hatena',
  'WordPress',
  'Medium',
  'coki',
  'biggo.jp',
  'VOI.ID',
  'HelenTech',
  'マキナレコード',
  'ログミー',
  '매일경제', // 韓国メディア
  'マクリン', // アフィリエイトサイト
  'VOI' // インドネシアメディア
];

// ニュースの新鮮度（日数）
const NEWS_FRESHNESS_DAYS = 30; // 30日以内（約1ヶ月）

// ==========================================
// メイン: VPNニュース監視
// ==========================================

function monitorVPNNews() {
  Logger.log('==========================================');
  Logger.log('VPNニュース監視');
  Logger.log(`実行時刻: ${new Date().toLocaleString('ja-JP')}`);
  Logger.log('==========================================');
  Logger.log('');
  
  const allNews = [];
  
  // 各キーワードでニュースを検索
  VPN_NEWS_KEYWORDS.forEach(keyword => {
    Logger.log(`--- キーワード: ${keyword} ---`);
    
    try {
      const news = fetchNewsForKeyword(keyword);
      
      if (news.length > 0) {
        Logger.log(`✅ ${news.length}件のニュースを取得`);
        allNews.push(...news);
      } else {
        Logger.log(`ℹ️ 新しいニュースなし`);
      }
      
    } catch (error) {
      Logger.log(`❌ エラー: ${error}`);
    }
    
    Logger.log('');
    
    // レート制限回避
    Utilities.sleep(2000);
  });
  
  Logger.log('==========================================');
  Logger.log(`合計 ${allNews.length}件のニュースを取得`);
  Logger.log('==========================================');
  Logger.log('');
  
  // 重複除去
  const uniqueNews = removeDuplicateNews(allNews);
  Logger.log(`重複除去後: ${uniqueNews.length}件`);
  Logger.log('');
  
  // 信頼性フィルタ（強化版）
  Logger.log('--- 信頼性フィルタ（強化版）---');
  const trustedNews = uniqueNews.filter(news => {
    Logger.log(`チェック: ${news.title}`);
    const isTrusted = isTrustedSource(news);
    const isQualityTitle = checkNewsTitleQuality(news.title);
    const isRelated = isVPNRelated(news.title);
    const result = isTrusted && isQualityTitle && isRelated;
    if (!result) {
      Logger.log(`  → 除外`);
    }
    Logger.log('');
    return result;
  });
  Logger.log(`信頼性フィルタ後: ${trustedNews.length}件`);
  Logger.log('');
  
  // 期間フィルタ（2週間以内）
  const recentNews = trustedNews.filter(news => isNewsRecent(news.pubDate));
  Logger.log(`期間フィルタ後（${NEWS_FRESHNESS_DAYS}日以内）: ${recentNews.length}件`);
  Logger.log('');
  
  // 新規ニュースのみ処理
  const newNews = filterNewNews(recentNews);
  
  if (newNews.length > 0) {
    Logger.log(`🆕 新規ニュース: ${newNews.length}件`);
    Logger.log('');
    
    // 大量投稿の警告
    if (newNews.length > 10) {
      Logger.log(`⚠️ 注意: ${newNews.length}件の新規ニュースがあります`);
      Logger.log('Twitter Rate Limit回避のため、投稿を制限します');
      Logger.log('');
    }
    
    // 最新5件のみTwitter投稿（Rate Limit対策）
    const tweetsToPost = newNews.slice(0, 5);
    const tweetsToSaveOnly = newNews.slice(5);
    
    Logger.log(`📤 Twitter投稿: ${tweetsToPost.length}件`);
    Logger.log(`💾 Spreadsheet保存のみ: ${tweetsToSaveOnly.length}件`);
    Logger.log('');
    
    // Twitter投稿あり
    tweetsToPost.forEach((news, index) => {
      processNewsItem(news, true); // Twitter投稿あり
      
      // Rate Limit回避のため待機（5秒）
      if (index < tweetsToPost.length - 1) {
        Logger.log('⏳ 5秒待機中...');
        Logger.log('');
        Utilities.sleep(5000);
      }
    });
    
    // Spreadsheet保存のみ
    tweetsToSaveOnly.forEach(news => {
      processNewsItem(news, false); // Twitter投稿なし
    });
  } else {
    Logger.log('ℹ️ 新規ニュースなし');
  }
  
  Logger.log('');
  Logger.log('==========================================');
  Logger.log('監視完了');
  Logger.log('==========================================');
  
  return newNews;
}

// ==========================================
// Google News RSS取得
// ==========================================

function fetchNewsForKeyword(keyword) {
  const rssUrl = GOOGLE_NEWS_RSS_BASE + encodeURIComponent(keyword) + '&hl=ja&gl=JP&ceid=JP:ja';
  
  Logger.log(`RSS URL: ${rssUrl}`);
  
  try {
    const response = UrlFetchApp.fetch(rssUrl, {
      muteHttpExceptions: true
    });
    
    if (response.getResponseCode() !== 200) {
      Logger.log(`⚠️ HTTP ${response.getResponseCode()}`);
      return [];
    }
    
    const xml = response.getContentText();
    const news = parseGoogleNewsRSS(xml, keyword);
    
    return news;
    
  } catch (error) {
    Logger.log(`❌ RSS取得エラー: ${error}`);
    return [];
  }
}

// ==========================================
// RSS XMLパース
// ==========================================

function parseGoogleNewsRSS(xml, keyword) {
  const news = [];
  
  try {
    const document = XmlService.parse(xml);
    const root = document.getRootElement();
    const channel = root.getChild('channel');
    const items = channel.getChildren('item');
    
    // 最新5件のみ取得
    const recentItems = items.slice(0, 5);
    
    recentItems.forEach(item => {
      const title = item.getChildText('title');
      const link = item.getChildText('link');
      const pubDate = item.getChildText('pubDate');
      const description = item.getChildText('description') || '';
      
      news.push({
        keyword: keyword,
        title: title,
        link: link,
        pubDate: new Date(pubDate),
        description: description,
        timestamp: new Date()
      });
    });
    
  } catch (error) {
    Logger.log(`❌ XMLパースエラー: ${error}`);
  }
  
  return news;
}

// ==========================================
// 重複除去
// ==========================================

function removeDuplicateNews(newsArray) {
  const seen = new Set();
  const unique = [];
  
  newsArray.forEach(news => {
    const key = news.link; // リンクで重複判定
    
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(news);
    }
  });
  
  return unique;
}

// ==========================================
// 信頼性チェック（強化版）
// ==========================================

function extractMediaNameFromTitle(title) {
  // タイトルから末尾のメディア名を抽出
  // 例: "記事タイトル - GIGAZINE" → "GIGAZINE"
  
  const patterns = [
    / - (.+)$/,           // " - メディア名"
    / ― (.+)$/,           // " ― メディア名"
    / \| (.+)$/,          // " | メディア名"
    / 【(.+)】$/,         // " 【メディア名】"
  ];
  
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  return null;
}

function isTrustedMedia(title) {
  const mediaName = extractMediaNameFromTitle(title);
  
  if (!mediaName) {
    // 【修正】メディア名が抽出できない場合は除外（厳格化）
    Logger.log(`  ❌ メディア名なし: 除外`);
    return false;
  }
  
  // 除外メディアチェック（優先）
  for (const excluded of EXCLUDED_MEDIA_NAMES) {
    if (mediaName.includes(excluded) || excluded.includes(mediaName)) {
      Logger.log(`  ❌ 除外メディア: ${mediaName}`);
      return false;
    }
  }
  
  // 信頼できるメディアチェック
  for (const trusted of TRUSTED_MEDIA_NAMES) {
    if (mediaName.includes(trusted) || trusted.includes(mediaName)) {
      Logger.log(`  ✅ 信頼できるメディア: ${mediaName}`);
      return true;
    }
  }
  
  // 【修正】ホワイトリストにない場合は除外（厳格化）
  Logger.log(`  ❌ 未登録メディア: ${mediaName} - 除外`);
  return false;
}

function isTrustedSource(news) {
  // ニュースオブジェクト全体をチェック
  return isTrustedMedia(news.title);
}

function checkNewsTitleQuality(title) {
  // タイトルから信頼性をチェック
  
  // 【修正】除外キーワード（ブログっぽい表現 + 不適切コンテンツ）
  const excludePatterns = [
    /まとめ$/,
    /〜してみた/,
    /やってみた/,
    /おすすめ\d+選/,
    /ランキング$/,
    /口コミ/,
    /〜\d+選$/,
    /ポルノ/,
    /アダルト/,
    /エロ/,
    /広告なしで/,
    /無料で/
  ];
  
  for (const pattern of excludePatterns) {
    if (pattern.test(title)) {
      Logger.log(`  ❌ 除外パターン: ${pattern}`);
      return false;
    }
  }
  
  return true;
}

// ==========================================
// VPN関連性チェック（強化版）
// ==========================================

function isVPNRelated(title) {
  // タイトルに「VPN」または関連用語が含まれているかチェック
  const titleLower = title.toLowerCase();
  
  // VPNまたは関連用語のチェック
  const vpnRelatedTerms = [
    'vpn',
    '位置情報',      // 「位置情報」と「偽装」が近くにあればOK
    '位置偽装',      // 短縮形
    'ip偽装',
    'ipアドレス',    // 「ipアドレス」と「変更」が近くにあればOK
    'geo-blocking',
    'ジオブロック',
    '地域制限',
    '国制限',
    'プロキシ',
    'proxy',
    'トンネリング',
    'tunneling'
  ];
  
  let hasVPNTerm = false;
  for (const term of vpnRelatedTerms) {
    if (titleLower.includes(term.toLowerCase())) {
      Logger.log(`  ✅ VPN関連用語: ${term}`);
      hasVPNTerm = true;
      break;
    }
  }
  
  // 「位置情報」と「偽装」の組み合わせチェック
  if (!hasVPNTerm && titleLower.includes('位置情報') && titleLower.includes('偽装')) {
    Logger.log(`  ✅ VPN関連用語: 位置情報 + 偽装`);
    hasVPNTerm = true;
  }
  
  // 「IPアドレス」と「変更」の組み合わせチェック
  if (!hasVPNTerm && titleLower.includes('ipアドレス') && titleLower.includes('変更')) {
    Logger.log(`  ✅ VPN関連用語: IPアドレス + 変更`);
    hasVPNTerm = true;
  }
  
  if (!hasVPNTerm) {
    Logger.log(`  ❌ VPN関連用語なし`);
    return false;
  }
  
  // 【追加】企業向けVPN記事を除外
  const enterpriseKeywords = [
    '企業',
    '法人',
    '社内',
    'リモートワーク',
    'テレワーク',
    '在宅勤務',
    'ゼロトラスト',
    'zero trust',
    'sase',
    'sd-wan',
    'セキュアアクセス',
    '導入',
    '構築',
    'ネットワーク管理',
    'vpn接続を許可',
    'vpnを導入',
    'vpn環境',
    'vpnソリューション',
    'ビジネス',
    'business vpn',
    'enterprise vpn',
    'corporate vpn'
  ];
  
  for (const keyword of enterpriseKeywords) {
    if (titleLower.includes(keyword.toLowerCase())) {
      Logger.log(`  ❌ 企業向けVPN: ${keyword}`);
      return false;
    }
  }
  
  // 【追加】VPN関連でも除外すべきキーワード
  const excludeKeywords = [
    'ポルノ',
    'アダルト',
    '広告',
    'yandex'
  ];
  
  for (const keyword of excludeKeywords) {
    if (titleLower.includes(keyword.toLowerCase())) {
      Logger.log(`  ❌ 除外キーワード: ${keyword}`);
      return false;
    }
  }
  
  // 【追加】個人向けVPNサービス名があれば優先的に通す
  const consumerVPNServices = [
    'nordvpn',
    'expressvpn',
    'surfshark',
    'cyberghost',
    'private internet access',
    'protonvpn',
    'ipvanish',
    'mullvad',
    'windscribe',
    'tunnelbear',
    'hotspot shield',
    'hidemyass',
    'millenvpn',
    'ミレンvpn',
    'セカイvpn'
  ];
  
  for (const service of consumerVPNServices) {
    if (titleLower.includes(service.toLowerCase())) {
      Logger.log(`  ✅ 個人向けVPNサービス: ${service}`);
      return true;
    }
  }
  
  // 【追加】VPN本来の用途に関連するキーワード（個人ユーザー向け）
  const relevantKeywords = [
    '規制',
    '禁止',
    'ban',
    'block',
    'crackdown',
    '法案',
    'law',
    'privacy',
    'プライバシー',
    'government',
    '政府',
    '中国',
    'china',
    'russia',
    'ロシア',
    'iran',
    'イラン',
    'censorship',
    '検閲',
    'streaming',
    'ストリーミング',
    'netflix',
    'youtube premium',
    'youtube',
    'disney+',
    'hulu',
    'amazon prime',
    'anonymous',
    '匿名',
    'premium',
    'サブスク',
    'subscription'
  ];
  
  for (const keyword of relevantKeywords) {
    if (titleLower.includes(keyword.toLowerCase())) {
      Logger.log(`  ✅ 関連キーワード: ${keyword}`);
      return true;
    }
  }
  
  // VPN関連キーワードがない場合は保留（通す）
  // ただし、企業向けキーワードがなければOK
  Logger.log(`  ⚠️ 個人向けVPN関連キーワードなし: 保留（通す）`);
  return true;
}

// ==========================================
// 期間フィルタ
// ==========================================

function isNewsRecent(pubDate) {
  const now = new Date();
  const newsDate = new Date(pubDate);
  const diffDays = (now - newsDate) / (1000 * 60 * 60 * 24);
  
  return diffDays <= NEWS_FRESHNESS_DAYS;
}

// ==========================================
// 新規ニュースフィルタ
// ==========================================

function filterNewNews(newsArray) {
  const sheet = getNewsSheet();
  
  if (sheet.getLastRow() <= 1) {
    // 初回実行（ヘッダーのみ）
    return newsArray;
  }
  
  // 既存のリンク一覧を取得
  const existingLinks = sheet.getRange(2, 3, sheet.getLastRow() - 1, 1)
    .getValues()
    .flat()
    .filter(link => link);
  
  const existingLinksSet = new Set(existingLinks);
  
  // 新規のみフィルタ
  const newNews = newsArray.filter(news => !existingLinksSet.has(news.link));
  
  return newNews;
}

// ==========================================
// ニュース処理
// ==========================================

function processNewsItem(news, shouldTweet = true) {
  Logger.log('--- ニュース処理 ---');
  Logger.log(`タイトル: ${news.title}`);
  Logger.log(`キーワード: ${news.keyword}`);
  Logger.log(`公開日: ${news.pubDate.toLocaleString('ja-JP')}`);
  Logger.log('');
  
  // Spreadsheetに保存
  saveNewsToSheet(news, shouldTweet);
  
  // Twitter投稿（フラグがtrueの場合のみ）
  if (shouldTweet) {
    const tweet = generateNewsTweet(news);
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
  } else {
    Logger.log('💾 Spreadsheet保存のみ（Twitter投稿スキップ）');
  }
  
  Logger.log('');
}

// ==========================================
// Twitter投稿メッセージ生成
// ==========================================

function generateNewsTweet(news) {
  // タイトルを短縮（必要に応じて）
  let title = news.title;
  if (title.length > 80) {
    title = title.substring(0, 77) + '...';
  }
  
  const tweet = `🚨 VPN関連ニュース

${title}

詳細▶️ ${news.link}

#VPN #セキュリティニュース`;
  
  return tweet;
}

// ==========================================
// Spreadsheet保存
// ==========================================

function getNewsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(NEWS_SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(NEWS_SHEET_NAME);
    sheet.appendRow([
      'タイムスタンプ',
      'キーワード',
      'リンク',
      'タイトル',
      '公開日',
      'Twitter投稿',
      'メルマガ配信'  // 追加
    ]);
    sheet.getRange(1, 1, 1, 7)
      .setFontWeight('bold')
      .setBackground('#4285f4')
      .setFontColor('#ffffff');
    
    // 列幅調整
    sheet.setColumnWidth(1, 180);
    sheet.setColumnWidth(2, 150);
    sheet.setColumnWidth(3, 400);
    sheet.setColumnWidth(4, 400);
    sheet.setColumnWidth(5, 180);
    sheet.setColumnWidth(6, 100);
    sheet.setColumnWidth(7, 100);  // 追加
  }
  
  return sheet;
}

function saveNewsToSheet(news, wasTweeted = true) {
  const sheet = getNewsSheet();
  
  sheet.appendRow([
    news.timestamp,
    news.keyword,
    news.link,
    news.title,
    news.pubDate,
    wasTweeted ? 'はい' : 'スキップ',
    ''  // メルマガ配信フラグ（初期値：空）
  ]);
}

// ==========================================
// セットアップ
// ==========================================

function setupNewsSheet() {
  Logger.log('==========================================');
  Logger.log('VPNニュース履歴シート セットアップ');
  Logger.log('==========================================');
  
  const sheet = getNewsSheet();
  
  Logger.log('✅ シート準備完了');
  Logger.log('==========================================');
}

// ==========================================
// トリガー設定
// ==========================================

function setupNewsMonitorTriggers() {
  Logger.log('==========================================');
  Logger.log('ニュース監視トリガー設定');
  Logger.log('==========================================');
  Logger.log('');
  
  // 既存のトリガーを削除
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'monitorVPNNews') {
      ScriptApp.deleteTrigger(trigger);
      Logger.log('🗑️ 既存トリガー削除');
    }
  });
  
  // 6時間ごとに実行
  ScriptApp.newTrigger('monitorVPNNews')
    .timeBased()
    .everyHours(6)
    .create();
  
  Logger.log('✅ トリガー設定完了');
  Logger.log('実行タイミング: 6時間ごと');
  Logger.log('');
  Logger.log('==========================================');
}

// ==========================================
// テスト
// ==========================================

function testNewsMonitor() {
  Logger.log('==========================================');
  Logger.log('ニュース監視テスト');
  Logger.log('==========================================');
  Logger.log('');
  
  monitorVPNNews();
}

// キーワード別テスト
function testSingleKeyword() {
  Logger.log('==========================================');
  Logger.log('単一キーワードテスト');
  Logger.log('==========================================');
  Logger.log('');
  
  const keyword = 'VPN China blocked';
  Logger.log(`キーワード: ${keyword}`);
  Logger.log('');
  
  const news = fetchNewsForKeyword(keyword);
  
  Logger.log(`取得件数: ${news.length}件`);
  Logger.log('');
  
  news.forEach((item, index) => {
    Logger.log(`--- ニュース ${index + 1} ---`);
    Logger.log(`タイトル: ${item.title}`);
    Logger.log(`リンク: ${item.link}`);
    Logger.log(`公開日: ${item.pubDate.toLocaleString('ja-JP')}`);
    Logger.log('');
  });
  
  Logger.log('==========================================');
}
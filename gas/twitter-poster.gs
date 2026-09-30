/**
 * ============================================
 * Twitter投稿システム統合版（OAuth 1.0a）
 * VPN速度ランキング＋トラストスコア更新ツイート
 * ============================================
 * 
 * 機能:
 * 1. 日次VPN速度ランキングツイート（10時、15時、20時）
 * 2. 月次トラストスコア更新ツイート
 * 3. トラストスコア順位変動ツイート
 * 4. 重複防止機能付き
 * 
 * @author Tokyo VPN Speed Monitor Project
 * @version 2.0
 * @license MIT
 */

// ==========================================
// 共通設定
// ==========================================

const TWITTER_CONFIG = {
  API_KEY: PropertiesService.getScriptProperties().getProperty('TWITTER_API_KEY') || '',
  API_SECRET: PropertiesService.getScriptProperties().getProperty('TWITTER_API_SECRET') || '',
  ACCESS_TOKEN: PropertiesService.getScriptProperties().getProperty('TWITTER_ACCESS_TOKEN') || '',
  ACCESS_TOKEN_SECRET: PropertiesService.getScriptProperties().getProperty('TWITTER_ACCESS_TOKEN_SECRET') || ''
};

// VPN速度データAPI
const VPN_API_URL = PropertiesService.getScriptProperties().getProperty('VPN_API_URL') || '';

// URL設定
const URL_CONFIG = {
  SPEED_RANKING: 'https://www.blstweb.jp/network/vpn/tokyo-vpn-speed-monitor/',
  TRUST_RANKING: 'https://www.blstweb.jp/network/vpn/vpn-trust-ranking/'
};

// トラストスコア設定
const TRUST_TWEET_CONFIG = {
  TRUST_API_URL: PropertiesService.getScriptProperties().getProperty('TRUST_API_URL') || '',
  USE_SPREADSHEET: true,
  SPREADSHEET_ID: PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') || '',
  TRUST_SHEET_NAME: 'トラストスコア'
};

// 重複防止用キャッシュキー
const CACHE_KEYS = {
  LAST_TWEET: 'last_tweet_content',
  LAST_TWEET_TIME: 'last_tweet_timestamp',
  PREVIOUS_TRUST_RANKING: 'previous_trust_ranking'
};

// ==========================================
// 重複防止機能
// ==========================================

/**
 * 重複ツイートかどうかをチェック
 * @param {string} tweetContent - ツイート内容
 * @returns {boolean} 重複の場合true
 */
function isDuplicateTweet(tweetContent) {
  const cache = CacheService.getScriptCache();
  const lastTweet = cache.get(CACHE_KEYS.LAST_TWEET);
  const lastTime = cache.get(CACHE_KEYS.LAST_TWEET_TIME);
  
  if (!lastTweet || !lastTime) return false;
  
  const minutesSince = (Date.now() - parseInt(lastTime)) / (1000 * 60);
  
  if (minutesSince < 5 && lastTweet === tweetContent) {
    Logger.log(`⚠️ 重複検知: ${minutesSince.toFixed(1)}分前に同じ内容を投稿済み`);
    return true;
  }
  
  return false;
}

/**
 * ツイート内容をキャッシュに記録
 * @param {string} tweetContent - ツイート内容
 */
function recordTweet(tweetContent) {
  const cache = CacheService.getScriptCache();
  cache.put(CACHE_KEYS.LAST_TWEET, tweetContent, 21600); // 6時間
  cache.put(CACHE_KEYS.LAST_TWEET_TIME, Date.now().toString(), 21600);
}

// ==========================================
// OAuth 1.0a署名生成
// ==========================================

/**
 * OAuth署名を生成
 * @param {string} method - HTTPメソッド
 * @param {string} url - リクエストURL
 * @param {Object} params - OAuthパラメータ
 * @param {string} tokenSecret - アクセストークンシークレット
 * @returns {string} Base64エンコードされた署名
 */
function generateOAuthSignature(method, url, params, tokenSecret) {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
  
  const signatureBase = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(sortedParams)
  ].join('&');
  
  const signingKey = `${encodeURIComponent(TWITTER_CONFIG.API_SECRET)}&${encodeURIComponent(tokenSecret)}`;
  
  const signature = Utilities.computeHmacSignature(
    Utilities.MacAlgorithm.HMAC_SHA_1,
    signatureBase,
    signingKey
  );
  
  return Utilities.base64Encode(signature);
}

// ==========================================
// Twitter投稿（共通）
// ==========================================

/**
 * Twitterに投稿
 * @param {string} text - ツイート内容
 * @returns {Object|null} 成功時はレスポンス、失敗時はnull
 */
function postToTwitter(text) {
  if (!TWITTER_CONFIG.API_KEY || !TWITTER_CONFIG.ACCESS_TOKEN) {
    Logger.log('⚠️ Twitter API credentials not configured');
    return null;
  }
  
  const url = 'https://api.twitter.com/2/tweets';
  const method = 'POST';
  
  const oauthParams = {
    oauth_consumer_key: TWITTER_CONFIG.API_KEY,
    oauth_token: TWITTER_CONFIG.ACCESS_TOKEN,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_nonce: Utilities.getUuid(),
    oauth_version: '1.0'
  };
  
  oauthParams.oauth_signature = generateOAuthSignature(
    method,
    url,
    oauthParams,
    TWITTER_CONFIG.ACCESS_TOKEN_SECRET
  );
  
  const authHeader = 'OAuth ' + Object.keys(oauthParams)
    .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
    .join(', ');
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: { 'Authorization': authHeader },
    payload: JSON.stringify({ text: text }),
    muteHttpExceptions: true
  };
  
  try {
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode === 201) {
      const result = JSON.parse(response.getContentText());
      Logger.log('✅ ツイート成功！ID: ' + result.data.id);
      return result;
    } else {
      Logger.log('❌ エラー: ' + response.getContentText());
      return null;
    }
  } catch (error) {
    Logger.log('❌ 例外エラー: ' + error);
    return null;
  }
}

// ==========================================
// VPN速度ランキングツイート
// ==========================================

/**
 * VPN速度ランキングツイートを生成・投稿
 * @returns {Object|null} 投稿結果
 */
function generateAndPostSpeedTweet() {
  try {
    Logger.log('==========================================');
    Logger.log('VPN速度ランキングツイート');
    Logger.log(`実行時刻: ${new Date().toLocaleString('ja-JP')}`);
    Logger.log('==========================================');
    
    if (!VPN_API_URL) {
      Logger.log('❌ VPN_API_URL not configured');
      return null;
    }
    
    const response = UrlFetchApp.fetch(VPN_API_URL + '?type=ranking&region=JP');
    const data = JSON.parse(response.getContentText());
    
    if (!data.data || data.data.length < 3) {
      Logger.log('❌ データ不足');
      return null;
    }
    
    const vpn1 = data.data[0].name;
    const speed1 = Math.round(data.data[0].download);
    const vpn2 = data.data[1].name;
    const speed2 = Math.round(data.data[1].download);
    const vpn3 = data.data[2].name;
    const speed3 = Math.round(data.data[2].download);
    
    const updateTime = Utilities.formatDate(new Date(data.lastUpdate), 'JST', 'MM/dd HH:mm');
    
    const tweet = `📊 VPN速度ランキング（編集部推定値）

🥇 ${vpn1}: ${speed1} Mbps
🥈 ${vpn2}: ${speed2} Mbps
🥉 ${vpn3}: ${speed3} Mbps

最終改訂: ${updateTime}
詳細データ▶️ ${URL_CONFIG.SPEED_RANKING}

#VPN #リモートワーク`;
    
    Logger.log('📝 ツイート内容:\n' + tweet);
    
    if (isDuplicateTweet(tweet)) {
      Logger.log('⚠️ 重複投稿を検知 - スキップします');
      return { skipped: true };
    }
    
    const result = postToTwitter(tweet);
    
    if (result) {
      recordTweet(tweet);
    }
    
    return result;
    
  } catch (error) {
    Logger.log('❌ エラー: ' + error);
    return null;
  }
}

// 後方互換性のためのエイリアス
function generateAndPostTweet() {
  return generateAndPostSpeedTweet();
}

// ==========================================
// トラストスコアツイート
// ==========================================

/**
 * トラストスコアデータを取得
 * @returns {Array} トラストスコアデータ配列
 */
function getTrustScoreDataForTweet() {
  if (TRUST_TWEET_CONFIG.USE_SPREADSHEET && TRUST_TWEET_CONFIG.SPREADSHEET_ID) {
    const ss = SpreadsheetApp.openById(TRUST_TWEET_CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(TRUST_TWEET_CONFIG.TRUST_SHEET_NAME);
    
    if (!sheet || sheet.getLastRow() <= 1) {
      return [];
    }
    
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 15).getValues();
    
    return data.map(row => ({
      vpnName: row[1],
      headquarters: row[2],
      totalScore: row[13],
      grade: row[14]
    })).sort((a, b) => b.totalScore - a.totalScore);
    
  } else if (TRUST_TWEET_CONFIG.TRUST_API_URL) {
    const response = UrlFetchApp.fetch(TRUST_TWEET_CONFIG.TRUST_API_URL + '?action=getTrustScores');
    const result = JSON.parse(response.getContentText());
    
    if (result.success) {
      return result.data;
    }
  }
  
  return [];
}

/**
 * トラストスコア更新ツイートを生成
 * @param {Array} trustData - トラストスコアデータ
 * @returns {string} ツイート内容
 */
function generateTrustScoreTweet(trustData) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  
  const top3 = trustData.slice(0, 3);
  const gradeA = trustData.filter(v => v.grade === 'A').length;
  
  const tweet = `🔒 VPNトラストスコア更新【${year}年${month}月】

プライバシー・透明性の総合評価

🥇 ${top3[0].vpnName}: ${top3[0].totalScore}点（${top3[0].grade}）
🥈 ${top3[1].vpnName}: ${top3[1].totalScore}点（${top3[1].grade}）
🥉 ${top3[2].vpnName}: ${top3[2].totalScore}点（${top3[2].grade}）

A評価: ${gradeA}社

詳細▶️ ${URL_CONFIG.TRUST_RANKING}

#VPN #プライバシー #セキュリティ`;

  return tweet;
}

/**
 * トラストスコア更新ツイートを投稿
 * @returns {Object|null} 投稿結果
 */
function postTrustScoreUpdateTweet() {
  Logger.log('==========================================');
  Logger.log('トラストスコア更新ツイート');
  Logger.log(`実行時刻: ${new Date().toLocaleString('ja-JP')}`);
  Logger.log('==========================================');
  
  try {
    const trustData = getTrustScoreDataForTweet();
    
    if (!trustData || trustData.length === 0) {
      Logger.log('❌ トラストスコアデータなし');
      return null;
    }
    
    const tweet = generateTrustScoreTweet(trustData);
    
    Logger.log('📝 ツイート内容:');
    Logger.log(tweet);
    
    if (isDuplicateTweet(tweet)) {
      Logger.log('⚠️ 重複投稿を検知 - スキップします');
      return { skipped: true };
    }
    
    const result = postToTwitter(tweet);
    
    if (result) {
      Logger.log('✅ ツイート成功');
      recordTweet(tweet);
    }
    
    return result;
    
  } catch (error) {
    Logger.log(`❌ エラー: ${error}`);
    return null;
  }
}

// ==========================================
// トリガー設定
// ==========================================

/**
 * 全てのトリガーを設定
 */
function setupAllTriggers() {
  Logger.log('==========================================');
  Logger.log('全トリガー設定');
  Logger.log('==========================================');
  
  const triggers = ScriptApp.getProjectTriggers();
  const targetFunctions = ['generateAndPostSpeedTweet', 'generateAndPostTweet', 'postTrustScoreUpdateTweet'];
  
  triggers.forEach(t => {
    if (targetFunctions.includes(t.getHandlerFunction())) {
      ScriptApp.deleteTrigger(t);
      Logger.log(`🗑️ 削除: ${t.getHandlerFunction()}`);
    }
  });
  
  // VPN速度ランキングツイート（毎日10時、15時、20時）
  ScriptApp.newTrigger('generateAndPostSpeedTweet').timeBased().atHour(10).everyDays(1).create();
  ScriptApp.newTrigger('generateAndPostSpeedTweet').timeBased().atHour(15).everyDays(1).create();
  ScriptApp.newTrigger('generateAndPostSpeedTweet').timeBased().atHour(20).everyDays(1).create();
  Logger.log('✅ 速度ランキングツイート: 10時、15時、20時');
  
  // トラストスコア更新ツイート（毎月1日 11時）
  ScriptApp.newTrigger('postTrustScoreUpdateTweet')
    .timeBased()
    .onMonthDay(1)
    .atHour(11)
    .create();
  Logger.log('✅ トラストスコアツイート: 毎月1日 11時');
  
  Logger.log('✅ 全トリガー設定完了');
}

// ==========================================
// テスト関数
// ==========================================

function testSpeedTweet() {
  Logger.log('==========================================');
  Logger.log('速度ランキングツイート テスト');
  Logger.log('==========================================');
  
  // テスト用：実際の投稿はしない
  Logger.log('⚠️ テストモード - 実際の投稿は行いません');
}

function testTrustScoreTweet() {
  Logger.log('==========================================');
  Logger.log('トラストスコアツイート テスト');
  Logger.log('==========================================');
  
  const trustData = getTrustScoreDataForTweet();
  
  Logger.log(`取得データ: ${trustData.length}社`);
  
  if (trustData.length >= 3) {
    const tweet = generateTrustScoreTweet(trustData);
    
    Logger.log('生成されたツイート:');
    Logger.log('---');
    Logger.log(tweet);
    Logger.log('---');
    Logger.log(`文字数: ${tweet.length}`);
  } else {
    Logger.log('❌ データ不足');
  }
}

function testAllTweetFunctions() {
  Logger.log('==========================================');
  Logger.log('全機能テスト');
  Logger.log('==========================================');
  
  Logger.log('【1】速度ランキングツイート テスト');
  testSpeedTweet();
  
  Logger.log('');
  Logger.log('【2】トラストスコアツイート テスト');
  testTrustScoreTweet();
  
  Logger.log('');
  Logger.log('✅ 全テスト完了');
}

// Twitter投稿システム - OAuth 1.0a版
// Google Apps ScriptからTwitterに投稿

// ==========================================
// 設定 - 以下の4つを実際の値に置き換えてください
// ==========================================

const TWITTER_CONFIG = {
  API_KEY: 'YOUR_API_KEY_HERE',
  API_SECRET: 'YOUR_API_SECRET_HERE',
  ACCESS_TOKEN: 'YOUR_ACCESS_TOKEN_HERE',
  ACCESS_TOKEN_SECRET: 'YOUR_ACCESS_TOKEN_SECRET_HERE'
};

const VPN_API_URL = 'https://script.google.com/macros/s/AKfycbzz1dBNdhDurB4Rwj8NXCu3E2FMjoyTRqXCPAWldo9Q-01awOKaG3fEWVoOX_cOx_yU/exec';
const RANKING_URL = 'https://www.blstweb.jp/network/vpn/vpn-speed-ranking/';

// ==========================================
// OAuth 1.0a署名生成
// ==========================================

function generateOAuthSignature(method, url, params, tokenSecret) {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(params[key]))
    .join('&');
  
  const signatureBase = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(sortedParams)
  ].join('&');
  
  const signingKey = encodeURIComponent(TWITTER_CONFIG.API_SECRET) + '&' + encodeURIComponent(tokenSecret);
  
  const signature = Utilities.computeHmacSignature(
    Utilities.MacAlgorithm.HMAC_SHA_1,
    signatureBase,
    signingKey
  );
  
  return Utilities.base64Encode(signature);
}

// ==========================================
// Twitter投稿
// ==========================================

function postToTwitter(text) {
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
    .map(key => encodeURIComponent(key) + '="' + encodeURIComponent(oauthParams[key]) + '"')
    .join(', ');
  
  const payload = {
    text: text
  };
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': authHeader
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  try {
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    Logger.log('レスポンスコード: ' + responseCode);
    Logger.log('レスポンス内容: ' + responseText);
    
    if (responseCode === 201) {
      const result = JSON.parse(responseText);
      Logger.log('✅ ツイート成功');
      Logger.log('ツイートID: ' + result.data.id);
      return result;
    } else {
      Logger.log('❌ エラー: ' + responseText);
      return null;
    }
  } catch (error) {
    Logger.log('❌ 例外エラー: ' + error);
    return null;
  }
}

// ==========================================
// VPNデータ取得とツイート
// ==========================================

function generateAndPostTweet() {
  const response = UrlFetchApp.fetch(VPN_API_URL);
  const data = JSON.parse(response.getContentText());
  
  const vpn1 = data.data[0].name;
  const speed1 = Math.round(data.data[0].download);
  const vpn2 = data.data[1].name;
  const speed2 = Math.round(data.data[1].download);
  const vpn3 = data.data[2].name;
  const speed3 = Math.round(data.data[2].download);
  
  const tweet = '📊 今日のVPN速度ランキング（日本実測）\n\n' +
    '🥇 ' + vpn1 + ': ' + speed1 + ' Mbps\n' +
    '🥈 ' + vpn2 + ': ' + speed2 + ' Mbps\n' +
    '🥉 ' + vpn3 + ': ' + speed3 + ' Mbps\n\n' +
    '詳細データ▶️ ' + RANKING_URL + '\n\n' +
    '#VPN #速度測定 #リモートワーク';
  
  Logger.log('ツイート内容:\n' + tweet);
  
  const result = postToTwitter(tweet);
  
  return result;
}

// ==========================================
// テスト実行
// ==========================================

function testTweet() {
  const testText = '🧪 テストツイート\n\n' +
    'Google Apps Scriptからの自動投稿テストです。\n\n' +
    new Date().toLocaleString('ja-JP');
  
  Logger.log('テストツイート内容:\n' + testText);
  
  const result = postToTwitter(testText);
  
  if (result) {
    Logger.log('✅ テスト成功 Twitterを確認してください');
  } else {
    Logger.log('❌ テスト失敗 設定を確認してください');
  }
}

// ==========================================
// トリガー設定
// ==========================================

function setupTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'generateAndPostTweet') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  ScriptApp.newTrigger('generateAndPostTweet')
    .timeBased()
    .atHour(10)
    .everyDays(1)
    .create();
  
  ScriptApp.newTrigger('generateAndPostTweet')
    .timeBased()
    .atHour(15)
    .everyDays(1)
    .create();
  
  ScriptApp.newTrigger('generateAndPostTweet')
    .timeBased()
    .atHour(20)
    .everyDays(1)
    .create();
  
  Logger.log('✅ トリガー設定完了 毎日10時 15時 20時に実行');
}

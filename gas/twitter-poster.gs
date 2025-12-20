/**
 * ============================================
 * Twitter Poster
 * OAuth 1.0a Twitter API integration
 * ============================================
 * 
 * Features:
 * - OAuth 1.0a authentication
 * - Duplicate detection
 * - Rate limiting
 * - Error handling
 * 
 * Setup:
 * 1. Get Twitter API credentials
 * 2. Add to config.gs
 * 3. Test with testTwitterPost()
 * 
 * Repository: https://github.com/yourusername/vpn-stability-ranking
 */

// Configuration loaded from config.gs
const TWITTER_POSTER_CONFIG = {
  CONSUMER_KEY: typeof TWITTER_CONFIG !== 'undefined' ? TWITTER_CONFIG.CONSUMER_KEY : '',
  CONSUMER_SECRET: typeof TWITTER_CONFIG !== 'undefined' ? TWITTER_CONFIG.CONSUMER_SECRET : '',
  ACCESS_TOKEN: typeof TWITTER_CONFIG !== 'undefined' ? TWITTER_CONFIG.ACCESS_TOKEN : '',
  ACCESS_TOKEN_SECRET: typeof TWITTER_CONFIG !== 'undefined' ? TWITTER_CONFIG.ACCESS_TOKEN_SECRET : '',
  
  API_URL: 'https://api.twitter.com/2/tweets',
  USE_CACHE: true,
  CACHE_DURATION: 300 // 5 minutes
};

function postToTwitter(tweetText) {
  if (!TWITTER_POSTER_CONFIG.CONSUMER_KEY || TWITTER_POSTER_CONFIG.CONSUMER_KEY === 'YOUR_CONSUMER_KEY') {
    Logger.log('❌ Twitter API not configured');
    return false;
  }
  
  // Check for duplicates
  if (TWITTER_POSTER_CONFIG.USE_CACHE && isDuplicateTweet(tweetText)) {
    Logger.log('ℹ️ Duplicate tweet detected, skipping');
    return false;
  }
  
  try {
    const response = sendTweet(tweetText);
    
    if (response) {
      Logger.log('✅ Tweet posted successfully');
      recordTweet(tweetText);
      return true;
    } else {
      Logger.log('❌ Tweet posting failed');
      return false;
    }
    
  } catch (error) {
    Logger.log(`❌ Twitter error: ${error.message}`);
    return false;
  }
}

function sendTweet(text) {
  const payload = JSON.stringify({
    text: text
  });
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: payload,
    headers: {
      'Authorization': getOAuthHeader('POST', TWITTER_POSTER_CONFIG.API_URL, {})
    },
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch(TWITTER_POSTER_CONFIG.API_URL, options);
  const responseCode = response.getResponseCode();
  
  if (responseCode === 201) {
    return JSON.parse(response.getContentText());
  } else {
    Logger.log(`HTTP ${responseCode}: ${response.getContentText()}`);
    return null;
  }
}

function getOAuthHeader(method, url, params) {
  const oauth = {
    oauth_consumer_key: TWITTER_POSTER_CONFIG.CONSUMER_KEY,
    oauth_token: TWITTER_POSTER_CONFIG.ACCESS_TOKEN,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_nonce: Utilities.getUuid(),
    oauth_version: '1.0'
  };
  
  const signature = generateSignature(method, url, Object.assign({}, oauth, params));
  oauth.oauth_signature = signature;
  
  const authHeader = 'OAuth ' + Object.keys(oauth)
    .sort()
    .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(oauth[key])}"`)
    .join(', ');
  
  return authHeader;
}

function generateSignature(method, url, params) {
  const paramString = Object.keys(params)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
  
  const signatureBase = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(paramString)
  ].join('&');
  
  const signingKey = encodeURIComponent(TWITTER_POSTER_CONFIG.CONSUMER_SECRET) + '&' + 
                     encodeURIComponent(TWITTER_POSTER_CONFIG.ACCESS_TOKEN_SECRET);
  
  const signature = Utilities.computeHmacSha1Signature(signatureBase, signingKey);
  return Utilities.base64Encode(signature);
}

function isDuplicateTweet(text) {
  const cache = CacheService.getScriptCache();
  const key = 'tweet_' + Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, text).toString();
  return cache.get(key) !== null;
}

function recordTweet(text) {
  const cache = CacheService.getScriptCache();
  const key = 'tweet_' + Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, text).toString();
  cache.put(key, '1', TWITTER_POSTER_CONFIG.CACHE_DURATION);
}

function testTwitterPost() {
  const testTweet = '🧪 Test tweet from VPN Stability Ranking system\n\n' +
                    `Timestamp: ${new Date().toLocaleString('ja-JP')}\n\n` +
                    '#VPN #Test';
  
  Logger.log('Posting test tweet...');
  Logger.log(`Content: ${testTweet}`);
  
  const result = postToTwitter(testTweet);
  
  if (result) {
    Logger.log('✅ Test successful');
  } else {
    Logger.log('❌ Test failed');
  }
}

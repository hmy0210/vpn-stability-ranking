/**
 * ============================================
 * Twitter Auto-Posting System
 * ============================================
 * Purpose: Automated VPN ranking tweets
 * Frequency: 3 times daily (10:00, 15:00, 20:00)
 * Authentication: OAuth 1.0a (required for Twitter API v2)
 * License: MIT
 * ============================================
 */

// ==================== Configuration ====================
// Replace these with your own Twitter API credentials
// Get them from: https://developer.twitter.com
const TWITTER_CONFIG = {
  API_KEY: 'YOUR_API_KEY_HERE',
  API_SECRET: 'YOUR_API_SECRET_HERE',
  ACCESS_TOKEN: 'YOUR_ACCESS_TOKEN_HERE',
  ACCESS_TOKEN_SECRET: 'YOUR_ACCESS_TOKEN_SECRET_HERE'
};

const VPN_API_URL = 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL';
const RANKING_URL = 'YOUR_RANKING_PAGE_URL';

// ==================== OAuth 1.0a Signature Generation ====================
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

// ==================== Post to Twitter ====================
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
    
    Logger.log('Response Code: ' + responseCode);
    Logger.log('Response: ' + responseText);
    
    if (responseCode === 201) {
      const result = JSON.parse(responseText);
      Logger.log('✅ Tweet posted successfully');
      Logger.log('Tweet ID: ' + result.data.id);
      return result;
    } else {
      Logger.log('❌ Error: ' + responseText);
      return null;
    }
  } catch (error) {
    Logger.log('❌ Exception: ' + error);
    return null;
  }
}

// ==================== Get VPN Data and Post Tweet ====================
function generateAndPostTweet() {
  // Get VPN data from API
  const response = UrlFetchApp.fetch(VPN_API_URL);
  const data = JSON.parse(response.getContentText());
  
  const vpn1 = data.data[0].name;
  const speed1 = Math.round(data.data[0].download);
  const vpn2 = data.data[1].name;
  const speed2 = Math.round(data.data[1].download);
  const vpn3 = data.data[2].name;
  const speed3 = Math.round(data.data[2].download);
  
  // Generate tweet text
  const tweet = '📊 VPN Speed Ranking (Japan)\n\n' +
    '🥇 ' + vpn1 + ': ' + speed1 + ' Mbps\n' +
    '🥈 ' + vpn2 + ': ' + speed2 + ' Mbps\n' +
    '🥉 ' + vpn3 + ': ' + speed3 + ' Mbps\n\n' +
    'Full rankings ▶️ ' + RANKING_URL + '\n\n' +
    '#VPN #SpeedTest #Network';
  
  Logger.log('Tweet content:\n' + tweet);
  
  // Post to Twitter
  const result = postToTwitter(tweet);
  
  return result;
}

// ==================== Test Function ====================
function testTweet() {
  const testText = '🧪 Test Tweet\n\n' +
    'This is an automated test tweet from Google Apps Script.\n\n' +
    new Date().toLocaleString('en-US');
  
  Logger.log('Test tweet content:\n' + testText);
  
  const result = postToTwitter(testText);
  
  if (result) {
    Logger.log('✅ Test successful! Check Twitter.');
  } else {
    Logger.log('❌ Test failed. Check configuration.');
  }
}

// ==================== Setup Triggers ====================
function setupTwitterTriggers() {
  // Delete existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'generateAndPostTweet') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Post at 10:00 daily
  ScriptApp.newTrigger('generateAndPostTweet')
    .timeBased()
    .atHour(10)
    .everyDays(1)
    .create();
  
  // Post at 15:00 daily
  ScriptApp.newTrigger('generateAndPostTweet')
    .timeBased()
    .atHour(15)
    .everyDays(1)
    .create();
  
  // Post at 20:00 daily
  ScriptApp.newTrigger('generateAndPostTweet')
    .timeBased()
    .atHour(20)
    .everyDays(1)
    .create();
  
  Logger.log('✅ Twitter triggers configured (10:00, 15:00, 20:00 daily)');
}

// ==================== Setup Instructions ====================
/**
 * SETUP INSTRUCTIONS:
 * 
 * 1. Get Twitter API Credentials:
 *    - Go to https://developer.twitter.com
 *    - Create a new app
 *    - Get API Key, API Secret, Access Token, and Access Token Secret
 * 
 * 2. Configure this script:
 *    - Replace TWITTER_CONFIG values with your credentials
 *    - Set VPN_API_URL to your Google Apps Script Web App URL
 *    - Set RANKING_URL to your ranking page URL
 * 
 * 3. Test the integration:
 *    - Run testTweet() function
 *    - Check if tweet appears on Twitter
 * 
 * 4. Setup automated posting:
 *    - Run setupTwitterTriggers() function
 *    - Tweets will be posted automatically 3 times daily
 * 
 * IMPORTANT NOTES:
 * - Twitter API v2 requires OAuth 1.0a for posting
 * - Bearer Token alone is NOT sufficient
 * - Make sure your app has "Read and Write" permissions
 */

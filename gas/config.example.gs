/**
 * ============================================
 * Configuration File (Example)
 * ============================================
 * 
 * Copy this file to config.gs and fill in your actual values.
 * DO NOT commit config.gs to GitHub - it contains sensitive data!
 */

// ==================== Google Spreadsheet ====================
const CONFIG = {
  // Your Google Spreadsheet ID
  // Find it in the URL: https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID/edit
  SPREADSHEET_ID: 'YOUR_SPREADSHEET_ID_HERE',
  
  // Timezone for logging and scheduling
  TIMEZONE: 'Asia/Tokyo',
  
  // Sheet names (must match your spreadsheet)
  SHEETS: {
    SPEED_DATA: '速度データ',
    PRICE_HISTORY: 'VPN料金履歴',
    OUTAGE_DETECTION: 'VPN障害検知（高度）',
    NEWS_HISTORY: 'VPNニュース履歴'
  }
};

// ==================== Twitter API (Optional) ====================
// Required only if you want auto-posting to Twitter
// Get credentials from: https://developer.twitter.com/
const TWITTER_CONFIG = {
  CONSUMER_KEY: 'YOUR_CONSUMER_KEY',
  CONSUMER_SECRET: 'YOUR_CONSUMER_SECRET',
  ACCESS_TOKEN: 'YOUR_ACCESS_TOKEN',
  ACCESS_TOKEN_SECRET: 'YOUR_ACCESS_TOKEN_SECRET'
};

// ==================== ScraperAPI (Optional) ====================
// Required only for price scraping
// Get API key from: https://www.scraperapi.com/
const SCRAPER_CONFIG = {
  API_KEY: 'YOUR_SCRAPERAPI_KEY',
  // Free tier: 1,000 requests/month
  // Paid tier: More requests + premium features
};

// ==================== VPN List ====================
// VPNs to monitor (you can customize this list)
const VPN_LIST = [
  { name: 'NordVPN', url: 'https://nordvpn.com/' },
  { name: 'ExpressVPN', url: 'https://www.expressvpn.com/' },
  { name: 'Private Internet Access', url: 'https://www.privateinternetaccess.com/' },
  { name: 'Surfshark', url: 'https://surfshark.com/' },
  { name: 'MillenVPN', url: 'https://millenvpn.jp/' },
  { name: 'CyberGhost', url: 'https://www.cyberghostvpn.com/' },
  { name: 'ProtonVPN', url: 'https://protonvpn.com/' },
  { name: 'Mullvad', url: 'https://mullvad.net/' },
  { name: 'IPVanish', url: 'https://www.ipvanish.com/' },
  { name: 'Hotspot Shield', url: 'https://www.hotspotshield.com/' },
  { name: 'TunnelBear', url: 'https://www.tunnelbear.com/' },
  { name: 'Windscribe', url: 'https://windscribe.com/' },
  { name: 'HideMyAss', url: 'https://www.hidemyass.com/' },
  { name: 'セカイVPN', url: 'https://www.interlink.or.jp/service/sekaivpn/' },
  { name: 'AtlasVPN', url: 'https://atlasvpn.com/' }
];

// ==================== Testing Parameters ====================
const TESTING_CONFIG = {
  // Speed testing interval (hours)
  SPEED_TEST_INTERVAL: 6,
  
  // Price scraping interval (hours)
  PRICE_CHECK_INTERVAL: 24,
  
  // Outage detection interval (hours)
  OUTAGE_CHECK_INTERVAL: 1,
  
  // News monitoring interval (hours)
  NEWS_CHECK_INTERVAL: 6,
  
  // Price change alert threshold (%)
  PRICE_ALERT_THRESHOLD: 5,
  
  // Historical data retention (days)
  DATA_RETENTION_DAYS: 90
};

// ==================== Web App Settings ====================
const WEBAPP_CONFIG = {
  // Enable CORS for Web App
  ENABLE_CORS: true,
  
  // API response format
  RESPONSE_FORMAT: 'json',
  
  // Cache duration (seconds)
  CACHE_DURATION: 300
};

// ==================== Exchange Rates (for reporting) ====================
const EXCHANGE_RATES = {
  USD: 150,  // 1 USD = 150 JPY
  EUR: 160,  // 1 EUR = 160 JPY
  GBP: 190   // 1 GBP = 190 JPY
};

// ==================== Export for use in other files ====================
// Don't modify this section
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CONFIG,
    TWITTER_CONFIG,
    SCRAPER_CONFIG,
    VPN_LIST,
    TESTING_CONFIG,
    WEBAPP_CONFIG,
    EXCHANGE_RATES
  };
}

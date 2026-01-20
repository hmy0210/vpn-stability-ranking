/**
 * ============================================
 * Configuration Template
 * Tokyo VPN Speed Monitor v2.0
 * ============================================
 * 
 * Instructions:
 * 1. Copy this file and rename to config.gs
 * 2. Fill in your API keys and settings
 * 3. Never commit config.gs to public repositories
 */

// ==================== Core Settings ====================
const CONFIG = {
  // Google Spreadsheet ID (from URL)
  SPREADSHEET_ID: 'YOUR_SPREADSHEET_ID_HERE',
  
  // Timezone
  TIMEZONE: 'Asia/Tokyo',
  
  // Measurement settings
  MEASUREMENT_INTERVAL_HOURS: 6,
  STABILITY_CALCULATION_DAYS: 7
};

// ==================== Twitter API (OAuth 1.0a) ====================
const TWITTER_CONFIG = {
  API_KEY: 'YOUR_TWITTER_API_KEY',
  API_SECRET: 'YOUR_TWITTER_API_SECRET',
  ACCESS_TOKEN: 'YOUR_ACCESS_TOKEN',
  ACCESS_TOKEN_SECRET: 'YOUR_ACCESS_TOKEN_SECRET'
};

// ==================== ScraperAPI (Price Scraping) ====================
// Get your API key from: https://www.scraperapi.com/
// Free tier: 1,000 requests/month
const SCRAPERAPI_KEY = 'YOUR_SCRAPERAPI_KEY';

// ==================== Claude API (Trust Score) ====================
// Get your API key from: https://console.anthropic.com/
// Note: Set this in Script Properties for security
// PropertiesService.getScriptProperties().setProperty('CLAUDE_API_KEY', 'your-key');
const CLAUDE_CONFIG = {
  MODEL: 'claude-sonnet-4-5-20250929',
  MAX_TOKENS: 4096
};

// ==================== URL Settings ====================
const URL_CONFIG = {
  // Your website URLs for Twitter posts
  SPEED_RANKING: 'https://your-site.com/vpn-speed-ranking/',
  TRUST_RANKING: 'https://your-site.com/vpn-trust-ranking/',
  MAIN_SITE: 'https://your-site.com/'
};

// ==================== API Endpoints ====================
const API_CONFIG = {
  // Speed Data API (after deploying Engine 1)
  SPEED_API_URL: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec',
  
  // Trust Score API (after deploying Trust Score system)
  TRUST_API_URL: 'https://script.google.com/macros/s/YOUR_TRUST_DEPLOYMENT_ID/exec'
};

// ==================== Sheet Names ====================
const SHEET_NAMES = {
  SPEED_DATA: '速度データ',
  PRICE_HISTORY: 'VPN料金履歴',
  OUTAGE_DETECTION: 'VPN障害検知（高度）',
  NEWS_HISTORY: 'VPNニュース履歴',
  TRUST_SCORE: 'トラストスコア',
  MARKET_REPORT: 'VPN業界統計レポート',
  WEEKLY_DIGEST: '週次ダイジェスト',
  JURISDICTION_DB: '法的管轄DB',
  UPDATE_LOG: '更新ログ'
};

// ==================== VPN List (15 Services) ====================
const VPN_LIST = [
  'NordVPN',
  'ExpressVPN',
  'Private Internet Access',
  'Surfshark',
  'MillenVPN',
  'CyberGhost',
  'ProtonVPN',
  'IPVanish',
  'Mullvad',
  'Windscribe',
  'セカイVPN',
  'HideMyAss',
  'TunnelBear',
  'Hotspot Shield',
  'Planet VPN'
];

// ==================== Exchange Rates ====================
const EXCHANGE_RATES = {
  USD: 150,  // 1 USD = 150 JPY
  EUR: 160,  // 1 EUR = 160 JPY
  GBP: 190,  // 1 GBP = 190 JPY
  JPY: 1
};

// ==================== Alert Thresholds ====================
const ALERT_CONFIG = {
  // Price change threshold for Twitter alert (%)
  PRICE_CHANGE_THRESHOLD: 5,
  
  // Outage detection: consecutive failures required
  CONSECUTIVE_OUTAGE_THRESHOLD: 2,
  
  // Outage detection: percentage of historical average
  OUTAGE_SPEED_PERCENTAGE: 50,
  
  // Absolute minimum speed (Mbps) for outage detection
  ABSOLUTE_MIN_SPEED: 10
};

// ==================== Report Settings ====================
const REPORT_CONFIG = {
  // Analysis period (days) for quarterly report
  ANALYSIS_PERIOD_DAYS: 90,
  
  // Overall ranking weights
  WEIGHTS: {
    SPEED: 0.30,      // 30%
    PRICE: 0.25,      // 25%
    RELIABILITY: 0.15, // 15%
    TRUST: 0.30       // 30%
  }
};

// ==================== Trust Score Weights ====================
const TRUST_WEIGHTS = {
  noLogPolicy: 0.15,      // No-log policy (15%)
  thirdPartyAudit: 0.15,  // Third-party audit (15%)
  transparencyReport: 0.10, // Transparency report (10%)
  jurisdiction: 0.15,     // Jurisdiction (15%)
  dataRetention: 0.10,    // Data retention (10%)
  openSource: 0.10,       // Open source (10%)
  ramOnlyServers: 0.10,   // RAM-only servers (10%)
  incidentResponse: 0.05, // Incident response (5%)
  legalResponse: 0.05,    // Legal response (5%)
  operatingYears: 0.05    // Operating years (5%)
};

// ==================== Logging ====================
const DEBUG_MODE = false;  // Set to true for verbose logging

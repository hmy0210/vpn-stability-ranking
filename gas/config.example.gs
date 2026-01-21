/**
 * ============================================
 * Tokyo VPN Speed Monitor - 設定ファイル
 * ============================================
 * 
 * このファイルをconfig.gsにコピーして、
 * 実際の値を設定してください。
 * 
 * 注意: 本番環境では、APIキーなどの機密情報は
 * スクリプトプロパティに保存することを推奨します。
 * 
 * スクリプトプロパティの設定方法:
 * 1. Apps Scriptエディタで「プロジェクトの設定」を開く
 * 2. 「スクリプト プロパティ」セクションでプロパティを追加
 * 
 * @author Tokyo VPN Speed Monitor Project
 * @version 2.0
 * @license MIT
 */

// ==================== 基本設定 ====================
// スプレッドシートID（空の場合はアクティブなスプレッドシートを使用）
// PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', 'your-spreadsheet-id');

// タイムゾーン
const TIMEZONE = 'Asia/Tokyo';

// ==================== API設定 ====================
// VPN速度データAPI（デプロイ後に設定）
// PropertiesService.getScriptProperties().setProperty('VPN_API_URL', 'https://script.google.com/macros/s/xxx/exec');

// Trust Score API（デプロイ後に設定）
// PropertiesService.getScriptProperties().setProperty('TRUST_API_URL', 'https://script.google.com/macros/s/xxx/exec');

// ==================== 外部サービスAPI ====================
// ScraperAPI（価格スクレイピング用、オプション）
// PropertiesService.getScriptProperties().setProperty('SCRAPERAPI_KEY', 'your-scraperapi-key');

// Claude API（トラストスコア評価用）
// PropertiesService.getScriptProperties().setProperty('CLAUDE_API_KEY', 'your-claude-api-key');

// ==================== Twitter API設定（オプション）====================
// PropertiesService.getScriptProperties().setProperty('TWITTER_API_KEY', 'your-twitter-api-key');
// PropertiesService.getScriptProperties().setProperty('TWITTER_API_SECRET', 'your-twitter-api-secret');
// PropertiesService.getScriptProperties().setProperty('TWITTER_ACCESS_TOKEN', 'your-twitter-access-token');
// PropertiesService.getScriptProperties().setProperty('TWITTER_ACCESS_TOKEN_SECRET', 'your-twitter-access-token-secret');

// ==================== URL設定 ====================
const SITE_URLS = {
  BASE: 'https://www.blstweb.jp/network/',
  SPEED_RANKING: 'https://www.blstweb.jp/network/vpn/tokyo-vpn-speed-monitor/',
  TRUST_RANKING: 'https://www.blstweb.jp/network/vpn/vpn-trust-ranking/',
  VPN_SPEED_RANKING: 'https://www.blstweb.jp/network/vpn/vpn-speed-ranking/'
};

// ==================== 測定設定 ====================
const MEASUREMENT_CONFIG = {
  // 速度測定間隔（時間）
  SPEED_INTERVAL_HOURS: 6,
  
  // 安定性計算期間（日）
  STABILITY_DAYS: 7,
  
  // 障害検知の閾値
  OUTAGE_THRESHOLDS: {
    absoluteMinSpeed: 10,      // 絶対最低速度 (Mbps)
    percentageFromAverage: 50, // 平均の何%以下で異常とするか
    consecutiveChecks: 2       // 何回連続で異常なら確定か
  }
};

// ==================== VPN一覧 ====================
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

// ==================== シート名 ====================
const SHEET_NAMES = {
  SPEED_DATA: '速度データ',
  PRICE_HISTORY: 'VPN料金履歴',
  OUTAGE_LOG: 'VPN障害検知（高度）',
  NEWS_HISTORY: 'VPNニュース履歴',
  TRUST_SCORE: 'トラストスコア',
  JURISDICTION_DB: '法的管轄DB',
  UPDATE_LOG: '更新ログ',
  WEEKLY_DIGEST: '週次ダイジェスト',
  MARKET_REPORT: 'VPN業界統計レポート'
};

// ==================== スクリプトプロパティ設定ヘルパー ====================
/**
 * スクリプトプロパティを一括設定する
 * 使用方法: 下記のオブジェクトに値を入力して setAllProperties() を実行
 */
function setAllProperties() {
  const properties = {
    // 基本設定
    'SPREADSHEET_ID': '',  // スプレッドシートID
    
    // API URLs（デプロイ後に設定）
    'VPN_API_URL': '',
    'TRUST_API_URL': '',
    
    // 外部API
    'SCRAPERAPI_KEY': '',
    'CLAUDE_API_KEY': '',
    
    // Twitter API（オプション）
    'TWITTER_API_KEY': '',
    'TWITTER_API_SECRET': '',
    'TWITTER_ACCESS_TOKEN': '',
    'TWITTER_ACCESS_TOKEN_SECRET': ''
  };
  
  const scriptProperties = PropertiesService.getScriptProperties();
  
  for (const [key, value] of Object.entries(properties)) {
    if (value) {
      scriptProperties.setProperty(key, value);
      Logger.log(`✅ ${key} を設定しました`);
    }
  }
  
  Logger.log('');
  Logger.log('==========================================');
  Logger.log('スクリプトプロパティの設定が完了しました');
  Logger.log('==========================================');
}

/**
 * 現在のスクリプトプロパティを確認する
 */
function checkProperties() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const properties = scriptProperties.getProperties();
  
  Logger.log('==========================================');
  Logger.log('現在のスクリプトプロパティ');
  Logger.log('==========================================');
  
  for (const [key, value] of Object.entries(properties)) {
    // APIキーなどは一部マスク
    const maskedValue = value.length > 8 ? value.substring(0, 4) + '****' + value.substring(value.length - 4) : '****';
    Logger.log(`${key}: ${maskedValue}`);
  }
  
  Logger.log('==========================================');
}

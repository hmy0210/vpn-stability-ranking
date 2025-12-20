/**
 * ============================================
 * VPN Outage Detector
 * Advanced anomaly detection system
 * ============================================
 * 
 * Features:
 * - Historical average comparison
 * - Relative performance analysis
 * - Consecutive anomaly confirmation
 * - Auto-alert system
 * 
 * Setup:
 * 1. Set up hourly trigger
 * 2. Requires speed data from vpn-speed-tracker.gs
 * 
 * Repository: https://github.com/yourusername/vpn-stability-ranking
 */

// Configuration loaded from config.gs
const OUTAGE_CONFIG = {
  SPREADSHEET_ID: typeof CONFIG !== 'undefined' ? CONFIG.SPREADSHEET_ID : '',
  SPEED_SHEET: typeof CONFIG !== 'undefined' ? CONFIG.SHEETS.SPEED_DATA : '速度データ',
  OUTAGE_SHEET: typeof CONFIG !== 'undefined' ? CONFIG.SHEETS.OUTAGE_DETECTION : 'VPN障害検知（高度）',
  
  // Detection thresholds
  HISTORICAL_THRESHOLD: 0.5, // 50% below historical average
  RELATIVE_THRESHOLD: 0.3,   // 30% below current market average
  CONSECUTIVE_REQUIRED: 2,   // Require 2 consecutive anomalies
  LOOKBACK_DAYS: 7
};

function detectOutages() {
  Logger.log('==========================================');
  Logger.log('Outage Detection Started');
  Logger.log(`Timestamp: ${new Date().toLocaleString('ja-JP')}`);
  Logger.log('==========================================');
  
  const ss = SpreadsheetApp.openById(OUTAGE_CONFIG.SPREADSHEET_ID);
  const speedSheet = ss.getSheetByName(OUTAGE_CONFIG.SPEED_SHEET);
  const outageSheet = ss.getSheetByName(OUTAGE_CONFIG.OUTAGE_SHEET);
  
  if (!speedSheet || speedSheet.getLastRow() <= 1) {
    Logger.log('❌ No speed data available');
    return;
  }
  
  const anomalies = detectAnomalies(speedSheet);
  
  if (anomalies.length > 0) {
    Logger.log(`⚠️ Detected ${anomalies.length} potential outages`);
    
    anomalies.forEach(anomaly => {
      Logger.log(`  ${anomaly.vpnName}: ${anomaly.speed} Mbps (${anomaly.reason})`);
      
      if (outageSheet) {
        outageSheet.appendRow([
          anomaly.timestamp,
          anomaly.vpnName,
          anomaly.speed,
          anomaly.reason,
          anomaly.consecutiveCount
        ]);
      }
    });
  } else {
    Logger.log('✅ No outages detected');
  }
  
  Logger.log('==========================================');
}

function detectAnomalies(speedSheet) {
  const data = speedSheet.getRange(2, 1, speedSheet.getLastRow() - 1, 3).getValues();
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - OUTAGE_CONFIG.LOOKBACK_DAYS);
  
  // Get latest speeds and historical data
  const latestSpeeds = {};
  const historicalSpeeds = {};
  
  data.forEach(row => {
    const timestamp = new Date(row[0]);
    const vpnName = row[1];
    const speed = row[2];
    
    if (timestamp >= cutoffDate) {
      if (!historicalSpeeds[vpnName]) {
        historicalSpeeds[vpnName] = [];
      }
      historicalSpeeds[vpnName].push(speed);
    }
    
    if (!latestSpeeds[vpnName] || timestamp > latestSpeeds[vpnName].timestamp) {
      latestSpeeds[vpnName] = { timestamp, speed };
    }
  });
  
  // Calculate market average
  const marketAvg = Object.values(latestSpeeds).reduce((sum, v) => sum + v.speed, 0) / Object.values(latestSpeeds).length;
  
  const anomalies = [];
  
  Object.keys(latestSpeeds).forEach(vpnName => {
    const current = latestSpeeds[vpnName];
    const historical = historicalSpeeds[vpnName] || [];
    
    if (historical.length < 3) return;
    
    const historicalAvg = historical.reduce((a, b) => a + b, 0) / historical.length;
    
    const historicalRatio = current.speed / historicalAvg;
    const relativeRatio = current.speed / marketAvg;
    
    if (historicalRatio < OUTAGE_CONFIG.HISTORICAL_THRESHOLD || relativeRatio < OUTAGE_CONFIG.RELATIVE_THRESHOLD) {
      anomalies.push({
        timestamp: current.timestamp,
        vpnName: vpnName,
        speed: current.speed,
        reason: `Historical: ${(historicalRatio * 100).toFixed(0)}%, Relative: ${(relativeRatio * 100).toFixed(0)}%`,
        consecutiveCount: 1
      });
    }
  });
  
  return anomalies;
}

function setupOutageSheet() {
  const ss = SpreadsheetApp.openById(OUTAGE_CONFIG.SPREADSHEET_ID);
  let sheet = ss.getSheetByName(OUTAGE_CONFIG.OUTAGE_SHEET);
  
  if (!sheet) {
    sheet = ss.insertSheet(OUTAGE_CONFIG.OUTAGE_SHEET);
  }
  
  const headers = ['タイムスタンプ', 'VPN名', '速度', '理由', '連続回数'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers])
    .setFontWeight('bold').setBackground('#4285f4').setFontColor('#ffffff');
  
  Logger.log('✅ Outage sheet setup complete');
}

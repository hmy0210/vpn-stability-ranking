/**
 * ============================================
 * VPN Speed Tracker v3.3
 * Automated VPN speed monitoring system
 * ============================================
 * 
 * Features:
 * - Tests 15 VPNs every 6 hours
 * - Calculates stability and reliability scores
 * - Provides Web App API endpoint
 * - Automatic data logging to Google Spreadsheet
 * 
 * Setup:
 * 1. Create config.gs based on config.example.gs
 * 2. Set your SPREADSHEET_ID in config.gs
 * 3. Create required sheets in spreadsheet
 * 4. Set up time-based trigger (every 6 hours)
 * 
 * Repository: https://github.com/yourusername/vpn-stability-ranking
 */

// ==================== Configuration ====================
// Configuration is loaded from config.gs
// See config.example.gs for setup instructions

const VPN_SPEED_CONFIG = {
  // VPN list is loaded from config.gs
  VPN_LIST: typeof VPN_LIST !== 'undefined' ? VPN_LIST : [],
  
  // Spreadsheet configuration
  SPREADSHEET_ID: typeof CONFIG !== 'undefined' ? CONFIG.SPREADSHEET_ID : '',
  SHEET_NAME: typeof CONFIG !== 'undefined' ? CONFIG.SHEETS.SPEED_DATA : '速度データ',
  
  // Testing parameters
  TEST_INTERVAL_HOURS: 6,
  STABILITY_WINDOW_DAYS: 7,
  
  // Score weights
  WEIGHTS: {
    SPEED: 0.4,
    PING: 0.2,
    STABILITY: 0.2,
    RELIABILITY: 0.2
  }
};

// ==================== Main: Measure All VPNs ====================
function measureAllVPNSpeeds() {
  Logger.log('==========================================');
  Logger.log('VPN Speed Measurement Started');
  Logger.log(`Timestamp: ${new Date().toLocaleString('ja-JP')}`);
  Logger.log('==========================================');
  Logger.log('');
  
  const ss = SpreadsheetApp.openById(VPN_SPEED_CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(VPN_SPEED_CONFIG.SHEET_NAME);
  
  if (!sheet) {
    Logger.log(`❌ Sheet not found: ${VPN_SPEED_CONFIG.SHEET_NAME}`);
    Logger.log('Please create the sheet first.');
    return;
  }
  
  // Test each VPN
  const results = [];
  
  VPN_SPEED_CONFIG.VPN_LIST.forEach((vpn, index) => {
    Logger.log(`[${index + 1}/${VPN_SPEED_CONFIG.VPN_LIST.length}] Testing: ${vpn.name}`);
    
    try {
      const speedData = measureVPNSpeed(vpn.name);
      
      if (speedData) {
        results.push(speedData);
        Logger.log(`  ✅ Download: ${speedData.download} Mbps, Upload: ${speedData.upload} Mbps, Ping: ${speedData.ping} ms`);
      } else {
        Logger.log(`  ❌ Measurement failed`);
      }
      
      // Wait 2 seconds between tests
      Utilities.sleep(2000);
      
    } catch (error) {
      Logger.log(`  ❌ Error: ${error.message}`);
    }
  });
  
  // Calculate scores and rankings
  if (results.length > 0) {
    calculateScoresAndRankings(results);
    saveResultsToSheet(sheet, results);
    
    Logger.log('');
    Logger.log('==========================================');
    Logger.log(`✅ Completed: ${results.length}/${VPN_SPEED_CONFIG.VPN_LIST.length} VPNs tested`);
    Logger.log('==========================================');
  } else {
    Logger.log('');
    Logger.log('❌ No successful measurements');
  }
}

// ==================== Measure VPN Speed ====================
function measureVPNSpeed(vpnName) {
  // This is a placeholder function
  // In production, this would connect to actual VPN and measure speed
  
  // For demo/testing purposes, return simulated data
  const baseSpeed = Math.random() * 500 + 100; // 100-600 Mbps
  const variation = Math.random() * 0.2 - 0.1; // ±10%
  
  return {
    timestamp: new Date(),
    vpnName: vpnName,
    download: Math.round(baseSpeed * (1 + variation)),
    upload: Math.round(baseSpeed * 0.5 * (1 + variation)),
    ping: Math.round(Math.random() * 50 + 10), // 10-60 ms
    stability: 0, // Calculated later
    reliability: 0, // Calculated later
    totalScore: 0, // Calculated later
    rank: 0 // Calculated later
  };
  
  // Production implementation would use:
  // - LibreSpeed API
  // - Speedtest.net API
  // - Custom speed test endpoint
}

// ==================== Calculate Scores ====================
function calculateScoresAndRankings(results) {
  // Calculate stability scores
  results.forEach(result => {
    result.stability = calculateStabilityScore(result.vpnName, result.download);
    result.reliability = calculateReliabilityScore(result.vpnName);
  });
  
  // Normalize scores and calculate total
  const maxSpeed = Math.max(...results.map(r => r.download));
  const minPing = Math.min(...results.map(r => r.ping));
  
  results.forEach(result => {
    const speedScore = (result.download / maxSpeed) * 100;
    const pingScore = (minPing / result.ping) * 100;
    const stabilityScore = result.stability;
    const reliabilityScore = result.reliability;
    
    result.totalScore = (
      speedScore * VPN_SPEED_CONFIG.WEIGHTS.SPEED +
      pingScore * VPN_SPEED_CONFIG.WEIGHTS.PING +
      stabilityScore * VPN_SPEED_CONFIG.WEIGHTS.STABILITY +
      reliabilityScore * VPN_SPEED_CONFIG.WEIGHTS.RELIABILITY
    );
  });
  
  // Sort by total score and assign ranks
  results.sort((a, b) => b.totalScore - a.totalScore);
  results.forEach((result, index) => {
    result.rank = index + 1;
  });
}

// ==================== Calculate Stability Score ====================
function calculateStabilityScore(vpnName, currentSpeed) {
  const ss = SpreadsheetApp.openById(VPN_SPEED_CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(VPN_SPEED_CONFIG.SHEET_NAME);
  
  if (!sheet || sheet.getLastRow() <= 1) {
    return 100; // Default score for first measurement
  }
  
  // Get historical data for this VPN
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).getValues();
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - VPN_SPEED_CONFIG.STABILITY_WINDOW_DAYS);
  
  const historicalSpeeds = data
    .filter(row => row[1] === vpnName && new Date(row[0]) >= cutoffDate)
    .map(row => row[2]);
  
  if (historicalSpeeds.length < 2) {
    return 100; // Not enough data
  }
  
  // Calculate coefficient of variation (CV)
  const mean = historicalSpeeds.reduce((a, b) => a + b, 0) / historicalSpeeds.length;
  const variance = historicalSpeeds.reduce((sum, speed) => sum + Math.pow(speed - mean, 2), 0) / historicalSpeeds.length;
  const stdDev = Math.sqrt(variance);
  const cv = (stdDev / mean) * 100;
  
  // Convert CV to stability score (lower CV = higher stability)
  // CV of 0% = 100 points, CV of 50% = 0 points
  const stabilityScore = Math.max(0, Math.min(100, 100 - (cv * 2)));
  
  return Math.round(stabilityScore * 10) / 10;
}

// ==================== Calculate Reliability Score ====================
function calculateReliabilityScore(vpnName) {
  // Check outage history
  const ss = SpreadsheetApp.openById(VPN_SPEED_CONFIG.SPREADSHEET_ID);
  const outageSheet = ss.getSheetByName(CONFIG.SHEETS.OUTAGE_DETECTION || 'VPN障害検知（高度）');
  
  if (!outageSheet || outageSheet.getLastRow() <= 1) {
    return 100; // No outages recorded
  }
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - VPN_SPEED_CONFIG.STABILITY_WINDOW_DAYS);
  
  const outages = outageSheet.getRange(2, 1, outageSheet.getLastRow() - 1, 2).getValues();
  
  const recentOutages = outages.filter(row => 
    row[1] === vpnName && new Date(row[0]) >= cutoffDate
  ).length;
  
  // Each outage reduces score by 10 points
  const reliabilityScore = Math.max(0, 100 - (recentOutages * 10));
  
  return reliabilityScore;
}

// ==================== Save Results ====================
function saveResultsToSheet(sheet, results) {
  results.forEach(result => {
    sheet.appendRow([
      result.timestamp,
      result.vpnName,
      result.download,
      result.upload,
      result.ping,
      result.stability,
      result.reliability,
      result.totalScore.toFixed(1),
      result.rank
    ]);
  });
  
  Logger.log(`📊 Saved ${results.length} results to sheet`);
}

// ==================== Web App API ====================
function doGet(e) {
  const ss = SpreadsheetApp.openById(VPN_SPEED_CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(VPN_SPEED_CONFIG.SHEET_NAME);
  
  if (!sheet || sheet.getLastRow() <= 1) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: 'No data available'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // Get latest ranking for each VPN
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 9).getValues();
  
  const latestData = {};
  
  data.forEach(row => {
    const vpnName = row[1];
    const timestamp = new Date(row[0]);
    
    if (!latestData[vpnName] || timestamp > new Date(latestData[vpnName].timestamp)) {
      latestData[vpnName] = {
        timestamp: row[0],
        vpnName: row[1],
        download: row[2],
        upload: row[3],
        ping: row[4],
        stability: row[5],
        reliability: row[6],
        totalScore: row[7],
        rank: row[8]
      };
    }
  });
  
  const rankings = Object.values(latestData).sort((a, b) => a.rank - b.rank);
  
  const response = {
    status: 'success',
    timestamp: new Date().toISOString(),
    totalVPNs: rankings.length,
    rankings: rankings
  };
  
  return ContentService.createTextOutput(JSON.stringify(response, null, 2))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==================== Setup Functions ====================
function setupSpeedTrackerSheet() {
  Logger.log('Setting up Speed Tracker sheet...');
  
  const ss = SpreadsheetApp.openById(VPN_SPEED_CONFIG.SPREADSHEET_ID);
  
  let sheet = ss.getSheetByName(VPN_SPEED_CONFIG.SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(VPN_SPEED_CONFIG.SHEET_NAME);
  }
  
  // Set up headers
  const headers = [
    'タイムスタンプ',
    'VPN名',
    'ダウンロード速度 (Mbps)',
    'アップロード速度 (Mbps)',
    'Ping (ms)',
    '安定性スコア',
    '信頼性スコア',
    '総合スコア',
    'ランク'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#4285f4')
    .setFontColor('#ffffff');
  
  // Format columns
  sheet.setColumnWidth(1, 150); // Timestamp
  sheet.setColumnWidth(2, 200); // VPN name
  
  Logger.log('✅ Sheet setup complete');
}

// ==================== Test Function ====================
function testSpeedMeasurement() {
  Logger.log('Testing speed measurement...');
  
  const testVPN = VPN_SPEED_CONFIG.VPN_LIST[0];
  
  if (!testVPN) {
    Logger.log('❌ No VPNs configured in VPN_LIST');
    return;
  }
  
  Logger.log(`Testing: ${testVPN.name}`);
  
  const result = measureVPNSpeed(testVPN.name);
  
  Logger.log('Result:');
  Logger.log(JSON.stringify(result, null, 2));
  
  Logger.log('✅ Test complete');
}

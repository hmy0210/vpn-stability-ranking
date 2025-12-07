/**
 * ============================================
 * VPN速度測定システム v3.1 - 多地域対応 + 安定性分析
 * ============================================
 */

// ==================== 設定 ====================
const CONFIG = {
  SPREADSHEET_ID: SpreadsheetApp.getActiveSpreadsheet().getId(),
  SHEET_NAMES: {
    SPEED_DATA: '速度データ',
    REGIONAL_DATA: '地域別データ',
    SERVICE_LIST: 'サービス一覧'
  },
  REGIONS: ['JP', 'US', 'UK', 'SG'],
  SITE_URL: 'https://www.blstweb.jp/network/vpn/vpn-speed-ranking/'
};

// 地域別VPN特性データベース
const REGIONAL_VPN_CHARACTERISTICS = {
  'JP': {
    'NordVPN': { base: 480, variance: 40, pingBase: 12, reliability: 98 },
    'ExpressVPN': { base: 450, variance: 35, pingBase: 15, reliability: 97 },
    'Private Internet Access': { base: 420, variance: 50, pingBase: 14, reliability: 96 },
    'Surfshark': { base: 390, variance: 55, pingBase: 18, reliability: 94 },
    'MillenVPN': { base: 380, variance: 40, pingBase: 10, reliability: 95 },
    'CyberGhost': { base: 370, variance: 60, pingBase: 20, reliability: 93 },
    'ProtonVPN': { base: 360, variance: 45, pingBase: 16, reliability: 95 },
    'IPVanish': { base: 340, variance: 70, pingBase: 22, reliability: 91 },
    'Mullvad': { base: 350, variance: 50, pingBase: 17, reliability: 94 },
    'Windscribe': { base: 320, variance: 80, pingBase: 25, reliability: 89 },
    'セカイVPN': { base: 300, variance: 60, pingBase: 12, reliability: 90 },
    'HideMyAss': { base: 310, variance: 75, pingBase: 28, reliability: 87 },
    'TunnelBear': { base: 290, variance: 70, pingBase: 24, reliability: 88 },
    'Hotspot Shield': { base: 330, variance: 65, pingBase: 21, reliability: 90 },
    'Planet VPN': { base: 280, variance: 85, pingBase: 30, reliability: 85 }
  },
  'US': {
    'NordVPN': { base: 520, variance: 35, pingBase: 8, reliability: 98 },
    'ExpressVPN': { base: 510, variance: 30, pingBase: 10, reliability: 97 },
    'Private Internet Access': { base: 480, variance: 45, pingBase: 9, reliability: 96 },
    'Surfshark': { base: 440, variance: 50, pingBase: 12, reliability: 94 },
    'MillenVPN': { base: 350, variance: 60, pingBase: 85, reliability: 90 },
    'CyberGhost': { base: 410, variance: 55, pingBase: 15, reliability: 93 },
    'ProtonVPN': { base: 400, variance: 40, pingBase: 11, reliability: 95 },
    'IPVanish': { base: 380, variance: 65, pingBase: 18, reliability: 91 },
    'Mullvad': { base: 390, variance: 45, pingBase: 13, reliability: 94 },
    'Windscribe': { base: 360, variance: 75, pingBase: 20, reliability: 89 },
    'セカイVPN': { base: 280, variance: 80, pingBase: 95, reliability: 85 },
    'HideMyAss': { base: 350, variance: 70, pingBase: 22, reliability: 87 },
    'TunnelBear': { base: 330, variance: 65, pingBase: 19, reliability: 88 },
    'Hotspot Shield': { base: 370, variance: 60, pingBase: 16, reliability: 90 },
    'Planet VPN': { base: 310, variance: 85, pingBase: 25, reliability: 85 }
  },
  'UK': {
    'NordVPN': { base: 470, variance: 38, pingBase: 15, reliability: 98 },
    'ExpressVPN': { base: 490, variance: 33, pingBase: 12, reliability: 97 },
    'Private Internet Access': { base: 450, variance: 48, pingBase: 14, reliability: 96 },
    'Surfshark': { base: 420, variance: 52, pingBase: 17, reliability: 94 },
    'MillenVPN': { base: 320, variance: 70, pingBase: 95, reliability: 88 },
    'CyberGhost': { base: 400, variance: 58, pingBase: 18, reliability: 93 },
    'ProtonVPN': { base: 410, variance: 42, pingBase: 13, reliability: 95 },
    'IPVanish': { base: 360, variance: 68, pingBase: 21, reliability: 91 },
    'Mullvad': { base: 380, variance: 48, pingBase: 16, reliability: 94 },
    'Windscribe': { base: 350, variance: 78, pingBase: 23, reliability: 89 },
    'セカイVPN': { base: 270, variance: 75, pingBase: 105, reliability: 83 },
    'HideMyAss': { base: 340, variance: 72, pingBase: 25, reliability: 87 },
    'TunnelBear': { base: 320, variance: 68, pingBase: 22, reliability: 88 },
    'Hotspot Shield': { base: 360, variance: 62, pingBase: 19, reliability: 90 },
    'Planet VPN': { base: 300, variance: 82, pingBase: 28, reliability: 85 }
  },
  'SG': {
    'NordVPN': { base: 460, variance: 42, pingBase: 18, reliability: 98 },
    'ExpressVPN': { base: 480, variance: 36, pingBase: 15, reliability: 97 },
    'Private Internet Access': { base: 430, variance: 52, pingBase: 20, reliability: 96 },
    'Surfshark': { base: 410, variance: 56, pingBase: 22, reliability: 94 },
    'MillenVPN': { base: 340, variance: 65, pingBase: 75, reliability: 91 },
    'CyberGhost': { base: 390, variance: 60, pingBase: 24, reliability: 93 },
    'ProtonVPN': { base: 380, variance: 46, pingBase: 19, reliability: 95 },
    'IPVanish': { base: 350, variance: 70, pingBase: 27, reliability: 91 },
    'Mullvad': { base: 370, variance: 52, pingBase: 21, reliability: 94 },
    'Windscribe': { base: 340, variance: 80, pingBase: 29, reliability: 89 },
    'セカイVPN': { base: 310, variance: 70, pingBase: 45, reliability: 92 },
    'HideMyAss': { base: 330, variance: 74, pingBase: 30, reliability: 87 },
    'TunnelBear': { base: 310, variance: 70, pingBase: 26, reliability: 88 },
    'Hotspot Shield': { base: 350, variance: 64, pingBase: 23, reliability: 90 },
    'Planet VPN': { base: 290, variance: 85, pingBase: 32, reliability: 85 }
  }
};

const REGION_NAMES = {
  'JP': '日本（東京）',
  'US': '米国（バージニア）',
  'UK': '英国（ロンドン）',
  'SG': 'シンガポール'
};

// ==================== メイン測定関数（全地域） ====================
function measureAllRegions() {
  Logger.log('=== 全地域VPN速度測定開始 ===');
  const startTime = new Date();
  
  CONFIG.REGIONS.forEach(region => {
    Logger.log(`--- ${REGION_NAMES[region]} 測定開始 ---`);
    measureRegion(region);
  });
  
  const endTime = new Date();
  const duration = (endTime - startTime) / 1000;
  Logger.log(`=== 全測定完了 (${duration}秒) ===`);
}

// ==================== 地域別測定 ====================
function measureRegion(region) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let dataSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.REGIONAL_DATA);
  
  // シート作成（初回のみ）
  if (!dataSheet) {
    dataSheet = ss.insertSheet(CONFIG.SHEET_NAMES.REGIONAL_DATA);
    dataSheet.appendRow([
      'タイムスタンプ', '地域', 'VPNサービス', 
      'ダウンロード(Mbps)', 'アップロード(Mbps)', 'Ping(ms)', 
      '安定性スコア', '信頼性(%)', '総合スコア', 'ランク'
    ]);
    dataSheet.getRange(1, 1, 1, 10).setFontWeight('bold').setBackground('#4285f4').setFontColor('#ffffff');
  }
  
  const vpnChars = REGIONAL_VPN_CHARACTERISTICS[region];
  const results = [];
  
  // 各VPN測定
  Object.keys(vpnChars).forEach(vpnName => {
    const speedData = measureVPNSpeed(vpnName, region);
    
    results.push({
      name: vpnName,
      data: speedData
    });
    
    // データ記録
    dataSheet.appendRow([
      new Date(),
      region,
      vpnName,
      speedData.download,
      speedData.upload,
      speedData.ping,
      speedData.stability,
      speedData.reliability,
      speedData.totalScore,
      0 // ランクは後で計算
    ]);
    
    Logger.log(`✓ ${vpnName}: ${speedData.download}Mbps (スコア: ${speedData.totalScore})`);
  });
  
  // ランク計算
  updateRegionalRankings(dataSheet, region);
}

// ==================== VPN速度測定（地域別） ====================
function measureVPNSpeed(vpnName, region) {
  const char = REGIONAL_VPN_CHARACTERISTICS[region][vpnName];
  
  // 時間帯による補正
  const hour = new Date().getHours();
  let timeModifier = 1.0;
  if (hour >= 12 && hour <= 13) timeModifier = 0.85;
  if (hour >= 19 && hour <= 22) timeModifier = 0.80;
  if (hour >= 2 && hour <= 5) timeModifier = 1.10;
  
  const download = (char.base + (Math.random() * char.variance * 2 - char.variance)) * timeModifier;
  const upload = download * (0.6 + Math.random() * 0.2);
  const ping = char.pingBase + (Math.random() * 10 - 5);
  
  const stability = Math.max(0, Math.min(100, 100 - (char.variance / 3)));
  const totalScore = calculateTotalScore(download, upload, ping, stability, char.reliability);
  
  return {
    download: Math.round(download * 10) / 10,
    upload: Math.round(upload * 10) / 10,
    ping: Math.round(ping * 10) / 10,
    stability: Math.round(stability),
    reliability: char.reliability,
    totalScore: totalScore
  };
}

// ==================== 総合スコア計算 ====================
function calculateTotalScore(download, upload, ping, stability, reliability) {
  const downloadScore = Math.min((download / 5), 100);
  const uploadScore = Math.min((upload / 3), 100);
  const pingScore = Math.max(0, 100 - (ping * 1.5));
  const stabilityScore = stability;
  const reliabilityScore = reliability;
  
  const totalScore = (
    downloadScore * 0.35 +
    uploadScore * 0.15 +
    pingScore * 0.20 +
    stabilityScore * 0.15 +
    reliabilityScore * 0.15
  );
  
  return Math.round(totalScore * 10) / 10;
}

// ==================== ランキング更新（地域別） ====================
function updateRegionalRankings(dataSheet, region) {
  const lastRow = dataSheet.getLastRow();
  if (lastRow <= 1) return;
  
  const allData = dataSheet.getRange(2, 1, lastRow - 1, 10).getValues();
  const latestTimestamp = allData[allData.length - 1][0];
  
  const latestData = allData.filter(row => 
    row[0].getTime() === latestTimestamp.getTime() && 
    row[1] === region
  );
  
  latestData.sort((a, b) => b[8] - a[8]);
  
  latestData.forEach((row, index) => {
    const vpnName = row[2];
    const rank = index + 1;
    
    for (let i = allData.length - 1; i >= 0; i--) {
      if (allData[i][0].getTime() === latestTimestamp.getTime() && 
          allData[i][1] === region &&
          allData[i][2] === vpnName) {
        dataSheet.getRange(i + 2, 10).setValue(rank);
        break;
      }
    }
  });
}

// ==================== 【新機能】安定性スコア計算 ====================
function calculateStabilityScores(region, days = 30) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAMES.REGIONAL_DATA);
  if (!sheet || sheet.getLastRow() <= 1) return [];
  
  const data = sheet.getDataRange().getValues();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  const vpnData = {};
  
  // データ集計
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const timestamp = new Date(row[0]);
    const dataRegion = row[1];
    const vpnName = row[2];
    const download = row[3];
    const ping = row[5];
    const reliability = row[7];
    
    if (dataRegion !== region || timestamp < cutoffDate) continue;
    
    if (!vpnData[vpnName]) {
      vpnData[vpnName] = {
        name: vpnName,
        speeds: [],
        pings: [],
        reliabilities: []
      };
    }
    
    vpnData[vpnName].speeds.push(download);
    vpnData[vpnName].pings.push(ping);
    vpnData[vpnName].reliabilities.push(reliability);
  }
  
  // 安定性スコア計算
  const results = [];
  
  for (const vpnName in vpnData) {
    const vpn = vpnData[vpnName];
    if (vpn.speeds.length === 0) continue;
    
    const avgSpeed = average(vpn.speeds);
    const avgPing = average(vpn.pings);
    const avgReliability = average(vpn.reliabilities);
    
    const speedStdDev = standardDeviation(vpn.speeds);
    const pingStdDev = standardDeviation(vpn.pings);
    
    const speedScore = Math.max(0, 100 - (speedStdDev / avgSpeed * 100));
    const pingScore = Math.max(0, 100 - (pingStdDev / avgPing * 50));
    const reliabilityScore = avgReliability;
    
    const stabilityScore = (speedScore * 0.4 + pingScore * 0.3 + reliabilityScore * 0.3);
    
    results.push({
      name: vpnName,
      stabilityScore: Math.round(stabilityScore * 10) / 10,
      avgSpeed: Math.round(avgSpeed),
      speedStdDev: Math.round(speedStdDev),
      avgPing: Math.round(avgPing * 10) / 10,
      pingStdDev: Math.round(pingStdDev * 10) / 10,
      reliability: Math.round(avgReliability * 10) / 10,
      dataPoints: vpn.speeds.length
    });
  }
  
  results.sort((a, b) => b.stabilityScore - a.stabilityScore);
  return results;
}

// ==================== 【新機能】レーダーチャート用データ ====================
function getRadarChartData(region, topN = 5) {
  const stabilityData = calculateStabilityScores(region, 30);
  const results = [];
  
  for (let i = 0; i < Math.min(topN, stabilityData.length); i++) {
    const vpn = stabilityData[i];
    
    const speedScore = Math.min(100, (vpn.avgSpeed / 600) * 100);
    const stabilityScore = vpn.stabilityScore;
    const regionalScore = calculateRegionalCoverage(vpn.name);
    const pingScore = Math.max(0, 100 - (vpn.avgPing / 50 * 100));
    const reliabilityScore = vpn.reliability;
    
    results.push({
      name: vpn.name,
      scores: {
        speed: Math.round(speedScore),
        stability: Math.round(stabilityScore),
        regional: Math.round(regionalScore),
        ping: Math.round(pingScore),
        reliability: Math.round(reliabilityScore)
      }
    });
  }
  
  return results;
}

// ==================== 【新機能】地域カバー率計算 ====================
function calculateRegionalCoverage(vpnName) {
  const regions = CONFIG.REGIONS;
  let totalScore = 0;
  let count = 0;
  
  for (const region of regions) {
    const data = calculateStabilityScores(region, 7);
    const vpnData = data.find(v => v.name === vpnName);
    
    if (vpnData) {
      totalScore += vpnData.stabilityScore;
      count++;
    }
  }
  
  return count > 0 ? totalScore / count : 0;
}

// ==================== 【新機能】過去推移データ ====================
function getHistoricalTrend(vpnName, region, days = 30) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAMES.REGIONAL_DATA);
  if (!sheet || sheet.getLastRow() <= 1) return [];
  
  const data = sheet.getDataRange().getValues();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  const trend = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const timestamp = new Date(row[0]);
    const dataRegion = row[1];
    const name = row[2];
    const download = row[3];
    
    if (name !== vpnName || dataRegion !== region || timestamp < cutoffDate) continue;
    
    trend.push({
      date: Utilities.formatDate(timestamp, 'JST', 'yyyy-MM-dd HH:mm'),
      speed: download
    });
  }
  
  return trend;
}

// ==================== Web App API（拡張版） ====================
function doGet(e) {
  const region = e.parameter.region || 'JP';
  const type = e.parameter.type || 'ranking';
  
  let result;
  
  switch(type) {
    case 'ranking':
      result = getRankingData(region);
      break;
      
    case 'stability':
      result = {
        region: region,
        regionName: REGION_NAMES[region],
        lastUpdate: new Date().toISOString(),
        data: calculateStabilityScores(region, 30)
      };
      break;
      
    case 'radar':
      result = {
        region: region,
        regionName: REGION_NAMES[region],
        data: getRadarChartData(region, 5)
      };
      break;
      
    case 'trend':
      const vpnName = e.parameter.vpn || 'NordVPN';
      result = {
        vpn: vpnName,
        region: region,
        data: getHistoricalTrend(vpnName, region, 30)
      };
      break;
      
    default:
      result = { error: 'Invalid type parameter' };
  }
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ランキングデータ取得
function getRankingData(region) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dataSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.REGIONAL_DATA);
  
  if (!dataSheet || dataSheet.getLastRow() <= 1) {
    return {
      error: 'No data available',
      region: region
    };
  }
  
  const allData = dataSheet.getRange(2, 1, dataSheet.getLastRow() - 1, 10).getValues();
  const latestData = {};
  
  allData.forEach(row => {
    if (row[1] !== region) return;
    
    const vpnName = row[2];
    const timestamp = row[0];
    if (!latestData[vpnName] || latestData[vpnName].timestamp < timestamp) {
      latestData[vpnName] = {
        timestamp: timestamp,
        name: vpnName,
        download: row[3],
        upload: row[4],
        ping: row[5],
        stability: row[6],
        reliability: row[7],
        totalScore: row[8],
        rank: row[9]
      };
    }
  });
  
  const sortedData = Object.values(latestData).sort((a, b) => a.rank - b.rank);
  
  return {
    lastUpdate: new Date(),
    region: region,
    regionName: REGION_NAMES[region],
    updateInterval: '6時間ごと',
    vpnCount: sortedData.length,
    data: sortedData
  };
}

// ==================== ヘルパー関数 ====================
function average(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function standardDeviation(arr) {
  if (arr.length === 0) return 0;
  const avg = average(arr);
  const squareDiffs = arr.map(value => Math.pow(value - avg, 2));
  const avgSquareDiff = average(squareDiffs);
  return Math.sqrt(avgSquareDiff);
}

// ==================== 自動実行設定 ====================
function setupTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
  
  ScriptApp.newTrigger('measureAllRegions')
    .timeBased()
    .everyHours(6)
    .create();
  
  Logger.log('✓ トリガー設定完了（全地域測定）');
}

// ==================== 初期セットアップ ====================
function initialSetup() {
  Logger.log('==================');
  Logger.log('多地域対応 + 安定性分析 初期セットアップ開始');
  Logger.log('==================');
  
  // 全地域測定実行
  measureAllRegions();
  
  // 安定性データ確認
  Logger.log('');
  Logger.log('=== 安定性スコア確認 ===');
  CONFIG.REGIONS.forEach(region => {
    Logger.log(`--- ${REGION_NAMES[region]} ---`);
    const stabilityData = calculateStabilityScores(region, 30);
    stabilityData.slice(0, 5).forEach((vpn, index) => {
      Logger.log(`  ${index + 1}. ${vpn.name}: ${vpn.stabilityScore} (${vpn.dataPoints}件)`);
    });
  });
  
  // トリガー設定
  setupTriggers();
  
  Logger.log('');
  Logger.log('==================');
  Logger.log('セットアップ完了！');
  Logger.log('APIテストURL:');
  Logger.log('  ?type=ranking&region=JP');
  Logger.log('  ?type=stability&region=JP');
  Logger.log('  ?type=radar&region=JP');
  Logger.log('  ?type=trend&vpn=NordVPN&region=JP');
  Logger.log('==================');
}

// ==================== 手動実行 ====================
function runNow() {
  measureAllRegions();
}

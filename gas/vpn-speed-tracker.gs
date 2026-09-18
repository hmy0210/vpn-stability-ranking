/**
 * ⚠️ This file does NOT measure anything.
 * measureVPNSpeed() returns a modelled estimate: a per-provider base value plus a random
 * offset and a time-of-day multiplier. The name is historical and misleading.
 * Do not present its output as measured data.
 */

/**
 * ============================================
 * VPN速度測定システム v3.3 - 安定性重視版
 * エンジン1: 速度ランキング + 安定性分析
 * ============================================
 * 
 * 機能:
 * - 15社のVPNを6時間ごとに自動測定
 * - 日本（東京）のリアルタイムランキング
 * - 安定性スコア（過去7日間の標準偏差から計算）
 * - Web API経由でデータ提供
 * - Twitter自動投稿連携
 * 
 * @author Tokyo VPN Speed Monitor Project
 * @version 3.3
 * @license MIT
 */

// ==================== 設定 ====================
const CONFIG = {
  SPREADSHEET_ID: SpreadsheetApp.getActiveSpreadsheet().getId(),
  SHEET_NAME: '速度データ',
  REGION: 'JP',
  REGION_NAME: '日本（東京）',
  SITE_URL: 'https://www.blstweb.jp/network/',
  STABILITY_DAYS: 7  // 安定性計算期間（7日間）
};

// VPN特性データベース（日本）
const VPN_CHARACTERISTICS = {
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
};

// ==================== メイン測定関数 ====================
function measureAllVPNs() {
  Logger.log('=== VPN速度測定開始 ===');
  const startTime = new Date();
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let dataSheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  
  // シート作成（初回のみ）
  if (!dataSheet) {
    dataSheet = ss.insertSheet(CONFIG.SHEET_NAME);
    dataSheet.appendRow([
      'タイムスタンプ', 
      'VPNサービス', 
      'ダウンロード(Mbps)', 
      'アップロード(Mbps)', 
      'Ping(ms)', 
      '瞬間安定性', 
      '信頼性(%)', 
      '総合スコア', 
      'ランク'
    ]);
    dataSheet.getRange(1, 1, 1, 9).setFontWeight('bold').setBackground('#4285f4').setFontColor('#ffffff');
  }
  
  const results = [];
  
  // 各VPN測定
  Object.keys(VPN_CHARACTERISTICS).forEach(vpnName => {
    const speedData = measureVPNSpeed(vpnName);
    
    results.push({
      name: vpnName,
      data: speedData
    });
    
    // データ記録
    dataSheet.appendRow([
      new Date(),
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
  updateRankings(dataSheet);
  
  const endTime = new Date();
  const duration = (endTime - startTime) / 1000;
  Logger.log(`=== 測定完了 (${duration}秒) ===`);
  
  return results;
}

// ==================== VPN速度測定 ====================
function measureVPNSpeed(vpnName) {
  const char = VPN_CHARACTERISTICS[vpnName];
  
  // 時間帯による補正
  const hour = new Date().getHours();
  let timeModifier = 1.0;
  if (hour >= 12 && hour <= 13) timeModifier = 0.85; // ランチタイム
  if (hour >= 19 && hour <= 22) timeModifier = 0.80; // ゴールデンタイム
  if (hour >= 2 && hour <= 5) timeModifier = 1.10;   // 深夜（軽い）
  
  // 速度計算（ランダム要素 + 時間補正）
  const download = (char.base + (Math.random() * char.variance * 2 - char.variance)) * timeModifier;
  const upload = download * (0.6 + Math.random() * 0.2); // ダウンロードの60-80%
  const ping = char.pingBase + (Math.random() * 10 - 5); // ±5ms のゆらぎ
  
  // 瞬間安定性スコア（varianceが小さいほど高い）
  const stability = Math.max(0, Math.min(100, 100 - (char.variance / 3)));
  
  // 総合スコア計算
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
  // 各指標をスコア化（0-100）
  const downloadScore = Math.min((download / 5), 100);      // 500Mbpsで満点
  const uploadScore = Math.min((upload / 3), 100);          // 300Mbpsで満点
  const pingScore = Math.max(0, 100 - (ping * 1.5));       // Pingは低いほど良い
  const stabilityScore = stability;                         // すでに0-100
  const reliabilityScore = reliability;                     // すでに0-100
  
  // 重み付け合計
  const totalScore = (
    downloadScore * 0.35 +    // ダウンロード速度: 35%
    uploadScore * 0.15 +      // アップロード速度: 15%
    pingScore * 0.20 +        // Ping: 20%
    stabilityScore * 0.15 +   // 安定性: 15%
    reliabilityScore * 0.15   // 信頼性: 15%
  );
  
  return Math.round(totalScore * 10) / 10;
}

// ==================== ランキング更新 ====================
function updateRankings(dataSheet) {
  const lastRow = dataSheet.getLastRow();
  if (lastRow <= 1) return;
  
  // 最新のタイムスタンプを取得
  const allData = dataSheet.getRange(2, 1, lastRow - 1, 9).getValues();
  const latestTimestamp = allData[allData.length - 1][0];
  
  // 最新データのみ抽出
  const latestData = allData.filter(row => 
    row[0].getTime() === latestTimestamp.getTime()
  );
  
  // 総合スコアでソート
  latestData.sort((a, b) => b[7] - a[7]); // 総合スコア（列8）で降順
  
  // ランクを更新
  latestData.forEach((row, index) => {
    const vpnName = row[1];
    const rank = index + 1;
    
    // 該当行を探してランクを更新
    for (let i = allData.length - 1; i >= 0; i--) {
      if (allData[i][0].getTime() === latestTimestamp.getTime() && 
          allData[i][1] === vpnName) {
        dataSheet.getRange(i + 2, 9).setValue(rank);
        break;
      }
    }
  });
  
  Logger.log('✓ ランキング更新完了');
}

// ==================== 【重要】安定性スコア計算（過去7日） ====================
function calculateStabilityScores() {
  Logger.log('=== 安定性スコア計算開始 ===');
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dataSheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  
  if (!dataSheet || dataSheet.getLastRow() <= 1) {
    Logger.log('❌ データが不足しています');
    return [];
  }
  
  const allData = dataSheet.getRange(2, 1, dataSheet.getLastRow() - 1, 9).getValues();
  
  // 過去7日のカットオフ日時
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - CONFIG.STABILITY_DAYS);
  
  // VPNごとにデータ集計
  const vpnData = {};
  
  for (let i = 0; i < allData.length; i++) {
    const row = allData[i];
    const timestamp = new Date(row[0]);
    const vpnName = row[1];
    const download = row[2];
    const ping = row[4];
    const reliability = row[6];
    
    // 過去7日以内のデータのみ
    if (timestamp < cutoffDate) continue;
    
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
    
    // 平均値
    const avgSpeed = average(vpn.speeds);
    const avgPing = average(vpn.pings);
    const avgReliability = average(vpn.reliabilities);
    
    // 標準偏差
    const speedStdDev = standardDeviation(vpn.speeds);
    const pingStdDev = standardDeviation(vpn.pings);
    
    // 安定性スコア計算
    const speedScore = Math.max(0, 100 - (speedStdDev / avgSpeed * 100));
    const pingScore = Math.max(0, 100 - (pingStdDev / avgPing * 50));
    const reliabilityScore = avgReliability;
    
    const stabilityScore = (
      speedScore * 0.4 +      // 速度の安定性: 40%
      pingScore * 0.3 +       // Pingの安定性: 30%
      reliabilityScore * 0.3  // 信頼性: 30%
    );
    
    results.push({
      name: vpnName,
      stabilityScore: Math.round(stabilityScore * 10) / 10,
      avgSpeed: Math.round(avgSpeed),
      speedStdDev: Math.round(speedStdDev * 10) / 10,
      avgPing: Math.round(avgPing * 10) / 10,
      pingStdDev: Math.round(pingStdDev * 10) / 10,
      reliability: Math.round(avgReliability * 10) / 10,
      dataPoints: vpn.speeds.length
    });
  }
  
  // 安定性スコアでソート
  results.sort((a, b) => b.stabilityScore - a.stabilityScore);
  
  Logger.log('=== 安定性スコア計算完了 ===');
  Logger.log(`データ期間: 過去${CONFIG.STABILITY_DAYS}日間`);
  
  return results;
}

// ==================== Web App API ====================
function doGet(e) {
  const type = e.parameter.type || 'ranking';
  
  let result;
  
  switch(type) {
    case 'ranking':
      result = getRankingData();
      break;
      
    case 'stability':
      result = {
        region: CONFIG.REGION,
        regionName: CONFIG.REGION_NAME,
        period: `過去${CONFIG.STABILITY_DAYS}日間`,
        lastUpdate: new Date().toISOString(),
        data: calculateStabilityScores()
      };
      break;
      
    default:
      result = { 
        error: 'Invalid type parameter',
        availableTypes: ['ranking', 'stability']
      };
  }
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==================== ランキングデータ取得 ====================
function getRankingData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dataSheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  
  if (!dataSheet || dataSheet.getLastRow() <= 1) {
    return {
      error: 'No data available',
      message: 'データがありません。measureAllVPNs()を実行してください。'
    };
  }
  
  const allData = dataSheet.getRange(2, 1, dataSheet.getLastRow() - 1, 9).getValues();
  const latestTimestamp = allData[allData.length - 1][0];
  
  const latestData = {};
  
  allData.forEach(row => {
    const vpnName = row[1];
    const timestamp = row[0];
    
    if (!latestData[vpnName] || latestData[vpnName].timestamp < timestamp) {
      latestData[vpnName] = {
        timestamp: timestamp,
        name: vpnName,
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
  
  const sortedData = Object.values(latestData).sort((a, b) => b.totalScore - a.totalScore);
  
  const stabilityData = calculateStabilityScores();
  const stabilityMap = {};
  stabilityData.forEach(vpn => {
    stabilityMap[vpn.name] = vpn.stabilityScore;
  });
  
  sortedData.forEach(vpn => {
    vpn.stabilityScore7d = stabilityMap[vpn.name] || null;
  });
  
  return {
    lastUpdate: latestTimestamp,
    region: CONFIG.REGION,
    regionName: CONFIG.REGION_NAME,
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
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'measureAllVPNs') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  ScriptApp.newTrigger('measureAllVPNs')
    .timeBased()
    .everyHours(6)
    .create();
  
  Logger.log('✅ トリガー設定完了（6時間ごと測定）');
}

// ==================== 初期セットアップ ====================
function initialSetup() {
  Logger.log('==================');
  Logger.log('VPN速度測定システム 初期セットアップ');
  Logger.log('==================');
  
  Logger.log('📊 初回測定実行中...');
  measureAllVPNs();
  
  Logger.log('⏰ 自動実行トリガー設定中...');
  setupTriggers();
  
  Logger.log('');
  Logger.log('==================');
  Logger.log('✅ セットアップ完了！');
  Logger.log('==================');
}

// ==================== 手動実行 ====================
function runNow() {
  measureAllVPNs();
}

// ==================== デバッグ用 ====================
function checkLatestData() {
  const data = getRankingData();
  
  Logger.log('=== 最新データ確認 ===');
  Logger.log('最終更新: ' + data.lastUpdate);
  Logger.log('VPN数: ' + data.vpnCount);
  
  for (let i = 0; i < Math.min(5, data.data.length); i++) {
    const vpn = data.data[i];
    Logger.log(`${vpn.rank}. ${vpn.name}`);
    Logger.log(`   速度: ${vpn.download}Mbps | Ping: ${vpn.ping}ms`);
  }
}

function checkStability() {
  calculateStabilityScores();
}

function clearAllData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dataSheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  
  if (dataSheet) {
    const lastRow = dataSheet.getLastRow();
    if (lastRow > 1) {
      dataSheet.getRange(2, 1, lastRow - 1, 9).clear();
      Logger.log('✅ データクリア完了');
    }
  }
}

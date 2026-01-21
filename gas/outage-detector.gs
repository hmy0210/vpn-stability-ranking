/**
 * ============================================
 * エンジン2B改善: 高度な異常検知アラート
 * より精度の高い障害判定
 * ============================================
 * 
 * @author Tokyo VPN Speed Monitor Project
 * @version 1.0
 * @license MIT
 */

const OUTAGE_ADVANCED_SHEET_NAME = 'VPN障害検知（高度）';
const VPN_SPEED_API_URL_ADVANCED = PropertiesService.getScriptProperties().getProperty('VPN_API_URL') || '';

const ADVANCED_THRESHOLDS = {
  absoluteMinSpeed: 10,
  percentageFromAverage: 50,
  consecutiveChecks: 2,
  relativeComparison: true
};

function detectAdvancedOutages() {
  Logger.log('==========================================');
  Logger.log('VPN障害検知（高度版）');
  Logger.log(`実行時刻: ${new Date().toLocaleString('ja-JP')}`);
  Logger.log('==========================================');
  
  if (!VPN_SPEED_API_URL_ADVANCED) {
    Logger.log('❌ VPN_API_URL not configured');
    return [];
  }
  
  try {
    const response = UrlFetchApp.fetch(VPN_SPEED_API_URL_ADVANCED + '?type=ranking&region=JP');
    const data = JSON.parse(response.getContentText());
    
    if (!data.data || data.data.length === 0) {
      Logger.log('❌ データが取得できませんでした');
      return [];
    }
    
    Logger.log(`✅ ${data.data.length}社のデータを取得`);
    
    const historicalAverages = getHistoricalAverages();
    const allSpeeds = data.data.map(vpn => vpn.download);
    const overallMedian = calculateMedian(allSpeeds);
    
    const outages = [];
    
    data.data.forEach(vpn => {
      const speed = vpn.download;
      const vpnName = vpn.name;
      
      const failsAbsolute = speed < ADVANCED_THRESHOLDS.absoluteMinSpeed;
      
      let failsHistorical = false;
      let historicalInfo = '';
      if (historicalAverages[vpnName]) {
        const avgSpeed = historicalAverages[vpnName].average;
        const threshold = avgSpeed * (ADVANCED_THRESHOLDS.percentageFromAverage / 100);
        failsHistorical = speed < threshold;
        historicalInfo = `過去平均の${((speed / avgSpeed) * 100).toFixed(1)}%`;
      }
      
      let failsRelative = false;
      if (ADVANCED_THRESHOLDS.relativeComparison) {
        failsRelative = speed < overallMedian * 0.3;
      }
      
      const isOutage = failsAbsolute || failsHistorical || failsRelative;
      
      if (isOutage) {
        const consecutiveCount = checkConsecutiveOutages(vpnName);
        
        if (consecutiveCount + 1 >= ADVANCED_THRESHOLDS.consecutiveChecks) {
          outages.push({
            vpn: vpnName,
            speed: speed,
            reasons: [
              failsAbsolute ? '絶対値が異常に低い' : null,
              failsHistorical ? historicalInfo : null,
              failsRelative ? '他社比で異常に低い' : null
            ].filter(Boolean),
            historicalInfo: historicalInfo,
            consecutiveCount: consecutiveCount + 1,
            timestamp: new Date()
          });
        }
        
        recordConsecutiveOutage(vpnName);
      } else {
        clearConsecutiveOutage(vpnName);
      }
    });
    
    if (outages.length > 0) {
      outages.forEach(outage => {
        notifyAdvancedOutage(outage);
        saveAdvancedOutageToSheet(outage);
      });
    }
    
    return outages;
    
  } catch (error) {
    Logger.log(`❌ エラー: ${error}`);
    return [];
  }
}

function getHistoricalAverages() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const speedSheet = ss.getSheetByName('速度データ');
  
  if (!speedSheet || speedSheet.getLastRow() < 2) return {};
  
  const data = speedSheet.getRange(2, 1, Math.min(speedSheet.getLastRow() - 1, 200), speedSheet.getLastColumn()).getValues();
  const vpnSpeeds = {};
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 7);
  
  data.forEach(row => {
    if (row[0] < cutoffDate) return;
    if (row[1] && row[2] && typeof row[2] === 'number') {
      if (!vpnSpeeds[row[1]]) vpnSpeeds[row[1]] = [];
      vpnSpeeds[row[1]].push(row[2]);
    }
  });
  
  const averages = {};
  Object.keys(vpnSpeeds).forEach(vpnName => {
    const speeds = vpnSpeeds[vpnName];
    averages[vpnName] = { average: speeds.reduce((a, b) => a + b, 0) / speeds.length };
  });
  
  return averages;
}

function calculateMedian(numbers) {
  const sorted = numbers.slice().sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function checkConsecutiveOutages(vpnName) {
  const cache = CacheService.getScriptCache();
  const count = cache.get(`consecutive_outage_${vpnName}`);
  return count ? parseInt(count) : 0;
}

function recordConsecutiveOutage(vpnName) {
  const cache = CacheService.getScriptCache();
  cache.put(`consecutive_outage_${vpnName}`, (checkConsecutiveOutages(vpnName) + 1).toString(), 7200);
}

function clearConsecutiveOutage(vpnName) {
  CacheService.getScriptCache().remove(`consecutive_outage_${vpnName}`);
}

function notifyAdvancedOutage(outageInfo) {
  const tweet = `⚠️ ${outageInfo.vpn} 速度異常を検知

現在の速度: ${outageInfo.speed}Mbps
${outageInfo.historicalInfo || '通常より著しく低速'}

詳細▶️ https://www.blstweb.jp/network/vpn/vpn-speed-ranking/

#VPN #障害情報`;
  
  if (typeof postToTwitter === 'function') {
    postToTwitter(tweet);
  }
}

function saveAdvancedOutageToSheet(outageInfo) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(OUTAGE_ADVANCED_SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(OUTAGE_ADVANCED_SHEET_NAME);
    sheet.appendRow(['タイムスタンプ', 'VPNサービス', '速度 (Mbps)', '理由', '連続回数', '通知済み']);
    sheet.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground('#ea4335').setFontColor('#ffffff');
  }
  
  sheet.appendRow([outageInfo.timestamp, outageInfo.vpn, outageInfo.speed, outageInfo.reasons.join(', '), outageInfo.consecutiveCount, '通知済み']);
}

function setupAdvancedOutageDetectionTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'detectAdvancedOutages') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  ScriptApp.newTrigger('detectAdvancedOutages').timeBased().everyHours(1).create();
  Logger.log('✅ トリガー設定完了: 1時間ごと');
}

function testAdvancedOutageDetection() {
  detectAdvancedOutages();
}

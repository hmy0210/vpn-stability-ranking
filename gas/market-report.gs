/**
 * ============================================
 * エンジン8統合版: VPN業界統計レポート
 * トラストスコア統合済み
 * ============================================
 * 
 * データソース:
 * - 速度データ（エンジン1）
 * - VPN料金履歴（エンジン2a）
 * - VPN障害検知（エンジン2b）
 * - VPNニュース履歴（エンジン2b）
 * - トラストスコア（エンジン9）
 * 
 * @author Tokyo VPN Speed Monitor Project
 * @version 2.0
 * @license MIT
 */

const REPORT_CONFIG = {
  SPREADSHEET_ID: PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') || SpreadsheetApp.getActiveSpreadsheet().getId(),
  REPORT_SHEET_NAME: 'VPN業界統計レポート',
  ANALYSIS_PERIOD_DAYS: 90,
  
  SPEED_SHEET: '速度データ',
  PRICE_SHEET: 'VPN料金履歴',
  OUTAGE_SHEET: 'VPN障害検知（高度）',
  NEWS_SHEET: 'VPNニュース履歴',
  TRUST_SHEET: 'トラストスコア',
  
  EXCHANGE_RATES: { 'USD': 150, 'EUR': 160, 'GBP': 190, 'JPY': 1 }
};

const TRUST_API_CONFIG = {
  TRUST_API_URL: PropertiesService.getScriptProperties().getProperty('TRUST_API_URL') || '',
  USE_API: true
};

// ==================== メイン ====================
function generateVPNMarketReport() {
  Logger.log('==========================================');
  Logger.log('VPN業界統計レポート生成');
  Logger.log(`実行時刻: ${new Date().toLocaleString('ja-JP')}`);
  Logger.log('==========================================');
  
  const ss = SpreadsheetApp.openById(REPORT_CONFIG.SPREADSHEET_ID);
  
  Logger.log('【Step 1】データ収集');
  const speedData = collectSpeedData(ss);
  const priceData = collectPriceData(ss);
  const outageData = collectOutageData(ss);
  const newsData = collectNewsData(ss);
  const trustData = collectTrustScoreData(ss);
  
  Logger.log('【Step 2】統計計算');
  const speedStats = calculateSpeedStatistics(speedData);
  const priceStats = calculatePriceStatistics(priceData);
  const reliabilityStats = calculateReliabilityStatistics(speedData, outageData);
  const newsStats = analyzeNewsData(newsData);
  const trustStats = calculateTrustStatistics(trustData);
  
  Logger.log('【Step 3】レポート生成');
  const report = generateReportDocument(speedStats, priceStats, reliabilityStats, newsStats, trustStats);
  
  saveReportToSheet(ss, report);
  
  Logger.log('✅ レポート生成完了！');
  
  return report;
}

// ==================== データ収集 ====================
function collectSpeedData(ss) {
  const sheet = ss.getSheetByName(REPORT_CONFIG.SPEED_SHEET);
  if (!sheet || sheet.getLastRow() <= 1) return [];
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - REPORT_CONFIG.ANALYSIS_PERIOD_DAYS);
  
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 9).getValues();
  return data.filter(row => new Date(row[0]) >= cutoffDate).map(row => ({
    timestamp: row[0], vpnName: row[1], download: row[2], upload: row[3],
    ping: row[4], stability: row[5], reliability: row[6], totalScore: row[7]
  }));
}

function collectPriceData(ss) {
  const sheet = ss.getSheetByName(REPORT_CONFIG.PRICE_SHEET);
  if (!sheet || sheet.getLastRow() <= 1) return [];
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - REPORT_CONFIG.ANALYSIS_PERIOD_DAYS);
  
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 8).getValues();
  return data.filter(row => new Date(row[0]) >= cutoffDate).map(row => ({
    timestamp: row[0], vpnName: row[1], price: row[2], currency: row[3],
    method: row[4], isFallback: row[5] === 'はい'
  }));
}

function collectOutageData(ss) {
  const sheet = ss.getSheetByName(REPORT_CONFIG.OUTAGE_SHEET);
  if (!sheet || sheet.getLastRow() <= 1) return [];
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - REPORT_CONFIG.ANALYSIS_PERIOD_DAYS);
  
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getValues();
  return data.filter(row => new Date(row[0]) >= cutoffDate).map(row => ({
    timestamp: row[0], vpnName: row[1], speed: row[2], reason: row[3]
  }));
}

function collectNewsData(ss) {
  const sheet = ss.getSheetByName(REPORT_CONFIG.NEWS_SHEET);
  if (!sheet || sheet.getLastRow() <= 1) return [];
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - REPORT_CONFIG.ANALYSIS_PERIOD_DAYS);
  
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 7).getValues();
  return data.filter(row => new Date(row[0]) >= cutoffDate).map(row => ({
    timestamp: row[0], keyword: row[1], link: row[2], title: row[3], pubDate: row[4]
  }));
}

function collectTrustScoreData(ss) {
  if (TRUST_API_CONFIG.USE_API && TRUST_API_CONFIG.TRUST_API_URL) {
    try {
      const response = UrlFetchApp.fetch(TRUST_API_CONFIG.TRUST_API_URL + '?action=getTrustScores');
      const result = JSON.parse(response.getContentText());
      
      if (result.success && result.data && result.data.length > 0) {
        return result.data.map(item => ({
          vpnName: item.vpnName,
          headquarters: item.headquarters || '',
          scores: item.scores || {},
          totalScore: item.totalScore || item.score || 0,
          grade: item.grade || ''
        }));
      }
    } catch (e) {
      Logger.log(`⚠️ Trust API取得エラー: ${e.message}`);
    }
  }
  
  const sheet = ss.getSheetByName(REPORT_CONFIG.TRUST_SHEET);
  if (!sheet || sheet.getLastRow() <= 1) return [];
  
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 15).getValues();
  return data.map(row => ({
    vpnName: row[1], headquarters: row[2],
    totalScore: row[13], grade: row[14]
  }));
}

// ==================== 統計計算 ====================
function calculateSpeedStatistics(speedData) {
  if (speedData.length === 0) return { error: 'No data' };
  
  const vpnGroups = {};
  speedData.forEach(record => {
    if (!vpnGroups[record.vpnName]) vpnGroups[record.vpnName] = { speeds: [], pings: [], scores: [] };
    vpnGroups[record.vpnName].speeds.push(record.download);
    vpnGroups[record.vpnName].pings.push(record.ping);
    vpnGroups[record.vpnName].scores.push(record.totalScore);
  });
  
  const stats = Object.keys(vpnGroups).map(vpnName => {
    const vpn = vpnGroups[vpnName];
    return {
      vpnName,
      avgSpeed: average(vpn.speeds),
      avgPing: average(vpn.pings),
      avgScore: average(vpn.scores),
      measurements: vpn.speeds.length
    };
  }).sort((a, b) => b.avgSpeed - a.avgSpeed);
  
  const allSpeeds = speedData.map(d => d.download);
  return {
    byVPN: stats,
    overall: { marketAverage: average(allSpeeds), marketMax: Math.max(...allSpeeds), marketMin: Math.min(...allSpeeds) },
    totalMeasurements: speedData.length
  };
}

function calculatePriceStatistics(priceData) {
  if (priceData.length === 0) return { error: 'No data' };
  
  const latestPrices = {};
  priceData.forEach(record => {
    if (!latestPrices[record.vpnName] || new Date(record.timestamp) > new Date(latestPrices[record.vpnName].timestamp)) {
      latestPrices[record.vpnName] = record;
    }
  });
  
  const pricesByVPN = Object.values(latestPrices).map(price => ({
    ...price,
    priceInJPY: price.price * (REPORT_CONFIG.EXCHANGE_RATES[price.currency] || 1)
  }));
  
  const sortedByJPY = pricesByVPN.slice().sort((a, b) => a.priceInJPY - b.priceInJPY);
  const allPricesInJPY = pricesByVPN.map(p => p.priceInJPY);
  
  return {
    byVPN: pricesByVPN,
    sortedByJPY,
    allPricesJPYAverage: average(allPricesInJPY)
  };
}

function calculateReliabilityStatistics(speedData, outageData) {
  const outageCount = {};
  const measurementCount = {};
  
  outageData.forEach(record => { outageCount[record.vpnName] = (outageCount[record.vpnName] || 0) + 1; });
  speedData.forEach(record => { measurementCount[record.vpnName] = (measurementCount[record.vpnName] || 0) + 1; });
  
  const stats = Object.keys(measurementCount).map(vpnName => {
    const total = measurementCount[vpnName];
    const outages = outageCount[vpnName] || 0;
    return { vpnName, totalMeasurements: total, outages, uptime: ((total - outages) / total * 100).toFixed(2) };
  }).sort((a, b) => b.uptime - a.uptime);
  
  return { byVPN: stats, totalOutages: outageData.length };
}

function calculateTrustStatistics(trustData) {
  if (trustData.length === 0) return { error: 'No data' };
  
  const sorted = [...trustData].sort((a, b) => b.totalScore - a.totalScore);
  const gradeCount = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  trustData.forEach(vpn => { if (gradeCount.hasOwnProperty(vpn.grade)) gradeCount[vpn.grade]++; });
  
  return {
    sorted,
    gradeCount,
    avgScore: trustData.reduce((sum, vpn) => sum + vpn.totalScore, 0) / trustData.length,
    topVPN: sorted[0]
  };
}

function analyzeNewsData(newsData) {
  if (newsData.length === 0) return { error: 'No data' };
  
  const keywordCount = {};
  newsData.forEach(record => { keywordCount[record.keyword] = (keywordCount[record.keyword] || 0) + 1; });
  
  return { totalNews: newsData.length, byKeyword: keywordCount };
}

// ==================== レポート生成 ====================
function generateReportDocument(speedStats, priceStats, reliabilityStats, newsStats, trustStats) {
  const reportDate = new Date();
  const quarter = Math.ceil((reportDate.getMonth() + 1) / 3);
  const year = reportDate.getFullYear();
  
  let report = `# VPN業界統計レポート Q${quarter} ${year}

**発行日:** ${Utilities.formatDate(reportDate, 'JST', 'yyyy年MM月dd日')}
**分析期間:** ${REPORT_CONFIG.ANALYSIS_PERIOD_DAYS}日間
**データソース:** blstweb.jp VPN速度測定データベース

---

## 📊 エグゼクティブサマリー

`;
  
  if (speedStats.byVPN?.length > 0) report += `- **最速VPN:** ${speedStats.byVPN[0].vpnName} (平均 ${Math.round(speedStats.byVPN[0].avgSpeed)} Mbps)\n`;
  if (priceStats.sortedByJPY?.length > 0) report += `- **最安VPN:** ${priceStats.sortedByJPY[0].vpnName} (¥${Math.round(priceStats.sortedByJPY[0].priceInJPY)}/月)\n`;
  if (reliabilityStats.byVPN?.length > 0) report += `- **最高稼働率:** ${reliabilityStats.byVPN[0].vpnName} (${reliabilityStats.byVPN[0].uptime}%)\n`;
  if (trustStats.topVPN) report += `- **最高トラストスコア:** ${trustStats.topVPN.vpnName} (${trustStats.topVPN.totalScore}点・${trustStats.topVPN.grade}評価)\n`;
  if (speedStats.overall) report += `- **市場平均速度:** ${Math.round(speedStats.overall.marketAverage)} Mbps\n`;
  if (speedStats.totalMeasurements) report += `- **総測定回数:** ${speedStats.totalMeasurements.toLocaleString()}回\n`;
  
  report += `\n---\n\n## 1. 速度パフォーマンス\n\n`;
  
  if (speedStats.byVPN) {
    report += `| ランク | VPN | 平均速度 | 測定回数 |\n|--------|-----|----------|----------|\n`;
    speedStats.byVPN.slice(0, 10).forEach((vpn, i) => {
      report += `| ${i + 1} | ${vpn.vpnName} | ${Math.round(vpn.avgSpeed)} Mbps | ${vpn.measurements} |\n`;
    });
  }
  
  report += `\n---\n\n## 2. 料金トレンド\n\n`;
  
  if (priceStats.sortedByJPY) {
    report += `| VPN | 月額料金 | 通貨 |\n|-----|----------|------|\n`;
    priceStats.sortedByJPY.slice(0, 10).forEach(vpn => {
      const symbol = vpn.currency === 'JPY' ? '¥' : vpn.currency === 'USD' ? '$' : '€';
      report += `| ${vpn.vpnName} | ${symbol}${vpn.price} | ${vpn.currency} |\n`;
    });
  }
  
  report += `\n---\n\n## 3. 信頼性・稼働率\n\n`;
  
  if (reliabilityStats.byVPN) {
    report += `| VPN | 稼働率 | 障害回数 |\n|-----|--------|----------|\n`;
    reliabilityStats.byVPN.slice(0, 10).forEach(vpn => {
      report += `| ${vpn.vpnName} | ${vpn.uptime}% | ${vpn.outages} |\n`;
    });
  }
  
  report += `\n---\n\n## 4. トラストスコア\n\n`;
  
  if (trustStats.sorted) {
    report += `| ランク | VPN | スコア | 評価 |\n|--------|-----|--------|------|\n`;
    trustStats.sorted.slice(0, 10).forEach((vpn, i) => {
      report += `| ${i + 1} | ${vpn.vpnName} | ${vpn.totalScore} | ${vpn.grade} |\n`;
    });
    report += `\n- A評価: ${trustStats.gradeCount.A}社\n- 業界平均: ${trustStats.avgScore.toFixed(1)}点\n`;
  }
  
  report += `\n---\n\n*本レポートは blstweb.jp が独自に収集したデータに基づいています。*
*詳細データ: https://www.blstweb.jp/network/vpn/tokyo-vpn-speed-monitor/*`;
  
  return report;
}

// ==================== 保存 ====================
function saveReportToSheet(ss, reportText) {
  let sheet = ss.getSheetByName(REPORT_CONFIG.REPORT_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(REPORT_CONFIG.REPORT_SHEET_NAME);
    sheet.appendRow(['生成日時', 'レポート本文', 'ファイル名']);
    sheet.getRange(1, 1, 1, 3).setFontWeight('bold').setBackground('#4285f4').setFontColor('#ffffff');
  }
  
  const reportDate = new Date();
  const quarter = Math.ceil((reportDate.getMonth() + 1) / 3);
  const filename = `VPN_Market_Report_Q${quarter}_${reportDate.getFullYear()}.md`;
  
  sheet.appendRow([reportDate, reportText, filename]);
  Logger.log(`✅ 保存完了: ${filename}`);
}

// ==================== ヘルパー関数 ====================
function average(arr) { return (!arr || arr.length === 0) ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length; }

// ==================== トリガー設定 ====================
function setupQuarterlyReportTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (['generateVPNMarketReport', 'checkAndGenerateQuarterlyReport'].includes(trigger.getHandlerFunction())) {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  ScriptApp.newTrigger('checkAndGenerateQuarterlyReport').timeBased().onMonthDay(1).atHour(9).create();
  Logger.log('✅ トリガー設定完了: 毎月1日 09:00（四半期開始月のみ実行）');
}

function checkAndGenerateQuarterlyReport() {
  const month = new Date().getMonth();
  if ([0, 3, 6, 9].includes(month)) {
    generateVPNMarketReport();
  }
}

function testReportGeneration() {
  generateVPNMarketReport();
}

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
 * - トラストスコア（統合済み）
 */

// ==================== 設定 ====================
const REPORT_CONFIG = {
  // スプレッドシートIDは公開しない。未設定なら実行中のブックを使う。
  SPREADSHEET_ID: PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') || SpreadsheetApp.getActiveSpreadsheet().getId(),
  REPORT_SHEET_NAME: 'VPN業界統計レポート',
  REPORT_DATA_SHEET: 'レポート集約データ',
  ANALYSIS_PERIOD_DAYS: 90,
  
  // 既存シート名
  SPEED_SHEET: '速度データ',
  PRICE_SHEET: 'VPN料金履歴',
  OUTAGE_SHEET: 'VPN障害検知（高度）',
  NEWS_SHEET: 'VPNニュース履歴',
  TRUST_SHEET: 'トラストスコア',
  
  // 為替レート（getExchangeRates() が失敗したときの参考値。通常は使われない）
  EXCHANGE_RATES: { 'USD': 150, 'EUR': 160, 'GBP': 190, 'JPY': 1 }
};

const TRUST_API_CONFIG = {
  // デプロイURLは公開しない。スクリプトプロパティ TRUST_API_URL に設定すること。
  TRUST_API_URL: PropertiesService.getScriptProperties().getProperty('TRUST_API_URL') || '',
  USE_API: true,  // trueならAPIから取得、falseならスプレッドシートから取得
  USE_SAME_SPREADSHEET: false
};

// ==================== メイン ====================
function generateVPNMarketReport() {
  Logger.log('==========================================');
  Logger.log('VPN業界統計レポート生成（トラストスコア統合版）');
  Logger.log(`実行時刻: ${new Date().toLocaleString('ja-JP')}`);
  Logger.log('==========================================\n');
  
  const ss = SpreadsheetApp.openById(REPORT_CONFIG.SPREADSHEET_ID);
  
  Logger.log('【Step 1】データ収集');
  const speedData = collectSpeedData(ss);
  const priceData = collectPriceData(ss);
  const outageData = collectOutageData(ss);
  const newsData = collectNewsData(ss);
  const trustData = collectTrustScoreData(ss);
  
  Logger.log('\n【Step 2】統計計算');
  const speedStats = calculateSpeedStatistics(speedData);
  const priceStats = calculatePriceStatistics(priceData);
  const reliabilityStats = calculateReliabilityStatistics(speedData, outageData);
  const newsStats = analyzeNewsData(newsData);
  const trustStats = calculateTrustStatistics(trustData);
  
  Logger.log('\n【Step 3】レポート生成');
  const report = generateReportDocument(speedStats, priceStats, reliabilityStats, newsStats, trustStats);
  
  saveReportToSheet(ss, report);
  
  Logger.log('\n==========================================');
  Logger.log('✅ レポート生成完了！');
  Logger.log('==========================================');
  
  return report;
}

// ==================== データ収集 ====================
function collectSpeedData(ss) {
  Logger.log('📊 速度データ収集中...');
  const sheet = ss.getSheetByName(REPORT_CONFIG.SPEED_SHEET);
  if (!sheet || sheet.getLastRow() <= 1) { Logger.log('⚠️ 速度データなし'); return []; }
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - REPORT_CONFIG.ANALYSIS_PERIOD_DAYS);
  
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 9).getValues();
  const filteredData = data.filter(row => new Date(row[0]) >= cutoffDate).map(row => ({
    timestamp: row[0], vpnName: row[1], download: row[2], upload: row[3],
    ping: row[4], stability: row[5], reliability: row[6], totalScore: row[7], rank: row[8]
  }));
  
  Logger.log(`✅ 速度データ: ${filteredData.length}件`);
  return filteredData;
}

function collectPriceData(ss) {
  Logger.log('💰 料金データ収集中...');
  const sheet = ss.getSheetByName(REPORT_CONFIG.PRICE_SHEET);
  if (!sheet || sheet.getLastRow() <= 1) { Logger.log('⚠️ 料金データなし'); return []; }
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - REPORT_CONFIG.ANALYSIS_PERIOD_DAYS);
  
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 8).getValues();
  const filteredData = data.filter(row => new Date(row[0]) >= cutoffDate).map(row => ({
    timestamp: row[0], vpnName: row[1], price: row[2], currency: row[3],
    method: row[4], isFallback: row[5] === 'はい'
  }));
  
  Logger.log(`✅ 料金データ: ${filteredData.length}件`);
  return filteredData;
}

function collectOutageData(ss) {
  Logger.log('⚠️ 障害データ収集中...');
  const sheet = ss.getSheetByName(REPORT_CONFIG.OUTAGE_SHEET);
  if (!sheet || sheet.getLastRow() <= 1) { Logger.log('ℹ️ 障害データなし（正常）'); return []; }
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - REPORT_CONFIG.ANALYSIS_PERIOD_DAYS);
  
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getValues();
  const filteredData = data.filter(row => new Date(row[0]) >= cutoffDate).map(row => ({
    timestamp: row[0], vpnName: row[1], speed: row[2], reason: row[3], consecutiveCount: row[4]
  }));
  
  Logger.log(`✅ 障害データ: ${filteredData.length}件`);
  return filteredData;
}

function collectNewsData(ss) {
  Logger.log('📰 ニュースデータ収集中...');
  const sheet = ss.getSheetByName(REPORT_CONFIG.NEWS_SHEET);
  if (!sheet || sheet.getLastRow() <= 1) { Logger.log('⚠️ ニュースデータなし'); return []; }
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - REPORT_CONFIG.ANALYSIS_PERIOD_DAYS);
  
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 7).getValues();
  const filteredData = data.filter(row => new Date(row[0]) >= cutoffDate).map(row => ({
    timestamp: row[0], keyword: row[1], link: row[2], title: row[3], pubDate: row[4]
  }));
  
  Logger.log(`✅ ニュースデータ: ${filteredData.length}件`);
  return filteredData;
}

function collectTrustScoreData(ss) {
  Logger.log('🔒 トラストスコアデータ収集中...');
  
  // APIから取得
  if (TRUST_API_CONFIG.USE_API) {
    try {
      const response = UrlFetchApp.fetch(TRUST_API_CONFIG.TRUST_API_URL + '?action=getTrustScores');
      const result = JSON.parse(response.getContentText());
      
      if (result.success && result.data && result.data.length > 0) {
        const trustData = result.data.map(item => ({
          lastUpdate: item.lastUpdate || new Date(),
          vpnName: item.vpnName,
          headquarters: item.headquarters || '',
          scores: item.scores || {},
          totalScore: item.totalScore || item.score || 0,
          grade: item.grade || ''
        }));
        Logger.log(`✅ トラストスコアデータ（API）: ${trustData.length}社分`);
        return trustData;
      }
    } catch (e) {
      Logger.log(`⚠️ API取得エラー: ${e.message}`);
    }
  }
  
  // スプレッドシートから取得（フォールバック）
  const sheet = TRUST_API_CONFIG.USE_SAME_SPREADSHEET ? ss.getSheetByName(REPORT_CONFIG.TRUST_SHEET) : null;
  if (!sheet || sheet.getLastRow() <= 1) { Logger.log('⚠️ トラストスコアデータなし'); return []; }
  
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 15).getValues();
  const trustData = data.map(row => ({
    lastUpdate: row[0], vpnName: row[1], headquarters: row[2],
    scores: { noLogPolicy: row[3], thirdPartyAudit: row[4], transparencyReport: row[5],
      jurisdiction: row[6], dataRetention: row[7], openSource: row[8], ramOnlyServers: row[9],
      incidentResponse: row[10], legalResponse: row[11], operatingYears: row[12] },
    totalScore: row[13], grade: row[14]
  }));
  
  Logger.log(`✅ トラストスコアデータ: ${trustData.length}社分`);
  return trustData;
}

// ==================== 統計計算 ====================
function calculateSpeedStatistics(speedData) {
  Logger.log('📈 速度統計を計算中...');
  if (speedData.length === 0) return { error: 'No data' };
  
  const vpnGroups = {};
  speedData.forEach(record => {
    if (!vpnGroups[record.vpnName]) vpnGroups[record.vpnName] = { name: record.vpnName, speeds: [], pings: [], scores: [] };
    vpnGroups[record.vpnName].speeds.push(record.download);
    vpnGroups[record.vpnName].pings.push(record.ping);
    vpnGroups[record.vpnName].scores.push(record.totalScore);
  });
  
  const stats = Object.keys(vpnGroups).map(vpnName => {
    const vpn = vpnGroups[vpnName];
    return {
      vpnName, avgSpeed: average(vpn.speeds), medianSpeed: median(vpn.speeds),
      maxSpeed: Math.max(...vpn.speeds), minSpeed: Math.min(...vpn.speeds),
      speedStdDev: standardDeviation(vpn.speeds), avgPing: average(vpn.pings),
      avgScore: average(vpn.scores), measurements: vpn.speeds.length
    };
  }).sort((a, b) => b.avgSpeed - a.avgSpeed);
  
  Logger.log(`✅ 速度統計: ${stats.length}社分`);
  
  const allSpeeds = speedData.map(d => d.download);
  return {
    byVPN: stats,
    overall: { marketAverage: average(allSpeeds), marketMedian: median(allSpeeds), marketMax: Math.max(...allSpeeds), marketMin: Math.min(...allSpeeds) },
    period: `過去${REPORT_CONFIG.ANALYSIS_PERIOD_DAYS}日間`,
    totalMeasurements: speedData.length
  };
}

function calculatePriceStatistics(priceData) {
  Logger.log('💵 料金統計を計算中...');
  if (priceData.length === 0) return { error: 'No data' };
  
  const latestPrices = {};
  priceData.forEach(record => {
    if (!latestPrices[record.vpnName] || new Date(record.timestamp) > new Date(latestPrices[record.vpnName].timestamp)) {
      latestPrices[record.vpnName] = record;
    }
  });
  
  // 為替は1回だけ取得して使い回す（convertToJPY は Engine2a-phase2-pricing.js の3引数版が正）
  const rates = getExchangeRates();
  const pricesByVPN = Object.values(latestPrices).map(price => ({ ...price, priceInJPY: convertToJPY(price.price, price.currency, rates) }));
  const sortedByJPY = pricesByVPN.slice().sort((a, b) => a.priceInJPY - b.priceInJPY);
  
  const jpyPrices = pricesByVPN.filter(p => p.currency === 'JPY').map(p => p.price);
  const usdPrices = pricesByVPN.filter(p => p.currency === 'USD').map(p => p.price);
  const allPricesInJPY = pricesByVPN.map(p => p.priceInJPY);
  
  Logger.log(`✅ 料金統計: ${pricesByVPN.length}社分`);
  
  return {
    byVPN: pricesByVPN, sortedByJPY,
    jpyAverage: jpyPrices.length > 0 ? average(jpyPrices) : null,
    jpyMedian: jpyPrices.length > 0 ? median(jpyPrices) : null,
    usdAverage: usdPrices.length > 0 ? average(usdPrices) : null,
    usdMedian: usdPrices.length > 0 ? median(usdPrices) : null,
    allPricesJPYAverage: average(allPricesInJPY),
    allPricesJPYMedian: median(allPricesInJPY),
    priceChanges: analyzePriceChanges(priceData),
    period: `過去${REPORT_CONFIG.ANALYSIS_PERIOD_DAYS}日間`
  };
}

// NOTE: convertToJPY はここでは定義しない。
// GAS は全ファイルが単一グローバル空間のため、ここで再定義すると
// Engine2a-phase2-pricing.js の 3引数版（ライブ為替 + Math.round）を上書きし、
// 料金エンジン全体の円換算が固定レートに化ける。

function analyzePriceChanges(priceData) {
  const vpnPriceHistory = {};
  priceData.forEach(record => {
    if (!vpnPriceHistory[record.vpnName]) vpnPriceHistory[record.vpnName] = [];
    vpnPriceHistory[record.vpnName].push(record);
  });
  
  const changes = [];
  Object.keys(vpnPriceHistory).forEach(vpnName => {
    const history = vpnPriceHistory[vpnName];
    if (history.length < 2) return;
    history.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const oldest = history[0], latest = history[history.length - 1];
    if (oldest.currency === latest.currency && oldest.price !== latest.price) {
      const priceDiff = latest.price - oldest.price;
      changes.push({ vpnName, oldPrice: oldest.price, newPrice: latest.price, currency: latest.currency,
        percentChange: parseFloat(((priceDiff / oldest.price) * 100).toFixed(1)),
        changeType: priceDiff > 0 ? '値上げ' : '値下げ' });
    }
  });
  return changes;
}

function calculateReliabilityStatistics(speedData, outageData) {
  Logger.log('🔧 信頼性統計を計算中...');
  
  const outageCount = {}, measurementCount = {};
  outageData.forEach(record => { outageCount[record.vpnName] = (outageCount[record.vpnName] || 0) + 1; });
  speedData.forEach(record => { measurementCount[record.vpnName] = (measurementCount[record.vpnName] || 0) + 1; });
  
  const reliabilityStats = {};
  Object.keys(measurementCount).forEach(vpnName => {
    const total = measurementCount[vpnName], outages = outageCount[vpnName] || 0;
    reliabilityStats[vpnName] = { vpnName, totalMeasurements: total, outages, uptime: parseFloat(((total - outages) / total * 100).toFixed(2)) };
  });
  
  const sortedStats = Object.values(reliabilityStats).sort((a, b) => b.uptime - a.uptime);
  Logger.log(`✅ 信頼性統計: ${sortedStats.length}社分`);
  
  return { byVPN: sortedStats, totalOutages: outageData.length, period: `過去${REPORT_CONFIG.ANALYSIS_PERIOD_DAYS}日間` };
}

function calculateTrustStatistics(trustData) {
  Logger.log('📊 トラストスコア統計を計算中...');
  if (trustData.length === 0) return { error: 'No data' };
  
  const sorted = [...trustData].sort((a, b) => b.totalScore - a.totalScore);
  const gradeCount = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  trustData.forEach(vpn => { if (gradeCount.hasOwnProperty(vpn.grade)) gradeCount[vpn.grade]++; });
  
  const avgScore = trustData.reduce((sum, vpn) => sum + vpn.totalScore, 0) / trustData.length;
  const itemAverages = {
    noLogPolicy: averageItem(trustData.map(v => v.scores.noLogPolicy)),
    thirdPartyAudit: averageItem(trustData.map(v => v.scores.thirdPartyAudit)),
    transparencyReport: averageItem(trustData.map(v => v.scores.transparencyReport)),
    jurisdiction: averageItem(trustData.map(v => v.scores.jurisdiction)),
    openSource: averageItem(trustData.map(v => v.scores.openSource)),
    ramOnlyServers: averageItem(trustData.map(v => v.scores.ramOnlyServers))
  };
  
  const byHeadquarters = {};
  trustData.forEach(vpn => {
    if (!byHeadquarters[vpn.headquarters]) byHeadquarters[vpn.headquarters] = [];
    byHeadquarters[vpn.headquarters].push(vpn.vpnName);
  });
  
  Logger.log(`✅ トラストスコア統計: 平均${avgScore.toFixed(1)}点, A評価${gradeCount.A}社`);
  
  return { sorted, gradeCount, avgScore, itemAverages, byHeadquarters, topVPN: sorted[0], bottomVPN: sorted[sorted.length - 1] };
}

function analyzeNewsData(newsData) {
  Logger.log('📰 ニュースデータ分析中...');
  if (newsData.length === 0) return { error: 'No data' };
  
  const keywordCount = {};
  newsData.forEach(record => { keywordCount[record.keyword] = (keywordCount[record.keyword] || 0) + 1; });
  
  const vpnNames = ['NordVPN', 'ExpressVPN', 'Surfshark', 'ProtonVPN', 'CyberGhost', 'Private Internet Access', 'IPVanish', 'Mullvad', 'Windscribe', 'MillenVPN'];
  const vpnMentions = {};
  vpnNames.forEach(vpnName => {
    const count = newsData.filter(news => news.title.includes(vpnName) || news.title.includes(vpnName.toLowerCase())).length;
    if (count > 0) vpnMentions[vpnName] = count;
  });
  
  const monthlyTrend = {};
  newsData.forEach(record => {
    const month = Utilities.formatDate(new Date(record.pubDate), 'JST', 'yyyy-MM');
    monthlyTrend[month] = (monthlyTrend[month] || 0) + 1;
  });
  
  Logger.log(`✅ ニュース分析: ${newsData.length}件`);
  return { totalNews: newsData.length, byKeyword: keywordCount, vpnMentions, monthlyTrend, period: `過去${REPORT_CONFIG.ANALYSIS_PERIOD_DAYS}日間` };
}

// ==================== レポート生成 ====================
function generateReportDocument(speedStats, priceStats, reliabilityStats, newsStats, trustStats) {
  Logger.log('📄 レポート文書を生成中...');
  
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
  
  report += generateExecutiveSummary(speedStats, priceStats, reliabilityStats, newsStats, trustStats);
  report += `\n\n---\n\n## 1. 市場概況\n\n### 1.1 速度パフォーマンス\n\n`;
  report += generateSpeedSection(speedStats);
  report += `\n\n### 1.2 料金トレンド\n\n`;
  report += generatePriceSection(priceStats);
  report += `\n\n---\n\n## 2. サービス品質分析\n\n### 2.1 信頼性・稼働率\n\n`;
  report += generateReliabilitySection(reliabilityStats);
  report += `\n\n---\n\n## 3. プライバシー・信頼性分析\n\n### 3.1 トラストスコア\n\n`;
  report += generateTrustScoreSection(trustStats);
  report += `\n\n---\n\n## 4. 業界動向\n\n### 4.1 ニュース・トピック分析\n\n`;
  report += generateNewsSection(newsStats);
  report += `\n\n---\n\n## 5. 総合ランキング\n\n`;
  report += generateOverallRanking(speedStats, priceStats, reliabilityStats, trustStats);
  report += `\n\n---\n\n## 6. 将来予測\n\n`;
  report += generateFutureForecast(speedStats, priceStats, newsStats, trustStats);
  report += generateMethodologySection();
  
  Logger.log('✅ レポート文書生成完了');
  return report;
}

function generateExecutiveSummary(speedStats, priceStats, reliabilityStats, newsStats, trustStats) {
  let summary = '**主要な発見事項:**\n\n';
  
  if (speedStats.byVPN?.length > 0) summary += `1. **最速VPN:** ${speedStats.byVPN[0].vpnName} (平均 ${Math.round(speedStats.byVPN[0].avgSpeed)} Mbps)\n`;
  if (priceStats.sortedByJPY?.length > 0) {
    const c = priceStats.sortedByJPY[0];
    const displayPrice = c.currency === 'JPY' ? `¥${Math.round(c.price)}` : `${c.currency === 'USD' ? '$' : '€'}${c.price} (¥${Math.round(c.priceInJPY)}相当)`;
    summary += `2. **最安VPN:** ${c.vpnName} (${displayPrice}/月)\n`;
  }
  if (reliabilityStats.byVPN?.length > 0) summary += `3. **最高稼働率:** ${reliabilityStats.byVPN[0].vpnName} (${reliabilityStats.byVPN[0].uptime}%)\n`;
  if (trustStats.topVPN) summary += `4. **最高トラストスコア:** ${trustStats.topVPN.vpnName} (${trustStats.topVPN.totalScore}点・${trustStats.topVPN.grade}評価)\n`;
  if (speedStats.overall) summary += `5. **市場平均速度:** ${Math.round(speedStats.overall.marketAverage)} Mbps\n`;
  if (priceStats.allPricesJPYAverage) summary += `6. **市場平均価格:** ¥${Math.round(priceStats.allPricesJPYAverage)}/月\n`;
  if (trustStats.avgScore) summary += `7. **業界平均トラストスコア:** ${trustStats.avgScore.toFixed(1)}点\n`;
  if (trustStats.gradeCount) summary += `8. **プライバシー優良（A評価）:** ${trustStats.gradeCount.A}社\n`;
  if (priceStats.priceChanges?.length > 0) {
    const priceDrops = priceStats.priceChanges.filter(c => c.changeType === '値下げ').length;
    const priceIncreases = priceStats.priceChanges.filter(c => c.changeType === '値上げ').length;
    summary += `9. **価格変動:** 値下げ${priceDrops}社、値上げ${priceIncreases}社\n`;
  }
  if (speedStats.totalMeasurements) summary += `10. **総測定回数:** ${speedStats.totalMeasurements.toLocaleString()}回\n`;
  
  summary += `\n**市場トレンド:**\n\n`;
  if (speedStats.overall && speedStats.byVPN?.length > 0) {
    const speedGap = ((speedStats.byVPN[0].avgSpeed - speedStats.overall.marketAverage) / speedStats.overall.marketAverage * 100).toFixed(1);
    summary += `- トップVPNと市場平均の速度差: ${speedGap}%\n`;
  }
  if (priceStats.sortedByJPY?.length >= 2) {
    const priceDiff = ((priceStats.allPricesJPYAverage - priceStats.sortedByJPY[0].priceInJPY) / priceStats.allPricesJPYAverage * 100).toFixed(1);
    summary += `- 最安値と市場平均の価格差: ${priceDiff}%\n`;
  }
  summary += reliabilityStats.totalOutages === 0 ? `- 障害発生: なし（全VPNが安定稼働）\n` : `- 障害発生: ${reliabilityStats.totalOutages}件\n`;
  if (trustStats.itemAverages?.thirdPartyAudit) summary += `- 第三者監査実施率: 業界平均 ${trustStats.itemAverages.thirdPartyAudit.toFixed(1)}/5点\n`;
  
  return summary;
}

function generateSpeedSection(speedStats) {
  let section = '';
  if (speedStats.overall) {
    section += `**市場全体:**\n- 平均速度: ${Math.round(speedStats.overall.marketAverage)} Mbps\n- 中央値: ${Math.round(speedStats.overall.marketMedian)} Mbps\n- 最高速度: ${Math.round(speedStats.overall.marketMax)} Mbps\n- 最低速度: ${Math.round(speedStats.overall.marketMin)} Mbps\n- 総測定回数: ${speedStats.totalMeasurements.toLocaleString()}回\n\n`;
  }
  section += `**トップ10 VPN（平均速度）:**\n\n| ランク | VPNサービス | 平均速度 | 中央値 | 標準偏差 | 測定回数 |\n|--------|------------|----------|--------|----------|----------|\n`;
  if (speedStats.byVPN) speedStats.byVPN.slice(0, 10).forEach((vpn, i) => {
    section += `| ${i + 1} | ${vpn.vpnName} | ${Math.round(vpn.avgSpeed)} Mbps | ${Math.round(vpn.medianSpeed)} Mbps | ${vpn.speedStdDev.toFixed(1)} | ${vpn.measurements} |\n`;
  });
  return section;
}

function generatePriceSection(priceStats) {
  let section = `**市場平均価格:**\n`;
  if (priceStats.jpyAverage) section += `- 日本円: ¥${Math.round(priceStats.jpyAverage)}/月（中央値: ¥${Math.round(priceStats.jpyMedian)}）\n`;
  if (priceStats.usdAverage) section += `- 米ドル: $${priceStats.usdAverage.toFixed(2)}/月（中央値: $${priceStats.usdMedian.toFixed(2)}）\n`;
  section += `\n`;
  if (priceStats.priceChanges?.length > 0) {
    section += `**価格変動（期間内）:**\n\n| VPNサービス | 旧価格 | 新価格 | 変動率 | 種別 |\n|------------|--------|--------|--------|------|\n`;
    priceStats.priceChanges.sort((a, b) => Math.abs(b.percentChange) - Math.abs(a.percentChange)).slice(0, 10).forEach(c => {
      const symbol = c.currency === 'JPY' ? '¥' : c.currency === 'USD' ? '$' : '€';
      section += `| ${c.vpnName} | ${symbol}${c.oldPrice} | ${symbol}${c.newPrice} | ${c.percentChange > 0 ? '+' : ''}${c.percentChange}% | ${c.changeType} |\n`;
    });
  }
  return section;
}

function generateReliabilitySection(reliabilityStats) {
  let section = `**稼働率トップ10:**\n\n| ランク | VPNサービス | 稼働率 | 障害回数 | 測定回数 |\n|--------|------------|--------|----------|----------|\n`;
  if (reliabilityStats.byVPN) reliabilityStats.byVPN.slice(0, 10).forEach((vpn, i) => {
    section += `| ${i + 1} | ${vpn.vpnName} | ${vpn.uptime}% | ${vpn.outages} | ${vpn.totalMeasurements} |\n`;
  });
  section += `\n**総障害件数:** ${reliabilityStats.totalOutages}件\n`;
  return section;
}

function generateTrustScoreSection(trustStats) {
  if (trustStats.error) return `トラストスコアデータがありません。\n\n`;
  
  let section = `**市場全体:**\n- 平均トラストスコア: ${trustStats.avgScore.toFixed(1)}点\n- グレードA（85点以上）: ${trustStats.gradeCount.A}社\n- グレードB（70-84点）: ${trustStats.gradeCount.B}社\n- グレードC（55-69点）: ${trustStats.gradeCount.C}社\n- グレードD以下: ${trustStats.gradeCount.D + trustStats.gradeCount.F}社\n\n`;
  
  section += `**トラストスコア トップ10:**\n\n| ランク | VPNサービス | 本社所在地 | スコア | 評価 |\n|--------|------------|------------|--------|------|\n`;
  trustStats.sorted.slice(0, 10).forEach((vpn, i) => {
    section += `| ${i + 1} | ${vpn.vpnName} | ${vpn.headquarters} | ${vpn.totalScore} | ${vpn.grade} |\n`;
  });
  
  section += `\n**評価項目別 業界平均（5点満点）:**\n\n| 項目 | 業界平均 | 評価 |\n|------|----------|------|\n`;
  const itemLabels = { noLogPolicy: 'ノーログポリシー', thirdPartyAudit: '第三者監査', transparencyReport: '透明性レポート', jurisdiction: '法的管轄', openSource: 'オープンソース', ramOnlyServers: 'RAMサーバー' };
  Object.entries(trustStats.itemAverages).forEach(([key, avg]) => {
    const rating = avg >= 4 ? '優良' : avg >= 3 ? '標準' : '要改善';
    section += `| ${itemLabels[key] || key} | ${avg.toFixed(1)} | ${rating} |\n`;
  });
  
  section += `\n**本社所在地別 VPN数:**\n\n`;
  Object.entries(trustStats.byHeadquarters).sort((a, b) => b[1].length - a[1].length).forEach(([hq, vpns]) => {
    section += `- ${hq}: ${vpns.length}社（${vpns.join(', ')}）\n`;
  });
  
  section += `\n**注目ポイント:**\n\n- 最高評価: ${trustStats.topVPN.vpnName}（${trustStats.topVPN.totalScore}点）\n- 第三者監査実施率: 業界平均 ${trustStats.itemAverages.thirdPartyAudit.toFixed(1)}/5点\n`;
  if (trustStats.itemAverages.openSource < 3) section += `- オープンソース対応は業界全体で課題（平均${trustStats.itemAverages.openSource.toFixed(1)}点）\n`;
  
  return section;
}

function generateNewsSection(newsStats) {
  let section = `**ニュース総数:** ${newsStats.totalNews}件\n\n`;
  if (newsStats.byKeyword) {
    section += `**注目トピック:**\n\n`;
    Object.keys(newsStats.byKeyword).sort((a, b) => newsStats.byKeyword[b] - newsStats.byKeyword[a]).slice(0, 5).forEach(keyword => {
      section += `- ${keyword}: ${newsStats.byKeyword[keyword]}件\n`;
    });
    section += `\n`;
  }
  if (newsStats.vpnMentions && Object.keys(newsStats.vpnMentions).length > 0) {
    section += `**メディア注目度（VPN別）:**\n\n`;
    Object.keys(newsStats.vpnMentions).sort((a, b) => newsStats.vpnMentions[b] - newsStats.vpnMentions[a]).slice(0, 5).forEach(vpn => {
      section += `- ${vpn}: ${newsStats.vpnMentions[vpn]}件\n`;
    });
  }
  return section;
}

function generateOverallRanking(speedStats, priceStats, reliabilityStats, trustStats) {
  let section = `**総合評価TOP10（速度30%・料金25%・信頼性15%・トラストスコア30%）:**\n\n`;
  
  const overallScores = {};
  if (speedStats.byVPN) speedStats.byVPN.forEach((vpn, i) => {
    if (!overallScores[vpn.vpnName]) overallScores[vpn.vpnName] = { name: vpn.vpnName, score: 0, components: {} };
    overallScores[vpn.vpnName].components.speed = Math.max(0, 100 - i * 5);
    overallScores[vpn.vpnName].score += overallScores[vpn.vpnName].components.speed * 0.30;
  });
  if (priceStats.sortedByJPY) priceStats.sortedByJPY.forEach((vpn, i) => {
    if (!overallScores[vpn.vpnName]) overallScores[vpn.vpnName] = { name: vpn.vpnName, score: 0, components: {} };
    overallScores[vpn.vpnName].components.price = Math.max(0, 100 - i * 5);
    overallScores[vpn.vpnName].score += overallScores[vpn.vpnName].components.price * 0.25;
  });
  if (reliabilityStats.byVPN) reliabilityStats.byVPN.forEach(vpn => {
    if (!overallScores[vpn.vpnName]) overallScores[vpn.vpnName] = { name: vpn.vpnName, score: 0, components: {} };
    overallScores[vpn.vpnName].components.reliability = vpn.uptime;
    overallScores[vpn.vpnName].score += vpn.uptime * 0.15;
  });
  if (trustStats.sorted) trustStats.sorted.forEach(vpn => {
    if (!overallScores[vpn.vpnName]) overallScores[vpn.vpnName] = { name: vpn.vpnName, score: 0, components: {} };
    overallScores[vpn.vpnName].components.trust = vpn.totalScore;
    overallScores[vpn.vpnName].score += vpn.totalScore * 0.30;
  });
  
  const sortedOverall = Object.values(overallScores).sort((a, b) => b.score - a.score).slice(0, 10);
  section += `| ランク | VPNサービス | 総合スコア | 速度 | 料金 | 信頼性 | トラスト |\n|--------|------------|------------|------|------|--------|----------|\n`;
  sortedOverall.forEach((vpn, i) => {
    section += `| ${i + 1} | ${vpn.name} | ${Math.round(vpn.score)} | ${Math.round(vpn.components.speed || 0)} | ${Math.round(vpn.components.price || 0)} | ${(vpn.components.reliability || 0).toFixed(1)}% | ${Math.round(vpn.components.trust || 0)} |\n`;
  });
  
  return section;
}

function generateFutureForecast(speedStats, priceStats, newsStats, trustStats) {
  let section = `**次四半期の見通し:**\n\n### 6.1 速度トレンド\n\n`;
  if (speedStats.overall) section += `- 現在の市場平均: ${Math.round(speedStats.overall.marketAverage)} Mbps\n- 予測: 前四半期比 +5-10% の速度向上を見込む\n- 理由: WireGuardプロトコルの普及、インフラ強化\n\n`;
  
  section += `### 6.2 価格トレンド\n\n`;
  if (priceStats.priceChanges) {
    const priceDrops = priceStats.priceChanges.filter(c => c.changeType === '値下げ').length;
    section += priceDrops >= 3 ? `- 傾向: 値下げ競争が活発化\n- 予測: 長期プラン価格のさらなる低下を見込む\n- 理由: 市場競争の激化、新規参入増加\n\n` : `- 傾向: 価格は概ね安定\n- 予測: 大幅な価格変動は少ない見込み\n- 注目: セールやキャンペーン時期に注目\n\n`;
  }
  
  if (trustStats && !trustStats.error) {
    section += `### 6.3 プライバシートレンド\n\n- 現在のA評価VPN数: ${trustStats.gradeCount.A}社\n- 予測: 第三者監査実施VPNの増加を見込む\n- 注目: RAMサーバー導入の加速、透明性レポート公開の拡大\n\n`;
  }
  
  section += `### 6.4 注目すべき動き\n\n`;
  if (newsStats.byKeyword) {
    const topKeywords = Object.keys(newsStats.byKeyword).sort((a, b) => newsStats.byKeyword[b] - newsStats.byKeyword[a]).slice(0, 3);
    if (topKeywords.length > 0) { section += `**注目トピック:**\n`; topKeywords.forEach(k => { section += `- ${k}\n`; }); section += `\n`; }
  }
  
  section += `**リスク要因:**\n- VPN規制の強化（特定地域）\n- サイバーセキュリティ脅威の増加\n- 為替変動による価格変動\n- プライバシー法改正の影響\n\n`;
  section += `**推奨アクション:**\n- 長期プラン契約で価格変動リスクを軽減\n- 定期的な速度テストで品質確認\n- トラストスコアを参考にプライバシー重視のVPN選択\n- 複数VPNサービスの比較検討を継続\n`;
  
  return section;
}

function generateMethodologySection() {
  return `\n\n---\n\n## 7. 方法論

**データ収集:**
- 速度測定: 6時間ごと自動測定（日本・東京）
- 料金情報: 毎日自動スクレイピング
- 障害検知: 1時間ごと自動監視
- ニュース収集: 6時間ごとGoogle News RSS
- トラストスコア: 毎月更新（10項目評価）

**トラストスコア評価項目:**
1. ノーログポリシー（15点）
2. 第三者監査（15点）
3. 透明性レポート（10点）
4. 法的管轄（10点）
5. データ保持期間（10点）
6. オープンソース（10点）
7. RAMサーバー（10点）
8. インシデント対応（10点）
9. 法的対応（5点）
10. 運営年数（5点）

**為替レート:** 1 USD = ${REPORT_CONFIG.EXCHANGE_RATES.USD} JPY, 1 EUR = ${REPORT_CONFIG.EXCHANGE_RATES.EUR} JPY

---

*本レポートは blstweb.jp が独自に収集したデータに基づいています。*  
*詳細データ: https://www.blstweb.jp/network/vpn/tokyo-vpn-speed-monitor/*\n`;
}

// ==================== 保存 ====================
function saveReportToSheet(ss, reportText) {
  Logger.log('💾 Spreadsheetに保存中...');
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
  sheet.setColumnWidth(2, 800);
  Logger.log(`✅ 保存完了: ${filename}`);
}

// ==================== ヘルパー関数 ====================
// average / averageItem / median / standardDeviation は _shared-utils.js に集約

// ==================== PDF出力 ====================
function generateReportPDF() {
  Logger.log('==========================================');
  Logger.log('PDF生成開始');
  Logger.log('==========================================\n');
  
  const reportText = generateVPNMarketReport();
  const reportDate = new Date();
  const quarter = Math.ceil((reportDate.getMonth() + 1) / 3);
  const docTitle = `VPN業界統計レポート Q${quarter} ${reportDate.getFullYear()}`;
  
  const doc = DocumentApp.create(docTitle);
  const body = doc.getBody();
  insertMarkdownToGoogleDocs(body, reportText);
  
  const docId = doc.getId();
  const pdfBlob = DriveApp.getFileById(docId).getAs('application/pdf');
  pdfBlob.setName(`${docTitle}.pdf`);
  const pdfFile = DriveApp.createFile(pdfBlob);
  
  Logger.log(`\n✅ PDF生成完了！`);
  Logger.log(`📄 Google Docs: ${doc.getUrl()}`);
  Logger.log(`📁 PDF: ${pdfFile.getUrl()}`);
  
  return { docUrl: doc.getUrl(), pdfUrl: pdfFile.getUrl(), docId, pdfId: pdfFile.getId() };
}

function insertMarkdownToGoogleDocs(body, markdown) {
  const lines = markdown.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') { body.appendParagraph(''); continue; }
    if (line.startsWith('# ')) { body.appendParagraph(line.substring(2)).setHeading(DocumentApp.ParagraphHeading.HEADING1); continue; }
    if (line.startsWith('## ')) { body.appendParagraph(line.substring(3)).setHeading(DocumentApp.ParagraphHeading.HEADING2); continue; }
    if (line.startsWith('### ')) { body.appendParagraph(line.substring(4)).setHeading(DocumentApp.ParagraphHeading.HEADING3); continue; }
    if (line.includes('**')) {
      const para = body.appendParagraph('');
      const text = para.editAsText();
      let currentPos = 0, tempLine = line;
      while (tempLine.includes('**')) {
        const startBold = tempLine.indexOf('**'), endBold = tempLine.indexOf('**', startBold + 2);
        if (endBold === -1) break;
        if (startBold > 0) { text.appendText(tempLine.substring(0, startBold)); currentPos += startBold; }
        const boldText = tempLine.substring(startBold + 2, endBold);
        text.appendText(boldText);
        text.setBold(currentPos, currentPos + boldText.length - 1, true);
        currentPos += boldText.length;
        tempLine = tempLine.substring(endBold + 2);
      }
      if (tempLine.length > 0) text.appendText(tempLine);
      continue;
    }
    if (line.startsWith('|')) {
      const tableLines = [line];
      while (i + 1 < lines.length && lines[i + 1].startsWith('|')) { i++; tableLines.push(lines[i]); }
      insertTable(body, tableLines);
      continue;
    }
    if (line.startsWith('- ')) { body.appendListItem(line.substring(2)).setGlyphType(DocumentApp.GlyphType.BULLET); continue; }
    if (/^\d+\.\s/.test(line)) { body.appendListItem(line.substring(line.indexOf('.') + 2)).setGlyphType(DocumentApp.GlyphType.NUMBER); continue; }
    if (line.trim() === '---') { body.appendHorizontalRule(); continue; }
    body.appendParagraph(line);
  }
}

function insertTable(body, tableLines) {
  const dataLines = tableLines.filter(line => !line.includes('---'));
  if (dataLines.length === 0) return;
  const rows = dataLines.map(line => line.split('|').slice(1, -1).map(cell => cell.trim()));
  if (rows.length === 0 || rows[0].length === 0) return;
  const table = body.appendTable();
  rows.forEach((rowData, rowIndex) => {
    const row = table.appendTableRow();
    rowData.forEach(cellText => {
      const cell = row.appendTableCell(cellText);
      if (rowIndex === 0) { cell.editAsText().setBold(true); cell.setBackgroundColor('#f0f0f0'); }
    });
  });
}

// ==================== トリガー設定 ====================
function setupQuarterlyReportTrigger() {
  Logger.log('==========================================');
  Logger.log('四半期レポートトリガー設定');
  Logger.log('==========================================\n');
  
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (['generateVPNMarketReport', 'checkAndGenerateQuarterlyReport'].includes(trigger.getHandlerFunction())) {
      ScriptApp.deleteTrigger(trigger);
      Logger.log('🗑️ 既存トリガー削除');
    }
  });
  
  ScriptApp.newTrigger('checkAndGenerateQuarterlyReport').timeBased().onMonthDay(1).atHour(9).create();
  Logger.log('✅ トリガー設定完了: 毎月1日 09:00（四半期開始月のみ実行）');
}

function checkAndGenerateQuarterlyReport() {
  const month = new Date().getMonth();
  if ([0, 3, 6, 9].includes(month)) {
    Logger.log(`四半期開始月（${month + 1}月）: レポート生成を実行`);
    generateVPNMarketReport();
  } else {
    Logger.log(`非四半期月（${month + 1}月）: スキップ`);
  }
}

function setupReportSheet() {
  const ss = SpreadsheetApp.openById(REPORT_CONFIG.SPREADSHEET_ID);
  let sheet = ss.getSheetByName(REPORT_CONFIG.REPORT_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(REPORT_CONFIG.REPORT_SHEET_NAME);
    sheet.appendRow(['生成日時', 'レポート本文', 'ファイル名']);
    sheet.getRange(1, 1, 1, 3).setFontWeight('bold').setBackground('#4285f4').setFontColor('#ffffff');
    Logger.log('✅ シート作成完了');
  } else {
    Logger.log('✅ シート確認完了');
  }
}

// ==================== テスト ====================
function testReportGeneration() {
  Logger.log('==========================================');
  Logger.log('レポート生成テスト');
  Logger.log('==========================================\n');
  const report = generateVPNMarketReport();
  Logger.log('\n生成されたレポート:\n' + report);
}

function testDataCollection() {
  Logger.log('==========================================');
  Logger.log('データ収集テスト');
  Logger.log('==========================================\n');
  const ss = SpreadsheetApp.openById(REPORT_CONFIG.SPREADSHEET_ID);
  const speedData = collectSpeedData(ss);
  const priceData = collectPriceData(ss);
  const outageData = collectOutageData(ss);
  const newsData = collectNewsData(ss);
  const trustData = collectTrustScoreData(ss);
  Logger.log(`\nサマリー: 速度${speedData.length}件, 料金${priceData.length}件, 障害${outageData.length}件, ニュース${newsData.length}件, トラスト${trustData.length}社`);
}

function testTrustStatistics() {
  Logger.log('==========================================');
  Logger.log('トラストスコア統計テスト');
  Logger.log('==========================================\n');
  const ss = SpreadsheetApp.openById(REPORT_CONFIG.SPREADSHEET_ID);
  const trustData = collectTrustScoreData(ss);
  const trustStats = calculateTrustStatistics(trustData);
  Logger.log(`\n統計結果: 平均${trustStats.avgScore.toFixed(1)}点, A評価${trustStats.gradeCount.A}社, トップ${trustStats.topVPN.vpnName}`);
}
/**
 * ============================================
 * エンジン8: VPN業界統計レポート
 * 既存データを活用した四半期レポート生成
 * ============================================
 * 
 * データソース:
 * - 速度データ（エンジン1）
 * - VPN料金履歴（エンジン2a）
 * - VPN障害検知（エンジン2b）
 * - VPNニュース履歴（エンジン2b）
 */

// ==================== 設定 ====================
const REPORT_CONFIG = {
  SPREADSHEET_ID: 'typeof CONFIG !== 'undefined' ? CONFIG.SPREADSHEET_ID : 'YOUR_SPREADSHEET_ID'',
  REPORT_SHEET_NAME: 'VPN業界統計レポート',
  REPORT_DATA_SHEET: 'レポート集約データ',
  
  // 分析期間（デフォルト: 過去3ヶ月）
  ANALYSIS_PERIOD_DAYS: 90,
  
  // 既存シート名
  SPEED_SHEET: '速度データ',
  PRICE_SHEET: 'VPN料金履歴',
  OUTAGE_SHEET: 'VPN障害検知（高度）',
  NEWS_SHEET: 'VPNニュース履歴',
  
  // 為替レート（JPY換算用）
  EXCHANGE_RATES: {
    'USD': 150,  // 1 USD = 150 JPY
    'EUR': 160,  // 1 EUR = 160 JPY
    'GBP': 190,  // 1 GBP = 190 JPY
    'JPY': 1
  }
};

// ==================== メイン: レポート生成 ====================
function generateVPNMarketReport() {
  Logger.log('==========================================');
  Logger.log('VPN業界統計レポート生成');
  Logger.log(`実行時刻: ${new Date().toLocaleString('ja-JP')}`);
  Logger.log('==========================================');
  Logger.log('');
  
  const ss = SpreadsheetApp.openById(REPORT_CONFIG.SPREADSHEET_ID);
  
  // 1. データ収集
  Logger.log('【Step 1】データ収集');
  const speedData = collectSpeedData(ss);
  const priceData = collectPriceData(ss);
  const outageData = collectOutageData(ss);
  const newsData = collectNewsData(ss);
  
  Logger.log('');
  
  // 2. 統計計算
  Logger.log('【Step 2】統計計算');
  const speedStats = calculateSpeedStatistics(speedData);
  const priceStats = calculatePriceStatistics(priceData);
  const reliabilityStats = calculateReliabilityStatistics(speedData, outageData);
  const newsStats = analyzeNewsData(newsData);
  
  Logger.log('');
  
  // 3. レポート生成
  Logger.log('【Step 3】レポート生成');
  const report = generateReportDocument(speedStats, priceStats, reliabilityStats, newsStats);
  
  // 4. Spreadsheet保存
  saveReportToSheet(ss, report);
  
  Logger.log('');
  Logger.log('==========================================');
  Logger.log('✅ レポート生成完了！');
  Logger.log('==========================================');
  
  return report;
}

// ==================== データ収集: 速度データ ====================
function collectSpeedData(ss) {
  Logger.log('📊 速度データ収集中...');
  
  const sheet = ss.getSheetByName(REPORT_CONFIG.SPEED_SHEET);
  
  if (!sheet || sheet.getLastRow() <= 1) {
    Logger.log('⚠️ 速度データなし');
    return [];
  }
  
  // 過去3ヶ月のカットオフ日時
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - REPORT_CONFIG.ANALYSIS_PERIOD_DAYS);
  
  // 全データ取得
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 9).getValues();
  
  // フィルタリング
  const filteredData = data
    .filter(row => new Date(row[0]) >= cutoffDate)
    .map(row => ({
      timestamp: row[0],
      vpnName: row[1],
      download: row[2],
      upload: row[3],
      ping: row[4],
      stability: row[5],
      reliability: row[6],
      totalScore: row[7],
      rank: row[8]
    }));
  
  Logger.log(`✅ 速度データ: ${filteredData.length}件（過去${REPORT_CONFIG.ANALYSIS_PERIOD_DAYS}日間）`);
  
  return filteredData;
}

// ==================== データ収集: 料金データ ====================
function collectPriceData(ss) {
  Logger.log('💰 料金データ収集中...');
  
  const sheet = ss.getSheetByName(REPORT_CONFIG.PRICE_SHEET);
  
  if (!sheet || sheet.getLastRow() <= 1) {
    Logger.log('⚠️ 料金データなし');
    return [];
  }
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - REPORT_CONFIG.ANALYSIS_PERIOD_DAYS);
  
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 8).getValues();
  
  const filteredData = data
    .filter(row => new Date(row[0]) >= cutoffDate)
    .map(row => ({
      timestamp: row[0],
      vpnName: row[1],
      price: row[2],
      currency: row[3],
      method: row[4],
      isFallback: row[5] === 'はい'
    }));
  
  Logger.log(`✅ 料金データ: ${filteredData.length}件`);
  
  return filteredData;
}

// ==================== データ収集: 障害データ ====================
function collectOutageData(ss) {
  Logger.log('⚠️ 障害データ収集中...');
  
  const sheet = ss.getSheetByName(REPORT_CONFIG.OUTAGE_SHEET);
  
  if (!sheet || sheet.getLastRow() <= 1) {
    Logger.log('ℹ️ 障害データなし（正常）');
    return [];
  }
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - REPORT_CONFIG.ANALYSIS_PERIOD_DAYS);
  
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getValues();
  
  const filteredData = data
    .filter(row => new Date(row[0]) >= cutoffDate)
    .map(row => ({
      timestamp: row[0],
      vpnName: row[1],
      speed: row[2],
      reason: row[3],
      consecutiveCount: row[4]
    }));
  
  Logger.log(`✅ 障害データ: ${filteredData.length}件`);
  
  return filteredData;
}

// ==================== データ収集: ニュースデータ ====================
function collectNewsData(ss) {
  Logger.log('📰 ニュースデータ収集中...');
  
  const sheet = ss.getSheetByName(REPORT_CONFIG.NEWS_SHEET);
  
  if (!sheet || sheet.getLastRow() <= 1) {
    Logger.log('⚠️ ニュースデータなし');
    return [];
  }
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - REPORT_CONFIG.ANALYSIS_PERIOD_DAYS);
  
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 7).getValues();
  
  const filteredData = data
    .filter(row => new Date(row[0]) >= cutoffDate)
    .map(row => ({
      timestamp: row[0],
      keyword: row[1],
      link: row[2],
      title: row[3],
      pubDate: row[4]
    }));
  
  Logger.log(`✅ ニュースデータ: ${filteredData.length}件`);
  
  return filteredData;
}

// ==================== 統計計算: 速度統計 ====================
function calculateSpeedStatistics(speedData) {
  Logger.log('📈 速度統計を計算中...');
  
  if (speedData.length === 0) {
    return { error: 'No data' };
  }
  
  // VPN別にグループ化
  const vpnGroups = {};
  
  speedData.forEach(record => {
    if (!vpnGroups[record.vpnName]) {
      vpnGroups[record.vpnName] = {
        name: record.vpnName,
        speeds: [],
        pings: [],
        scores: []
      };
    }
    
    vpnGroups[record.vpnName].speeds.push(record.download);
    vpnGroups[record.vpnName].pings.push(record.ping);
    vpnGroups[record.vpnName].scores.push(record.totalScore);
  });
  
  // 統計計算
  const stats = Object.keys(vpnGroups).map(vpnName => {
    const vpn = vpnGroups[vpnName];
    
    return {
      vpnName: vpnName,
      avgSpeed: average(vpn.speeds),
      medianSpeed: median(vpn.speeds),
      maxSpeed: Math.max(...vpn.speeds),
      minSpeed: Math.min(...vpn.speeds),
      speedStdDev: standardDeviation(vpn.speeds),
      avgPing: average(vpn.pings),
      avgScore: average(vpn.scores),
      measurements: vpn.speeds.length
    };
  });
  
  // 平均速度でソート
  stats.sort((a, b) => b.avgSpeed - a.avgSpeed);
  
  Logger.log(`✅ 速度統計: ${stats.length}社分`);
  Logger.log(`  TOP3: ${stats.slice(0, 3).map(s => `${s.vpnName} (${Math.round(s.avgSpeed)}Mbps)`).join(', ')}`);
  
  // 全体統計
  const allSpeeds = speedData.map(d => d.download);
  const overallStats = {
    marketAverage: average(allSpeeds),
    marketMedian: median(allSpeeds),
    marketMax: Math.max(...allSpeeds),
    marketMin: Math.min(...allSpeeds)
  };
  
  return {
    byVPN: stats,
    overall: overallStats,
    period: `過去${REPORT_CONFIG.ANALYSIS_PERIOD_DAYS}日間`,
    totalMeasurements: speedData.length
  };
}

// ==================== 統計計算: 料金統計 ====================
function calculatePriceStatistics(priceData) {
  Logger.log('💵 料金統計を計算中...');
  
  if (priceData.length === 0) {
    return { error: 'No data' };
  }
  
  // VPN別の最新価格を取得
  const latestPrices = {};
  
  priceData.forEach(record => {
    if (!latestPrices[record.vpnName] || 
        new Date(record.timestamp) > new Date(latestPrices[record.vpnName].timestamp)) {
      latestPrices[record.vpnName] = record;
    }
  });
  
  // JPY換算価格を追加
  const pricesByVPN = Object.values(latestPrices).map(price => {
    const priceInJPY = convertToJPY(price.price, price.currency);
    return {
      ...price,
      priceInJPY: priceInJPY
    };
  });
  
  // JPY換算価格でソート
  const sortedByJPY = pricesByVPN.slice().sort((a, b) => a.priceInJPY - b.priceInJPY);
  
  // 通貨別に分類（統計用）
  const jpyPrices = pricesByVPN
    .filter(p => p.currency === 'JPY')
    .map(p => p.price);
  
  const usdPrices = pricesByVPN
    .filter(p => p.currency === 'USD')
    .map(p => p.price);
  
  // 全価格のJPY換算平均
  const allPricesInJPY = pricesByVPN.map(p => p.priceInJPY);
  
  // 価格変動分析
  const priceChanges = analyzePriceChanges(priceData);
  
  Logger.log(`✅ 料金統計: ${pricesByVPN.length}社分`);
  Logger.log(`  全体平均（JPY換算）: ¥${Math.round(average(allPricesInJPY))}`);
  Logger.log(`  JPY平均: ¥${Math.round(average(jpyPrices))}`);
  Logger.log(`  USD平均: $${average(usdPrices).toFixed(2)}`);
  
  return {
    byVPN: pricesByVPN,
    sortedByJPY: sortedByJPY,
    jpyAverage: jpyPrices.length > 0 ? average(jpyPrices) : null,
    jpyMedian: jpyPrices.length > 0 ? median(jpyPrices) : null,
    usdAverage: usdPrices.length > 0 ? average(usdPrices) : null,
    usdMedian: usdPrices.length > 0 ? median(usdPrices) : null,
    allPricesJPYAverage: average(allPricesInJPY),
    allPricesJPYMedian: median(allPricesInJPY),
    priceChanges: priceChanges,
    period: `過去${REPORT_CONFIG.ANALYSIS_PERIOD_DAYS}日間`
  };
}

// ==================== JPY換算関数 ====================
function convertToJPY(price, currency) {
  const rate = REPORT_CONFIG.EXCHANGE_RATES[currency] || 1;
  return price * rate;
}

// ==================== 価格変動分析 ====================
function analyzePriceChanges(priceData) {
  const vpnPriceHistory = {};
  
  // VPN別に時系列データを整理
  priceData.forEach(record => {
    if (!vpnPriceHistory[record.vpnName]) {
      vpnPriceHistory[record.vpnName] = [];
    }
    vpnPriceHistory[record.vpnName].push(record);
  });
  
  const changes = [];
  
  Object.keys(vpnPriceHistory).forEach(vpnName => {
    const history = vpnPriceHistory[vpnName];
    
    if (history.length < 2) return;
    
    // 時系列でソート
    history.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    const oldest = history[0];
    const latest = history[history.length - 1];
    
    // 通貨が同じ場合のみ比較
    if (oldest.currency === latest.currency && oldest.price !== latest.price) {
      const priceDiff = latest.price - oldest.price;
      const percentChange = ((priceDiff / oldest.price) * 100).toFixed(1);
      
      changes.push({
        vpnName: vpnName,
        oldPrice: oldest.price,
        newPrice: latest.price,
        currency: latest.currency,
        percentChange: parseFloat(percentChange),
        changeType: priceDiff > 0 ? '値上げ' : '値下げ'
      });
    }
  });
  
  return changes;
}

// ==================== 統計計算: 信頼性統計 ====================
function calculateReliabilityStatistics(speedData, outageData) {
  Logger.log('🔧 信頼性統計を計算中...');
  
  // VPN別の障害回数
  const outageCount = {};
  outageData.forEach(record => {
    outageCount[record.vpnName] = (outageCount[record.vpnName] || 0) + 1;
  });
  
  // VPN別の測定回数（分母）
  const measurementCount = {};
  speedData.forEach(record => {
    measurementCount[record.vpnName] = (measurementCount[record.vpnName] || 0) + 1;
  });
  
  // 稼働率計算
  const reliabilityStats = {};
  
  Object.keys(measurementCount).forEach(vpnName => {
    const totalMeasurements = measurementCount[vpnName];
    const outages = outageCount[vpnName] || 0;
    const uptime = ((totalMeasurements - outages) / totalMeasurements * 100).toFixed(2);
    
    reliabilityStats[vpnName] = {
      vpnName: vpnName,
      totalMeasurements: totalMeasurements,
      outages: outages,
      uptime: parseFloat(uptime),
      reliabilityScore: parseFloat(uptime)
    };
  });
  
  // 稼働率でソート
  const sortedStats = Object.values(reliabilityStats).sort((a, b) => b.uptime - a.uptime);
  
  Logger.log(`✅ 信頼性統計: ${sortedStats.length}社分`);
  Logger.log(`  最高稼働率: ${sortedStats[0]?.vpnName} (${sortedStats[0]?.uptime}%)`);
  
  return {
    byVPN: sortedStats,
    totalOutages: outageData.length,
    period: `過去${REPORT_CONFIG.ANALYSIS_PERIOD_DAYS}日間`
  };
}

// ==================== ニュースデータ分析 ====================
function analyzeNewsData(newsData) {
  Logger.log('📰 ニュースデータ分析中...');
  
  if (newsData.length === 0) {
    return { error: 'No data' };
  }
  
  // キーワード別集計
  const keywordCount = {};
  newsData.forEach(record => {
    keywordCount[record.keyword] = (keywordCount[record.keyword] || 0) + 1;
  });
  
  // VPN名言及分析
  const vpnMentions = analyzeVPNMentions(newsData);
  
  // 月別トレンド
  const monthlyTrend = analyzeMonthlyTrend(newsData);
  
  Logger.log(`✅ ニュース分析: ${newsData.length}件`);
  Logger.log(`  最多キーワード: ${Object.keys(keywordCount).sort((a, b) => keywordCount[b] - keywordCount[a])[0]}`);
  
  return {
    totalNews: newsData.length,
    byKeyword: keywordCount,
    vpnMentions: vpnMentions,
    monthlyTrend: monthlyTrend,
    period: `過去${REPORT_CONFIG.ANALYSIS_PERIOD_DAYS}日間`
  };
}

// ==================== VPN言及分析 ====================
function analyzeVPNMentions(newsData) {
  const vpnNames = [
    'NordVPN', 'ExpressVPN', 'Surfshark', 'ProtonVPN',
    'CyberGhost', 'Private Internet Access', 'IPVanish',
    'Mullvad', 'Windscribe', 'MillenVPN'
  ];
  
  const mentions = {};
  
  vpnNames.forEach(vpnName => {
    const count = newsData.filter(news => 
      news.title.includes(vpnName) || news.title.includes(vpnName.toLowerCase())
    ).length;
    
    if (count > 0) {
      mentions[vpnName] = count;
    }
  });
  
  return mentions;
}

// ==================== 月別トレンド分析 ====================
function analyzeMonthlyTrend(newsData) {
  const monthlyCount = {};
  
  newsData.forEach(record => {
    const month = Utilities.formatDate(new Date(record.pubDate), 'JST', 'yyyy-MM');
    monthlyCount[month] = (monthlyCount[month] || 0) + 1;
  });
  
  return monthlyCount;
}

// ==================== レポート文書生成 ====================
function generateReportDocument(speedStats, priceStats, reliabilityStats, newsStats) {
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
  
  // サマリー生成
  report += generateExecutiveSummary(speedStats, priceStats, reliabilityStats, newsStats);
  
  report += `

---

## 1. 市場概況

### 1.1 速度パフォーマンス

`;
  
  // 速度統計セクション
  report += generateSpeedSection(speedStats);
  
  report += `

### 1.2 料金トレンド

`;
  
  // 料金統計セクション
  report += generatePriceSection(priceStats);
  
  report += `

---

## 2. サービス品質分析

### 2.1 信頼性・稼働率

`;
  
  // 信頼性セクション
  report += generateReliabilitySection(reliabilityStats);
  
  report += `

---

## 3. 業界動向

### 3.1 ニュース・トピック分析

`;
  
  // ニュースセクション
  report += generateNewsSection(newsStats);
  
  report += `

---

## 4. 総合ランキング

`;
  
  // 総合ランキング
  report += generateOverallRanking(speedStats, priceStats, reliabilityStats);
  
  report += `

---

## 5. 将来予測

`;
  
  // 将来予測セクション
  report += generateFutureForecast(speedStats, priceStats, newsStats);
  
  report += `

---

## 6. 方法論

**データ収集:**
- 速度測定: 6時間ごと自動測定（日本・東京）
- 料金情報: 毎日自動スクレイピング
- 障害検知: 1時間ごと自動監視
- ニュース収集: 6時間ごとGoogle News RSS

**測定環境:**
- 地域: 日本（東京）
- 測定ツール: 自動測定システム
- VPN数: 15社

**分析期間:** ${REPORT_CONFIG.ANALYSIS_PERIOD_DAYS}日間

**為替レート（JPY換算）:**
- 1 USD = ${REPORT_CONFIG.EXCHANGE_RATES.USD} JPY
- 1 EUR = ${REPORT_CONFIG.EXCHANGE_RATES.EUR} JPY
- 1 GBP = ${REPORT_CONFIG.EXCHANGE_RATES.GBP} JPY

---

*本レポートは blstweb.jp が独自に収集したデータに基づいています。*  
*詳細データ: https://www.blstweb.jp/network/vpn/vpn-speed-ranking/*

`;
  
  Logger.log('✅ レポート文書生成完了');
  
  return report;
}

// ==================== サマリー生成 ====================
function generateExecutiveSummary(speedStats, priceStats, reliabilityStats, newsStats) {
  let summary = '';
  
  // 主要発見事項
  summary += '**主要な発見事項:**\n\n';
  
  // 1. 最速VPN
  if (speedStats.byVPN && speedStats.byVPN.length > 0) {
    const fastest = speedStats.byVPN[0];
    summary += `1. **最速VPN:** ${fastest.vpnName} (平均 ${Math.round(fastest.avgSpeed)} Mbps)\n`;
  }
  
  // 2. 最安VPN（JPY換算）
  if (priceStats.sortedByJPY && priceStats.sortedByJPY.length > 0) {
    const cheapest = priceStats.sortedByJPY[0];
    const displayPrice = cheapest.currency === 'JPY' ? 
      `¥${Math.round(cheapest.price)}` : 
      `${cheapest.currency === 'USD' ? '$' : '€'}${cheapest.price} (¥${Math.round(cheapest.priceInJPY)}相当)`;
    summary += `2. **最安VPN:** ${cheapest.vpnName} (${displayPrice}/月)\n`;
  }
  
  // 3. 最高稼働率
  if (reliabilityStats.byVPN && reliabilityStats.byVPN.length > 0) {
    const mostReliable = reliabilityStats.byVPN[0];
    summary += `3. **最高稼働率:** ${mostReliable.vpnName} (${mostReliable.uptime}%)\n`;
  }
  
  // 4. 市場平均速度
  if (speedStats.overall) {
    summary += `4. **市場平均速度:** ${Math.round(speedStats.overall.marketAverage)} Mbps\n`;
  }
  
  // 5. 市場平均価格（JPY換算）
  if (priceStats.allPricesJPYAverage) {
    summary += `5. **市場平均価格:** ¥${Math.round(priceStats.allPricesJPYAverage)}/月（全通貨JPY換算）\n`;
  }
  
  // 6. 価格トレンド
  if (priceStats.priceChanges && priceStats.priceChanges.length > 0) {
    const priceDrops = priceStats.priceChanges.filter(c => c.changeType === '値下げ').length;
    const priceIncreases = priceStats.priceChanges.filter(c => c.changeType === '値上げ').length;
    summary += `6. **価格変動:** 値下げ${priceDrops}社、値上げ${priceIncreases}社\n`;
  }
  
  // 7. 総測定回数
  if (speedStats.totalMeasurements) {
    summary += `7. **総測定回数:** ${speedStats.totalMeasurements.toLocaleString()}回（${REPORT_CONFIG.ANALYSIS_PERIOD_DAYS}日間）\n`;
  }
  
  // 市場トレンド分析
  summary += `\n**市場トレンド:**\n\n`;
  
  // 速度改善傾向
  if (speedStats.overall) {
    const topSpeed = speedStats.byVPN[0].avgSpeed;
    const marketAvg = speedStats.overall.marketAverage;
    const speedGap = ((topSpeed - marketAvg) / marketAvg * 100).toFixed(1);
    summary += `- トップVPNと市場平均の速度差: ${speedGap}%\n`;
  }
  
  // 価格競争
  if (priceStats.sortedByJPY && priceStats.sortedByJPY.length >= 2) {
    const cheapest = priceStats.sortedByJPY[0].priceInJPY;
    const average = priceStats.allPricesJPYAverage;
    const priceDiff = ((average - cheapest) / average * 100).toFixed(1);
    summary += `- 最安値と市場平均の価格差: ${priceDiff}%\n`;
  }
  
  // 安定性
  if (reliabilityStats.totalOutages === 0) {
    summary += `- 障害発生: なし（全VPNが安定稼働）\n`;
  } else {
    summary += `- 障害発生: ${reliabilityStats.totalOutages}件\n`;
  }
  
  return summary;
}

// ==================== 速度セクション生成 ====================
function generateSpeedSection(speedStats) {
  let section = '';
  
  if (speedStats.overall) {
    section += `**市場全体:**\n`;
    section += `- 平均速度: ${Math.round(speedStats.overall.marketAverage)} Mbps\n`;
    section += `- 中央値: ${Math.round(speedStats.overall.marketMedian)} Mbps\n`;
    section += `- 最高速度: ${Math.round(speedStats.overall.marketMax)} Mbps\n`;
    section += `- 最低速度: ${Math.round(speedStats.overall.marketMin)} Mbps\n`;
    section += `- 総測定回数: ${speedStats.totalMeasurements.toLocaleString()}回\n\n`;
  }
  
  section += `**トップ10 VPN（平均速度）:**\n\n`;
  section += `| ランク | VPNサービス | 平均速度 | 中央値 | 標準偏差 | 測定回数 |\n`;
  section += `|--------|------------|----------|--------|----------|----------|\n`;
  
  if (speedStats.byVPN) {
    speedStats.byVPN.slice(0, 10).forEach((vpn, index) => {
      section += `| ${index + 1} | ${vpn.vpnName} | ${Math.round(vpn.avgSpeed)} Mbps | ${Math.round(vpn.medianSpeed)} Mbps | ${vpn.speedStdDev.toFixed(1)} | ${vpn.measurements} |\n`;
    });
  }
  
  return section;
}

// ==================== 料金セクション生成 ====================
function generatePriceSection(priceStats) {
  let section = '';
  
  section += `**市場平均価格:**\n`;
  if (priceStats.jpyAverage) {
    section += `- 日本円: ¥${Math.round(priceStats.jpyAverage)}/月（中央値: ¥${Math.round(priceStats.jpyMedian)}）\n`;
  }
  if (priceStats.usdAverage) {
    section += `- 米ドル: $${priceStats.usdAverage.toFixed(2)}/月（中央値: $${priceStats.usdMedian.toFixed(2)}）\n`;
  }
  section += `\n`;
  
  // 価格変動
  if (priceStats.priceChanges && priceStats.priceChanges.length > 0) {
    section += `**価格変動（期間内）:**\n\n`;
    section += `| VPNサービス | 旧価格 | 新価格 | 変動率 | 種別 |\n`;
    section += `|------------|--------|--------|--------|------|\n`;
    
    priceStats.priceChanges
      .sort((a, b) => Math.abs(b.percentChange) - Math.abs(a.percentChange))
      .slice(0, 10)
      .forEach(change => {
        const symbol = change.currency === 'JPY' ? '¥' : change.currency === 'USD' ? '$' : '€';
        section += `| ${change.vpnName} | ${symbol}${change.oldPrice} | ${symbol}${change.newPrice} | ${change.percentChange > 0 ? '+' : ''}${change.percentChange}% | ${change.changeType} |\n`;
      });
  }
  
  return section;
}

// ==================== 信頼性セクション生成 ====================
function generateReliabilitySection(reliabilityStats) {
  let section = '';
  
  section += `**稼働率トップ10:**\n\n`;
  section += `| ランク | VPNサービス | 稼働率 | 障害回数 | 測定回数 |\n`;
  section += `|--------|------------|--------|----------|----------|\n`;
  
  if (reliabilityStats.byVPN) {
    reliabilityStats.byVPN.slice(0, 10).forEach((vpn, index) => {
      section += `| ${index + 1} | ${vpn.vpnName} | ${vpn.uptime}% | ${vpn.outages} | ${vpn.totalMeasurements} |\n`;
    });
  }
  
  section += `\n**総障害件数:** ${reliabilityStats.totalOutages}件\n`;
  
  return section;
}

// ==================== ニュースセクション生成 ====================
function generateNewsSection(newsStats) {
  let section = '';
  
  section += `**ニュース総数:** ${newsStats.totalNews}件\n\n`;
  
  // キーワード別
  if (newsStats.byKeyword) {
    section += `**注目トピック:**\n\n`;
    const sortedKeywords = Object.keys(newsStats.byKeyword)
      .sort((a, b) => newsStats.byKeyword[b] - newsStats.byKeyword[a])
      .slice(0, 5);
    
    sortedKeywords.forEach(keyword => {
      section += `- ${keyword}: ${newsStats.byKeyword[keyword]}件\n`;
    });
    section += `\n`;
  }
  
  // VPN言及
  if (newsStats.vpnMentions && Object.keys(newsStats.vpnMentions).length > 0) {
    section += `**メディア注目度（VPN別）:**\n\n`;
    const sortedVPNs = Object.keys(newsStats.vpnMentions)
      .sort((a, b) => newsStats.vpnMentions[b] - newsStats.vpnMentions[a])
      .slice(0, 5);
    
    sortedVPNs.forEach(vpn => {
      section += `- ${vpn}: ${newsStats.vpnMentions[vpn]}件\n`;
    });
  }
  
  return section;
}

// ==================== 将来予測生成 ====================
function generateFutureForecast(speedStats, priceStats, newsStats) {
  let section = '';
  
  section += `**次四半期の見通し:**\n\n`;
  
  // 速度トレンド予測
  if (speedStats.overall) {
    const marketAvg = speedStats.overall.marketAverage;
    section += `### 5.1 速度トレンド\n\n`;
    section += `- 現在の市場平均: ${Math.round(marketAvg)} Mbps\n`;
    section += `- 予測: 前四半期比 +5-10% の速度向上を見込む\n`;
    section += `- 理由: WireGuardプロトコルの普及、インフラ強化\n\n`;
  }
  
  // 価格トレンド予測
  if (priceStats.priceChanges) {
    const priceDrops = priceStats.priceChanges.filter(c => c.changeType === '値下げ').length;
    section += `### 5.2 価格トレンド\n\n`;
    
    if (priceDrops >= 3) {
      section += `- 傾向: 値下げ競争が活発化\n`;
      section += `- 予測: 長期プラン価格のさらなる低下を見込む\n`;
      section += `- 理由: 市場競争の激化、新規参入増加\n\n`;
    } else {
      section += `- 傾向: 価格は概ね安定\n`;
      section += `- 予測: 大幅な価格変動は少ない見込み\n`;
      section += `- 注目: セールやキャンペーン時期に注目\n\n`;
    }
  }
  
  // 業界動向
  section += `### 5.3 注目すべき動き\n\n`;
  
  // ニュースから注目トピック抽出
  if (newsStats.byKeyword) {
    const topKeywords = Object.keys(newsStats.byKeyword)
      .sort((a, b) => newsStats.byKeyword[b] - newsStats.byKeyword[a])
      .slice(0, 3);
    
    if (topKeywords.length > 0) {
      section += `**注目トピック:**\n`;
      topKeywords.forEach(keyword => {
        section += `- ${keyword}\n`;
      });
      section += `\n`;
    }
  }
  
  // リスク要因
  section += `**リスク要因:**\n`;
  section += `- VPN規制の強化（特定地域）\n`;
  section += `- サイバーセキュリティ脅威の増加\n`;
  section += `- 為替変動による価格変動\n\n`;
  
  // 推奨アクション
  section += `**推奨アクション:**\n`;
  section += `- 長期プラン契約で価格変動リスクを軽減\n`;
  section += `- 定期的な速度テストで品質確認\n`;
  section += `- 複数VPNサービスの比較検討を継続\n`;
  
  return section;
}

// ==================== 総合ランキング生成 ====================
function generateOverallRanking(speedStats, priceStats, reliabilityStats) {
  let section = '';
  
  section += `**総合評価TOP10（速度・料金・信頼性の総合スコア）:**\n\n`;
  
  // 簡易スコアリング
  const overallScores = {};
  
  // 速度スコア（最大100点）
  if (speedStats.byVPN) {
    speedStats.byVPN.forEach((vpn, index) => {
      if (!overallScores[vpn.vpnName]) {
        overallScores[vpn.vpnName] = { name: vpn.vpnName, score: 0, components: {} };
      }
      overallScores[vpn.vpnName].components.speed = 100 - (index * 5); // 1位100点、以降5点ずつ減点
      overallScores[vpn.vpnName].score += overallScores[vpn.vpnName].components.speed * 0.4; // 40%
    });
  }
  
  // 料金スコア（安いほど高得点）- JPY換算価格で統一
  if (priceStats.sortedByJPY) {
    priceStats.sortedByJPY.forEach((vpn, index) => {
      if (!overallScores[vpn.vpnName]) {
        overallScores[vpn.vpnName] = { name: vpn.vpnName, score: 0, components: {} };
      }
      overallScores[vpn.vpnName].components.price = 100 - (index * 5);
      overallScores[vpn.vpnName].score += overallScores[vpn.vpnName].components.price * 0.3; // 30%
    });
  }
  
  // 信頼性スコア
  if (reliabilityStats.byVPN) {
    reliabilityStats.byVPN.forEach((vpn, index) => {
      if (!overallScores[vpn.vpnName]) {
        overallScores[vpn.vpnName] = { name: vpn.vpnName, score: 0, components: {} };
      }
      overallScores[vpn.vpnName].components.reliability = vpn.uptime;
      overallScores[vpn.vpnName].score += vpn.uptime * 0.3; // 30%
    });
  }
  
  // ソート
  const sortedOverall = Object.values(overallScores)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
  
  section += `| ランク | VPNサービス | 総合スコア | 速度 | 料金 | 信頼性 |\n`;
  section += `|--------|------------|------------|------|------|--------|\n`;
  
  sortedOverall.forEach((vpn, index) => {
    section += `| ${index + 1} | ${vpn.name} | ${Math.round(vpn.score)} | ${Math.round(vpn.components.speed || 0)} | ${Math.round(vpn.components.price || 0)} | ${(vpn.components.reliability || 0).toFixed(1)}% |\n`;
  });
  
  return section;
}

// ==================== Spreadsheet保存 ====================
function saveReportToSheet(ss, reportText) {
  Logger.log('💾 Spreadsheetに保存中...');
  
  let sheet = ss.getSheetByName(REPORT_CONFIG.REPORT_SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(REPORT_CONFIG.REPORT_SHEET_NAME);
    sheet.appendRow(['生成日時', 'レポート本文', 'ファイル名']);
    sheet.getRange(1, 1, 1, 3)
      .setFontWeight('bold')
      .setBackground('#4285f4')
      .setFontColor('#ffffff');
  }
  
  const reportDate = new Date();
  const quarter = Math.ceil((reportDate.getMonth() + 1) / 3);
  const year = reportDate.getFullYear();
  const filename = `VPN_Market_Report_Q${quarter}_${year}.md`;
  
  sheet.appendRow([
    reportDate,
    reportText,
    filename
  ]);
  
  // 列幅調整
  sheet.setColumnWidth(2, 800); // レポート本文
  sheet.setColumnWidth(3, 300); // ファイル名
  
  Logger.log(`✅ Spreadsheetに保存: ${filename}`);
}

// ==================== ヘルパー関数 ====================
function average(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function median(arr) {
  if (arr.length === 0) return 0;
  const sorted = arr.slice().sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  } else {
    return sorted[middle];
  }
}

function standardDeviation(arr) {
  if (arr.length === 0) return 0;
  const avg = average(arr);
  const squareDiffs = arr.map(value => Math.pow(value - avg, 2));
  const avgSquareDiff = average(squareDiffs);
  return Math.sqrt(avgSquareDiff);
}

// ==================== テスト実行 ====================
function testReportGeneration() {
  Logger.log('==========================================');
  Logger.log('レポート生成テスト');
  Logger.log('==========================================');
  Logger.log('');
  
  const report = generateVPNMarketReport();
  
  Logger.log('');
  Logger.log('==========================================');
  Logger.log('生成されたレポート:');
  Logger.log('==========================================');
  Logger.log('');
  Logger.log(report);
}

// ==================== PDF出力機能 ====================

/**
 * Google DocsとPDFを生成
 */
function generateReportPDF() {
  Logger.log('==========================================');
  Logger.log('PDF生成開始');
  Logger.log('==========================================');
  Logger.log('');
  
  // 1. レポート生成
  Logger.log('【Step 1】レポート生成');
  const reportText = generateVPNMarketReport();
  
  Logger.log('');
  Logger.log('【Step 2】Google Docs作成');
  
  // 2. Google Docs作成
  const reportDate = new Date();
  const quarter = Math.ceil((reportDate.getMonth() + 1) / 3);
  const year = reportDate.getFullYear();
  const docTitle = `VPN業界統計レポート Q${quarter} ${year}`;
  
  // Google Docsを作成
  const doc = DocumentApp.create(docTitle);
  const body = doc.getBody();
  
  // Markdownを整形してGoogle Docsに挿入
  insertMarkdownToGoogleDocs(body, reportText);
  
  const docId = doc.getId();
  const docUrl = doc.getUrl();
  
  Logger.log(`✅ Google Docs作成完了`);
  Logger.log(`  Document ID: ${docId}`);
  Logger.log(`  URL: ${docUrl}`);
  
  Logger.log('');
  Logger.log('【Step 3】PDF生成');
  
  // 3. PDFとして出力
  const pdfBlob = DriveApp.getFileById(docId).getAs('application/pdf');
  pdfBlob.setName(`${docTitle}.pdf`);
  
  // PDFをDriveに保存
  const pdfFile = DriveApp.createFile(pdfBlob);
  const pdfUrl = pdfFile.getUrl();
  
  Logger.log(`✅ PDF生成完了`);
  Logger.log(`  PDF URL: ${pdfUrl}`);
  
  Logger.log('');
  Logger.log('==========================================');
  Logger.log('✅ PDF生成完了！');
  Logger.log('==========================================');
  Logger.log('');
  Logger.log('📄 Google Docs: ' + docUrl);
  Logger.log('📁 PDF: ' + pdfUrl);
  Logger.log('');
  Logger.log('次のステップ:');
  Logger.log('1. Google DocsまたはPDFをダウンロード');
  Logger.log('2. プレスリリースに添付');
  Logger.log('3. メディアに配信');
  
  return {
    docUrl: docUrl,
    pdfUrl: pdfUrl,
    docId: docId,
    pdfId: pdfFile.getId()
  };
}

/**
 * Markdownテキストを解析してGoogle Docsに整形挿入
 */
function insertMarkdownToGoogleDocs(body, markdown) {
  // 行ごとに分割
  const lines = markdown.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 空行
    if (line.trim() === '') {
      body.appendParagraph('');
      continue;
    }
    
    // 見出し1 (# )
    if (line.startsWith('# ')) {
      const heading = body.appendParagraph(line.substring(2));
      heading.setHeading(DocumentApp.ParagraphHeading.HEADING1);
      continue;
    }
    
    // 見出し2 (## )
    if (line.startsWith('## ')) {
      const heading = body.appendParagraph(line.substring(3));
      heading.setHeading(DocumentApp.ParagraphHeading.HEADING2);
      continue;
    }
    
    // 見出し3 (### )
    if (line.startsWith('### ')) {
      const heading = body.appendParagraph(line.substring(4));
      heading.setHeading(DocumentApp.ParagraphHeading.HEADING3);
      continue;
    }
    
    // 太字 (**text**)
    if (line.includes('**')) {
      const para = body.appendParagraph('');
      const text = para.editAsText();
      
      let currentPos = 0;
      let tempLine = line;
      
      while (tempLine.includes('**')) {
        const startBold = tempLine.indexOf('**');
        const endBold = tempLine.indexOf('**', startBold + 2);
        
        if (endBold === -1) break;
        
        // 太字前のテキスト
        if (startBold > 0) {
          text.appendText(tempLine.substring(0, startBold));
          currentPos += startBold;
        }
        
        // 太字部分
        const boldText = tempLine.substring(startBold + 2, endBold);
        text.appendText(boldText);
        text.setBold(currentPos, currentPos + boldText.length - 1, true);
        currentPos += boldText.length;
        
        // 残りのテキスト
        tempLine = tempLine.substring(endBold + 2);
      }
      
      // 残りがあれば追加
      if (tempLine.length > 0) {
        text.appendText(tempLine);
      }
      
      continue;
    }
    
    // テーブル行（| で始まる）
    if (line.startsWith('|')) {
      // テーブルの検出（連続する | 行を収集）
      const tableLines = [line];
      while (i + 1 < lines.length && lines[i + 1].startsWith('|')) {
        i++;
        tableLines.push(lines[i]);
      }
      
      // テーブル生成
      insertTable(body, tableLines);
      continue;
    }
    
    // 箇条書き (- で始まる)
    if (line.startsWith('- ')) {
      const listItem = body.appendListItem(line.substring(2));
      listItem.setGlyphType(DocumentApp.GlyphType.BULLET);
      continue;
    }
    
    // 番号付きリスト (数字. で始まる)
    if (/^\d+\.\s/.test(line)) {
      const listItem = body.appendListItem(line.substring(line.indexOf('.') + 2));
      listItem.setGlyphType(DocumentApp.GlyphType.NUMBER);
      continue;
    }
    
    // 水平線 (---)
    if (line.trim() === '---') {
      body.appendHorizontalRule();
      continue;
    }
    
    // 通常のテキスト
    body.appendParagraph(line);
  }
}

/**
 * Markdownテーブルを Google Docs Table に変換
 */
function insertTable(body, tableLines) {
  // ヘッダー区切り行を除外
  const dataLines = tableLines.filter(line => !line.includes('---'));
  
  if (dataLines.length === 0) return;
  
  // セル分割
  const rows = dataLines.map(line => {
    return line.split('|')
      .slice(1, -1)  // 最初と最後の空要素を削除
      .map(cell => cell.trim());
  });
  
  if (rows.length === 0 || rows[0].length === 0) return;
  
  // テーブル作成
  const table = body.appendTable();
  
  rows.forEach((rowData, rowIndex) => {
    const row = table.appendTableRow();
    rowData.forEach(cellText => {
      const cell = row.appendTableCell(cellText);
      
      // ヘッダー行（最初の行）は太字
      if (rowIndex === 0) {
        cell.editAsText().setBold(true);
        cell.setBackgroundColor('#f0f0f0');
      }
    });
  });
}

// ==================== セットアップ ====================
function setupReportSheet() {
  Logger.log('==========================================');
  Logger.log('レポートシート セットアップ');
  Logger.log('==========================================');
  
  const ss = SpreadsheetApp.openById(REPORT_CONFIG.SPREADSHEET_ID);
  
  let sheet = ss.getSheetByName(REPORT_CONFIG.REPORT_SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(REPORT_CONFIG.REPORT_SHEET_NAME);
    sheet.appendRow(['生成日時', 'レポート本文', 'ファイル名']);
    sheet.getRange(1, 1, 1, 3)
      .setFontWeight('bold')
      .setBackground('#4285f4')
      .setFontColor('#ffffff');
    
    Logger.log('✅ シート作成完了');
  } else {
    Logger.log('✅ シート確認完了');
  }
  
  Logger.log('==========================================');
}

// ==================== トリガー設定（四半期ごと） ====================
function setupQuarterlyReportTrigger() {
  Logger.log('==========================================');
  Logger.log('四半期レポートトリガー設定');
  Logger.log('==========================================');
  Logger.log('');
  
  // 既存のトリガーを削除
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'generateVPNMarketReport') {
      ScriptApp.deleteTrigger(trigger);
      Logger.log('🗑️ 既存トリガー削除');
    }
  });
  
  // 四半期ごと（3ヶ月に1回）= 月次実行で代用
  // 実際には1月、4月、7月、10月の1日に実行
  const today = new Date();
  const currentMonth = today.getMonth(); // 0-11
  
  // 次の四半期開始月を計算
  const quarterStartMonths = [0, 3, 6, 9]; // 1月、4月、7月、10月
  let nextQuarterMonth = quarterStartMonths.find(m => m > currentMonth);
  if (!nextQuarterMonth) nextQuarterMonth = 0; // 来年の1月
  
  Logger.log(`次回実行予定: ${nextQuarterMonth + 1}月1日 09:00`);
  
  // 注意: Google Apps Scriptには「四半期ごと」のトリガーがないため、
  // 毎月実行して月をチェックする方式を採用
  ScriptApp.newTrigger('checkAndGenerateQuarterlyReport')
    .timeBased()
    .onMonthDay(1)
    .atHour(9)
    .create();
  
  Logger.log('✅ トリガー設定完了');
  Logger.log('実行タイミング: 毎月1日 午前9時（四半期開始月のみレポート生成）');
  Logger.log('');
  Logger.log('==========================================');
}

// 四半期チェック関数
function checkAndGenerateQuarterlyReport() {
  const today = new Date();
  const month = today.getMonth(); // 0-11
  
  // 四半期開始月（1月、4月、7月、10月 = 0, 3, 6, 9）
  const quarterStartMonths = [0, 3, 6, 9];
  
  if (quarterStartMonths.includes(month)) {
    Logger.log(`四半期開始月（${month + 1}月）: レポート生成を実行`);
    generateVPNMarketReport();
  } else {
    Logger.log(`非四半期月（${month + 1}月）: スキップ`);
  }
}

/**
 * エンジン2B改善: 高度な異常検知アラート
 * より精度の高い障害判定
 */

const OUTAGE_ADVANCED_SHEET_NAME = 'VPN障害検知（高度）';
// デプロイURLは公開しない。スクリプトプロパティ VPN_API_URL に設定すること。
const VPN_SPEED_API_URL_ADVANCED = PropertiesService.getScriptProperties().getProperty('VPN_API_URL') || '';

// 障害判定の閾値（改善版）
const ADVANCED_THRESHOLDS = {
  absoluteMinSpeed: 10,        // 絶対的な最低速度 (Mbps)
  percentageFromAverage: 50,   // 過去平均の50%以下
  consecutiveChecks: 2,        // 連続で閾値を下回った回数
  relativeComparison: true     // 他社との相対比較を有効化
};

// ==========================================
// メイン: 高度な障害検知
// ==========================================

function detectAdvancedOutages() {
  Logger.log('==========================================');
  Logger.log('VPN障害検知（高度版）');
  Logger.log(`実行時刻: ${new Date().toLocaleString('ja-JP')}`);
  Logger.log('==========================================');
  Logger.log('');
  
  try {
    // 1. 最新速度データ取得
    const response = UrlFetchApp.fetch(VPN_SPEED_API_URL_ADVANCED + '?type=ranking&region=JP');
    const data = JSON.parse(response.getContentText());
    
    if (!data.data || data.data.length === 0) {
      Logger.log('❌ データが取得できませんでした');
      return;
    }
    
    Logger.log(`✅ ${data.data.length}社のデータを取得`);
    Logger.log('');
    
    // 2. 過去平均を取得
    const historicalAverages = getHistoricalAverages();
    
    // 3. 全VPNの平均速度を計算（相対比較用）
    const allSpeeds = data.data.map(vpn => vpn.download);
    const overallAverage = allSpeeds.reduce((a, b) => a + b, 0) / allSpeeds.length;
    const overallMedian = calculateMedian(allSpeeds);
    
    Logger.log(`📊 全VPN統計:`);
    Logger.log(`  平均: ${overallAverage.toFixed(1)}Mbps`);
    Logger.log(`  中央値: ${overallMedian.toFixed(1)}Mbps`);
    Logger.log('');
    
    // 4. 各VPNを高度な判定でチェック
    const outages = [];
    
    data.data.forEach(vpn => {
      const speed = vpn.download;
      const vpnName = vpn.name;
      
      Logger.log(`--- ${vpnName} ---`);
      Logger.log(`現在速度: ${speed}Mbps`);
      
      // 判定1: 絶対的最低速度
      const failsAbsolute = speed < ADVANCED_THRESHOLDS.absoluteMinSpeed;
      Logger.log(`判定1（絶対値）: ${failsAbsolute ? '❌' : '✅'} ${speed} < ${ADVANCED_THRESHOLDS.absoluteMinSpeed}`);
      
      // 判定2: 過去平均との比較
      let failsHistorical = false;
      let historicalInfo = '';
      if (historicalAverages[vpnName]) {
        const avgSpeed = historicalAverages[vpnName].average;
        const threshold = avgSpeed * (ADVANCED_THRESHOLDS.percentageFromAverage / 100);
        failsHistorical = speed < threshold;
        const percentOfAvg = ((speed / avgSpeed) * 100).toFixed(1);
        Logger.log(`判定2（過去平均）: ${failsHistorical ? '❌' : '✅'} ${speed} < ${threshold.toFixed(1)} (過去平均: ${avgSpeed.toFixed(1)}Mbps, 現在は${percentOfAvg}%)`);
        historicalInfo = `過去平均の${percentOfAvg}%`;
      } else {
        Logger.log(`判定2（過去平均）: ⚠️ データ不足`);
      }
      
      // 判定3: 他社との相対比較
      let failsRelative = false;
      if (ADVANCED_THRESHOLDS.relativeComparison) {
        const threshold = overallMedian * 0.3; // 中央値の30%以下
        failsRelative = speed < threshold;
        const percentOfMedian = ((speed / overallMedian) * 100).toFixed(1);
        Logger.log(`判定3（相対比較）: ${failsRelative ? '❌' : '✅'} ${speed} < ${threshold.toFixed(1)} (全VPN中央値: ${overallMedian.toFixed(1)}Mbps, 現在は${percentOfMedian}%)`);
      }
      
      // 総合判定（いずれか1つでも失敗したら異常）
      const isOutage = failsAbsolute || failsHistorical || failsRelative;
      
      if (isOutage) {
        Logger.log(`⚠️ 異常検知！`);
        
        // 連続異常チェック
        const consecutiveCount = checkConsecutiveOutages(vpnName);
        Logger.log(`連続異常回数: ${consecutiveCount + 1}回`);
        
        const outageInfo = {
          vpn: vpnName,
          speed: speed,
          reasons: [],
          historicalInfo: historicalInfo,
          consecutiveCount: consecutiveCount + 1,
          timestamp: new Date()
        };
        
        if (failsAbsolute) outageInfo.reasons.push('絶対値が異常に低い');
        if (failsHistorical) outageInfo.reasons.push(historicalInfo);
        if (failsRelative) outageInfo.reasons.push('他社比で異常に低い');
        
        // 連続2回以上で確定
        if (consecutiveCount + 1 >= ADVANCED_THRESHOLDS.consecutiveChecks) {
          Logger.log(`🚨 障害確定（${consecutiveCount + 1}回連続）`);
          outages.push(outageInfo);
        } else {
          Logger.log(`⏳ 監視継続（確定には${ADVANCED_THRESHOLDS.consecutiveChecks}回必要）`);
        }
        
        // 連続回数を記録
        recordConsecutiveOutage(vpnName);
      } else {
        Logger.log(`✅ 正常`);
        // 連続カウンターをリセット
        clearConsecutiveOutage(vpnName);
      }
      
      Logger.log('');
    });
    
    Logger.log('==========================================');
    Logger.log(`検知結果: ${outages.length}件の障害を確定`);
    Logger.log('==========================================');
    Logger.log('');
    
    // 障害があれば通知
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

// ==========================================
// 過去平均速度を取得
// ==========================================

function getHistoricalAverages() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // VPN速度履歴シート（エンジン1のデータ）
  const speedSheet = ss.getSheetByName('速度データ');
  
  if (!speedSheet || speedSheet.getLastRow() < 2) {
    Logger.log('⚠️ 過去データなし: 速度データシートが見つかりません');
    return {};
  }
  
  // 過去7日分のデータを取得（最大200行）
  const data = speedSheet.getRange(2, 1, Math.min(speedSheet.getLastRow() - 1, 200), speedSheet.getLastColumn()).getValues();
  const vpnSpeeds = {};
  
  // 過去7日のカットオフ日時
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 7);
  
  data.forEach(row => {
    const timestamp = row[0];  // タイムスタンプ（列A）
    const vpnName = row[1];    // VPN名（列B）
    const speed = row[2];      // ダウンロード速度（列C）
    
    // 過去7日以内のデータのみ
    if (timestamp < cutoffDate) return;
    
    if (vpnName && speed && typeof speed === 'number') {
      if (!vpnSpeeds[vpnName]) {
        vpnSpeeds[vpnName] = [];
      }
      vpnSpeeds[vpnName].push(speed);
    }
  });
  
  // 平均を計算
  const averages = {};
  Object.keys(vpnSpeeds).forEach(vpnName => {
    const speeds = vpnSpeeds[vpnName];
    const average = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    averages[vpnName] = {
      average: average,
      count: speeds.length
    };
  });
  
  Logger.log(`✅ 過去7日間のデータ取得: ${Object.keys(averages).length}社分`);
  
  return averages;
}

// ==========================================
// 中央値計算
// ==========================================

function calculateMedian(numbers) {
  const sorted = numbers.slice().sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  } else {
    return sorted[middle];
  }
}

// ==========================================
// 連続異常回数の管理
// ==========================================

function checkConsecutiveOutages(vpnName) {
  const cache = CacheService.getScriptCache();
  const key = `consecutive_outage_${vpnName}`;
  const count = cache.get(key);
  return count ? parseInt(count) : 0;
}

function recordConsecutiveOutage(vpnName) {
  const cache = CacheService.getScriptCache();
  const key = `consecutive_outage_${vpnName}`;
  const currentCount = checkConsecutiveOutages(vpnName);
  cache.put(key, (currentCount + 1).toString(), 7200); // 2時間保持
}

function clearConsecutiveOutage(vpnName) {
  const cache = CacheService.getScriptCache();
  const key = `consecutive_outage_${vpnName}`;
  cache.remove(key);
}

// ==========================================
// 障害通知
// ==========================================

function notifyAdvancedOutage(outageInfo) {
  Logger.log('');
  Logger.log('--- 障害通知（高度版）---');
  Logger.log(`VPN: ${outageInfo.vpn}`);
  Logger.log(`速度: ${outageInfo.speed}Mbps`);
  Logger.log(`理由: ${outageInfo.reasons.join(', ')}`);
  Logger.log(`連続: ${outageInfo.consecutiveCount}回`);
  
  // Twitter投稿用メッセージ生成
  const tweet = generateAdvancedOutageTweet(outageInfo);
  Logger.log('');
  Logger.log('📝 Twitter投稿内容:');
  Logger.log(tweet);
  
  // Twitter投稿
  try {
    if (typeof postToTwitter === 'function') {
      const result = postToTwitter(tweet);
      if (result) {
        Logger.log('✅ Twitter投稿成功');
      } else {
        Logger.log('⚠️ Twitter投稿失敗');
      }
    } else {
      Logger.log('⚠️ postToTwitter関数が見つかりません');
    }
  } catch (error) {
    Logger.log(`❌ Twitter投稿エラー: ${error}`);
  }
  
  Logger.log('');
}

function generateAdvancedOutageTweet(outageInfo) {
  const tweet = `⚠️ ${outageInfo.vpn} 速度異常を検知

現在の速度: ${outageInfo.speed}Mbps
${outageInfo.historicalInfo ? outageInfo.historicalInfo : '通常より著しく低速'}

${outageInfo.consecutiveCount}回連続で異常値

詳細▶️ https://www.blstweb.jp/network/vpn/vpn-speed-ranking/

#VPN #${outageInfo.vpn} #障害情報`;
  
  return tweet;
}

// ==========================================
// Spreadsheet保存
// ==========================================

function saveAdvancedOutageToSheet(outageInfo) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(OUTAGE_ADVANCED_SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(OUTAGE_ADVANCED_SHEET_NAME);
    sheet.appendRow([
      'タイムスタンプ',
      'VPNサービス',
      '速度 (Mbps)',
      '理由',
      '連続回数',
      '通知済み'
    ]);
    sheet.getRange(1, 1, 1, 6)
      .setFontWeight('bold')
      .setBackground('#ea4335')
      .setFontColor('#ffffff');
  }
  
  sheet.appendRow([
    outageInfo.timestamp,
    outageInfo.vpn,
    outageInfo.speed,
    outageInfo.reasons.join(', '),
    outageInfo.consecutiveCount,
    '通知済み'
  ]);
}

// ==========================================
// セットアップ
// ==========================================

function setupAdvancedOutageSheet() {
  Logger.log('==========================================');
  Logger.log('VPN障害検知（高度版）シート セットアップ');
  Logger.log('==========================================');
  
  saveAdvancedOutageToSheet({
    vpn: 'テスト',
    speed: 0,
    reasons: ['テストデータ'],
    consecutiveCount: 0,
    timestamp: new Date()
  });
  
  // テストデータを削除
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(OUTAGE_ADVANCED_SHEET_NAME);
  sheet.deleteRow(2);
  
  Logger.log('✅ シート準備完了');
  Logger.log('==========================================');
}

// ==========================================
// トリガー設定
// ==========================================

function setupAdvancedOutageDetectionTriggers() {
  Logger.log('==========================================');
  Logger.log('高度な障害検知トリガー設定');
  Logger.log('==========================================');
  Logger.log('');
  
  // 既存のトリガーを削除
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'detectOutagesFromSpeedData' ||
        trigger.getHandlerFunction() === 'detectAdvancedOutages') {
      ScriptApp.deleteTrigger(trigger);
      Logger.log('🗑️ 既存トリガー削除');
    }
  });
  
  // 1時間ごとに実行
  ScriptApp.newTrigger('detectAdvancedOutages')
    .timeBased()
    .everyHours(1)
    .create();
  
  Logger.log('✅ トリガー設定完了');
  Logger.log('実行タイミング: 1時間ごと');
  Logger.log('');
  Logger.log('==========================================');
}

// ==========================================
// テスト
// ==========================================

function testAdvancedOutageDetection() {
  Logger.log('==========================================');
  Logger.log('高度な障害検知テスト');
  Logger.log('==========================================');
  Logger.log('');
  
  detectAdvancedOutages();
}
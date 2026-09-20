/**
 * 【データセットを引用された方へ】
 *
 * 2025-12〜2026-01 に公開したデータセットの速度値は、当時この位置にあった
 * measureVPNSpeed() が base 値に乱数と時間帯補正を掛けて生成したものです。
 * 測定ではありません。その関数は 2026-09 に廃止しました。
 * 当時のコードはこちらで参照できます:
 * https://github.com/hmy0210/vpn-stability-ranking/blob/3c8f08bb04b259605341662c62239bc2d383c069/gas/vpn-speed-tracker.gs
 *
 * 現在は VPN_CHARACTERISTICS の編集部推定値をそのまま返します。
 * 値が揺れないのは、推定値が数時間ごとに変わる根拠が無いためです。
 */

/**
 * ============================================
 * VPN速度データシステム v4.0
 * エンジン1: 速度ランキング + 安定性分析
 * ============================================
 *
 * データ種別は2つある。混同しないこと。
 *
 *   measured  … 実測。VPNトンネル経由で実際に計測した値。
 *                外部エージェント（vpn-speed-agent.sh）が doPost で投入する。
 *                → speed-ingest.js
 *
 *   estimated … 推定。VPN_CHARACTERISTICS の手入力ベース値に
 *                乱数と時間帯補正を掛けた「モデル推定値」。
 *                measureAllVPNs() が生成する。実測ではない。
 *
 * Apps Script は VPN トンネルを張れないため、GAS 単体で実測は取得できない。
 * 公開面（記事・ウィジェット）で「実測」と表記してよいのは
 * source === 'measured' の行だけ。API は source を必ず返す。
 *
 * 機能:
 * - 実測データの受け入れ（doPost / speed-ingest.js）
 * - 未実測VPNの編集部推定値の反映（改訂時のみ・自動更新しない）
 * - 安定性スコア（過去7日間の標準偏差から計算）
 * - Web API経由でデータ提供（doGet は Engine2a-phase2-pricing.js）
 * - Twitter自動投稿連携
 */

// ==================== 設定 ====================
const CONFIG = {
  SPREADSHEET_ID: SpreadsheetApp.getActiveSpreadsheet().getId(),
  SHEET_NAME: '速度データ',
  REGION: 'JP',
  REGION_NAME: '日本（東京）',
  SITE_URL: 'https://www.blstweb.jp/network/',
  STABILITY_DAYS: 7,          // 安定性計算期間（7日間）
  // 古い行の自動削除。既存データを消さないよう既定では無効。
  // シートが重くなってきたら RETENTION_ENABLED を true にする。
  // 有効化前に「速度データ」シートを複製してバックアップを取ること。
  RETENTION_ENABLED: false,
  RETENTION_DAYS: 120,        // 有効時、これより古い行を削除
  READ_WINDOW_ROWS: 8000,     // API/集計で読む最大行数（末尾から）
  MEASURED_FRESH_DAYS: 7      // 実測値をランキングで優先採用する鮮度
};

// 速度データシートの列定義（1始まり）
const SPEED_COLS = {
  TIMESTAMP: 1,
  VPN: 2,
  DOWNLOAD: 3,
  UPLOAD: 4,
  PING: 5,
  STABILITY: 6,
  RELIABILITY: 7,
  TOTAL_SCORE: 8,
  RANK: 9,
  SOURCE: 10,   // 'measured' | 'estimated'（空欄は estimated 扱い＝旧データ）
  ORIGIN: 11,   // 計測元メモ（agent名 / Cloudflare colo / ISP など）
  WIDTH: 11
};

const SPEED_HEADERS = [
  'タイムスタンプ', 'VPNサービス', 'ダウンロード(Mbps)', 'アップロード(Mbps)', 'Ping(ms)',
  '瞬間安定性', '信頼性(%)', '総合スコア', 'ランク', 'データ種別', '計測元'
];

const SOURCE_MEASURED = 'measured';
const SOURCE_ESTIMATED = 'estimated';

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
function publishVPNEstimates() {
  Logger.log('=== 編集部推定値の反映 ===');

  const dataSheet = getSpeedSheet_();
  const now = new Date();

  // 直近に実測が入っているVPNは推定値で上書きしない
  const measured = getRecentMeasuredVpnNames_(dataSheet);
  if (measured.size) {
    Logger.log(`ℹ️ 実測済みのためスキップ: ${Array.from(measured).join(', ')}`);
  }

  // 現在シートに載っている推定値と突き合わせ、変化がなければ書かない。
  // 推定値は編集部が改訂したときだけ動くべきで、
  // 毎回追記するとタイムスタンプが「更新され続けている」誤解を生む。
  const current = {};
  readSpeedWindow_(dataSheet).forEach(r => {
    if (r.source !== SOURCE_ESTIMATED) return;
    const prev = current[r.name];
    const ts = toDate_(r.timestamp);
    if (!prev || (ts && toDate_(prev.timestamp) < ts)) current[r.name] = r;
  });

  const results = [];
  const rows = [];

  Object.keys(VPN_CHARACTERISTICS).forEach(vpnName => {
    if (measured.has(vpnName)) return;

    const est = estimateVPNPerformance_(vpnName);
    if (!est) return;
    results.push({ name: vpnName, data: est, source: SOURCE_ESTIMATED });

    const prev = current[vpnName];
    const unchanged = prev
      && Number(prev.download) === est.download
      && Number(prev.upload) === est.upload
      && Number(prev.ping) === est.ping
      && Number(prev.totalScore) === est.totalScore;

    if (unchanged) return;   // 改訂がなければ行を増やさない

    rows.push([
      now, vpnName,
      est.download, est.upload, est.ping,
      est.stability, est.reliability, est.totalScore,
      0,
      SOURCE_ESTIMATED,
      'editorial:VPN_CHARACTERISTICS'
    ]);
    Logger.log(`~ ${vpnName}: ${est.download}Mbps（推定 / スコア ${est.totalScore}）`);
  });

  if (rows.length) {
    dataSheet.getRange(dataSheet.getLastRow() + 1, 1, rows.length, SPEED_COLS.WIDTH).setValues(rows);
    updateRankings(dataSheet);
    Logger.log(`=== ${rows.length}社の推定値を改訂 ===`);
  } else {
    Logger.log('=== 推定値に変更なし。シートは更新していません ===');
  }

  pruneOldSpeedRows_(dataSheet);
  return results;
}

/**
 * 旧名。過去に作られた時間トリガーがまだ残っている可能性があるため、
 * 関数自体は残す。ただし推定値は自動改訂しないので何も書かない。
 * トリガーは removeSpeedEstimateTriggers() で削除できる。
 */
function measureAllVPNs() {
  Logger.log('⚠️ measureAllVPNs は廃止されました。推定値は自動更新しません。');
  Logger.log('   編集部が VPN_CHARACTERISTICS を改訂したら publishVPNEstimates() を手動実行してください。');
  return [];
}

// ==================== シート取得・スキーマ整備 ====================
function getSpeedSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
    sheet.appendRow(SPEED_HEADERS);
    sheet.getRange(1, 1, 1, SPEED_COLS.WIDTH)
      .setFontWeight('bold').setBackground('#4285f4').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    return sheet;
  }

  // 旧9列スキーマなら「データ種別」「計測元」を追加
  if (sheet.getLastColumn() < SPEED_COLS.WIDTH) {
    sheet.getRange(1, 1, 1, SPEED_COLS.WIDTH).setValues([SPEED_HEADERS]);
    sheet.getRange(1, 1, 1, SPEED_COLS.WIDTH)
      .setFontWeight('bold').setBackground('#4285f4').setFontColor('#ffffff');
    Logger.log('🔧 速度データシートを11列スキーマに拡張しました');
  }
  return sheet;
}

/**
 * 手動実行用: 既存の全行に source を埋める（空欄 = 旧データ = estimated）。
 * 1回だけ実行すればよい。
 */
function backfillSpeedSourceColumn() {
  const sheet = getSpeedSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) { Logger.log('データなし'); return; }

  const range = sheet.getRange(2, SPEED_COLS.SOURCE, lastRow - 1, 1);
  const values = range.getValues();
  let filled = 0;

  for (let i = 0; i < values.length; i++) {
    if (!values[i][0]) { values[i][0] = SOURCE_ESTIMATED; filled++; }
  }
  range.setValues(values);
  Logger.log(`✅ ${filled}行に '${SOURCE_ESTIMATED}' を補完（全${values.length}行）`);
}

// ==================== 保持期間を超えた行の削除 ====================
function pruneOldSpeedRows_(sheet) {
  if (!CONFIG.RETENTION_ENABLED) return 0;

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return 0;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - CONFIG.RETENTION_DAYS);

  // 行は時系列に追記されるので、先頭から連続する古い行だけ数えれば足りる
  const scan = Math.min(lastRow - 1, 5000);
  const stamps = sheet.getRange(2, SPEED_COLS.TIMESTAMP, scan, 1).getValues();

  let stale = 0;
  for (let i = 0; i < stamps.length; i++) {
    const ts = toDate_(stamps[i][0]);
    if (ts && ts < cutoff) stale++;
    else break;
  }

  if (stale > 0) {
    sheet.deleteRows(2, stale);
    Logger.log(`🧹 ${CONFIG.RETENTION_DAYS}日より古い ${stale}行を削除`);
  }
  return stale;
}

/**
 * 手動実行用: 自動削除を有効にしたら何行消えるかを、消さずに数える。
 * RETENTION_ENABLED を true にする前にこれで影響を確認すること。
 */
function previewSpeedRowPruning() {
  const sheet = getSpeedSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) { Logger.log('データなし'); return 0; }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - CONFIG.RETENTION_DAYS);

  const scan = Math.min(lastRow - 1, 5000);
  const stamps = sheet.getRange(2, SPEED_COLS.TIMESTAMP, scan, 1).getValues();

  let stale = 0;
  for (let i = 0; i < stamps.length; i++) {
    const ts = toDate_(stamps[i][0]);
    if (ts && ts < cutoff) stale++; else break;
  }

  Logger.log(`全 ${lastRow - 1} 行のうち、${CONFIG.RETENTION_DAYS}日より古い行は ${stale} 行`);
  Logger.log(`現在の自動削除: ${CONFIG.RETENTION_ENABLED ? '有効' : '無効（既定）'}`);
  return stale;
}

// ==================== 日付の正規化 ====================
/**
 * セルの値を Date にする。
 * Sheets は通常 Date を返すが、外部から文字列で入るケースや
 * 再インポート後に文字列化するケースがあるため instanceof に頼らない。
 * 変換できない場合は null。
 */
function toDate_(value) {
  if (!value) return null;
  const d = (value instanceof Date) ? value : new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

// ==================== 末尾ウィンドウだけ読む ====================
function readSpeedWindow_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  const total = lastRow - 1;
  const take = Math.min(total, CONFIG.READ_WINDOW_ROWS);
  const startRow = lastRow - take + 1;

  return sheet.getRange(startRow, 1, take, SPEED_COLS.WIDTH).getValues().map(row => ({
    timestamp: row[SPEED_COLS.TIMESTAMP - 1],
    name: row[SPEED_COLS.VPN - 1],
    download: row[SPEED_COLS.DOWNLOAD - 1],
    upload: row[SPEED_COLS.UPLOAD - 1],
    ping: row[SPEED_COLS.PING - 1],
    stability: row[SPEED_COLS.STABILITY - 1],
    reliability: row[SPEED_COLS.RELIABILITY - 1],
    totalScore: row[SPEED_COLS.TOTAL_SCORE - 1],
    rank: row[SPEED_COLS.RANK - 1],
    source: row[SPEED_COLS.SOURCE - 1] || SOURCE_ESTIMATED,
    origin: row[SPEED_COLS.ORIGIN - 1] || ''
  }));
}

/** 直近 MEASURED_FRESH_DAYS 以内に実測があるVPN名の集合 */
function getRecentMeasuredVpnNames_(sheet) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - CONFIG.MEASURED_FRESH_DAYS);

  const set = new Set();
  readSpeedWindow_(sheet).forEach(r => {
    const ts = toDate_(r.timestamp);
    if (r.source === SOURCE_MEASURED && ts && ts >= cutoff) {
      set.add(r.name);
    }
  });
  return set;
}

// ==================== 編集部による性能推定 ====================
/**
 * VPN_CHARACTERISTICS の編集部推定値をそのまま返す。
 *
 * 【2026-09 変更】以前は base 値に Math.random() と時間帯補正を掛けて
 * 6時間ごとに違う数値を生成していた。実測に見せるための揺らぎであって、
 * 推定値が数時間ごとに変動する根拠は存在しなかった。
 * 「推定値」として掲載する以上、値は安定していなければならない。
 * 改訂は編集部が根拠をもって行い、そのときだけタイムスタンプが動く。
 */
function estimateVPNPerformance_(vpnName) {
  const char = VPN_CHARACTERISTICS[vpnName];
  if (!char) return null;

  const download = char.base;
  const upload = Math.round(download * 0.70 * 10) / 10;  // 一般的な上り/下り比
  const ping = char.pingBase;

  // ばらつきの小ささを安定性スコアに写像（variance は編集部の評価値）
  const stability = Math.max(0, Math.min(100, 100 - (char.variance / 3)));

  return {
    download: download,
    upload: upload,
    ping: ping,
    stability: Math.round(stability),
    reliability: char.reliability,
    totalScore: calculateTotalScore(download, upload, ping, stability, char.reliability)
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

  // 直近ウィンドウのみ読む（全行 getValues をやめる）
  const total = lastRow - 1;
  const take = Math.min(total, CONFIG.READ_WINDOW_ROWS);
  const startRow = lastRow - take + 1;

  const stamps = dataSheet.getRange(startRow, SPEED_COLS.TIMESTAMP, take, 1).getValues();
  const names  = dataSheet.getRange(startRow, SPEED_COLS.VPN, take, 1).getValues();
  const scores = dataSheet.getRange(startRow, SPEED_COLS.TOTAL_SCORE, take, 1).getValues();

  const latest = toDate_(stamps[take - 1][0]);
  if (!latest) return;
  const latestMs = latest.getTime();

  // 最新バッチの行番号（相対）を集める
  const batch = [];
  for (let i = 0; i < take; i++) {
    const ts = toDate_(stamps[i][0]);
    if (ts && ts.getTime() === latestMs) {
      batch.push({ i: i, name: names[i][0], score: Number(scores[i][0]) || 0 });
    }
  }
  if (!batch.length) return;

  batch.sort((a, b) => b.score - a.score);

  // 既存のランク列を読み、対象行だけ書き換えて1回で戻す
  const rankRange = dataSheet.getRange(startRow, SPEED_COLS.RANK, take, 1);
  const ranks = rankRange.getValues();
  batch.forEach((row, index) => { ranks[row.i][0] = index + 1; });
  rankRange.setValues(ranks);

  Logger.log(`✅ ランク更新: ${batch.length}件`);
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

  const rows = readSpeedWindow_(dataSheet);

  // 過去7日のカットオフ日時
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - CONFIG.STABILITY_DAYS);

  // VPNごとにデータ集計
  const vpnData = {};

  rows.forEach(r => {
    const timestamp = toDate_(r.timestamp);
    if (!timestamp || timestamp < cutoffDate) return;

    if (!vpnData[r.name]) {
      vpnData[r.name] = { name: r.name, speeds: [], pings: [], reliabilities: [], measured: 0, estimated: 0 };
    }

    vpnData[r.name].speeds.push(Number(r.download) || 0);
    vpnData[r.name].pings.push(Number(r.ping) || 0);
    vpnData[r.name].reliabilities.push(Number(r.reliability) || 0);
    if (r.source === SOURCE_MEASURED) vpnData[r.name].measured++;
    else vpnData[r.name].estimated++;
  });
  
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
    // - 速度の変動が少ないほど高スコア
    // - Pingの変動が少ないほど高スコア
    // - 信頼性が高いほど高スコア
    // avgSpeed / avgPing が 0 だと NaN になるためガードする
    const speedScore = avgSpeed > 0 ? Math.max(0, 100 - (speedStdDev / avgSpeed * 100)) : 0;
    const pingScore = avgPing > 0 ? Math.max(0, 100 - (pingStdDev / avgPing * 50)) : 0;
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
      dataPoints: vpn.speeds.length,
      measuredPoints: vpn.measured,
      estimatedPoints: vpn.estimated,
      source: vpn.measured > 0 ? (vpn.estimated > 0 ? 'mixed' : SOURCE_MEASURED) : SOURCE_ESTIMATED
    });
  }
  
  // 安定性スコアでソート
  results.sort((a, b) => b.stabilityScore - a.stabilityScore);
  
  Logger.log('=== 安定性スコア計算完了 ===');
  Logger.log(`データ期間: 過去${CONFIG.STABILITY_DAYS}日間`);
  Logger.log('');
  Logger.log('トップ5:');
  for (let i = 0; i < Math.min(5, results.length); i++) {
    const vpn = results[i];
    Logger.log(`${i+1}. ${vpn.name}: ${vpn.stabilityScore}点 (測定${vpn.dataPoints}回)`);
    Logger.log(`   平均速度: ${vpn.avgSpeed}Mbps (±${vpn.speedStdDev})`);
  }
  
  return results;
}

// ==================== Web App API ====================
// doGet はこのファイルには置かない。
// 速度(?type=ranking / ?type=stability)と料金(?action=getPricing)の両方を捌く
// 唯一の doGet は Engine2a-phase2-pricing.js にある。
// ここで再定義すると、ファイル評価順しだいで ?action=getPricing が 404 相当になり、
// WordPress の [vpn_pricing] が「準備中です」に落ちる。

// ==================== ランキングデータ取得 ====================
/**
 * WordPress の [vpn_ranking] などが叩く ?type=ranking の実体。
 *
 * 同じVPNに実測と推定の両方がある場合、鮮度内（MEASURED_FRESH_DAYS）の
 * 実測を優先する。返り値の各要素は必ず source を持ち、
 * 呼び出し側はこれを見て「実測」表記の可否を判断すること。
 */
function getRankingData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dataSheet = ss.getSheetByName(CONFIG.SHEET_NAME);

  if (!dataSheet || dataSheet.getLastRow() <= 1) {
    return {
      error: 'No data available',
      message: 'データがありません。publishVPNEstimates() を実行するか、実測エージェントから投入してください。'
    };
  }

  const rows = readSpeedWindow_(dataSheet);
  if (!rows.length) {
    return { error: 'No data available', message: 'データがありません。' };
  }

  const measuredCutoff = new Date();
  measuredCutoff.setDate(measuredCutoff.getDate() - CONFIG.MEASURED_FRESH_DAYS);

  // VPN名 → { measured: 最新実測, estimated: 最新推定 }
  const byVpn = {};

  rows.forEach(r => {
    const ts = toDate_(r.timestamp);
    if (!ts || !r.name) return;

    const bucket = r.source === SOURCE_MEASURED ? 'measured' : 'estimated';
    if (!byVpn[r.name]) byVpn[r.name] = { measured: null, estimated: null };

    const cur = byVpn[r.name][bucket];
    if (!cur || cur.timestamp < ts) {
      byVpn[r.name][bucket] = {
        timestamp: ts,
        name: r.name,
        download: r.download,
        upload: r.upload,
        ping: r.ping,
        stability: r.stability,
        reliability: r.reliability,
        totalScore: r.totalScore,
        rank: r.rank,
        source: bucket,
        origin: r.origin
      };
    }
  });

  // 実測が鮮度内にあればそれを採用、なければ推定にフォールバック
  const selected = [];
  Object.keys(byVpn).forEach(name => {
    const { measured, estimated } = byVpn[name];
    if (measured && measured.timestamp >= measuredCutoff) selected.push(measured);
    else if (estimated) selected.push(estimated);
    else if (measured) selected.push(measured);   // 古い実測しかない場合
  });

  selected.sort((a, b) => (Number(b.totalScore) || 0) - (Number(a.totalScore) || 0));
  selected.forEach((vpn, i) => { vpn.rank = i + 1; });

  // 安定性スコア（7日）を付与
  const stabilityMap = {};
  calculateStabilityScores().forEach(v => { stabilityMap[v.name] = v.stabilityScore; });
  selected.forEach(vpn => { vpn.stabilityScore7d = stabilityMap[vpn.name] || null; });

  const measuredCount = selected.filter(v => v.source === SOURCE_MEASURED).length;
  const latestTimestamp = selected.reduce(
    (acc, v) => (!acc || v.timestamp > acc ? v.timestamp : acc), null
  );

  return {
    lastUpdate: latestTimestamp,
    region: CONFIG.REGION,
    regionName: CONFIG.REGION_NAME,
    // 推定値は編集部が改訂したときだけ動く。定期更新はしない。
    estimateBasis: '各社の公称値・提供プロトコル・サーバー規模に基づく編集部推定',
    vpnCount: selected.length,
    // 公開面での表記判断に使う
    measuredCount: measuredCount,
    estimatedCount: selected.length - measuredCount,
    dataSource: measuredCount === selected.length ? SOURCE_MEASURED
              : measuredCount === 0 ? SOURCE_ESTIMATED : 'mixed',
    disclaimer: measuredCount === selected.length
      ? 'VPNトンネル経由の実測値です。'
      : 'source が measured の行のみ実測値です。estimated は編集部によるモデル推定値であり実測ではありません。',
    data: selected
  };
}

// ==================== ヘルパー関数 ====================
// average / standardDeviation は _shared-utils.js に集約

// ==================== 自動実行設定 ====================
/**
 * 【2026-09 変更】速度推定値の定期実行トリガーは廃止した。
 * 推定値は編集部が改訂したときだけ変わるべきで、
 * 6時間ごとに走らせる理由がない（走らせると「毎日測定している」誤解を生む）。
 *
 * 過去に作られたトリガーを消すには removeSpeedEstimateTriggers() を実行する。
 */
function removeSpeedEstimateTriggers() {
  const targets = ['measureAllVPNs', 'publishVPNEstimates'];
  let removed = 0;

  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (targets.indexOf(trigger.getHandlerFunction()) !== -1) {
      ScriptApp.deleteTrigger(trigger);
      removed++;
    }
  });

  Logger.log(removed ? `✅ 速度推定の定期トリガーを${removed}件削除しました`
                     : 'ℹ️ 削除対象のトリガーはありませんでした');
  return removed;
}

/** 現在のトリガー一覧を確認する */
function listSpeedTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  Logger.log(`=== トリガー ${triggers.length}件 ===`);
  triggers.forEach(t => Logger.log(`  ${t.getHandlerFunction()}  (${t.getEventType()})`));
  return triggers.length;
}

// ==================== 初期セットアップ ====================
function initialSetup() {
  Logger.log('==================');
  Logger.log('VPN速度測定システム 初期セットアップ');
  Logger.log('==================');
  
  // 推定値の初期反映
  Logger.log('📊 編集部推定値を反映中...');
  publishVPNEstimates();

  // 速度の定期トリガーは作らない（推定値は改訂時のみ更新）
  Logger.log('⏰ 速度の定期トリガーは設定しません');
  
  // Web App URL表示
  Logger.log('');
  Logger.log('==================');
  Logger.log('✅ セットアップ完了！');
  Logger.log('==================');
  Logger.log('');
  Logger.log('次のステップ:');
  Logger.log('1. 「デプロイ」→「新しいデプロイ」');
  Logger.log('2. 種類: ウェブアプリ');
  Logger.log('3. アクセス: 全員');
  Logger.log('4. デプロイして Web App URL を取得');
  Logger.log('');
  Logger.log('APIテスト:');
  Logger.log('  ?type=ranking   → ランキングデータ取得');
  Logger.log('  ?type=stability → 安定性スコア取得');
  Logger.log('==================');
}

// ==================== 手動実行 ====================
function runNow() {
  return publishVPNEstimates();
}

// ==================== デバッグ用: データ確認 ====================
function checkLatestData() {
  const data = getRankingData();
  
  Logger.log('=== 最新データ確認 ===');
  Logger.log('最終更新: ' + data.lastUpdate);
  Logger.log('VPN数: ' + data.vpnCount);
  Logger.log('');
  Logger.log('トップ5:');
  
  for (let i = 0; i < Math.min(5, data.data.length); i++) {
    const vpn = data.data[i];
    Logger.log(`${vpn.rank}. ${vpn.name}`);
    Logger.log(`   速度: ${vpn.download}Mbps | Ping: ${vpn.ping}ms`);
    Logger.log(`   スコア: ${vpn.totalScore} | 安定性(7d): ${vpn.stabilityScore7d || 'N/A'}`);
  }
  
  Logger.log('==================');
}

// ==================== デバッグ用: 安定性確認 ====================
function checkStability() {
  calculateStabilityScores();
}

// ==================== デバッグ用: シートクリア ====================
function clearAllData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dataSheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  
  if (dataSheet) {
    const lastRow = dataSheet.getLastRow();
    if (lastRow > 1) {
      dataSheet.getRange(2, 1, lastRow - 1, SPEED_COLS.WIDTH).clear();
      Logger.log('✅ データクリア完了');
    }
  }
}
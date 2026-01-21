/**
 * ============================================
 * VPN Trust Score System v1.0
 * Claude APIによる自動評価システム
 * ============================================
 * 
 * 機能:
 * - 15社のVPNを月1回自動評価
 * - プライバシー・監査・法的管轄を総合スコア化
 * - 既存エンジンと連携したWeb API提供
 * - 統合ランキング生成
 * 
 * @author Tokyo VPN Speed Monitor Project
 * @version 1.0
 * @license MIT
 */

// ==================== 設定 ====================
const TRUST_CONFIG = {
  SCORING_SHEET: 'トラストスコア',
  JURISDICTION_SHEET: '法的管轄DB',
  UPDATE_LOG_SHEET: '更新ログ',
  
  CLAUDE_API_KEY: PropertiesService.getScriptProperties().getProperty('CLAUDE_API_KEY') || '',
  CLAUDE_MODEL: 'claude-sonnet-4-5-20250929',
  CLAUDE_MAX_TOKENS: 4096,
  
  SPEED_API_URL: PropertiesService.getScriptProperties().getProperty('VPN_API_URL') || '',
  
  VPN_LIST: [
    'NordVPN', 'ExpressVPN', 'Private Internet Access', 'Surfshark', 'MillenVPN',
    'CyberGhost', 'ProtonVPN', 'IPVanish', 'Mullvad', 'Windscribe',
    'セカイVPN', 'HideMyAss', 'TunnelBear', 'Hotspot Shield', 'PureVPN'
  ],
  
  WEIGHTS: {
    noLogPolicy: 0.15,
    thirdPartyAudit: 0.15,
    transparencyReport: 0.10,
    jurisdiction: 0.15,
    dataRetention: 0.10,
    openSource: 0.10,
    ramOnlyServers: 0.10,
    incidentResponse: 0.05,
    legalResponse: 0.05,
    operatingYears: 0.05
  }
};

// ==================== 法的管轄データベース ====================
const JURISDICTION_DB = {
  'パナマ': { fiveEyes: false, nineEyes: false, fourteenEyes: false, dataRetention: 'なし', score: 5 },
  '英領ヴァージン諸島': { fiveEyes: false, nineEyes: false, fourteenEyes: false, dataRetention: 'なし', score: 5 },
  'スイス': { fiveEyes: false, nineEyes: false, fourteenEyes: false, dataRetention: '限定的', score: 4 },
  'ルーマニア': { fiveEyes: false, nineEyes: false, fourteenEyes: false, dataRetention: 'なし（違憲判決）', score: 4 },
  'スウェーデン': { fiveEyes: false, nineEyes: false, fourteenEyes: true, dataRetention: 'EU指令', score: 3 },
  'オランダ': { fiveEyes: false, nineEyes: true, fourteenEyes: true, dataRetention: 'EU指令', score: 3 },
  'アメリカ': { fiveEyes: true, nineEyes: true, fourteenEyes: true, dataRetention: 'あり', score: 1 },
  'カナダ': { fiveEyes: true, nineEyes: true, fourteenEyes: true, dataRetention: 'あり', score: 2 },
  'マレーシア': { fiveEyes: false, nineEyes: false, fourteenEyes: false, dataRetention: 'なし', score: 4 },
  'ジブラルタル': { fiveEyes: false, nineEyes: false, fourteenEyes: false, dataRetention: 'なし', score: 4 },
  '日本': { fiveEyes: false, nineEyes: false, fourteenEyes: false, dataRetention: '限定的', score: 3 },
  'イギリス': { fiveEyes: true, nineEyes: true, fourteenEyes: true, dataRetention: 'あり', score: 1 }
};

// ==================== VPN基本情報データベース ====================
const VPN_INFO_DB = {
  'NordVPN': { headquarters: 'パナマ', founded: 2012 },
  'ExpressVPN': { headquarters: '英領ヴァージン諸島', founded: 2009 },
  'Private Internet Access': { headquarters: 'アメリカ', founded: 2010 },
  'Surfshark': { headquarters: 'オランダ', founded: 2018 },
  'MillenVPN': { headquarters: '日本', founded: 2020 },
  'CyberGhost': { headquarters: 'ルーマニア', founded: 2011 },
  'ProtonVPN': { headquarters: 'スイス', founded: 2017 },
  'IPVanish': { headquarters: 'アメリカ', founded: 2012 },
  'Mullvad': { headquarters: 'スウェーデン', founded: 2009 },
  'Windscribe': { headquarters: 'カナダ', founded: 2016 },
  'セカイVPN': { headquarters: '日本', founded: 2010 },
  'HideMyAss': { headquarters: 'イギリス', founded: 2005 },
  'TunnelBear': { headquarters: 'カナダ', founded: 2011 },
  'Hotspot Shield': { headquarters: 'アメリカ', founded: 2008 },
  'PureVPN': { headquarters: '英領ヴァージン諸島', founded: 2007 }
};

// ==================== メイン: トラストスコア更新 ====================
function updateAllTrustScores() {
  Logger.log('==========================================');
  Logger.log('VPN Trust Score 一括更新');
  Logger.log(`実行時刻: ${new Date().toLocaleString('ja-JP')}`);
  Logger.log('==========================================');
  
  const results = [];
  
  for (const vpnName of TRUST_CONFIG.VPN_LIST) {
    Logger.log(`--- ${vpnName} ---`);
    
    try {
      const score = evaluateVPNTrust(vpnName);
      results.push(score);
      Logger.log(`✅ トラストスコア: ${score.totalScore}点 (${score.grade})`);
    } catch (error) {
      Logger.log(`❌ エラー: ${error}`);
      results.push({ vpnName, error: error.toString(), totalScore: 0, grade: 'N/A' });
    }
    
    Utilities.sleep(2000);
  }
  
  saveTrustScoresToSheet(results);
  logUpdate(results);
  
  Logger.log('==========================================');
  Logger.log(`✅ 更新完了: ${results.filter(r => !r.error).length}/${results.length}社`);
  
  return results;
}

// ==================== Claude APIでVPN評価 ====================
function evaluateVPNTrust(vpnName) {
  const vpnInfo = VPN_INFO_DB[vpnName];
  const jurisdictionInfo = JURISDICTION_DB[vpnInfo?.headquarters] || {};
  
  const prompt = generateEvaluationPrompt(vpnName, vpnInfo, jurisdictionInfo);
  const response = callClaudeAPI(prompt);
  const evaluation = parseClaudeResponse(response, vpnName);
  
  if (jurisdictionInfo.score) {
    evaluation.scores.jurisdiction = jurisdictionInfo.score;
  }
  
  if (vpnInfo?.founded) {
    const years = new Date().getFullYear() - vpnInfo.founded;
    evaluation.scores.operatingYears = years >= 10 ? 5 : years >= 5 ? 4 : years >= 3 ? 3 : years >= 1 ? 2 : 1;
  }
  
  const totalScore = calculateTotalScore(evaluation.scores);
  const grade = totalScore >= 85 ? 'A' : totalScore >= 70 ? 'B' : totalScore >= 55 ? 'C' : totalScore >= 40 ? 'D' : 'F';
  
  return {
    vpnName,
    headquarters: vpnInfo?.headquarters || '不明',
    scores: evaluation.scores,
    totalScore,
    grade,
    details: evaluation.details,
    lastUpdate: new Date(),
    source: 'Claude API + Manual DB'
  };
}

// ==================== 評価プロンプト生成 ====================
function generateEvaluationPrompt(vpnName, vpnInfo, jurisdictionInfo) {
  return `あなたはVPNセキュリティの専門家です。
以下のVPNサービスについて、公開情報に基づいて評価してください。

**評価対象:** ${vpnName}
**本社所在地:** ${vpnInfo?.headquarters || '不明'}
**設立年:** ${vpnInfo?.founded || '不明'}

以下の各項目を1〜5点で評価し、JSON形式で回答してください。

**評価項目:**
1. noLogPolicy (ノーログポリシーの具体性)
2. thirdPartyAudit (第三者監査の実施)
3. transparencyReport (透明性レポートの公開)
4. openSource (オープンソースクライアント)
5. ramOnlyServers (RAMオンリーサーバー)
6. incidentResponse (セキュリティインシデント対応)
7. legalResponse (法執行機関からのデータ要求への対応)

**回答形式（JSON）:**
\`\`\`json
{
  "scores": {
    "noLogPolicy": <1-5>,
    "thirdPartyAudit": <1-5>,
    "transparencyReport": <1-5>,
    "openSource": <1-5>,
    "ramOnlyServers": <1-5>,
    "incidentResponse": <1-5>,
    "legalResponse": <1-5>
  },
  "details": {
    "noLogPolicy": "<根拠を1文で>",
    "thirdPartyAudit": "<監査機関名と最終監査日>",
    "transparencyReport": "<レポート公開頻度>",
    "openSource": "<GitHub URLがあれば記載>",
    "ramOnlyServers": "<対応状況>",
    "incidentResponse": "<過去のインシデントと対応>",
    "legalResponse": "<実績があれば記載>"
  }
}
\`\`\``;
}

// ==================== Claude API呼び出し ====================
function callClaudeAPI(prompt) {
  if (!TRUST_CONFIG.CLAUDE_API_KEY) {
    throw new Error('CLAUDE_API_KEY が設定されていません');
  }
  
  const payload = {
    model: TRUST_CONFIG.CLAUDE_MODEL,
    max_tokens: TRUST_CONFIG.CLAUDE_MAX_TOKENS,
    messages: [{ role: 'user', content: prompt }]
  };
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-api-key': TRUST_CONFIG.CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', options);
  
  if (response.getResponseCode() !== 200) {
    throw new Error(`Claude API error: ${response.getResponseCode()}`);
  }
  
  return JSON.parse(response.getContentText()).content[0].text;
}

// ==================== レスポンスパース ====================
function parseClaudeResponse(response, vpnName) {
  try {
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (!jsonMatch) return getDefaultEvaluation();
    
    const parsed = JSON.parse(jsonMatch[1]);
    if (!parsed.scores) return getDefaultEvaluation();
    
    const validateScore = (score) => {
      const num = parseInt(score);
      if (isNaN(num) || num < 1) return 1;
      if (num > 5) return 5;
      return num;
    };
    
    return {
      scores: {
        noLogPolicy: validateScore(parsed.scores.noLogPolicy),
        thirdPartyAudit: validateScore(parsed.scores.thirdPartyAudit),
        transparencyReport: validateScore(parsed.scores.transparencyReport),
        openSource: validateScore(parsed.scores.openSource),
        ramOnlyServers: validateScore(parsed.scores.ramOnlyServers),
        incidentResponse: validateScore(parsed.scores.incidentResponse),
        legalResponse: validateScore(parsed.scores.legalResponse),
        jurisdiction: 3,
        dataRetention: 3,
        operatingYears: 3
      },
      details: parsed.details || {}
    };
  } catch (error) {
    Logger.log(`⚠️ レスポンスパースエラー: ${error}`);
    return getDefaultEvaluation();
  }
}

function getDefaultEvaluation() {
  return {
    scores: {
      noLogPolicy: 2, thirdPartyAudit: 1, transparencyReport: 1, openSource: 1,
      ramOnlyServers: 2, incidentResponse: 3, legalResponse: 3, jurisdiction: 3, dataRetention: 3, operatingYears: 3
    },
    details: { note: '自動評価に失敗。デフォルト値を使用。' }
  };
}

// ==================== 総合スコア計算 ====================
function calculateTotalScore(scores) {
  let total = 0;
  for (const [key, weight] of Object.entries(TRUST_CONFIG.WEIGHTS)) {
    total += (scores[key] || 1) * weight * 20;
  }
  return Math.round(total);
}

// ==================== Spreadsheet保存 ====================
function saveTrustScoresToSheet(results) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(TRUST_CONFIG.SCORING_SHEET);
  
  if (!sheet) {
    sheet = ss.insertSheet(TRUST_CONFIG.SCORING_SHEET);
    const headers = ['更新日時', 'VPNサービス', '本社所在地', 'ノーログ(15)', '監査(15)', '透明性(10)', '管轄(15)', '保持義務(10)', 'OSS(10)', 'RAM(10)', 'インシデント(5)', '法的対応(5)', '運営年数(5)', '合計スコア', '評価'];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#2F5496').setFontColor('#FFFFFF');
  }
  
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clear();
  }
  
  results.forEach(result => {
    if (result.error) {
      sheet.appendRow([new Date(), result.vpnName, 'エラー', '', '', '', '', '', '', '', '', '', '', 0, 'N/A']);
    } else {
      sheet.appendRow([
        result.lastUpdate, result.vpnName, result.headquarters,
        result.scores.noLogPolicy, result.scores.thirdPartyAudit, result.scores.transparencyReport,
        result.scores.jurisdiction, result.scores.dataRetention || 3, result.scores.openSource,
        result.scores.ramOnlyServers, result.scores.incidentResponse, result.scores.legalResponse,
        result.scores.operatingYears, result.totalScore, result.grade
      ]);
    }
  });
  
  Logger.log('✅ スプレッドシート保存完了');
}

function logUpdate(results) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let logSheet = ss.getSheetByName(TRUST_CONFIG.UPDATE_LOG_SHEET);
  
  if (!logSheet) {
    logSheet = ss.insertSheet(TRUST_CONFIG.UPDATE_LOG_SHEET);
    logSheet.appendRow(['更新日時', '評価VPN数', '成功数', '平均スコア', '備考']);
    logSheet.getRange(1, 1, 1, 5).setFontWeight('bold').setBackground('#4285f4').setFontColor('#ffffff');
  }
  
  const successful = results.filter(r => !r.error);
  const avgScore = successful.length > 0 ? Math.round(successful.reduce((sum, r) => sum + r.totalScore, 0) / successful.length) : 0;
  
  logSheet.appendRow([new Date(), results.length, successful.length, avgScore, 'Claude API使用']);
}

// ==================== Web API ====================
function doGetTrust(e) {
  const action = e.parameter.action || 'getTrustScores';
  
  switch (action) {
    case 'getTrustScores':
      return ContentService.createTextOutput(JSON.stringify(getTrustScoresAPI())).setMimeType(ContentService.MimeType.JSON);
    case 'getIntegrated':
      return ContentService.createTextOutput(JSON.stringify(getIntegratedRankingAPI())).setMimeType(ContentService.MimeType.JSON);
    case 'getJurisdiction':
      return ContentService.createTextOutput(JSON.stringify({ success: true, data: Object.entries(JURISDICTION_DB).map(([country, info]) => ({ country, ...info })) })).setMimeType(ContentService.MimeType.JSON);
    default:
      return ContentService.createTextOutput(JSON.stringify({ error: 'Unknown action' })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getTrustScoresAPI() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(TRUST_CONFIG.SCORING_SHEET);
  
  if (!sheet || sheet.getLastRow() <= 1) {
    return { success: false, error: 'No data' };
  }
  
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 15).getValues();
  
  const scores = data.map(row => ({
    vpnName: row[1],
    headquarters: row[2],
    scores: {
      noLogPolicy: row[3], thirdPartyAudit: row[4], transparencyReport: row[5],
      jurisdiction: row[6], dataRetention: row[7], openSource: row[8],
      ramOnlyServers: row[9], incidentResponse: row[10], legalResponse: row[11], operatingYears: row[12]
    },
    totalScore: row[13],
    grade: row[14],
    lastUpdate: row[0]
  })).sort((a, b) => b.totalScore - a.totalScore);
  
  return { success: true, lastUpdate: scores[0]?.lastUpdate, count: scores.length, data: scores };
}

function getIntegratedRankingAPI() {
  const trustData = getTrustScoresAPI();
  if (!trustData.success) return trustData;
  
  let speedData = { data: [] };
  if (TRUST_CONFIG.SPEED_API_URL) {
    try {
      speedData = JSON.parse(UrlFetchApp.fetch(TRUST_CONFIG.SPEED_API_URL + '?type=ranking').getContentText());
    } catch (e) {}
  }
  
  const integrated = trustData.data.map(trust => {
    const speed = speedData.data?.find(s => s.name === trust.vpnName) || {};
    return {
      vpnName: trust.vpnName,
      headquarters: trust.headquarters,
      trustScore: trust.totalScore,
      trustGrade: trust.grade,
      downloadSpeed: speed.download || null,
      speedScore: speed.totalScore || 0,
      integratedScore: Math.round(trust.totalScore * 0.5 + (speed.totalScore || 50) * 0.5),
      lastUpdate: trust.lastUpdate
    };
  }).sort((a, b) => b.integratedScore - a.integratedScore);
  
  integrated.forEach((item, index) => { item.rank = index + 1; });
  
  return { success: true, lastUpdate: new Date().toISOString(), count: integrated.length, data: integrated };
}

// ==================== トリガー設定 ====================
function setupMonthlyTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'updateAllTrustScores') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  ScriptApp.newTrigger('updateAllTrustScores').timeBased().onMonthDay(1).atHour(10).create();
  Logger.log('✅ トリガー設定完了: 毎月1日 午前10時');
}

// ==================== 初期セットアップ ====================
function initialSetup() {
  Logger.log('==========================================');
  Logger.log('VPN Trust Score System 初期セットアップ');
  Logger.log('==========================================');
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Logger.log(`📊 スプレッドシート: ${ss.getName()}`);
  Logger.log(`  ID: ${ss.getId()}`);
  
  if (TRUST_CONFIG.CLAUDE_API_KEY) {
    Logger.log('✅ Claude API Key: 設定済み');
  } else {
    Logger.log('⚠️ Claude API Key: 未設定');
    Logger.log('  → スクリプトプロパティに CLAUDE_API_KEY を設定してください');
  }
  
  Logger.log('');
  Logger.log('次のステップ:');
  Logger.log('1. Claude API Keyを設定（未設定の場合）');
  Logger.log('2. updateAllTrustScores() を実行');
  Logger.log('3. デプロイしてWeb App URLを取得');
}

function testSingleVPNEvaluation() {
  const result = evaluateVPNTrust('NordVPN');
  Logger.log('評価結果:');
  Logger.log(JSON.stringify(result, null, 2));
}

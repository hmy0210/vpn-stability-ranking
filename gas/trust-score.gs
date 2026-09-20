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
 */

// ==================== 設定 ====================
const TRUST_CONFIG = {
  
  // シート名
  SCORING_SHEET: 'トラストスコア',
  JURISDICTION_SHEET: '法的管轄DB',
  AUDIT_HISTORY_SHEET: '監査履歴',
  UPDATE_LOG_SHEET: '更新ログ',
  
  // Claude API設定
  // NOTE: APIキーはトップレベルで一度だけ読むと、キー更新後に再デプロイが要る。
  //       getClaudeApiKey() で都度読む。
  CLAUDE_MODEL: 'claude-opus-5',
  // adaptive thinking を有効にすると思考トークンも max_tokens を消費するため
  // 4096 では JSON が途中で切れる。非ストリーミングの推奨値まで引き上げる。
  CLAUDE_MAX_TOKENS: 16000,
  CLAUDE_MAX_RETRIES: 3,
  
  // 既存エンジンのAPI URL
  // 稼働中の環境ではデプロイURLを直接書いているが、公開リポジトリには載せない。
  // 利用する場合はスクリプトプロパティ VPN_API_URL に設定すること。
  SPEED_API_URL: PropertiesService.getScriptProperties().getProperty('VPN_API_URL') || '',
  
  // 評価対象VPN
  VPN_LIST: [
    'NordVPN',
    'ExpressVPN', 
    'Private Internet Access',
    'Surfshark',
    'MillenVPN',
    'CyberGhost',
    'ProtonVPN',
    'IPVanish',
    'Mullvad',
    'Windscribe',
    'セカイVPN',
    'HideMyAss',
    'TunnelBear',
    'Hotspot Shield',
    'PureVPN'
  ],
  
  // スコアリング重み
  WEIGHTS: {
    noLogPolicy: 0.15,      // ノーログポリシー具体性
    thirdPartyAudit: 0.15,  // 第三者監査
    transparencyReport: 0.10, // 透明性レポート
    jurisdiction: 0.15,     // 本社所在地
    dataRetention: 0.10,    // データ保持義務
    openSource: 0.10,       // オープンソース
    ramOnlyServers: 0.10,   // RAMオンリーサーバー
    incidentResponse: 0.05, // インシデント対応
    legalResponse: 0.05,    // 法的要求対応
    operatingYears: 0.05    // 運営年数
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
/**
 * 15社を評価してシートに保存する。
 *
 * 途中で止まっても続きから再開できるようにしてある。
 * GASの実行時間は6分が上限で、以前は「15社を回しきってから一括保存」だったため、
 * 1社あたりが遅くなると最後まで到達できず、その回のAPI費用が丸ごと無駄になっていた。
 * いまは1社終わるごとに結果をスクリプトプロパティへ書き、時間が尽きる前に
 * 続きのトリガーを積んで抜ける。全社ぶん揃ったときだけシートを書き換える。
 */
function updateAllTrustScores() {
  const props = PropertiesService.getScriptProperties();
  const started = Date.now();
  const list = TRUST_CONFIG.VPN_LIST;

  let index = parseInt(props.getProperty(TRUST_STATE_INDEX) || '0', 10);
  if (!(index >= 0) || index > list.length) index = 0;

  Logger.log('==========================================');
  Logger.log(`VPN Trust Score 更新（${index + 1}社目から）`);
  Logger.log(`実行時刻: ${new Date().toLocaleString('ja-JP')}`);
  Logger.log('==========================================');

  while (index < list.length) {
    // 上限6分に対して余裕をとる。1社ぶんの評価が入る見込みが無ければ次回に回す。
    if (Date.now() - started > TRUST_TIME_BUDGET_MS) {
      props.setProperty(TRUST_STATE_INDEX, String(index));
      scheduleTrustContinuation_();
      Logger.log(`⏸ 時間切れ: ${index}/${list.length}社まで完了。続きは次の実行で。`);
      return null;
    }

    const vpnName = list[index];
    Logger.log(`--- ${vpnName}（${index + 1}/${list.length}）---`);

    let item;
    try {
      item = evaluateVPNTrust(vpnName);
      Logger.log(`✅ ${item.totalScore}点 (${item.grade})`);
    } catch (error) {
      item = { vpnName: vpnName, error: String(error), totalScore: 0, grade: 'N/A' };
      Logger.log(`❌ ${error}`);
    }
    saveTrustItem_(props, index, item);

    index++;
    props.setProperty(TRUST_STATE_INDEX, String(index));
    if (index < list.length) Utilities.sleep(TRUST_GAP_MS);
  }

  // ここまで来たら全社ぶん揃っている
  const results = [];
  for (let i = 0; i < list.length; i++) {
    const raw = props.getProperty(TRUST_STATE_ITEM + i);
    let item;
    try {
      item = raw ? JSON.parse(raw) : null;
    } catch (e) {
      item = null;
    }
    if (!item) item = { vpnName: list[i], error: '結果が残っていません', totalScore: 0, grade: 'N/A' };
    // JSONを経由すると Date が文字列になるので戻す
    if (typeof item.lastUpdate === 'string') item.lastUpdate = new Date(item.lastUpdate);
    results.push(item);
  }

  saveTrustScoresToSheet(results);
  logUpdate(results);

  // 失敗した社を残しておく。シートには前回値が残るので、ここを見ないと気づけない。
  const failed = {};
  results.forEach(r => { if (r.error) failed[r.vpnName] = String(r.error).slice(0, 300); });
  props.setProperty(TRUST_LAST_ERRORS, JSON.stringify(failed));

  clearTrustState_(props, list.length);
  cleanupOneShotTriggers_();

  Logger.log('==========================================');
  Logger.log(`✅ 更新完了: ${results.filter(r => !r.error).length}/${results.length}社`);
  Logger.log('==========================================');

  return results;
}

/** 続きを実行するトリガーを積む */
function scheduleTrustContinuation_() {
  cleanupOneShotTriggers_();
  ScriptApp.newTrigger('updateAllTrustScores').timeBased().after(60 * 1000).create();
}

/** 1社ぶんの結果を保存する。プロパティは1件9KBまでなので、大きければ details を落とす。 */
function saveTrustItem_(props, index, item) {
  let json = JSON.stringify(item);
  if (json.length > 8000) {
    const slim = {};
    Object.keys(item).forEach(k => { if (k !== 'details') slim[k] = item[k]; });
    slim.details = { note: '長すぎるため保存時に省略' };
    json = JSON.stringify(slim);
  }
  props.setProperty(TRUST_STATE_ITEM + index, json);
}

/** 途中経過を消す */
function clearTrustState_(props, count) {
  props.deleteProperty(TRUST_STATE_INDEX);
  for (let i = 0; i < count; i++) props.deleteProperty(TRUST_STATE_ITEM + i);
}

/** 途中で止まっているものを捨てて、最初からやり直す */
function resetTrustRun() {
  const props = PropertiesService.getScriptProperties();
  clearTrustState_(props, TRUST_CONFIG.VPN_LIST.length);
  Logger.log('途中経過を消しました。次の実行は1社目から始まります。');
}


// ==================== Claude APIでVPN評価 ====================
function evaluateVPNTrust(vpnName) {
  Logger.log(`Claude APIで${vpnName}を評価中...`);
  
  const vpnInfo = VPN_INFO_DB[vpnName];
  const jurisdictionInfo = JURISDICTION_DB[vpnInfo?.headquarters] || {};
  
  // プロンプト生成
  const prompt = generateEvaluationPrompt(vpnName, vpnInfo, jurisdictionInfo);
  
  // Claude API呼び出し
  const response = callClaudeAPI(prompt);
  
  // レスポンスをパース
  const evaluation = parseClaudeResponse(response, vpnName);
  
  // 法的管轄スコアを上書き（データベースから）
  if (jurisdictionInfo.score) {
    evaluation.scores.jurisdiction = jurisdictionInfo.score;
  }
  
  // 運営年数スコアを計算
  if (vpnInfo?.founded) {
    const years = new Date().getFullYear() - vpnInfo.founded;
    evaluation.scores.operatingYears = calculateOperatingYearsScore(years);
  }
  
  // 総合スコア計算
  const totalScore = calculateTotalScore(evaluation.scores);
  const grade = calculateGrade(totalScore);
  
  return {
    vpnName: vpnName,
    headquarters: vpnInfo?.headquarters || '不明',
    scores: evaluation.scores,
    totalScore: totalScore,
    grade: grade,
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
評価基準:
- 5点: 業界最高水準
- 4点: 優れている
- 3点: 標準的
- 2点: やや不足
- 1点: 不十分または情報なし

**評価項目:**

1. **noLogPolicy** (ノーログポリシーの具体性)
   - 5: 何を収集しないか具体的に明記+独立監査で検証済
   - 3: 「ノーログ」と記載のみ
   - 1: 曖昧または記載なし

2. **thirdPartyAudit** (第三者監査の実施)
   - 5: Big4による年次監査+結果公開
   - 4: Big4による監査（不定期）
   - 3: その他監査機関による監査
   - 2: 監査実施（結果非公開）
   - 1: 監査なし

3. **transparencyReport** (透明性レポートの公開)
   - 5: 四半期ごとの詳細レポート
   - 4: 半年ごとのレポート
   - 3: 年次レポート
   - 2: 不定期
   - 1: なし

4. **openSource** (オープンソースクライアント)
   - 5: 全クライアントOSS+活発な開発
   - 3: 一部OSS
   - 1: クローズドソース

5. **ramOnlyServers** (RAMオンリーサーバー)
   - 5: 全サーバーRAMオンリー
   - 3: 一部対応
   - 1: 非対応または不明

6. **incidentResponse** (セキュリティインシデント対応)
   - 5: 過去インシデントなし、または迅速な対応と公開
   - 3: インシデントあり、対応は適切
   - 1: インシデント対応に問題

7. **legalResponse** (法執行機関からのデータ要求への対応)
   - 5: 要求拒否の実績あり（データなし）
   - 3: 実績不明
   - 1: データ提供の実績あり

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
\`\`\`

最新の公開情報に基づいて評価してください。不明な場合は1〜2点とし、詳細に「情報なし」と記載してください。`;
}

// ==================== Claude API呼び出し ====================
function getClaudeApiKey_() {
  return PropertiesService.getScriptProperties().getProperty('CLAUDE_API_KEY');
}

/**
 * Claude Messages API を呼ぶ。
 *
 * 変更点:
 *  - 429 / 5xx / 529 を指数バックオフでリトライする。
 *    以前はリトライが無く、1社でも失敗するとシートに「エラー」行が残り
 *    その月のトラストスコアから丸ごと欠落していた。
 *  - adaptive thinking を有効化。content[0] は thinking ブロックに
 *    なりうるので、必ず type==='text' を探して取り出す。
 *  - stop_reason === 'refusal' を明示的に扱う。
 */
function callClaudeAPI(prompt) {
  const apiKey = getClaudeApiKey_();

  if (!apiKey) {
    throw new Error('CLAUDE_API_KEY が設定されていません。スクリプトプロパティに設定してください。');
  }

  const url = 'https://api.anthropic.com/v1/messages';

  const payload = {
    model: TRUST_CONFIG.CLAUDE_MODEL,
    max_tokens: TRUST_CONFIG.CLAUDE_MAX_TOKENS,
    thinking: { type: 'adaptive' },
    messages: [{ role: 'user', content: prompt }]
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const maxRetries = TRUST_CONFIG.CLAUDE_MAX_RETRIES;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    let response;
    try {
      response = UrlFetchApp.fetch(url, options);
    } catch (networkError) {
      lastError = networkError;
      if (attempt < maxRetries) { sleepBackoff_(attempt); continue; }
      throw networkError;
    }

    const code = response.getResponseCode();
    const text = response.getContentText();

    // リトライして意味がある失敗
    if (code === 429 || code >= 500) {
      lastError = new Error(`Claude API ${code}: ${text.slice(0, 300)}`);
      Logger.log(`⏳ ${code} のため再試行 (${attempt}/${maxRetries})`);
      if (attempt < maxRetries) { sleepBackoff_(attempt); continue; }
      throw lastError;
    }

    // リトライしても直らない失敗（キー誤り・リクエスト不正など）
    if (code !== 200) {
      throw new Error(`Claude API error: ${code} - ${text.slice(0, 500)}`);
    }

    const result = JSON.parse(text);

    if (result.stop_reason === 'refusal') {
      const category = result.stop_details && result.stop_details.category;
      throw new Error(`Claude がリクエストを拒否しました (category: ${category || 'unknown'})`);
    }

    const textBlock = (result.content || []).find(b => b && b.type === 'text');
    if (!textBlock || !textBlock.text) {
      throw new Error(`Claude のレスポンスに text ブロックがありません (stop_reason: ${result.stop_reason})`);
    }

    if (result.stop_reason === 'max_tokens') {
      Logger.log('⚠️ max_tokens に到達。JSONが途中で切れている可能性があります。');
    }

    return textBlock.text;
  }

  throw lastError || new Error('Claude API の呼び出しに失敗しました');
}

/** 指数バックオフ（1秒 → 2秒 → 4秒 …、上限30秒） */
function sleepBackoff_(attempt) {
  Utilities.sleep(Math.min(30000, Math.pow(2, attempt - 1) * 1000));
}

// ==================== Claude レスポンスをパース ====================
function parseClaudeResponse(response, vpnName) {
  try {
    // JSONブロックを抽出
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    
    if (!jsonMatch) {
      Logger.log('⚠️ JSONブロックが見つかりません。デフォルト値を使用。');
      return getDefaultEvaluation();
    }
    
    const parsed = JSON.parse(jsonMatch[1]);
    
    // バリデーション
    if (!parsed.scores) {
      return getDefaultEvaluation();
    }
    
    return {
      scores: {
        noLogPolicy: validateScore(parsed.scores.noLogPolicy),
        thirdPartyAudit: validateScore(parsed.scores.thirdPartyAudit),
        transparencyReport: validateScore(parsed.scores.transparencyReport),
        openSource: validateScore(parsed.scores.openSource),
        ramOnlyServers: validateScore(parsed.scores.ramOnlyServers),
        incidentResponse: validateScore(parsed.scores.incidentResponse),
        legalResponse: validateScore(parsed.scores.legalResponse),
        jurisdiction: 3, // 後で上書き
        dataRetention: 3, // 後で上書き
        operatingYears: 3 // 後で計算
      },
      details: parsed.details || {}
    };
    
  } catch (error) {
    Logger.log(`⚠️ レスポンスパースエラー: ${error}`);
    return getDefaultEvaluation();
  }
}

// ==================== デフォルト評価 ====================
function getDefaultEvaluation() {
  return {
    scores: {
      noLogPolicy: 2,
      thirdPartyAudit: 1,
      transparencyReport: 1,
      openSource: 1,
      ramOnlyServers: 2,
      incidentResponse: 3,
      legalResponse: 3,
      jurisdiction: 3,
      dataRetention: 3,
      operatingYears: 3
    },
    details: {
      note: '自動評価に失敗。デフォルト値を使用。'
    }
  };
}

// ==================== スコアバリデーション ====================
function validateScore(score) {
  const num = parseInt(score);
  if (isNaN(num) || num < 1) return 1;
  if (num > 5) return 5;
  return num;
}

// ==================== 運営年数スコア計算 ====================
function calculateOperatingYearsScore(years) {
  if (years >= 10) return 5;
  if (years >= 5) return 4;
  if (years >= 3) return 3;
  if (years >= 1) return 2;
  return 1;
}

// ==================== 総合スコア計算 ====================
function calculateTotalScore(scores) {
  let total = 0;
  
  for (const [key, weight] of Object.entries(TRUST_CONFIG.WEIGHTS)) {
    const score = scores[key] || 1;
    total += score * weight * 20; // 5点満点を100点満点に変換
  }
  
  return Math.round(total);
}

// ==================== グレード計算 ====================
function calculateGrade(totalScore) {
  if (totalScore >= 85) return 'A';
  if (totalScore >= 70) return 'B';
  if (totalScore >= 55) return 'C';
  if (totalScore >= 40) return 'D';
  return 'F';
}

// ==================== スプレッドシートに保存 ====================
// 途中再開のための保存先と時間の目安
const TRUST_STATE_INDEX = 'TRUST_RUN_INDEX';
const TRUST_STATE_ITEM  = 'TRUST_RUN_ITEM_';
const TRUST_LAST_ERRORS = 'TRUST_LAST_ERRORS';
const TRUST_TIME_BUDGET_MS = 4 * 60 * 1000;   // 上限6分に対して2分の余裕
const TRUST_GAP_MS = 8000;                    // 1社ごとに空ける間隔（レート制限対策）

const SCORING_HEADERS = [
  '更新日時', 'VPNサービス', '本社所在地',
  'ノーログ(15)', '監査(15)', '透明性(10)', '管轄(15)', '保持義務(10)',
  'OSS(10)', 'RAM(10)', 'インシデント(5)', '法的対応(5)', '運営年数(5)',
  '合計スコア', '評価', '詳細', '採点モデル'
];

function saveTrustScoresToSheet(results) {
  Logger.log('💾 スプレッドシートに保存中...');
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(TRUST_CONFIG.SCORING_SHEET);
  
  // シートが存在しない場合は作成
  if (!sheet) {
    sheet = ss.insertSheet(TRUST_CONFIG.SCORING_SHEET);
    
    // ヘッダー行
    const headers = SCORING_HEADERS;

    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#2F5496')
      .setFontColor('#FFFFFF');
    
    // 列幅調整
    sheet.setColumnWidth(1, 150);
    sheet.setColumnWidth(2, 180);
    sheet.setColumnWidth(3, 150);
  }
  
  const width = SCORING_HEADERS.length;

  // 既存のシートには「採点モデル」列の見出しが無い。空なら入れておく。
  // 採点者が誰かを残さないと、点が動いた理由を後から説明できなくなる。
  if (sheet.getLastRow() >= 1 && !sheet.getRange(1, width).getValue()) {
    sheet.getRange(1, width).setValue(SCORING_HEADERS[width - 1])
      .setFontWeight('bold').setBackground('#2F5496').setFontColor('#FFFFFF');
  }

  // 既存行を VPN名 → 行 で控えておく。
  // 今回の実行で評価に失敗したVPNは、0点の「エラー」行で上書きせず
  // 前回の値を残す（1社の一時的なAPI失敗でランキングから消えないように）。
  const previousByVpn = {};
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, width).getValues().forEach(row => {
      const name = row[1];
      if (name && row[13] > 0) previousByVpn[name] = row;   // 有効スコアの行のみ
    });
  }

  const rows = [];
  let carriedOver = 0;

  results.forEach(result => {
    if (result.error) {
      const prev = previousByVpn[result.vpnName];
      if (prev) {
        rows.push(prev);            // 前回値を維持
        carriedOver++;
        Logger.log(`↩️ ${result.vpnName}: 今回失敗のため前回のスコアを保持`);
      } else {
        const errorRow = new Array(width).fill('');
        errorRow[0] = new Date();
        errorRow[1] = result.vpnName;
        errorRow[2] = 'エラー';
        errorRow[13] = 0;
        errorRow[14] = 'N/A';
        errorRow[15] = result.error;
        errorRow[16] = TRUST_CONFIG.CLAUDE_MODEL;
        rows.push(errorRow);
      }
      return;
    }

    rows.push([
      result.lastUpdate,
      result.vpnName,
      result.headquarters,
      result.scores.noLogPolicy,
      result.scores.thirdPartyAudit,
      result.scores.transparencyReport,
      result.scores.jurisdiction,
      result.scores.dataRetention || 3,
      result.scores.openSource,
      result.scores.ramOnlyServers,
      result.scores.incidentResponse,
      result.scores.legalResponse,
      result.scores.operatingYears,
      result.totalScore,
      result.grade,
      JSON.stringify(result.details || {}),
      TRUST_CONFIG.CLAUDE_MODEL
    ]);
  });

  if (rows.length === 0) {
    Logger.log('⚠️ 書き込む行がありません。既存データは変更しません。');
    return;
  }

  // クリアと書き込みは、有効な行が揃ってから一括で行う
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, width).clearContent();
  }
  sheet.getRange(2, 1, rows.length, width).setValues(rows);

  if (carriedOver) Logger.log(`ℹ️ ${carriedOver}社は前回値を保持しました`);
  Logger.log('✅ スプレッドシート保存完了');
}

// ==================== 更新ログ記録 ====================
function logUpdate(results) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let logSheet = ss.getSheetByName(TRUST_CONFIG.UPDATE_LOG_SHEET);
  
  if (!logSheet) {
    logSheet = ss.insertSheet(TRUST_CONFIG.UPDATE_LOG_SHEET);
    logSheet.appendRow(['更新日時', '評価VPN数', '成功数', '平均スコア', '備考']);
    logSheet.getRange(1, 1, 1, 5)
      .setFontWeight('bold')
      .setBackground('#4285f4')
      .setFontColor('#ffffff');
  }
  
  const successful = results.filter(r => !r.error);
  const avgScore = successful.length > 0
    ? Math.round(successful.reduce((sum, r) => sum + r.totalScore, 0) / successful.length)
    : 0;
  
  logSheet.appendRow([
    new Date(),
    results.length,
    successful.length,
    avgScore,
    `Claude API使用`
  ]);
}

// ==================== Web API エンドポイント ====================
function doGet(e) {
  try {
    const action = e.parameter.action || 'getTrustScores';
    
    switch (action) {
      case 'getTrustScores':
        return createJsonResponse(getTrustScoresAPI());
        
      case 'getIntegrated':
        return createJsonResponse(getIntegratedRankingAPI());
        
      case 'getVPNDetail':
        const vpnName = e.parameter.vpn;
        return createJsonResponse(getVPNDetailAPI(vpnName));
        
      case 'getJurisdiction':
        return createJsonResponse(getJurisdictionAPI());
      
      // 外から再実行するための口。合言葉が一致したときだけ受け付ける。
      // 15社×Claude APIで2分以上かかり、doGetの実行時間上限に当たるため、
      // ここでは「10秒後に1回だけ動くトリガー」を積んで、すぐ返す。
      case 'runTrust': {
        const expected = PropertiesService.getScriptProperties().getProperty('RUN_KEY') || '';
        if (!expected || e.parameter.key !== expected) {
          return ContentService
            .createTextOutput(JSON.stringify({ success: false, error: 'unauthorized' }))
            .setMimeType(ContentService.MimeType.JSON);
        }
        cleanupOneShotTriggers_();
        ScriptApp.newTrigger('updateAllTrustScores').timeBased().after(10 * 1000).create();
        return ContentService
          .createTextOutput(JSON.stringify({ success: true, queued: true }))
          .setMimeType(ContentService.MimeType.JSON);
      }
        
      default:
        return createJsonResponse({
          error: 'Unknown action',
          availableActions: ['getTrustScores', 'getIntegrated', 'getVPNDetail', 'getJurisdiction']
        });
    }
    
  } catch (error) {
    return createJsonResponse({
      error: error.toString()
    });
  }
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==================== API: トラストスコア取得 ====================
function getTrustScoresAPI() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(TRUST_CONFIG.SCORING_SHEET);
  
  if (!sheet || sheet.getLastRow() <= 1) {
    return {
      success: false,
      error: 'No data',
      message: 'updateAllTrustScores()を実行してください。'
    };
  }
  
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, SCORING_HEADERS.length).getValues();
  
  const scores = data.map(row => ({
    vpnName: row[1],
    headquarters: row[2],
    scores: {
      noLogPolicy: row[3],
      thirdPartyAudit: row[4],
      transparencyReport: row[5],
      jurisdiction: row[6],
      dataRetention: row[7],
      openSource: row[8],
      ramOnlyServers: row[9],
      incidentResponse: row[10],
      legalResponse: row[11],
      operatingYears: row[12]
    },
    totalScore: row[13],
    grade: row[14],
    lastUpdate: row[0],
    model: row[16] || ''
  }));
  
  // スコア順にソート
  scores.sort((a, b) => b.totalScore - a.totalScore);
  
  let errors = {};
  try {
    errors = JSON.parse(PropertiesService.getScriptProperties().getProperty(TRUST_LAST_ERRORS) || '{}');
  } catch (e) {
    errors = {};
  }

  // 社ごとに採点モデルが違う＝途中で止まった回がある、ということ
  const models = {};
  scores.forEach(x => { models[x.model || ''] = true; });

  return {
    success: true,
    lastUpdate: scores[0]?.lastUpdate || null,
    model: scores[0]?.model || '',
    mixedModels: Object.keys(models).length > 1,
    errors: errors,
    count: scores.length,
    data: scores
  };
}

// ==================== API: 統合ランキング取得 ====================
const INTEGRATED_CACHE_KEY = 'integrated_ranking_v2';
const INTEGRATED_CACHE_SEC = 3600;  // 1時間

function getIntegratedRankingAPI() {
  // doGet から呼ばれるため、毎リクエストで外部GASを2回叩かないようキャッシュする
  const cache = CacheService.getScriptCache();
  const cached = cache.get(INTEGRATED_CACHE_KEY);
  if (cached) {
    Logger.log('統合ランキング: キャッシュヒット');
    return JSON.parse(cached);
  }

  Logger.log('統合ランキング生成中...');

  // 1. トラストスコア取得
  const trustData = getTrustScoresAPI();

  if (!trustData.success) {
    return trustData;
  }

  // 2. 速度データ取得（既存API）
  let speedData = { data: [] };
  let speedOk = false;
  try {
    const response = UrlFetchApp.fetch(TRUST_CONFIG.SPEED_API_URL + '?type=ranking', { muteHttpExceptions: true });
    if (response.getResponseCode() === 200) {
      speedData = JSON.parse(response.getContentText());
      speedOk = !!(speedData && speedData.data && speedData.data.length);
    }
  } catch (error) {
    Logger.log(`⚠️ 速度API取得エラー: ${error}`);
  }

  // 3. 料金データ取得（既存API）
  let priceData = { data: [] };
  let priceOk = false;
  try {
    const response = UrlFetchApp.fetch(TRUST_CONFIG.SPEED_API_URL + '?action=getPricing', { muteHttpExceptions: true });
    if (response.getResponseCode() === 200) {
      priceData = JSON.parse(response.getContentText());
      priceOk = !!(priceData && priceData.data && priceData.data.length);
    }
  } catch (error) {
    Logger.log(`⚠️ 料金API取得エラー: ${error}`);
  }

  // 速度・料金が両方落ちていると統合スコアが実質トラスト30%だけの
  // 別物になる。壊れた値をWordPress側のキャッシュに焼き付けないよう失敗を返す。
  if (!speedOk && !priceOk) {
    return {
      success: false,
      error: 'Upstream unavailable',
      message: '速度・料金APIの両方が取得できなかったため統合ランキングを生成しませんでした。'
    };
  }
  
  // 4. データ統合
  const integrated = trustData.data.map(trust => {
    // 速度データをマッチング
    const speed = speedData.data?.find(s => s.name === trust.vpnName) || {};
    
    // 料金データをマッチング
    const price = priceData.data?.find(p => p.name === trust.vpnName) || {};
    
    // 統合スコア計算
    // トラスト30% + 速度30% + 料金20% + 接続安定性20%
    const speedScore = speed.totalScore || 0;
    const priceScore = calculatePriceScore(price.price, 'JPY');
    const stabilityScore = speed.stabilityScore7d || speed.stability || 50;
    
    const integratedScore = Math.round(
      trust.totalScore * 0.30 +
      speedScore * 0.30 +
      priceScore * 0.20 +
      stabilityScore * 0.20
    );
    
    return {
      vpnName: trust.vpnName,
      headquarters: trust.headquarters,
      
      // トラストスコア
      trustScore: trust.totalScore,
      trustGrade: trust.grade,
      
      // 速度データ
      downloadSpeed: speed.download || null,
      uploadSpeed: speed.upload || null,
      ping: speed.ping || null,
      speedScore: speedScore,
      speedSource: speed.source || 'unknown',   // 'measured' なら実測
      
      // 接続安定性
      stabilityScore: stabilityScore,
      
      // 料金データ
      price: price.price || null,
      currency: 'JPY',
      priceScore: priceScore,
      
      // 統合スコア
      integratedScore: integratedScore,
      
      lastUpdate: trust.lastUpdate
    };
  });
  
  // 統合スコア順にソート
  integrated.sort((a, b) => b.integratedScore - a.integratedScore);
  
  // ランク付け
  integrated.forEach((item, index) => {
    item.rank = index + 1;
  });
  
  const result = {
    success: true,
    lastUpdate: new Date().toISOString(),
    count: integrated.length,
    weights: {
      trust: '30%',
      speed: '30%',
      price: '20%',
      stability: '20%'
    },
    // 速度エンジン側のデータ種別をそのまま引き継ぐ。
    // 公開面で「実測」と書けるかの判断に使う。
    speedDataSource: speedData.dataSource || 'unknown',
    measuredCount: speedData.measuredCount || 0,
    estimatedCount: speedData.estimatedCount || 0,
    data: integrated
  };

  try {
    CacheService.getScriptCache().put(INTEGRATED_CACHE_KEY, JSON.stringify(result), INTEGRATED_CACHE_SEC);
  } catch (cacheError) {
    // 100KB超などでキャッシュに入らない場合は諦めて結果だけ返す
    Logger.log(`⚠️ 統合ランキングのキャッシュ保存に失敗: ${cacheError}`);
  }

  return result;
}

// ==================== 料金スコア計算 ====================
function calculatePriceScore(price, currency) {
  if (!price) return 50; // デフォルト（料金データなし）
  
  // Pricing API v3は全VPNを円換算済み（currency: 'JPY'）で返す
  // 万一JPY以外が来た場合のフォールバック（安全策）
  let priceJPY = price;
  if (currency && currency !== 'JPY') {
    // この分岐は通常到達しないが、念のため
    Logger.log(`⚠️ calculatePriceScore: 想定外の通貨 ${currency} (price=${price})`);
    const rates = { 'USD': 150, 'EUR': 160, 'GBP': 190 };
    priceJPY = price * (rates[currency] || 150);
  }
  
  // 安いほど高スコア（¥200〜¥1500の範囲で0〜100点）
  // ¥200以下 = 100点、¥1500以上 = 0点
  const score = Math.max(0, Math.min(100, 100 - ((priceJPY - 200) / 13)));
  
  return Math.round(score);
}

// ==================== API: VPN詳細取得 ====================
function getVPNDetailAPI(vpnName) {
  if (!vpnName) {
    return { error: 'vpn parameter required' };
  }
  
  const trustData = getTrustScoresAPI();
  const vpnTrust = trustData.data?.find(v => v.vpnName === vpnName);
  
  if (!vpnTrust) {
    return { error: 'VPN not found', vpnName: vpnName };
  }
  
  // 法的管轄情報を追加
  const jurisdictionInfo = JURISDICTION_DB[vpnTrust.headquarters] || {};
  
  return {
    success: true,
    data: {
      ...vpnTrust,
      jurisdictionInfo: jurisdictionInfo
    }
  };
}

// ==================== API: 法的管轄DB取得 ====================
function getJurisdictionAPI() {
  const data = Object.entries(JURISDICTION_DB).map(([country, info]) => ({
    country: country,
    ...info
  }));
  
  return {
    success: true,
    count: data.length,
    data: data
  };
}

// ==================== 初期セットアップ ====================
function initialSetup() {
  Logger.log('==========================================');
  Logger.log('VPN Trust Score System 初期セットアップ');
  Logger.log('==========================================');
  Logger.log('');
  
  // 1. スプレッドシート確認
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Logger.log(`📊 スプレッドシート: ${ss.getName()}`);
  Logger.log(`  ID: ${ss.getId()}`);
  
  // 2. 法的管轄DBシート作成
  setupJurisdictionSheet(ss);
  
  // 3. Claude API Key確認
  const apiKey = getClaudeApiKey_();
  if (apiKey) {
    Logger.log('✅ Claude API Key: 設定済み');
  } else {
    Logger.log('⚠️ Claude API Key: 未設定');
    Logger.log('  → スクリプトプロパティに CLAUDE_API_KEY を設定してください');
  }
  
  Logger.log('');
  Logger.log('==========================================');
  Logger.log('セットアップ完了！');
  Logger.log('==========================================');
  Logger.log('');
  Logger.log('次のステップ:');
  Logger.log('1. Claude API Keyを設定（未設定の場合）');
  Logger.log('2. updateAllTrustScores() を実行');
  Logger.log('3. デプロイしてWeb App URLを取得');
  Logger.log('');
  Logger.log('API エンドポイント:');
  Logger.log('  ?action=getTrustScores    → トラストスコア一覧');
  Logger.log('  ?action=getIntegrated     → 統合ランキング');
  Logger.log('  ?action=getVPNDetail&vpn=NordVPN → VPN詳細');
  Logger.log('  ?action=getJurisdiction   → 法的管轄DB');
}

// ==================== 法的管轄DBシート作成 ====================
function setupJurisdictionSheet(ss) {
  Logger.log('法的管轄DBシート作成中...');
  
  let sheet = ss.getSheetByName(TRUST_CONFIG.JURISDICTION_SHEET);
  
  if (!sheet) {
    sheet = ss.insertSheet(TRUST_CONFIG.JURISDICTION_SHEET);
    
    // ヘッダー
    const headers = ['国/地域', '5Eyes', '9Eyes', '14Eyes', 'データ保持義務', 'スコア', '主なVPN', '備考'];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#2F5496')
      .setFontColor('#FFFFFF');
    
    // データ投入
    const vpnByCountry = {};
    Object.entries(VPN_INFO_DB).forEach(([vpn, info]) => {
      if (!vpnByCountry[info.headquarters]) {
        vpnByCountry[info.headquarters] = [];
      }
      vpnByCountry[info.headquarters].push(vpn);
    });
    
    Object.entries(JURISDICTION_DB).forEach(([country, info]) => {
      sheet.appendRow([
        country,
        info.fiveEyes ? '○' : '×',
        info.nineEyes ? '○' : '×',
        info.fourteenEyes ? '○' : '×',
        info.dataRetention,
        info.score,
        (vpnByCountry[country] || []).join(', '),
        ''
      ]);
    });
    
    Logger.log('✅ 法的管轄DBシート作成完了');
  } else {
    Logger.log('✅ 法的管轄DBシート確認完了');
  }
}

// ==================== トリガー設定 ====================
function setupMonthlyTrigger() {
  Logger.log('==========================================');
  Logger.log('月次トリガー設定');
  Logger.log('==========================================');
  Logger.log('');
  
  // 既存のトリガーを削除
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'updateAllTrustScores') {
      ScriptApp.deleteTrigger(trigger);
      Logger.log('🗑️ 既存トリガー削除');
    }
  });
  
  // 毎月1日 10:00に実行
  ScriptApp.newTrigger('updateAllTrustScores')
    .timeBased()
    .onMonthDay(1)
    .atHour(10)
    .create();
  
  Logger.log('✅ トリガー設定完了');
  Logger.log('実行タイミング: 毎月1日 午前10時');
  Logger.log('');
  Logger.log('==========================================');
}

// ==================== テスト: 単一VPN評価 ====================
function testSingleVPNEvaluation() {
  Logger.log('==========================================');
  Logger.log('単一VPN評価テスト: NordVPN');
  Logger.log('==========================================');
  Logger.log('');
  
  const result = evaluateVPNTrust('NordVPN');
  
  Logger.log('');
  Logger.log('評価結果:');
  Logger.log(JSON.stringify(result, null, 2));
}

// ==================== テスト: 統合ランキング ====================
function testIntegratedRanking() {
  Logger.log('==========================================');
  Logger.log('統合ランキングテスト');
  Logger.log('==========================================');
  Logger.log('');
  
  const result = getIntegratedRankingAPI();
  
  Logger.log('');
  Logger.log('TOP 5:');
  result.data?.slice(0, 5).forEach((vpn, i) => {
    Logger.log(`${i + 1}. ${vpn.vpnName}`);
    Logger.log(`   統合: ${vpn.integratedScore} | トラスト: ${vpn.trustScore} | 速度: ${vpn.speedScore} | 料金: ${vpn.priceScore}`);
  });
}

/**
 * 使い捨てトリガーの後片付け。
 * GASはプロジェクトあたり20個までしかトリガーを持てないので、
 * 積みっぱなしにすると、いずれ新しいトリガーが作れなくなる。
 */
function cleanupOneShotTriggers_() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'updateAllTrustScores' &&
        t.getEventType() === ScriptApp.EventType.CLOCK) {
      // 毎月1日のトリガーは残したいので、実行済みの使い捨てだけを消す
      if (String(t.getTriggerSource()) === 'CLOCK' && t.getUniqueId()) {
        try { ScriptApp.deleteTrigger(t); } catch (err) {}
      }
    }
  });
}
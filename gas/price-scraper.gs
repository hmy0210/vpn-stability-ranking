/**
 * ============================================
 * エンジン2A: VPN料金スクレイピング v3
 * ============================================
 * 
 * 【v3 修正内容】 2026-02-11
 * 
 * 1. ScraperAPI消費量削減
 *    - premium=true 廃止（10クレジット/回 → 1クレジット/回）
 *    - 円リトライ廃止（2回呼び出し → 1回に）
 *    - NordVPN/PIA等の取得困難サイトはフォールバック優先
 *    - render=true は本当に必要なサイトのみ
 * 
 * 2. 価格抽出ロジック刷新
 *    - JPY優先ソート廃止（HTMLの¥はCSS等の誤検出が多い）
 *    - USD/EUR を正として取得 → 為替レートで円換算に統一
 *    - 各VPNの「本来の通貨」を定義して誤検出を排除
 * 
 * 3. 為替換算の統一
 *    - JPY以外の全通貨を自動円換算
 *    - スプレッドシートには円換算後の値を保存
 * 
 * 4. フォールバック固定サイトの月1自動チェック（v3.1）
 *    - NordVPN/PIA等は普段フォールバック（API消費ゼロ）
 *    - 毎月1日だけScraperAPIで最新価格を取得試行
 *    - 取れたらスプレッドシートの「フォールバック管理」シートを自動更新
 *    - 取れなければ既存フォールバック価格を継続
 * 
 * 【API消費見込み】
 *    - 日次（毎日）: render必要4サイト × 5 = 20クレジット → 月600クレジット
 *    - 月次（月1回）: フォールバック2サイト × 5 = 10クレジット
 *    - 合計月間: 約610クレジット（無料枠5,000の12%）
 * ============================================
 */

// ScraperAPI設定
const SCRAPERAPI_KEY = PropertiesService.getScriptProperties().getProperty('SCRAPERAPI_KEY');
const SCRAPERAPI_URL = 'https://api.scraperapi.com';

// ==================== VPN設定マスタ ====================
// 各VPNの取得方法・期待通貨・フォールバック価格を一元管理
const VPN_CONFIG = {
  'NordVPN': {
    url: 'https://nordvpn.com/ja/pricing/',
    // 主力商品なので毎日実取得する。nordvpn.com は Cloudflare の
    // JSチャレンジで直接アクセスを 403 で弾くため render 必須（5クレジット/回）。
    fetchMethod: 'scraperapi_render',
    scraperCountry: 'jp',            // 日本語・円建てページを確実に取るため
    expectedCurrency: 'JPY',
    fallbackPrice: { amount: 540, currency: 'JPY' }  // 取得失敗時のみ（2026年4月確認）
  },
  'ExpressVPN': {
    url: 'https://www.expressvpn.com/jp/order',
    // 日本語ページは円建て・28ヶ月一括表記。customExtractor で月額換算する。
    fetchMethod: 'direct',
    expectedCurrency: 'JPY',
    customExtractor: 'expressvpn',
    fallbackPrice: { amount: 480, currency: 'JPY' }   // ¥13,440/28ヶ月（2026-09-05 実確認）
  },
  'Private Internet Access': {
    url: 'https://www.privateinternetaccess.com/ja/buy-vpn-online',
    fetchMethod: 'scraperapi_render',
    expectedCurrency: 'USD',
    fallbackPrice: { amount: 1.98, currency: 'USD' }  // 取得失敗時のみ（3年+4ヶ月 $79/40ヶ月）
  },
  'Surfshark': {
    url: 'https://surfshark.com/ja/pricing',
    fetchMethod: 'scraperapi_render', // JS必須
    expectedCurrency: 'USD',
    excludeAmounts: [1],              // $1（試用）を除外
    fallbackPrice: { amount: 2.19, currency: 'USD' }
  },
  'MillenVPN': {
    url: 'https://millenvpn.jp/pricing/',
    fetchMethod: 'direct',
    expectedCurrency: 'JPY',
    excludeAmounts: [360],            // 税抜を除外（税込396円を採用）
    fallbackPrice: { amount: 396, currency: 'JPY' }
  },
  'CyberGhost': {
    url: 'https://www.cyberghostvpn.com/ja/buy/cyberghost-vpn-3',
    fetchMethod: 'direct',
    expectedCurrency: 'USD',
    fallbackPrice: { amount: 2.19, currency: 'USD' }
  },
  'ProtonVPN': {
    url: 'https://protonvpn.com/ja/pricing',
    fetchMethod: 'scraperapi_render', // JS必須
    expectedCurrency: 'USD',
    fallbackPrice: { amount: 3.99, currency: 'USD' }
  },
  'IPVanish': {
    url: 'https://www.ipvanish.com/pricing/',
    fetchMethod: 'direct',
    expectedCurrency: 'USD',
    fallbackPrice: { amount: 2.49, currency: 'USD' }
  },
  'Mullvad': {
    url: 'https://mullvad.net/ja/pricing',
    fetchMethod: 'direct',
    expectedCurrency: 'EUR',
    fallbackPrice: { amount: 5, currency: 'EUR' }
  },
  'Windscribe': {
    url: 'https://jpn.windscribe.com/upgrade',
    fetchMethod: 'direct',
    expectedCurrency: 'USD',
    excludeAmounts: [1],              // $1を除外
    fallbackPrice: { amount: 5.75, currency: 'USD' }
  },
  'セカイVPN': {
    url: 'https://www.interlink.or.jp/service/sekaivpn/price.html',
    fetchMethod: 'direct',
    expectedCurrency: 'JPY',
    fallbackPrice: { amount: 1100, currency: 'JPY' }
  },
  'HideMyAss': {
    url: 'https://www.hidemyass.com/ja-jp/pricing',
    fetchMethod: 'scraperapi_render', // JS必須
    expectedCurrency: 'USD',
    fallbackPrice: { amount: 2.99, currency: 'USD' }
  },
  'TunnelBear': {
    url: 'https://www.tunnelbear.com/pricing',
    fetchMethod: 'direct',
    expectedCurrency: 'USD',
    fallbackPrice: { amount: 3.33, currency: 'USD' }
  },
  'Hotspot Shield': {
    url: 'https://www.hotspotshield.com/select-plan/',
    fetchMethod: 'direct',
    expectedCurrency: 'USD',
    fallbackPrice: { amount: 2.99, currency: 'USD' }
  },
  'Planet VPN': {
    url: 'https://account.freevpnplanet.com/ja/order/',
    fetchMethod: 'scraperapi_render', // JS必須
    expectedCurrency: 'EUR',
    fallbackPrice: { amount: 1.99, currency: 'EUR' }
  }
};

// 手動オーバーライド価格（最優先。スクレイピングもフォールバックも上書き）
const MANUAL_OVERRIDE_PRICES = {
  // 'NordVPN': { amount: 490, currency: 'JPY' },
};

// ==================== 価格範囲フィルタ ====================
const PRICE_RANGES = {
  'JPY': { min: 200, max: 3000 },
  'USD': { min: 1, max: 20 },    // max引き下げ（月額$20超はVPNとして異常）
  'EUR': { min: 1, max: 20 },
  'GBP': { min: 1, max: 20 }
};

// ==================== 直接アクセス ====================
function fetchHTMLDirect(url) {
  const options = {
    method: 'get',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8'
    },
    muteHttpExceptions: true,
    followRedirects: true
  };
  
  try {
    const response = UrlFetchApp.fetch(url, options);
    const statusCode = response.getResponseCode();
    
    if (statusCode === 200) {
      return { success: true, html: response.getContentText(), method: 'direct' };
    } else {
      return { success: false, error: `HTTP ${statusCode}`, method: 'direct' };
    }
  } catch (error) {
    return { success: false, error: error.toString(), method: 'direct' };
  }
}

// ==================== ScraperAPI経由アクセス（シンプル化） ====================
function fetchHTMLScraperAPI(url, renderJS = false, countryCode = '') {
  if (!SCRAPERAPI_KEY) {
    return { success: false, error: 'ScraperAPI key not configured' };
  }
  
  let apiUrl = `${SCRAPERAPI_URL}?api_key=${SCRAPERAPI_KEY}&url=${encodeURIComponent(url)}`;
  
  if (renderJS) {
    apiUrl += '&render=true';
  }
  
  // 日本語ページを正確に取得したい場合のみcountry_code=jpを付与
  if (countryCode) {
    apiUrl += `&country_code=${countryCode}`;
    Logger.log(`🌏 country_code=${countryCode} を指定`);
  }
  
  try {
    const response = UrlFetchApp.fetch(apiUrl, { muteHttpExceptions: true });
    const statusCode = response.getResponseCode();
    
    if (statusCode === 200) {
      return { success: true, html: response.getContentText(), method: renderJS ? 'scraperapi_render' : 'scraperapi' };
    } else {
      return { success: false, error: `ScraperAPI HTTP ${statusCode}`, method: 'scraperapi' };
    }
  } catch (error) {
    return { success: false, error: error.toString(), method: 'scraperapi' };
  }
}

// ==================== HTML取得（設定ベース） ====================
function fetchHTML(vpnName) {
  const config = VPN_CONFIG[vpnName];
  if (!config) return { success: false, error: 'VPN not in config' };
  
  const url = config.url;
  
  switch (config.fetchMethod) {
    case 'fallback':
      // 最初からフォールバック（API消費ゼロ）
      Logger.log(`${vpnName}: フォールバック固定（API節約）`);
      return { success: false, error: 'fallback_only', method: 'skipped' };
    
    case 'direct':
      Logger.log(`${vpnName}: 直接アクセス`);
      return fetchHTMLDirect(url);
    
    case 'scraperapi':
      Logger.log(`${vpnName}: ScraperAPI（JSなし = 1クレジット）`);
      const result1 = fetchHTMLScraperAPI(url, false);
      if (!result1.success) {
        Logger.log(`⚠️ ${vpnName}: ScraperAPI失敗、直接アクセス試行...`);
        return fetchHTMLDirect(url);
      }
      return result1;
    
    case 'scraperapi_render':
      Logger.log(`${vpnName}: ScraperAPI + JSレンダリング（5クレジット）`);
      const result2 = fetchHTMLScraperAPI(url, true, config.scraperCountry || '');
      if (!result2.success) {
        Logger.log(`⚠️ ${vpnName}: ScraperAPI失敗、直接アクセス試行...`);
        return fetchHTMLDirect(url);
      }
      return result2;
    
    default:
      return fetchHTMLDirect(url);
  }
}

// ==================== 為替レート取得（USD/EUR/GBP → JPY） ====================
/**
 * 為替レートを実勢値で取得する。
 *
 * 以前の実装は単一ソース（exchangerate-api v4）で、失敗すると黙って
 * { USD:150, EUR:165, GBP:190 } のハードコード値に落ちていた。
 * 2026-09-04 時点の実勢は USD 156.3 / EUR 181.5 / GBP 211.2 で、
 * GBP は 10% もズレていた。しかも失敗はログにしか出ないため気付けなかった。
 *
 * 対策:
 *   1. 複数ソースを順に試す（1つ落ちても実勢値を維持できる）
 *   2. 妥当な範囲かを検証してから採用する（壊れた値を弾く）
 *   3. 成功した値を ScriptProperties に保存し、全滅時はその「最後の正常値」を使う
 *      → ハードコード値まで落ちるのは初回実行時だけ
 *   4. ハードコードに落ちたら通知する（黙って誤変換を続けない）
 */

const FX_CACHE_SEC = 21600;              // 6時間（ScriptCache の上限）
const FX_LAST_GOOD_PROPERTY = 'FX_LAST_GOOD';
const FX_STALE_ALERT_HOURS = 48;         // 最後の正常値がこれより古いと警告

// 妥当性チェックの範囲。ここを外れる値は採用しない。
const FX_SANE_RANGE = {
  USD: [80, 300],
  EUR: [90, 350],
  GBP: [110, 400]
};

function getExchangeRates() {
  const cache = CacheService.getScriptCache();

  const cached = cache.get('FX_RATES_V2');
  if (cached) {
    try {
      const rates = JSON.parse(cached);
      if (isSaneRateSet_(rates)) {
        Logger.log(`💱 為替（キャッシュ）: $1=¥${rates.USD.toFixed(2)}, €1=¥${rates.EUR.toFixed(2)}, £1=¥${rates.GBP.toFixed(2)}`);
        return rates;
      }
    } catch (e) { /* 壊れたキャッシュは無視して取り直す */ }
  }

  const sources = [
    { name: 'Yahoo Finance（実勢）', fn: fetchRatesFromYahoo_ },
    { name: 'frankfurter（ECB）',    fn: fetchRatesFromFrankfurter_ },
    { name: 'open.er-api',           fn: fetchRatesFromOpenErApi_ },
    { name: 'exchangerate-api',      fn: fetchRatesFromExchangeRateApi_ }
  ];

  for (let i = 0; i < sources.length; i++) {
    try {
      const rates = sources[i].fn();
      if (rates && isSaneRateSet_(rates)) {
        rates.source = sources[i].name;
        rates.fetchedAt = new Date().toISOString();

        cache.put('FX_RATES_V2', JSON.stringify(rates), FX_CACHE_SEC);
        PropertiesService.getScriptProperties()
          .setProperty(FX_LAST_GOOD_PROPERTY, JSON.stringify(rates));

        Logger.log(`💱 為替取得 [${sources[i].name}]: $1=¥${rates.USD.toFixed(2)}, €1=¥${rates.EUR.toFixed(2)}, £1=¥${rates.GBP.toFixed(2)}`);
        return rates;
      }
      Logger.log(`⚠️ ${sources[i].name}: 値が妥当範囲外のため不採用`);
    } catch (e) {
      Logger.log(`⚠️ ${sources[i].name} 失敗: ${e}`);
    }
  }

  // 全ソース失敗 → 最後に取れた正常値を使う
  const lastGood = getLastGoodRates_();
  if (lastGood) {
    const ageHours = (Date.now() - new Date(lastGood.fetchedAt).getTime()) / 3600000;
    Logger.log(`⚠️ 全為替ソース失敗。最後の正常値を使用（${ageHours.toFixed(1)}時間前 / ${lastGood.source}）`);
    if (ageHours > FX_STALE_ALERT_HOURS) {
      notifyExchangeRateFailure_(`最後の正常値が${ageHours.toFixed(0)}時間前です`, lastGood);
    }
    return lastGood;
  }

  // ここに来るのは初回実行時のみ。固定値は必ず古くなるので通知する。
  Logger.log('❌ 為替を一切取得できず、固定値にフォールバックします');
  const fallback = { USD: 150, EUR: 165, GBP: 190, source: 'hardcoded-fallback', fetchedAt: new Date().toISOString() };
  notifyExchangeRateFailure_('全ソース失敗かつ過去の正常値なし。固定値を使用中', fallback);
  return fallback;
}

/** 値が現実的な範囲に収まっているか */
function isSaneRateSet_(rates) {
  if (!rates) return false;
  return Object.keys(FX_SANE_RANGE).every(cur => {
    const v = rates[cur];
    const [lo, hi] = FX_SANE_RANGE[cur];
    return typeof v === 'number' && isFinite(v) && v >= lo && v <= hi;
  });
}

function getLastGoodRates_() {
  const raw = PropertiesService.getScriptProperties().getProperty(FX_LAST_GOOD_PROPERTY);
  if (!raw) return null;
  try {
    const rates = JSON.parse(raw);
    return isSaneRateSet_(rates) ? rates : null;
  } catch (e) { return null; }
}

// ---------- 各ソース ----------

/** Yahoo Finance: 実勢レート（更新頻度が最も高い） */
function fetchRatesFromYahoo_() {
  const pairs = { USD: 'USDJPY=X', EUR: 'EURJPY=X', GBP: 'GBPJPY=X' };
  const rates = {};

  Object.keys(pairs).forEach(cur => {
    const res = UrlFetchApp.fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${pairs[cur]}?interval=1d&range=1d`,
      { muteHttpExceptions: true, headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (res.getResponseCode() !== 200) throw new Error(`HTTP ${res.getResponseCode()} (${cur})`);
    const meta = JSON.parse(res.getContentText()).chart.result[0].meta;
    rates[cur] = Number(meta.regularMarketPrice);
  });

  return rates;
}

/** frankfurter: ECB公表の参照レート（営業日ごと） */
function fetchRatesFromFrankfurter_() {
  const res = UrlFetchApp.fetch(
    'https://api.frankfurter.dev/v1/latest?base=USD&symbols=JPY,EUR,GBP',
    { muteHttpExceptions: true }
  );
  if (res.getResponseCode() !== 200) throw new Error(`HTTP ${res.getResponseCode()}`);
  return ratesFromUsdBase_(JSON.parse(res.getContentText()).rates);
}

function fetchRatesFromOpenErApi_() {
  const res = UrlFetchApp.fetch('https://open.er-api.com/v6/latest/USD', { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error(`HTTP ${res.getResponseCode()}`);
  return ratesFromUsdBase_(JSON.parse(res.getContentText()).rates);
}

function fetchRatesFromExchangeRateApi_() {
  const res = UrlFetchApp.fetch('https://api.exchangerate-api.com/v4/latest/USD', { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error(`HTTP ${res.getResponseCode()}`);
  return ratesFromUsdBase_(JSON.parse(res.getContentText()).rates);
}

/**
 * USD基準のレート表を「1通貨あたり何円か」に変換する。
 * r.JPY   = 1USD が何円か
 * r.EUR   = 1USD が何ユーロか  → EUR→JPY = r.JPY / r.EUR
 */
function ratesFromUsdBase_(r) {
  if (!r || !r.JPY || !r.EUR || !r.GBP) throw new Error('必要な通貨が欠けています');
  return {
    USD: Number(r.JPY),
    EUR: Number(r.JPY) / Number(r.EUR),
    GBP: Number(r.JPY) / Number(r.GBP)
  };
}

/** 固定値まで落ちたら知らせる（1日1通まで） */
function notifyExchangeRateFailure_(reason, rates) {
  try {
    const props = PropertiesService.getScriptProperties();
    const lastNotified = props.getProperty('FX_ALERT_SENT_ON');
    const today = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd');
    if (lastNotified === today) return;

    const email = Session.getActiveUser().getEmail();
    if (!email) return;

    MailApp.sendEmail(
      email,
      '[VPN] 為替レートの取得に失敗しています',
      `為替レートを実勢値で取得できていません。料金の円換算が実際とズレます。\n\n` +
      `理由: ${reason}\n` +
      `使用中のレート: USD ${rates.USD} / EUR ${rates.EUR} / GBP ${rates.GBP}\n` +
      `ソース: ${rates.source}\n\n` +
      `checkExchangeRates() を実行して各ソースの状態を確認してください。`
    );
    props.setProperty('FX_ALERT_SENT_ON', today);
  } catch (e) {
    Logger.log(`⚠️ 為替失敗通知を送れませんでした: ${e}`);
  }
}

/** 手動実行: 各ソースの生存確認と現在レートの表示 */
function checkExchangeRates() {
  const sources = [
    ['Yahoo Finance（実勢）', fetchRatesFromYahoo_],
    ['frankfurter（ECB）',    fetchRatesFromFrankfurter_],
    ['open.er-api',           fetchRatesFromOpenErApi_],
    ['exchangerate-api',      fetchRatesFromExchangeRateApi_]
  ];

  Logger.log('=== 為替ソースの状態 ===');
  sources.forEach(([name, fn]) => {
    try {
      const r = fn();
      const sane = isSaneRateSet_(r) ? '✅' : '⚠️範囲外';
      Logger.log(`${sane} ${name}: USD ${r.USD.toFixed(3)} / EUR ${r.EUR.toFixed(3)} / GBP ${r.GBP.toFixed(3)}`);
    } catch (e) {
      Logger.log(`❌ ${name}: ${e}`);
    }
  });

  const lastGood = getLastGoodRates_();
  Logger.log('');
  Logger.log(lastGood
    ? `保存済みの最終正常値: USD ${lastGood.USD.toFixed(3)} (${lastGood.source} / ${lastGood.fetchedAt})`
    : '保存済みの最終正常値: なし');
  Logger.log('');
  Logger.log('実際に採用されるレート:');
  const active = getExchangeRates();
  Logger.log(`  USD ${active.USD.toFixed(3)} / EUR ${active.EUR.toFixed(3)} / GBP ${active.GBP.toFixed(3)}  [${active.source}]`);
  return active;
}

// 通貨を円に換算
function convertToJPY(amount, currency, rates) {
  if (currency === 'JPY') return Math.round(amount);
  const rate = rates[currency];
  if (!rate) {
    Logger.log(`⚠️ 未対応通貨: ${currency}、USD換算で代替`);
    return Math.round(amount * 150);
  }
  return Math.round(amount * rate);
}

// ==================== 価格抽出（v3: 期待通貨ベース） ====================
function extractPrices(html, vpnName) {
  const config = VPN_CONFIG[vpnName];
  const expectedCurrency = config.expectedCurrency;
  
  // ===== v4.1: 月額表記限定モード（monthlyOnly） =====
  // 「$X.XX/月」「$X.XX/mo」形式のみ採用。定価・総額・年額の誤検出を構造的に遮断。
  // 月額表記が1つも見つからない場合は空を返し、フォールバックに退避させる（fail-safe）。
  if (config.monthlyOnly) {
    const monthlyPatterns = [
      /\$\s*([0-9]+\.[0-9]{2})\s*\/\s*月/g,                 // $2.49/月（日本語ページ）
      /\$\s*([0-9]+\.[0-9]{2})\s*\/\s*mo\b/gi,              // $2.49/mo（英語ページ）
      /\$\s*([0-9]+\.[0-9]{2})\s*per\s+month/gi             // $2.49 per month
    ];
    const monthlyPrices = [];
    for (const pattern of monthlyPatterns) {
      let m;
      while ((m = pattern.exec(html)) !== null) {
        const amount = parseFloat(m[1]);
        if (!isNaN(amount) && isValidPrice(amount, 'USD')) {
          if (config.excludeAmounts && config.excludeAmounts.includes(amount)) continue;
          monthlyPrices.push({ currency: 'USD', amount, raw: m[0] });
        }
      }
    }
    if (monthlyPrices.length > 0) {
      monthlyPrices.sort((a, b) => a.amount - b.amount);
      Logger.log(`  🎯 月額限定モード: ${monthlyPrices.length}件検出、最安 $${monthlyPrices[0].amount}`);
      return monthlyPrices;
    }
    Logger.log(`  ⚠️ 月額限定モード: /月 表記の価格が未検出 → フォールバック退避`);
    return [];   // 汎用パターンに落とさない（誤検出防止のため意図的に空を返す）
  }
  // ===== v4.1 ここまで =====

  const prices = [];
  
  // 期待通貨のパターンのみ検索（誤検出を防止）
  const allPatterns = {
    'JPY': [
      /([0-9,]+)\s*円/g,                    // 1100円 形式
      /[¥￥]\s*([0-9,]+)(?![0-9])/g         // ¥1100 形式（後続数字なし）
    ],
    'USD': [
      /\$\s*([0-9]+\.[0-9]{2})\b/g,         // $3.49 形式（小数必須で誤検出減）
      /([0-9]+\.[0-9]{2})\s*(?:USD|\/mo)/gi  // 3.49 USD, 3.49/mo 形式
    ],
    'EUR': [
      /€\s*([0-9]+\.?[0-9]*)\b/g,           // €5 or €4.99
      /([0-9]+\.?[0-9]*)\s*EUR/gi
    ],
    'GBP': [
      /£\s*([0-9]+\.?[0-9]*)\b/g
    ]
  };
  
  // 期待通貨のパターンを優先的に検索
  const searchCurrencies = [expectedCurrency];
  // 期待通貨で見つからなかった場合のフォールバック通貨
  const fallbackCurrencies = Object.keys(allPatterns).filter(c => c !== expectedCurrency);
  
  for (const currency of searchCurrencies) {
    const patternList = allPatterns[currency];
    if (!patternList) continue;
    
    for (const pattern of patternList) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const amountStr = match[1].replace(/,/g, '');
        const amount = parseFloat(amountStr);
        
        if (!isNaN(amount) && isValidPrice(amount, currency)) {
          // VPN別の除外リストチェック
          if (config.excludeAmounts && config.excludeAmounts.includes(amount)) {
            Logger.log(`  除外: ${currency} ${amount}（excludeAmountsに該当）`);
            continue;
          }
          
          prices.push({ currency, amount, raw: match[0] });
        }
      }
    }
  }
  
  // 期待通貨で見つからなかった場合、他の通貨も検索
  if (prices.length === 0) {
    Logger.log(`⚠️ ${vpnName}: 期待通貨(${expectedCurrency})で価格未検出、他通貨を検索...`);
    
    for (const currency of fallbackCurrencies) {
      const patternList = allPatterns[currency];
      if (!patternList) continue;
      
      for (const pattern of patternList) {
        let match;
        while ((match = pattern.exec(html)) !== null) {
          const amountStr = match[1].replace(/,/g, '');
          const amount = parseFloat(amountStr);
          
          if (!isNaN(amount) && isValidPrice(amount, currency)) {
            if (config.excludeAmounts && config.excludeAmounts.includes(amount)) continue;
            prices.push({ currency, amount, raw: match[0] });
          }
        }
      }
    }
  }
  
  // ========== VPN別の特殊処理: 長期プラン月額換算 ==========
  
  // Private Internet Access: "$79/3年+4ヶ月" を月額換算
  if (vpnName === 'Private Internet Access') {
    const match3y = html.match(/\$\s*79\s*every\s*3\s*years/i) ||
                    html.match(/3\s*年.*?\$\s*79/i) || 
                    html.match(/\$\s*79.*?3\s*年/i);
    if (match3y) {
      // 3年ごとに$79自動更新だが、初回は+4ヶ月無料 = 40ヶ月分
      const monthly = parseFloat((79 / 40).toFixed(2));
      prices.push({ currency: 'USD', amount: monthly, raw: '$79/40months→monthly' });
      Logger.log(`📊 PIA: 3年+4ヶ月プラン検出 → $${monthly}/月`);
    }
  }
  
  // CyberGhost: "$56.94/2年" を月額換算
  if (vpnName === 'CyberGhost') {
    const match2y = html.match(/\$\s*56\.94.*?2\s*years/i) ||
                    html.match(/56\.94.*?2\s*年/i) ||
                    html.match(/2\s*年.*?56\.94/i);
    if (match2y) {
      const monthly = parseFloat((56.94 / 24).toFixed(2));
      prices.push({ currency: 'USD', amount: monthly, raw: '$56.94/2years→monthly' });
      Logger.log(`📊 CyberGhost: 2年プラン検出 → $${monthly}/月`);
    }
  }
  
  // 重複削除 + 安い順ソート
  const seen = new Set();
  const uniquePrices = prices.filter(p => {
    const key = `${p.currency}-${p.amount}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => a.amount - b.amount);
  
  // ログ出力
  Logger.log(`${vpnName}: ${uniquePrices.length}個の価格を抽出`);
  uniquePrices.slice(0, 5).forEach((p, i) => {
    Logger.log(`  ${i + 1}. ${p.currency} ${p.amount} (${p.raw})`);
  });
  
  return uniquePrices;
}

// ==================== ExpressVPN専用抽出 ====================
function extractExpressVPNPrices(html) {
  const prices = [];

  // 日本語ページの表記例（2026-09 時点）:
  //   最初の28 ヶ月は <span class="line-through">¥69,440</span> <span ...>¥13,440</span> です。
  //
  // 旧実装は /最初の(\d+)ヶ月は[^$]*\$([0-9.]+)/ で、
  //   (a) 「28 ヶ月」の半角スペースに対応できず
  //   (b) ドル建て前提だった（現在は円建て）
  // ために常に0件となり、フォールバック($2.49=¥389)に落ちていた。
  // 実際は ¥13,440/28ヶ月 = ¥480/月 で、約19%安く表示されていた。

  const blockPattern = /最初の\s*(\d+)\s*[ヶか箇]?月は([\s\S]{0,400}?)です/g;
  let match;

  while ((match = blockPattern.exec(html)) !== null) {
    const months = parseInt(match[1], 10);
    if (!months) continue;

    const block = match[2];

    // 円建て: 打ち消し線（定価）と割引後が並ぶ。最後に出るものが実売価格。
    const yens = (block.match(/¥\s*([0-9][0-9,]*)/g) || [])
      .map(v => parseInt(v.replace(/[¥,\s]/g, ''), 10))
      .filter(v => v > 0);

    if (yens.length) {
      const total = yens[yens.length - 1];
      const monthly = Math.round(total / months);
      Logger.log(`  ExpressVPN検出: ¥${total} / ${months}ヶ月 = ¥${monthly}/月`);
      prices.push({ currency: 'JPY', amount: monthly, raw: `¥${total}/${months}mo` });
      continue;
    }

    // ドル建てページ（地域によっては従来表記）
    const usds = (block.match(/\$\s*([0-9]+(?:\.[0-9]+)?)/g) || [])
      .map(v => parseFloat(v.replace(/[$\s]/g, '')))
      .filter(v => v > 0);

    if (usds.length) {
      const total = usds[usds.length - 1];
      const monthly = parseFloat((total / months).toFixed(2));
      Logger.log(`  ExpressVPN検出: $${total} / ${months}ヶ月 = $${monthly}/月`);
      prices.push({ currency: 'USD', amount: monthly, raw: `$${total}/${months}mo` });
    }
  }

  // 上記で取れない場合のみ、単体表記を拾う
  if (prices.length === 0) {
    let m;
    const yenSingle = /¥\s*([0-9][0-9,]*)\s*\/\s*月/g;
    while ((m = yenSingle.exec(html)) !== null) {
      const amount = parseInt(m[1].replace(/,/g, ''), 10);
      if (amount >= 100 && amount <= 5000) prices.push({ currency: 'JPY', amount, raw: m[0] });
    }

    const dollarPattern = /\$\s*([0-9]+\.[0-9]{2})\b/g;
    while ((m = dollarPattern.exec(html)) !== null) {
      const amount = parseFloat(m[1]);
      if (amount >= 1 && amount <= 20) prices.push({ currency: 'USD', amount, raw: m[0] });
    }
  }

  const seen = new Set();
  return prices.filter(p => {
    const key = `${p.currency}-${p.amount}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => a.amount - b.amount);
}


// ==================== 価格妥当性チェック ====================
function isValidPrice(amount, currency) {
  const range = PRICE_RANGES[currency];
  if (!range) return false;
  return amount >= range.min && amount <= range.max;
}

// ==================== メイン: 全VPN料金取得 ====================
function scrapePricingAll() {
  Logger.log('==========================================');
  Logger.log('全VPN料金スクレイピング v3 開始');
  Logger.log('==========================================');
  Logger.log('');
  
  // 為替レートを先に1回だけ取得
  const rates = getExchangeRates();

  const fallbackPrices = loadFallbackPrices();
  
  const results = [];
  let scraperApiCalls = 0;

  // ローカル（~/vpn-speed-agent/price）が日本語公式の円建て額を書いている社は、ここで米ドル換算の値を
  // 取り直すと前回値との差で毎日「異常」通知が出て、ローカルが失敗した日は誤った額が最新行になる。
  // 48時間以内にローカルの行がある社は触らない。ローカルが2日止まったらGASが代わりに取得する。
  const localFresh = recentLocalBrowserVpns_(48);
  
  for (const [vpnName, config] of Object.entries(VPN_CONFIG)) {
    Logger.log(`━━━━━━━━━━━━━━━━━━━━━━`);
    Logger.log(`VPN: ${vpnName}`);

    if (localFresh.has(vpnName)) {
      Logger.log(`⏭ 48時間以内にローカル取得（日本語公式）の行があるためスキップ`);
      continue;
    }
    
    // ===== 手動オーバーライド（最優先） =====
    if (MANUAL_OVERRIDE_PRICES[vpnName]) {
      Logger.log(`📌 手動設定価格を使用`);
      const override = MANUAL_OVERRIDE_PRICES[vpnName];
      const jpyAmount = convertToJPY(override.amount, override.currency, rates);
      
      results.push({
        vpn: vpnName,
        success: true,
        monthlyPrice: { amount: jpyAmount, currency: 'JPY', display: `¥${jpyAmount}` },
        originalPrice: { amount: override.amount, currency: override.currency },
        allPrices: [],
        method: 'manual_override',
        isManual: true
      });
      Logger.log(`💰 月額: ¥${jpyAmount}`);
      continue;
    }
    
    // ===== HTML取得 =====
    const fetchResult = fetchHTML(vpnName);
    
    // 取得失敗 → フォールバック
    if (!fetchResult.success) {
      if (fetchResult.method === 'scraperapi' || fetchResult.method === 'scraperapi_render') {
        scraperApiCalls++;
      }
      
      const fb = fallbackPrices[vpnName] || config.fallbackPrice;
      const jpyAmount = Math.round(convertToJPY(fb.amount, fb.currency, rates));

      Logger.log(`📋 フォールバック使用: ${fb.currency} ${fb.amount} → ¥${jpyAmount}`);
      
      results.push({
        vpn: vpnName,
        success: true,
        monthlyPrice: { amount: jpyAmount, currency: 'JPY', display: `¥${jpyAmount}` },
        originalPrice: { amount: fb.amount, currency: fb.currency },
        allPrices: [],
        method: fetchResult.error === 'fallback_only' ? 'fallback' : `fallback (${fetchResult.error})`,
        isFallback: true
      });
      
      Utilities.sleep(500);
      continue;
    }
    
    // ScraperAPI使用カウント
    if (fetchResult.method.includes('scraperapi')) {
      scraperApiCalls++;
    }
    
    Logger.log(`✅ HTML取得成功 (${fetchResult.method}), ${fetchResult.html.length}文字`);
    
    // ===== 価格抽出 =====
    const prices = extractPrices(fetchResult.html, vpnName);
    
    // 抽出失敗 → フォールバック
    if (prices.length === 0) {
      Logger.log(`⚠️ 価格未検出`);
      const fb = fallbackPrices[vpnName] || config.fallbackPrice;
      const jpyAmount = Math.round(convertToJPY(fb.amount, fb.currency, rates));

      Logger.log(`📋 フォールバック使用: ${fb.currency} ${fb.amount} → ¥${jpyAmount}`);
      
      results.push({
        vpn: vpnName,
        success: true,
        monthlyPrice: { amount: jpyAmount, currency: 'JPY', display: `¥${jpyAmount}` },
        originalPrice: { amount: fb.amount, currency: fb.currency },
        allPrices: [],
        method: fetchResult.method + ' (fallback: no prices)',
        isFallback: true
      });
      
      Utilities.sleep(500);
      continue;
    }
    
    // ===== 最安値を円換算 =====
    const cheapest = prices[0]; // ソート済み（安い順）
    const jpyAmount = convertToJPY(cheapest.amount, cheapest.currency, rates);
    
    Logger.log(`💰 最安値: ${cheapest.currency} ${cheapest.amount} → ¥${jpyAmount}`);
    
    // ===== v4: 異常検知 =====
    const anomaly = checkPriceAnomaly(vpnName, jpyAmount);
    if (!anomaly.ok) {
      Logger.log(`🚨 異常検知: ¥${jpyAmount}（前回¥${anomaly.prevPrice}, ${(anomaly.changeRate*100).toFixed(0)}%変動）`);
      const fb = fallbackPrices[vpnName] || config.fallbackPrice;
      const fbJpy = Math.round(convertToJPY(fb.amount, fb.currency, rates));
      notifyAnomaly(vpnName, jpyAmount, anomaly.prevPrice, anomaly.changeRate,
                    `フォールバック価格 ¥${fbJpy} に自動退避しました`);
      results.push({
        vpn: vpnName,
        success: true,
        monthlyPrice: { amount: fbJpy, currency: 'JPY', display: `¥${fbJpy}` },
        originalPrice: { amount: fb.amount, currency: fb.currency },
        allPrices: [],
        method: 'fallback (anomaly_detected)',
        isFallback: true
      });
      logFetchResult(vpnName, false, 'anomaly_detected', jpyAmount);
      continue;
    }

    results.push({
      vpn: vpnName,
      success: true,
      monthlyPrice: { amount: jpyAmount, currency: 'JPY', display: `¥${jpyAmount}` },
      originalPrice: { amount: cheapest.amount, currency: cheapest.currency },
      allPrices: prices,
      method: fetchResult.method
    });
    
    logFetchResult(vpnName, true, fetchResult.method, jpyAmount);
    
    Logger.log('');
    Utilities.sleep(1000);
  }
  
  // ==================== 結果サマリー ====================
  Logger.log('');
  Logger.log('==========================================');
  Logger.log('スクレイピング結果サマリー');
  Logger.log('==========================================');
  Logger.log('');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const fallbacks = results.filter(r => r.isFallback);
  const scraped = results.filter(r => r.success && !r.isFallback && !r.isManual);
  
  Logger.log(`✅ 成功: ${successful.length}社`);
  Logger.log(`   スクレイピング: ${scraped.length}社`);
  Logger.log(`   フォールバック: ${fallbacks.length}社`);
  Logger.log(`❌ 失敗: ${failed.length}社`);
  Logger.log(`📡 ScraperAPI使用: ${scraperApiCalls}回`);
  Logger.log('');
  
  // 価格一覧（安い順）
  Logger.log('価格一覧（円換算・安い順）:');
  successful
    .sort((a, b) => a.monthlyPrice.amount - b.monthlyPrice.amount)
    .forEach(r => {
      const tag = r.isFallback ? ' [FB]' : r.isManual ? ' [手動]' : '';
      const orig = r.originalPrice ? ` (${r.originalPrice.currency} ${r.originalPrice.amount})` : '';
      Logger.log(`  ${r.vpn.padEnd(30)} ¥${String(r.monthlyPrice.amount).padStart(6)}${orig}${tag}`);
    });
  
  Logger.log('');
  Logger.log('==========================================');
  
  return results;
}

// ==================== Phase 3: Spreadsheet保存機能 ====================

const PRICING_SHEET_NAME = 'VPN料金履歴';

function setupPricingSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(PRICING_SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(PRICING_SHEET_NAME);
  }
  
  const headers = [
    '取得日時', 'VPNサービス', '月額料金(円)', '元通貨', '元金額',
    '取得方法', 'フォールバック', '価格候補数', '備考'
  ];
  
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#4285f4')
      .setFontColor('#ffffff');
  }
  
  // 列幅調整
  [180, 200, 120, 80, 100, 180, 100, 100, 300].forEach((w, i) => {
    sheet.setColumnWidth(i + 1, w);
  });
  
  return sheet;
}

/** 料金履歴で、指定時間以内に「ローカルブラウザ」の行があるVPN名の集合 */
function recentLocalBrowserVpns_(hours) {
  const names = new Set();
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PRICING_SHEET_NAME);
    if (!sheet || sheet.getLastRow() < 2) return names;
    const n = Math.min(400, sheet.getLastRow() - 1);
    const rows = sheet.getRange(sheet.getLastRow() - n + 1, 1, n, 6).getValues();
    const limit = Date.now() - hours * 3600 * 1000;
    rows.forEach(r => {
      const ts = r[0] instanceof Date ? r[0] : new Date(r[0]);
      if (!r[1] || isNaN(ts)) return;
      if (String(r[5]).indexOf('ローカルブラウザ') === 0 && ts.getTime() >= limit) names.add(r[1]);
    });
  } catch (e) {
    Logger.log(`⚠️ ローカル取得行の確認に失敗（全社を取得する）: ${e}`);
  }
  return names;
}

function savePricingToSheet(results) {
  Logger.log('スプレッドシートに保存中...');
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(PRICING_SHEET_NAME);
  if (!sheet) sheet = setupPricingSheet();
  
  const timestamp = new Date();
  let savedCount = 0;
  
  results.forEach(result => {
    if (result.success) {
      const row = [
        timestamp,
        result.vpn,
        result.monthlyPrice.amount,           // 円換算済み
        result.originalPrice ? result.originalPrice.currency : 'JPY',
        result.originalPrice ? result.originalPrice.amount : result.monthlyPrice.amount,
        result.method || 'unknown',
        result.isFallback ? 'はい' : 'いいえ',
        result.allPrices ? result.allPrices.length : 0,
        result.isManual ? '手動設定' : ''
      ];
      
      sheet.appendRow(row);
      savedCount++;
      Logger.log(`✅ 保存: ${result.vpn} - ¥${result.monthlyPrice.amount}`);
    }
  });
  
  Logger.log(`✅ ${savedCount}件のデータを保存しました`);
  return savedCount;
}

// 全VPN価格取得 + Spreadsheet保存（メインエントリポイント）
function scrapePricingAndSave() {
  Logger.log('==========================================');
  Logger.log('VPN料金スクレイピング v3 + 保存');
  Logger.log('==========================================');
  
  const results = scrapePricingAll();
  const savedCount = savePricingToSheet(results);
  
  Logger.log('');
  Logger.log('==========================================');
  Logger.log(`完了！ 取得: ${results.filter(r => r.success).length}社, 保存: ${savedCount}件`);
  Logger.log('==========================================');
  
  return { results, savedCount };
}

// ==================== 自動実行トリガー設定 ====================
function setupPricingTriggers() {
  // 既存トリガー削除
  ScriptApp.getProjectTriggers().forEach(trigger => {
    const fn = trigger.getHandlerFunction();
    if (fn === 'scrapePricingAndSave' || fn === 'monthlyFallbackCheck') {
      ScriptApp.deleteTrigger(trigger);
      Logger.log(`🗑️ トリガー削除: ${fn}`);
    }
  });
  
  // 毎日午前9時に日次スクレイピング実行
  ScriptApp.newTrigger('scrapePricingAndSave')
    .timeBased()
    .atHour(9)
    .everyDays(1)
    .create();
  
  // 毎月1日の午前10時にフォールバック価格チェック
  ScriptApp.newTrigger('monthlyFallbackCheck')
    .timeBased()
    .onMonthDay(1)
    .atHour(10)
    .create();
  
  Logger.log('✅ トリガー設定完了');
  Logger.log('  日次: scrapePricingAndSave → 毎日 09:00');
  Logger.log('  月次: monthlyFallbackCheck → 毎月1日 10:00');
  Logger.log('');
  Logger.log('ScraperAPI使用量見込み:');
  Logger.log('  - 日次: render 4サイト × 5クレジット = 20/日 → 月600');
  Logger.log('  - 月次: フォールバック 2サイト × 5クレジット = 10/月');
  Logger.log('  - 合計: 約610クレジット/月（無料枠5,000の12%）');
}

// ==================== 月1回フォールバック価格チェック ====================
const FALLBACK_MGMT_SHEET = 'フォールバック管理';

function loadFallbackPrices() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(FALLBACK_MGMT_SHEET);
 
  if (!sheet) {
    sheet = ss.insertSheet(FALLBACK_MGMT_SHEET);
    sheet.getRange(1, 1, 1, 6).setValues([['VPN名', '金額', '通貨', '最終更新日', '更新方法', 'メモ']]);
    sheet.setFrozenRows(1);
  }
 
  const data = sheet.getDataRange().getValues();
  const fallbacks = {};
  const existingVpns = new Set();
 
  for (let i = 1; i < data.length; i++) {
    const [vpn, amount, currency] = data[i];
    if (vpn && amount && currency) {
      fallbacks[vpn] = { amount: Number(amount), currency: String(currency) };
      existingVpns.add(vpn);
    }
  }
 
  // シートに無いVPNはコード内初期値から自動シード
  const newRows = [];
  for (const [vpnName, config] of Object.entries(VPN_CONFIG)) {
    if (!existingVpns.has(vpnName) && config.fallbackPrice) {
      const fb = config.fallbackPrice;
      fallbacks[vpnName] = { amount: fb.amount, currency: fb.currency };
      newRows.push([vpnName, fb.amount, fb.currency, new Date(), 'seed', 'コード初期値から自動登録']);
    }
  }
  if (newRows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, 6).setValues(newRows);
    Logger.log(`📋 フォールバック管理シートに${newRows.length}件を初期登録`);
  }
 
  return fallbacks;
}

/**
 * 月1回実行: フォールバック固定サイトの最新価格を確認
 * 価格が取れたらフォールバック管理シートに記録 + ログ通知
 * 取れなければ既存価格を継続
 */
function monthlyFallbackCheck() {
  Logger.log('==========================================');
  Logger.log('📅 月次フォールバック価格チェック');
  Logger.log('==========================================');
  Logger.log('');
  
  const rates = getExchangeRates();
  const results = [];
  
  // fetchMethod === 'fallback' かつ monthlyCheckMethod があるVPNだけ対象
  for (const [vpnName, config] of Object.entries(VPN_CONFIG)) {
    if (config.fetchMethod !== 'fallback' || !config.monthlyCheckMethod) continue;
    
    Logger.log(`━━━ ${vpnName} ━━━`);
    Logger.log(`URL: ${config.url}`);
    Logger.log(`チェック方法: ${config.monthlyCheckMethod}`);
    
    // ScraperAPIで取得を試行（日本語ページを取るためcountry_code=jp付与）
    let fetchResult;
    if (config.monthlyCheckMethod === 'scraperapi_render') {
      fetchResult = fetchHTMLScraperAPI(config.url, true, 'jp');
    } else {
      fetchResult = fetchHTMLScraperAPI(config.url, false, 'jp');
    }
    
    if (!fetchResult.success) {
      Logger.log(`❌ 取得失敗: ${fetchResult.error}`);
      Logger.log(`→ 既存フォールバック価格を継続: ${config.fallbackPrice.currency} ${config.fallbackPrice.amount}`);
      results.push({
        vpn: vpnName,
        success: false,
        error: fetchResult.error,
        currentFallback: config.fallbackPrice
      });
      Utilities.sleep(2000);
      continue;
    }
    
    Logger.log(`✅ HTML取得成功 (${fetchResult.html.length}文字)`);
    
    // 価格抽出
    const prices = extractPrices(fetchResult.html, vpnName);
    
    if (prices.length === 0) {
      Logger.log(`⚠️ 価格未検出`);
      Logger.log(`→ 既存フォールバック価格を継続: ${config.fallbackPrice.currency} ${config.fallbackPrice.amount}`);
      results.push({
        vpn: vpnName,
        success: false,
        error: 'No prices found in HTML',
        currentFallback: config.fallbackPrice
      });
      Utilities.sleep(2000);
      continue;
    }
    
    // 最安値を取得
    const cheapest = prices[0];
    const jpyAmount = convertToJPY(cheapest.amount, cheapest.currency, rates);
    const currentJPY = convertToJPY(config.fallbackPrice.amount, config.fallbackPrice.currency, rates);
    
    Logger.log(`📊 取得価格: ${cheapest.currency} ${cheapest.amount} → ¥${jpyAmount}`);
    Logger.log(`📊 現在のFB: ${config.fallbackPrice.currency} ${config.fallbackPrice.amount} → ¥${currentJPY}`);
    
    // 価格変動チェック
    const diff = jpyAmount - currentJPY;
    const diffPercent = ((diff / currentJPY) * 100).toFixed(1);
    
    if (Math.abs(diff) > 10) {
      Logger.log(`🔔 価格変動検出！ ¥${currentJPY} → ¥${jpyAmount} (${diff > 0 ? '+' : ''}${diffPercent}%)`);
      Logger.log(`⚠️ VPN_CONFIG のフォールバック価格を更新してください:`);
      Logger.log(`   '${vpnName}': { amount: ${cheapest.amount}, currency: '${cheapest.currency}' }`);
    } else {
      Logger.log(`✅ 価格変動なし（差額: ¥${diff}）`);
    }
    
    results.push({
      vpn: vpnName,
      success: true,
      newPrice: { amount: cheapest.amount, currency: cheapest.currency, jpyAmount },
      currentFallback: config.fallbackPrice,
      currentJPY,
      diff,
      diffPercent
    });
    
    Utilities.sleep(2000);
  }
  
  // フォールバック管理シートに記録
  saveFallbackCheckResults(results);
  
  // サマリー
  Logger.log('');
  Logger.log('==========================================');
  Logger.log('月次チェック結果');
  Logger.log('==========================================');
  
  const succeeded = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const changed = succeeded.filter(r => Math.abs(r.diff) > 10);
  
  Logger.log(`チェック対象: ${results.length}社`);
  Logger.log(`取得成功: ${succeeded.length}社`);
  Logger.log(`取得失敗: ${failed.length}社`);
  Logger.log(`価格変動: ${changed.length}社`);
  
  if (changed.length > 0) {
    Logger.log('');
    Logger.log('🔔 価格変動があったVPN:');
    changed.forEach(r => {
      Logger.log(`  ${r.vpn}: ¥${r.currentJPY} → ¥${r.newPrice.jpyAmount} (${r.diff > 0 ? '+' : ''}${r.diffPercent}%)`);
    });
    Logger.log('');
    Logger.log('→ VPN_CONFIGのfallbackPriceを更新してください');
  } else if (succeeded.length > 0) {
    Logger.log('');
    Logger.log('✅ 全VPN価格変動なし。現在のフォールバック価格で問題ありません。');
  }
  
  Logger.log('==========================================');
  
  return results;
}

/**
 * フォールバック管理シートに月次チェック結果を記録
 */
function saveFallbackCheckResults(results) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(FALLBACK_MGMT_SHEET);
  
  if (!sheet) {
    sheet = ss.insertSheet(FALLBACK_MGMT_SHEET);
    const headers = [
      'チェック日時', 'VPN', '取得成功', 
      '取得価格(元通貨)', '取得価格(円)', 
      '現FB価格(円)', '差額(円)', '変動率(%)',
      '要更新', '備考'
    ];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#f39c12')
      .setFontColor('#ffffff');
    
    [160, 200, 80, 140, 100, 100, 80, 80, 80, 300].forEach((w, i) => {
      sheet.setColumnWidth(i + 1, w);
    });
  }
  
  const timestamp = new Date();
  
  results.forEach(r => {
    if (r.success) {
      sheet.appendRow([
        timestamp,
        r.vpn,
        '成功',
        `${r.newPrice.currency} ${r.newPrice.amount}`,
        r.newPrice.jpyAmount,
        r.currentJPY,
        r.diff,
        r.diffPercent,
        Math.abs(r.diff) > 10 ? '⚠️ 要更新' : 'OK',
        ''
      ]);
    } else {
      sheet.appendRow([
        timestamp,
        r.vpn,
        '失敗',
        '-',
        '-',
        convertToJPY(r.currentFallback.amount, r.currentFallback.currency, getExchangeRates()),
        '-',
        '-',
        'FB継続',
        r.error
      ]);
    }
  });
  
  Logger.log(`📋 フォールバック管理シートに${results.length}件記録`);
}

// ==================== Web APIエンドポイント ====================

function doGet(e) {
  try {
    // エンジン1: 速度データ
    if (e.parameter.type) {
      const type = e.parameter.type;
      switch(type) {
        case 'ranking':
          return ContentService.createTextOutput(JSON.stringify(getRankingData()))
            .setMimeType(ContentService.MimeType.JSON);
        case 'stability':
          return ContentService.createTextOutput(JSON.stringify({
            region: CONFIG.REGION,
            regionName: CONFIG.REGION_NAME,
            period: `過去${CONFIG.STABILITY_DAYS}日間`,
            lastUpdate: new Date().toISOString(),
            data: calculateStabilityScores()
          })).setMimeType(ContentService.MimeType.JSON);
        default:
          return ContentService.createTextOutput(JSON.stringify({
            error: 'Invalid type', availableTypes: ['ranking', 'stability']
          })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    // エンジン2a: 料金データ
    if (e.parameter.action === 'getPricing') {
      return ContentService.createTextOutput(JSON.stringify(getLatestPricingAPI()))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // プラン別料金（v4追加）
    if (e.parameter.action === 'getPlanPricing') {
      return ContentService.createTextOutput(JSON.stringify(getPlanPricingJSON()))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Missing parameter',
      availableEndpoints: {
        speed: { ranking: '?type=ranking', stability: '?type=stability' },
        pricing: { latest: '?action=getPricing', plans: '?action=getPlanPricing' }
      }
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false, error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ==================== 最新料金API ====================
function getLatestPricingAPI() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(PRICING_SHEET_NAME);
  
  if (!sheet || sheet.getLastRow() <= 1) {
    return { success: false, error: 'No data' };
  }
  
  const lastRow = sheet.getLastRow();
  const allData = sheet.getRange(2, 1, lastRow - 1, 9).getValues();
  
  // VPN名 → 最新データ
  const latestByVPN = {};
  
  allData.forEach(row => {
    const timestamp = new Date(row[0]);
    const vpnName = String(row[1] || '').trim();

    // VPN名が空の行はシートの書き込み事故。APIに漏らさない。
    if (!vpnName || isNaN(timestamp.getTime())) return;
    const priceJPY = row[2];
    const origCurrency = row[3];
    const origAmount = row[4];
    const method = row[5];
    const isFallback = row[6] === 'はい';
    
    if (!latestByVPN[vpnName] || timestamp > latestByVPN[vpnName].timestamp) {
      latestByVPN[vpnName] = {
        vpnName, timestamp, priceJPY, origCurrency, origAmount, method, isFallback
      };
    }
  });
  
  const result = Object.values(latestByVPN).map(vpn => ({
    name: vpn.vpnName,
    price: vpn.priceJPY,           // 円換算済み
    currency: 'JPY',                // 常にJPY
    originalCurrency: vpn.origCurrency,
    originalPrice: vpn.origAmount,
    lastUpdate: vpn.timestamp,
    isFallback: vpn.isFallback,
    method: vpn.method
  }));
  
  return {
    success: true,
    lastUpdate: new Date().toISOString(),
    count: result.length,
    data: result
  };
}

// ==================== テスト関数群 ====================

function testGetLatestPricingAPI() {
  Logger.log(JSON.stringify(getLatestPricingAPI(), null, 2));
}

// 月次チェックを手動実行（テスト用）
function testMonthlyFallbackCheck() {
  Logger.log('=== 月次フォールバックチェック 手動テスト ===');
  Logger.log('※ 本番は毎月1日に自動実行されます');
  Logger.log('');
  return monthlyFallbackCheck();
}

function testPricingVPN(vpnName) {
  const config = VPN_CONFIG[vpnName];
  if (!config) {
    Logger.log(`❌ VPN not found: ${vpnName}`);
    return;
  }
  
  Logger.log(`テスト: ${vpnName}`);
  Logger.log(`URL: ${config.url}`);
  Logger.log(`取得方法: ${config.fetchMethod}`);
  Logger.log(`期待通貨: ${config.expectedCurrency}`);
  Logger.log('');
  
  // フォールバック固定の場合
  if (config.fetchMethod === 'fallback') {
    const rates = getExchangeRates();
    const fb = config.fallbackPrice;
    const jpyAmount = convertToJPY(fb.amount, fb.currency, rates);
    Logger.log(`📋 フォールバック固定: ${fb.currency} ${fb.amount} → ¥${jpyAmount}`);
    return;
  }
  
  const fetchResult = fetchHTML(vpnName);
  if (!fetchResult.success) {
    Logger.log(`❌ 取得失敗: ${fetchResult.error}`);
    return;
  }
  
  Logger.log(`✅ HTML取得成功 (${fetchResult.method}), ${fetchResult.html.length}文字`);
  Logger.log('');
  
  // デバッグ: 価格っぽい箇所
  Logger.log('━━━ HTML抜粋（価格箇所）━━━');
  extractPriceSnippets(fetchResult.html).slice(0, 10).forEach((s, i) => {
    Logger.log(`${i + 1}. ${s}`);
  });
  Logger.log('━━━━━━━━━━━━━━━━━━━━━━');
  Logger.log('');
  
  const prices = extractPrices(fetchResult.html, vpnName);
  
  if (prices.length === 0) {
    Logger.log(`⚠️ 価格が見つかりませんでした`);
    return;
  }
  
  const rates = getExchangeRates();
  const cheapest = prices[0];
  const jpyAmount = convertToJPY(cheapest.amount, cheapest.currency, rates);
  Logger.log(`💰 最安値: ${cheapest.currency} ${cheapest.amount} → ¥${jpyAmount}`);
}

function extractPriceSnippets(html) {
  const snippets = [];
  const patterns = [
    /(.{0,80}[$¥￥€£]\s*[0-9,.]+.{0,80})/g,
    /(.{0,80}[0-9,.]+\s*(円|ドル|ユーロ|USD|EUR|GBP|\/mo).{0,80})/gi
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const snippet = match[1].replace(/\s+/g, ' ').trim();
      if (snippet.length > 10 && snippet.length < 250) {
        snippets.push(snippet);
      }
    }
  }
  
  return [...new Set(snippets)];
}

function quickPricingTest() {
  Logger.log('=== クイックテスト ===');
  ['ExpressVPN', 'Surfshark', 'MillenVPN', 'CyberGhost', 'IPVanish'].forEach(vpn => {
    testPricingVPN(vpn);
    Logger.log('');
  });
}

function testAllVPNsPricing() {
  return scrapePricingAll();
}

// ==================== 異常検知 + 通知 ====================
 
const ANOMALY_THRESHOLD = 0.30;  // 前回値から±30%超で異常
const NOTIFY_EMAIL = Session.getActiveUser().getEmail();  // 通知先（自分宛）
 
/**
 * 前回保存された価格と比較して異常を判定する。
 * @return {ok: boolean, prevPrice: number|null, changeRate: number|null}
 */
function checkPriceAnomaly(vpnName, newJpyAmount) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(PRICING_SHEET_NAME);
  if (!sheet) return { ok: true, prevPrice: null, changeRate: null };
 
  // 料金シートから該当VPNの前回値を探す（B列: VPN名 / C列: 月額円 を想定。
  // 実際の列構成が異なる場合はここのインデックスを合わせる）
  const data = sheet.getDataRange().getValues();
  let prevPrice = null;
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][1] === vpnName && data[i][2]) {
      prevPrice = Number(data[i][2]);
      break;
    }
  }
 
  if (prevPrice === null || prevPrice === 0) {
    return { ok: true, prevPrice: null, changeRate: null };  // 初回は判定不能→通す
  }
 
  const changeRate = Math.abs(newJpyAmount - prevPrice) / prevPrice;
  return { ok: changeRate <= ANOMALY_THRESHOLD, prevPrice, changeRate };
}
 
/**
 * 異常検知時のメール通知
 */
function notifyAnomaly(vpnName, newPrice, prevPrice, changeRate, action) {
  const subject = `【VPN価格監視】${vpnName} の取得価格が異常 (${(changeRate * 100).toFixed(0)}%変動)`;
  const body = [
    `VPN: ${vpnName}`,
    `取得価格: ¥${newPrice}`,
    `前回価格: ¥${prevPrice}`,
    `変動率: ${(changeRate * 100).toFixed(1)}%（しきい値 ${ANOMALY_THRESHOLD * 100}%）`,
    ``,
    `対応: ${action}`,
    ``,
    `本当に価格改定なら「フォールバック管理」シートの${vpnName}の金額を更新し、`,
    `料金シートの当該行を確認してください。`,
    `サイト構造変更による誤検出なら、抽出ロジックの確認が必要です。`
  ].join('\n');
 
  try {
    MailApp.sendEmail(NOTIFY_EMAIL, subject, body);
    Logger.log(`📧 異常通知メール送信: ${vpnName}`);
  } catch (e) {
    Logger.log(`⚠️ メール送信失敗: ${e}`);
  }
}

// ==================== 取得ログ ====================
 
const FETCH_LOG_SHEET = '取得ログ';
 
/**
 * 取得結果を1行記録。成功率の可視化・壊れやすいサイトの特定に使う。
 */
function logFetchResult(vpnName, success, method, jpyAmount) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(FETCH_LOG_SHEET);
    if (!sheet) {
      sheet = ss.insertSheet(FETCH_LOG_SHEET);
      sheet.getRange(1, 1, 1, 5).setValues([['日時', 'VPN名', '成功', '手法', '月額円']]);
      sheet.setFrozenRows(1);
    }
    sheet.appendRow([new Date(), vpnName, success ? '○' : '×', method, jpyAmount || '']);
 
    // ログが5000行を超えたら古い方から1000行削除（肥大化防止）
    if (sheet.getLastRow() > 5000) {
      sheet.deleteRows(2, 1000);
    }
  } catch (e) {
    Logger.log(`⚠️ ログ記録失敗: ${e}`);
  }
}


function weeklyFetchSummary() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(FETCH_LOG_SHEET);
  if (!sheet) return;
 
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const data = sheet.getDataRange().getValues();
  const stats = {};
 
  for (let i = 1; i < data.length; i++) {
    const [date, vpn, success] = data[i];
    if (new Date(date) < oneWeekAgo) continue;
    if (!stats[vpn]) stats[vpn] = { total: 0, ok: 0 };
    stats[vpn].total++;
    if (success === '○') stats[vpn].ok++;
  }
 
  const lines = ['直近7日間のVPN価格取得成功率:', ''];
  for (const [vpn, s] of Object.entries(stats)) {
    const rate = ((s.ok / s.total) * 100).toFixed(0);
    const mark = rate < 50 ? ' 🚨要確認' : rate < 80 ? ' ⚠️' : '';
    lines.push(`${vpn}: ${rate}% (${s.ok}/${s.total})${mark}`);
  }
 
  MailApp.sendEmail(NOTIFY_EMAIL, '【VPN価格監視】週次取得サマリー', lines.join('\n'));
}
// ==================== 料金取得の診断 ====================
/**
 * 手動実行: なぜフォールバックに落ちているのかを1回で切り分ける。
 *
 * ScraperAPI のキー有無・残クレジット・各社の取得結果・抽出結果を
 * まとめて出力する。GAS の外からは Script Properties が読めず、
 * nordvpn.com は日本の家庭回線からも 403 で弾かれるため、
 * 原因の特定はこの関数を実行するのが唯一の方法。
 */
function diagnosePricingFetch() {
  Logger.log('==========================================');
  Logger.log('料金取得の診断');
  Logger.log('==========================================');

  // --- ScraperAPI の状態 ---
  const key = PropertiesService.getScriptProperties().getProperty('SCRAPERAPI_KEY');
  Logger.log('');
  Logger.log('【ScraperAPI】');
  if (!key) {
    Logger.log('  ❌ SCRAPERAPI_KEY が未設定です');
    Logger.log('     → 設定しない限り NordVPN 等は永久にフォールバック固定になります');
  } else {
    Logger.log(`  ✅ キーは設定済み（末尾4桁: ...${key.slice(-4)}）`);
    try {
      const res = UrlFetchApp.fetch(`https://api.scraperapi.com/account?api_key=${key}`,
                                    { muteHttpExceptions: true });
      if (res.getResponseCode() === 200) {
        const a = JSON.parse(res.getContentText());
        const used = Number(a.requestCount), limit = Number(a.requestLimit);
        Logger.log(`  使用状況: ${used} / ${limit} クレジット（残 ${limit - used}）`);
        if (limit - used < 200) Logger.log('  ⚠️ 残りわずかです。これが失敗の原因の可能性大');
        if (a.subscriptionDate) Logger.log(`  更新日: ${a.subscriptionDate}`);
      } else {
        Logger.log(`  ❌ アカウント照会に失敗: HTTP ${res.getResponseCode()}`);
        Logger.log(`     ${res.getContentText().slice(0, 200)}`);
      }
    } catch (e) {
      Logger.log(`  ❌ アカウント照会でエラー: ${e}`);
    }
  }

  // --- 各社の取得と抽出 ---
  Logger.log('');
  Logger.log('【各社の取得結果】');
  const rates = getExchangeRates();

  Object.keys(VPN_CONFIG).forEach(vpnName => {
    const config = VPN_CONFIG[vpnName];

    if (config.fetchMethod === 'fallback') {
      Logger.log(`  ⏭️  ${vpnName}: 設定で固定値（fetchMethod: 'fallback'）`);
      return;
    }

    let fetched;
    try {
      fetched = fetchHTML(vpnName);
    } catch (e) {
      Logger.log(`  ❌ ${vpnName}: 取得で例外 ${e}`);
      return;
    }

    if (!fetched.success) {
      Logger.log(`  ❌ ${vpnName}: 取得失敗 [${fetched.method}] ${fetched.error}`);
      return;
    }

    let prices = [];
    try {
      prices = extractPrices(fetched.html, vpnName) || [];
    } catch (e) {
      Logger.log(`  ❌ ${vpnName}: 抽出で例外 ${e}`);
      return;
    }

    if (!prices.length) {
      Logger.log(`  ⚠️ ${vpnName}: 取得OK [${fetched.method}, ${fetched.html.length}文字] だが価格を抽出できず`);
      Logger.log(`     → ページ構造が変わった可能性。extractPrices のパターン要見直し`);
      return;
    }

    const cheapest = prices.reduce((a, b) => (a.amount <= b.amount ? a : b));
    const jpy = convertToJPY(cheapest.amount, cheapest.currency, rates);
    Logger.log(`  ✅ ${vpnName}: ${cheapest.currency} ${cheapest.amount} → ¥${jpy}  [${fetched.method}] 候補${prices.length}件`);
  });

  Logger.log('');
  Logger.log('==========================================');
  Logger.log('❌ = 取得できず / ⚠️ = 取得できたが抽出失敗');
  Logger.log('==========================================');
}

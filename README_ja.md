# VPN安定性ランキングシステム

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-4285F4?logo=google&logoColor=white)](https://script.google.com)
[![Twitter Bot](https://img.shields.io/badge/Twitter-1DA1F2?logo=twitter&logoColor=white)](https://twitter.com/remoteaccessvpn)

**リアルタイム更新・多地域対応のVPN安定性ランキング自動化システム**

[🇬🇧 English README](./README.md) | [🌐 ライブデモ](https://www.blstweb.jp/network/vpn/vpn-stability-ranking/)

---

## 🎯 これは何？

4地域でVPN安定性を自動測定・ランキング化するシステムです：
- 🇯🇵 日本（東京）
- 🇺🇸 米国（バージニア）
- 🇬🇧 英国（ロンドン）
- 🇸🇬 シンガポール

**主な機能:**
- ✅ 6時間ごと自動測定
- ✅ 過去30日データから安定性スコア計算
- ✅ 多地域比較
- ✅ リアルタイムAPI
- ✅ インタラクティブチャート（レーダー・推移）
- ✅ Twitter自動投稿（1日3回）
- ✅ **完全無料**運用（Google Apps Script）

---

## 📊 ライブデモ

**メインダッシュボード:**
https://www.blstweb.jp/network/vpn/vpn-stability-ranking/

**ウィジェット:**
https://www.blstweb.jp/network/vpn/vpn-stability-ranking/widget/

**Twitter Bot:**
https://twitter.com/remoteaccessvpn

---

## 📂 プロジェクト構成

```
vpn-stability-ranking/
├── gas/
│   ├── vpn-speed-tracker-v3.1.gs      # メイン測定スクリプト
│   └── twitter-oauth1-fixed.gs        # Twitter Bot
├── frontend/
│   ├── vpn-stability-ranking.html     # メインダッシュボード
│   └── vpn-stability-widget.html      # 埋め込み用ウィジェット
├── docs/
│   ├── API.md                         # APIドキュメント
│   ├── DEPLOYMENT.md                  # デプロイガイド
│   └── STABILITY_CALCULATION.md       # 安定性スコア計算式
├── README.md
└── README_ja.md
```

---

## 🚀 クイックスタート

### 前提条件
- Googleアカウント
- Twitter Developer Account（Bot機能を使う場合）

### 1. Google Sheetsをセットアップ

以下の構造で新しいGoogle Sheetsを作成：

**シート名: `地域別データ`**
| タイムスタンプ | 地域 | VPNサービス | ダウンロード(Mbps) | アップロード(Mbps) | Ping(ms) | 安定性スコア | 信頼性(%) | 総合スコア | ランク |
|---|---|---|---|---|---|---|---|---|---|

### 2. Google Apps Scriptをデプロイ

1. Google Sheets → **拡張機能 → Apps Script**
2. `gas/vpn-speed-tracker-v3.1.gs` の内容をコピー
3. Code.gsに貼り付け
4. `initialSetup()` を実行して初期化
5. **デプロイ → 新しいデプロイ**
   - 種類: ウェブアプリ
   - 次のユーザーとして実行: 自分
   - アクセスできるユーザー: 全員
6. Web App URLをコピー

### 3. フロントエンドをセットアップ

1. HTMLファイル内の `API_URL` を更新:
```javascript
const API_URL = 'YOUR_WEB_APP_URL';
```

2. HTMLファイルをWebサーバーにアップロード

### 4. Twitter Botをセットアップ（オプション）

1. Twitter API認証情報を取得:
   - API Key & Secret
   - Access Token & Secret

2. `gas/twitter-oauth1-fixed.gs` をApps Scriptにコピー

3. スクリプトプロパティを設定:
```javascript
Properties.setScriptProperties({
  'TWITTER_API_KEY': 'your_api_key',
  'TWITTER_API_SECRET': 'your_api_secret',
  'TWITTER_ACCESS_TOKEN': 'your_access_token',
  'TWITTER_ACCESS_TOKEN_SECRET': 'your_access_token_secret'
});
```

4. `setupTwitterTriggers()` を実行してスケジュール設定

---

## 📊 安定性スコア計算

過去30日間の履歴データから安定性を評価：

```
安定性スコア = 
  (速度安定性 × 40%) + 
  (Ping安定性 × 30%) + 
  (信頼性 × 30%)
```

**詳細:**
- **速度安定性**: `100 - (標準偏差 / 平均速度 × 100)`
- **Ping安定性**: `100 - (標準偏差 / 平均Ping × 50)`
- **信頼性**: 接続成功率(%)

詳細は [STABILITY_CALCULATION.md](./docs/STABILITY_CALCULATION.md) を参照。

---

## 🌍 APIエンドポイント

### 安定性ランキング取得
```
GET /exec?type=stability&region=JP
```

### レーダーチャートデータ取得
```
GET /exec?type=radar&region=US
```

### 速度推移データ取得
```
GET /exec?type=trend&vpn=NordVPN&region=UK
```

詳細は [API.md](./docs/API.md) を参照。

---

## 💰 運用コスト

**月額 ¥0** - すべて無料枠で運用：

| サービス | コスト |
|---------|------|
| Google Apps Script | 無料 |
| Google Sheets | 無料 |
| Chart.js | 無料（オープンソース） |
| Twitter API | 無料（Free Tier） |
| **合計** | **¥0/月** |

---

## 🤝 コントリビューション

プルリクエスト歓迎です！

1. リポジトリをFork
2. Feature branchを作成 (`git checkout -b feature/AmazingFeature`)
3. 変更をCommit (`git commit -m 'Add some AmazingFeature'`)
4. Branchにpush (`git push origin feature/AmazingFeature`)
5. Pull Requestを開く

---

## 📄 ライセンス

このプロジェクトはMITライセンスです - [LICENSE](LICENSE)ファイルを参照。

---

## 📮 お問い合わせ

- Website: [blstweb.jp](https://www.blstweb.jp)
- Twitter: [@remoteaccessvpn](https://twitter.com/remoteaccessvpn)
- Issues: [GitHub Issues](https://github.com/hmy0210/vpn-stability-ranking/issues)

---

**Made with ❤️ by [hmy0210](https://github.com/hmy0210)**

# VPN Stability Ranking System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-4285F4?logo=google&logoColor=white)](https://script.google.com)
[![Twitter Bot](https://img.shields.io/badge/Twitter-1DA1F2?logo=twitter&logoColor=white)](https://twitter.com/remoteaccessvpn)

**Automated VPN stability ranking system with real-time data updates and multi-region support.**

[🇯🇵 日本語版README](./README_ja.md) | [🌐 Live Demo](https://www.blstweb.jp/network/vpn/vpn-stability-ranking/)

---

## 🎯 What's This?

A fully automated system that measures and ranks VPN stability across 4 regions:
- 🇯🇵 Japan (Tokyo)
- 🇺🇸 United States (Virginia)
- 🇬🇧 United Kingdom (London)
- 🇸🇬 Singapore

**Key Features:**
- ✅ Automated measurements every 6 hours
- ✅ Stability scoring based on 30-day historical data
- ✅ Multi-region comparison
- ✅ Real-time API
- ✅ Interactive charts (Radar, Trend)
- ✅ Twitter bot (3x daily updates)
- ✅ **100% free** to run (Google Apps Script)

---

## 📊 Live Demo

**Main Dashboard:**
https://www.blstweb.jp/network/vpn/vpn-stability-ranking/

**Widget:**
https://www.blstweb.jp/network/vpn/vpn-stability-ranking/widget/

**Twitter Bot:**
https://twitter.com/remoteaccessvpn

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│  Google Apps Script (Measurement)       │
│  - Automated data collection (6h)       │
│  - Stability score calculation          │
│  - Multi-region support                 │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Google Sheets (Database)               │
│  - Historical data storage               │
│  - 30-day rolling window                │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Web Apps API                           │
│  - /exec?type=stability&region=JP       │
│  - /exec?type=radar&region=US           │
│  - /exec?type=trend&vpn=NordVPN&region=UK│
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Frontend (HTML + Chart.js)             │
│  - Stability ranking table              │
│  - Radar chart (5-axis evaluation)      │
│  - Speed trend chart (30 days)          │
└─────────────────────────────────────────┘

         ┌──────────────────┐
         │  Twitter API     │
         │  - OAuth 1.0a    │
         │  - 3x daily posts│
         └──────────────────┘
```

---

## 📂 Project Structure

```
vpn-stability-ranking/
├── gas/
│   ├── vpn-speed-tracker-v3.1.gs      # Main measurement script
│   └── twitter-oauth1-fixed.gs        # Twitter bot
├── frontend/
│   ├── vpn-stability-ranking.html     # Main dashboard
│   └── vpn-stability-widget.html      # Embeddable widget
├── docs/
│   ├── API.md                         # API documentation
│   ├── DEPLOYMENT.md                  # Deployment guide
│   └── STABILITY_CALCULATION.md       # Stability score algorithm
├── README.md
└── README_ja.md
```

---

## 🚀 Quick Start

### Prerequisites
- Google Account
- Twitter Developer Account (for bot feature)

### 1. Setup Google Sheets

Create a new Google Sheet with the following structure:

**Sheet: `地域別データ`**
| タイムスタンプ | 地域 | VPNサービス | ダウンロード(Mbps) | アップロード(Mbps) | Ping(ms) | 安定性スコア | 信頼性(%) | 総合スコア | ランク |
|---|---|---|---|---|---|---|---|---|---|

### 2. Deploy Google Apps Script

1. Open Google Sheets → **Extensions → Apps Script**
2. Copy contents from `gas/vpn-speed-tracker-v3.1.gs`
3. Paste into Code.gs
4. Run `initialSetup()` to initialize
5. **Deploy → New deployment**
   - Type: Web app
   - Execute as: Me
   - Who has access: Anyone
6. Copy the Web App URL

### 3. Setup Frontend

1. Update `API_URL` in HTML files:
```javascript
const API_URL = 'YOUR_WEB_APP_URL';
```

2. Upload HTML files to your web server

### 4. Setup Twitter Bot (Optional)

1. Get Twitter API credentials:
   - API Key & Secret
   - Access Token & Secret

2. Copy `gas/twitter-oauth1-fixed.gs` to Apps Script

3. Set Script Properties:
```javascript
Properties.setScriptProperties({
  'TWITTER_API_KEY': 'your_api_key',
  'TWITTER_API_SECRET': 'your_api_secret',
  'TWITTER_ACCESS_TOKEN': 'your_access_token',
  'TWITTER_ACCESS_TOKEN_SECRET': 'your_access_token_secret'
});
```

4. Run `setupTwitterTriggers()` to schedule tweets

---

## 📊 Stability Score Calculation

The stability score is calculated from 30 days of historical data:

```
Stability Score = 
  (Speed Stability × 40%) + 
  (Ping Stability × 30%) + 
  (Reliability × 30%)
```

**Where:**
- **Speed Stability**: `100 - (stdDev / avgSpeed × 100)`
- **Ping Stability**: `100 - (stdDev / avgPing × 50)`
- **Reliability**: Connection success rate (%)

See [STABILITY_CALCULATION.md](./docs/STABILITY_CALCULATION.md) for details.

---

## 🌍 API Endpoints

### Get Stability Ranking
```
GET /exec?type=stability&region=JP
```

**Response:**
```json
{
  "region": "JP",
  "regionName": "日本（東京）",
  "lastUpdate": "2025-12-07T10:00:00Z",
  "data": [
    {
      "name": "NordVPN",
      "stabilityScore": 98.5,
      "avgSpeed": 480,
      "speedStdDev": 12,
      "avgPing": 12.5,
      "pingStdDev": 1.2,
      "reliability": 98.0,
      "dataPoints": 120
    }
  ]
}
```

### Get Radar Chart Data
```
GET /exec?type=radar&region=US
```

**Response:**
```json
{
  "region": "US",
  "data": [
    {
      "name": "NordVPN",
      "scores": {
        "speed": 95,
        "stability": 98,
        "regional": 92,
        "ping": 94,
        "reliability": 99
      }
    }
  ]
}
```

### Get Speed Trend
```
GET /exec?type=trend&vpn=NordVPN&region=UK
```

**Response:**
```json
{
  "vpn": "NordVPN",
  "region": "UK",
  "data": [
    {
      "date": "2025-12-01 10:00",
      "speed": 485
    },
    {
      "date": "2025-12-01 16:00",
      "speed": 478
    }
  ]
}
```

See [API.md](./docs/API.md) for full documentation.

---

## 🎨 Widget Embedding

Embed the stability ranking on your website:

```html
<iframe 
  src="https://www.blstweb.jp/network/vpn-stability-ranking/widget/" 
  width="100%" 
  height="550"
  frameborder="0"
  scrolling="no">
</iframe>
```

---

## 🤖 Twitter Bot

The bot posts stability rankings 3 times daily (10:00, 15:00, 20:00 JST):

```
📊 VPN安定性ランキング（日本）

🥇 NordVPN: 98.5
   速度: 480 Mbps ±12

🥈 ExpressVPN: 97.2
   速度: 450 Mbps ±18

🥉 Surfshark: 94.8
   速度: 390 Mbps ±25

詳細▶️ https://www.blstweb.jp/network/vpn/vpn-stability-ranking/
```

---

## 💰 Cost

**$0/month** - Everything runs on free tiers:

| Service | Cost |
|---------|------|
| Google Apps Script | Free |
| Google Sheets | Free |
| Chart.js | Free (Open Source) |
| Twitter API | Free (Free Tier) |
| **Total** | **$0/month** |

---

## 🛠️ Tech Stack

- **Backend**: Google Apps Script
- **Database**: Google Sheets
- **API**: Apps Script Web Apps
- **Frontend**: HTML + Vanilla JavaScript
- **Charts**: Chart.js 4.4.0
- **Twitter**: Twitter API v2 (OAuth 1.0a)
- **Hosting**: WordPress (self-hosted)

---

## 📈 Roadmap

### Short-term (1 month)
- [x] Multi-region support (4 regions)
- [x] Stability analysis
- [x] Radar charts
- [ ] Complete GitHub documentation
- [ ] Publish to Product Hunt

### Mid-term (3 months)
- [ ] VPN outage detection bot
- [ ] Price tracking system
- [ ] Kaggle dataset publication

### Long-term (6 months)
- [ ] Open-source VPN evaluation framework
- [ ] Community-driven evaluation platform
- [ ] Browser extension

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Chart.js](https://www.chartjs.org/) - Beautiful charts
- [Google Apps Script](https://developers.google.com/apps-script) - Serverless automation
- [Twitter API](https://developer.twitter.com/) - Social media integration

---

## 📮 Contact

- Website: [blstweb.jp](https://www.blstweb.jp)
- Twitter: [@remoteaccessvpn](https://twitter.com/remoteaccessvpn)
- Issues: [GitHub Issues](https://github.com/hmy0210/vpn-stability-ranking/issues)

---

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=hmy0210/vpn-stability-ranking&type=Date)](https://star-history.com/#hmy0210/vpn-stability-ranking&Date)

---

**Made with ❤️ by [hmy0210](https://github.com/hmy0210)**

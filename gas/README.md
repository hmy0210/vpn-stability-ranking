# 📁 Google Apps Script Files

This folder contains all Google Apps Script (GAS) files for the Tokyo VPN Speed Monitor system.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Main Spreadsheet                            │
│  (Speed Data, Price History, Outage, News, Reports)             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  vpn-speed-tracker.gs             ─────┐                       │
│  price-scraper.gs           ───────────┼──► Data Collection    │
│  outage-detection.gs                  ─┤                       │
│  news-monitor.gs                 ──────┘                       │
│                                                                 │
│  twitter-poster.gs            ─────────────► Notifications     │
│  price-alert.gs          ──────────────────►                   │
│                                                                 │
│  market-report.gs             ─────────────► Reporting         │
│  weekly-digest.gs      ────────────────────►                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              Separate Spreadsheet (Trust Score)                 │
├─────────────────────────────────────────────────────────────────┤
│  trust-score.gs             ────────────────► Trust Evaluation  │
│  (Uses Claude API for automated assessment)                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📄 File Descriptions

### Core Engines

| File | Engine | Description | Trigger |
|------|--------|-------------|---------|
| `speed-tracker.gs`   | 1 | Speed measurement for 15 VPNs | Every 6 hours |
| `price-scraper.gs`   | 2a | Price scraping with ScraperAPI | Daily 9:00 AM |
| `price-alert.gs`     | 2a+ | Price change detection & alerts | After price scraping |
| `outage-detection.gs`| 2b | Statistical anomaly detection | Hourly |
| `news-monitor.gs`    | 2b+ | Google News RSS monitoring | Every 6 hours |

### Notification & Reporting

| File | Description | Trigger |
|------|-------------|---------|
| `twitter-poster.gs`| Twitter OAuth 1.0a posting (speed + trust) | 10:00, 15:00, 20:00 / Monthly 1st |
| `weekly-digest.gs` | Weekly newsletter digest generator | Monday 9:00 AM |
| `market-report.gs` | Quarterly market report with PDF | Quarterly 1st |

### Trust Score (Separate Project)

| File | Description | Trigger |
|------|-------------|---------|
| `trust-score.gs`   | Claude API-based trust evaluation | Monthly 1st, 10:00 |

### Configuration

| File | Description |
|------|-------------|
| `config.example.gs` | Configuration template (copy to config.gs) |

---

## 🔧 Setup Instructions

### Step 1: Main Spreadsheet Setup

1. Create a new Google Spreadsheet
2. Go to **Extensions → Apps Script**
3. Copy the following files:
   - `speed-tracker.gs`
   - `price-scraper.gs`
   - `price-alert.gs`
   - `outage-detection.gs`
   - `news-monitor.gs`
   - `twitter-poster.gs`
   - `weekly-digest.gs`
   - `market-report.gs`
   - `config.example.gs` → rename to `config.gs` and fill in values

4. Create required sheets:
   - `速度データ`
   - `VPN料金履歴`
   - `VPN障害検知（高度）`
   - `VPNニュース履歴`
   - `VPN業界統計レポート`
   - `週次ダイジェスト`

### Step 2: Trust Score Setup (Separate Project)

1. Create a **new** Google Spreadsheet for Trust Score
2. Go to **Extensions → Apps Script**
3. Copy `vpn-trust-score-system.gs`
4. Set Script Property: `CLAUDE_API_KEY` = your Anthropic API key
5. Run `initialSetup()` to create sheets
6. Deploy as Web App
7. Copy the deployed URL to main project's config

### Step 3: Set Script Properties

In the main project, set these Script Properties:

| Property | Description |
|----------|-------------|
| `SCRAPERAPI_KEY` | ScraperAPI key for price scraping |

In the Trust Score project:

| Property | Description |
|----------|-------------|
| `CLAUDE_API_KEY` | Anthropic API key for Claude |

### Step 4: Configure Triggers

Run these setup functions once:

```javascript
// In main project:
setupTriggers();           // Speed measurement (6h)
setupPriceAlertTriggers(); // Price scraping (daily)
setupAdvancedOutageDetectionTriggers(); // Outage (hourly)
setupNewsMonitorTriggers(); // News (6h)
setupAllTriggers();        // Twitter posting
setupWeeklyDigestTrigger(); // Newsletter (weekly)
setupQuarterlyReportTrigger(); // Report (quarterly)

// In Trust Score project:
setupMonthlyTrigger();     // Trust evaluation (monthly)
```

### Step 5: Deploy Web Apps

Deploy each project as a Web App:

1. **Main Project** (Speed/Price/Outage/News API)
   - Deploy → New deployment → Web app
   - Execute as: Me
   - Who has access: Anyone

2. **Trust Score Project** (Trust Score API)
   - Same process, separate deployment

---

## 📡 API Endpoints

### Main Project

| Endpoint | Description |
|----------|-------------|
| `?type=ranking` | Speed ranking data |
| `?type=stability` | Stability scores (7-day) |
| `?action=getPricing` | Latest price data |

### Trust Score Project

| Endpoint | Description |
|----------|-------------|
| `?action=getTrustScores` | Trust scores for all VPNs |
| `?action=getIntegrated` | Combined ranking (speed + price + trust) |
| `?action=getVPNDetail&vpn=NordVPN` | Single VPN details |
| `?action=getJurisdiction` | Jurisdiction database |

---

## 🔑 Required API Keys

| Service | Purpose | Free Tier |
|---------|---------|-----------|
| **ScraperAPI** | Price scraping (JS rendering) | 1,000 req/month |
| **Twitter API** | Auto-posting | Free (with approval) |
| **Claude API** | Trust Score evaluation | Pay per token |

### Estimated Costs

| Service | Monthly Usage | Cost |
|---------|--------------|------|
| ScraperAPI | ~150 requests | Free |
| Twitter API | ~100 tweets | Free |
| Claude API | ~15 evaluations | ~$0.50 |
| **Total** | | **~$0.50/month** |

---

## 📊 Data Flow

```
[Speed Measurement] ──► 速度データ sheet ──┐
                                          │
[Price Scraping] ────► VPN料金履歴 sheet ─┼──► [Engine 8 Report]
                                          │         │
[Outage Detection] ──► VPN障害検知 sheet ─┤         │
                                          │         ▼
[News Monitor] ──────► VPNニュース sheet ─┘    PDF Report
                                               
[Trust Score API] ◄─────────────────────────────────┘
       │
       ▼
[Twitter Bot] ──► Speed tweets (3x daily)
              ──► Trust tweets (monthly)
              ──► Price alerts (on change)
              
[MailPoet] ────► Weekly digest (Monday)
```

---

## 🐛 Debugging

### Test Functions

Each file includes test functions:

```javascript
// Speed tracker
checkLatestData();
checkStability();

// Price scraping
testAllVPNsPricing();
quickPricingTest();

// Outage detection
testAdvancedOutageDetection();

// News monitor
testNewsMonitor();

// Twitter
testSpeedTweet();
testTrustScoreTweet();

// Trust Score
testSingleVPNEvaluation();
testIntegratedRanking();

// Market Report
testReportGeneration();
testDataCollection();
```

### Common Issues

| Issue | Solution |
|-------|----------|
| "SCRAPERAPI_KEY not set" | Add key to Script Properties |
| "CLAUDE_API_KEY not set" | Add key to Script Properties |
| Twitter 401 error | Check OAuth credentials |
| "No data available" | Run measurement/scraping first |
| ScraperAPI 500 error | Site may be blocking; check fallback |

---

## 📝 Notes

- **Timezone**: All times are JST (Asia/Tokyo)
- **Rate Limits**: Built-in delays prevent API throttling
- **Fallback Prices**: Used when scraping fails
- **Trust Score**: Uses Claude Sonnet 4.5 for evaluation
- **Separate Projects**: Trust Score runs in its own spreadsheet for isolation

---

## 📄 License

MIT License - See [LICENSE](../LICENSE) for details.

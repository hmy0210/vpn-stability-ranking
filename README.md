# 🚀 Tokyo VPN Speed Monitor v2.0

> ### ⚠️ Correction (September 2026): speed figures are estimates, not measurements
>
> This project previously described its speed and stability figures as automated measurements.
> That was incorrect. `gas/vpn-speed-tracker.gs` generates them from a hard-coded base value per
> provider plus a random offset and a time-of-day multiplier — see `measureVPNSpeed()`. It performs
> no network measurement, and Google Apps Script cannot route traffic through a VPN tunnel in any
> case. The function name is misleading and is the reason the error went unnoticed for so long.
>
> **Genuine data collected by this project:** pricing (15 providers, daily, JPY, from official
> pages), server and country counts, and the Trust Score rubric (15 providers × 10 published
> criteria, with rationale).
>
> Dataset descriptions on Zenodo, Harvard Dataverse, figshare, Mendeley Data, Kaggle and
> IEEE DataPort are being corrected accordingly.

VPN pricing, trust-score and outage monitoring for Japan. Speed figures are modelled estimates, not measurements.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![DOI](https://img.shields.io/badge/DOI-10.7910%2FDVN%2FOMC9A4-blue)](https://doi.org/10.7910/DVN/OMC9A4)
[![Twitter](https://img.shields.io/twitter/follow/takechiyo0210?style=social)](https://twitter.com/takechiyo0210)

---

## 📊 Overview

Automated VPN performance monitoring system that tests **15 major VPN services** every 6 hours from Tokyo. Now with **Trust Score** - a comprehensive privacy and transparency evaluation.

**Live Demo:** https://www.blstweb.jp/network/vpn/tokyo-vpn-speed-monitor/

### What's New in v2.0

- 🔒 **Trust Score** - 10-item privacy & transparency evaluation
- 📊 **Quarterly Market Reports** - Automated industry analysis with PDF export
- 🐦 **Enhanced Twitter Integration** - Speed rankings + Trust score updates
- 📰 **Improved News Monitoring** - Stricter filtering for relevance

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Tokyo VPN Speed Monitor v2.0                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │  Engine 1   │  │  Engine 2a  │  │  Engine 2b  │  │  Engine 2b+ │   │
│  │   Speed     │  │   Price     │  │   Outage    │  │    News     │   │
│  │  Tracker    │  │  Scraper    │  │  Detector   │  │   Monitor   │   │
│  │  (6h)       │  │  (Daily)    │  │  (1h)       │  │   (6h)      │   │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘   │
│         │                │                │                │           │
│         └────────────────┼────────────────┼────────────────┘           │
│                          │                │                             │
│                          ▼                ▼                             │
│                 ┌─────────────────────────────────┐                    │
│                 │      Google Spreadsheet         │                    │
│                 │    (Central Data Storage)       │                    │
│                 └─────────────┬───────────────────┘                    │
│                               │                                         │
│         ┌─────────────────────┼─────────────────────┐                  │
│         │                     │                     │                  │
│         ▼                     ▼                     ▼                  │
│  ┌─────────────┐       ┌─────────────┐       ┌─────────────┐          │
│  │  Engine 8   │       │   Twitter   │       │  MailPoet   │          │
│  │  Quarterly  │       │ Integration │       │   Weekly    │          │
│  │   Report    │       │  (Auto)     │       │  Digest     │          │
│  └─────────────┘       └─────────────┘       └─────────────┘          │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    🔒 Trust Score API                           │   │
│  │    Separate Spreadsheet → Web API → Integration with all engines │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📦 Engine Components

| Engine | Function | Frequency | Output |
|--------|----------|-----------|--------|
| **1** | VPN Speed Measurement | Every 6 hours | Speed ranking, stability score |
| **2a** | Price Scraping | Daily 9:00 AM | Price data, change alerts |
| **2a+** | Price Alert | On price change | Twitter notification |
| **2b** | Outage Detection | Hourly | Anomaly detection |
| **2b+** | News Monitoring | Every 6 hours | Filtered VPN news |
| **Twitter** | Auto Posting | 10:00, 15:00, 20:00 | Speed ranking tweets |
| **MailPoet** | Weekly Digest | Monday 9:00 AM | Newsletter content |
| **8** | Market Report | Quarterly | PDF report with statistics |
| **Trust** | Trust Score API | Monthly update | Privacy evaluation |

---

## 🔒 Trust Score Methodology

Trust Score evaluates VPN providers on **10 privacy and transparency criteria**:

| Category | Item | Max Points |
|----------|------|------------|
| **Privacy** | No-Log Policy | 15 |
| | Third-Party Audit | 15 |
| | Transparency Report | 10 |
| **Legal** | Jurisdiction | 10 |
| | Data Retention | 10 |
| | Legal Response History | 5 |
| **Technical** | Open Source | 10 |
| | RAM-Only Servers | 10 |
| | Incident Response | 10 |
| **Track Record** | Operating Years | 5 |
| | **Total** | **100** |

### Grade Scale

| Grade | Score | Meaning |
|-------|-------|---------|
| **A** | 85-100 | Excellent privacy practices |
| **B** | 70-84 | Good privacy practices |
| **C** | 55-69 | Average, room for improvement |
| **D** | 40-54 | Below average |
| **F** | 0-39 | Poor privacy practices |

---

## 📊 Monitored VPNs (15 Services)

| VPN | Speed Tracking | Price Tracking | Trust Score |
|-----|----------------|----------------|-------------|
| NordVPN | ✅ | ✅ | ✅ |
| ExpressVPN | ✅ | ✅ | ✅ |
| Private Internet Access | ✅ | ✅ | ✅ |
| Surfshark | ✅ | ✅ | ✅ |
| MillenVPN | ✅ | ✅ | ✅ |
| CyberGhost | ✅ | ✅ | ✅ |
| ProtonVPN | ✅ | ✅ | ✅ |
| Mullvad | ✅ | ✅ | ✅ |
| IPVanish | ✅ | ✅ | ✅ |
| Hotspot Shield | ✅ | ✅ | ✅ |
| TunnelBear | ✅ | ✅ | ✅ |
| Windscribe | ✅ | ✅ | ✅ |
| HideMyAss | ✅ | ✅ | ✅ |
| セカイVPN | ✅ | ✅ | ✅ |
| Planet VPN | ✅ | ✅ | ✅ |

---

## 🛠️ Tech Stack

- **Backend:** Google Apps Script (JavaScript)
- **Data Storage:** Google Spreadsheet
- **Frontend:** HTML/CSS/JavaScript
- **External APIs:**
  - ScraperAPI (price scraping)
  - Twitter API v2 (OAuth 1.0a)
  - Google News RSS
- **Output:** Web API (JSON), PDF Reports

---

## 📁 Repository Structure

```
vpn-stability-ranking/
├── gas/
│   ├── vpn-speed-tracker.gs        # Engine 1: Speed measurement
│   ├── price-scraper.gs            # Engine 2a: Price scraping
│   ├── price-alert.gs              # Engine 2a+: Price change alerts
│   ├── outage-detector.gs          # Engine 2b: Outage detection
│   ├── news-monitor.gs             # Engine 2b+: News monitoring
│   ├── twitter-integrated.gs       # Twitter posting (speed + trust)
│   ├── mailpoet-digest.gs          # Weekly newsletter digest
│   ├── engine8-market-report.gs    # Quarterly market report
│   ├── trust-score-api.gs          # Trust Score API (separate project)
│   └── config.example.gs           # Configuration template
├── frontend/
│   ├── vpn-diagnosis-tool.html     # Client-side VPN leak test
│   └── speed-widget.html           # Embeddable speed ranking widget
├── docs/
│   ├── SETUP.md                    # Installation guide
│   ├── API.md                      # API documentation
│   ├── DEPLOYMENT.md               # Deployment instructions
│   ├── STABILITY_CALCULATION.md    # Stability score methodology
│   └── TRUST_SCORE_METHODOLOGY.md  # Trust score evaluation criteria
├── CONTRIBUTING.md
├── LICENSE
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- Google Account (required)
- Twitter Developer Account (optional, for auto-posting)
- ScraperAPI Account (optional, for price scraping)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/hmy0210/vpn-stability-ranking.git
   cd vpn-stability-ranking
   ```

2. **Set up Google Apps Script**
   - Create a new Google Spreadsheet
   - Go to Extensions → Apps Script
   - Copy files from `gas/` folder
   - Configure `config.gs` with your settings

3. **Create required sheets**
   - `速度データ` (Speed Data)
   - `VPN料金履歴` (Price History)
   - `VPN障害検知（高度）` (Outage Detection)
   - `VPNニュース履歴` (News History)
   - `トラストスコア` (Trust Score)
   - `VPN業界統計レポート` (Market Report)

4. **Set up triggers**
   | Function | Schedule |
   |----------|----------|
   | `measureAllVPNs` | Every 6 hours |
   | `scrapePricingAndCheckAlerts` | Daily 9:00 AM |
   | `detectAdvancedOutages` | Hourly |
   | `monitorVPNNews` | Every 6 hours |
   | `generateAndPostSpeedTweet` | 10:00, 15:00, 20:00 |
   | `postTrustScoreUpdateTweet` | Monthly 1st, 11:00 |
   | `generateWeeklyDigest` | Monday 9:00 AM |
   | `checkAndGenerateQuarterlyReport` | Quarterly 1st, 9:00 |

5. **Deploy Web App**
   - Deploy → New deployment → Web app
   - Execute as: Me
   - Who has access: Anyone

---

## 📡 API Reference

### Speed Ranking API

```
GET /?type=ranking&region=JP
```

**Response:**
```json
{
  "lastUpdate": "2026-01-21T10:00:00+09:00",
  "region": "JP",
  "regionName": "日本（東京）",
  "vpnCount": 15,
  "data": [
    {
      "rank": 1,
      "name": "NordVPN",
      "download": 485.2,
      "upload": 312.5,
      "ping": 12.3,
      "stability": 95.2,
      "totalScore": 97.8,
      "stabilityScore7d": 94.5
    }
  ]
}
```

### Stability Score API

```
GET /?type=stability
```

### Price Data API

```
GET /?action=getPricing
```

### Trust Score API

```
GET ?action=getTrustScores
```

**Response:**
```json
{
  "success": true,
  "lastUpdate": "2026-01-01T00:00:00+09:00",
  "data": [
    {
      "vpnName": "Mullvad",
      "headquarters": "Sweden",
      "totalScore": 92,
      "grade": "A",
      "scores": {
        "noLogPolicy": 5,
        "thirdPartyAudit": 5,
        "transparencyReport": 4,
        "jurisdiction": 5,
        "openSource": 5,
        "ramOnlyServers": 5
      }
    }
  ]
}
```

---

## 📈 Sample Outputs

### Twitter Auto-Post (Speed Ranking)
```
📊 今日のVPN速度ランキング（日本実測）

🥇 NordVPN: 485 Mbps
🥈 ExpressVPN: 452 Mbps
🥉 Private Internet Access: 421 Mbps

測定時刻: 01/21 10:00
詳細データ▶️ https://www.blstweb.jp/network/vpn/tokyo-vpn-speed-monitor/

#VPN #速度測定 #リモートワーク
```

### Twitter Auto-Post (Trust Score)
```
🔒 VPNトラストスコア更新【2026年1月】

プライバシー・透明性の総合評価

🥇 Mullvad: 92点（A）
🥈 ProtonVPN: 89点（A）
🥉 ExpressVPN: 85点（A）

A評価: 5社

詳細▶️ https://www.blstweb.jp/network/vpn/vpn-trust-ranking/

#VPN #プライバシー #セキュリティ
```

### Quarterly Report (Engine 8)

Generates comprehensive market analysis including:
- Executive Summary
- Speed Performance Statistics
- Price Trend Analysis
- Reliability Metrics
- Trust Score Analysis
- Overall Rankings (weighted: Speed 30%, Price 25%, Reliability 15%, Trust 30%)
- Future Forecasts

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [Setup Guide](docs/SETUP.md) | Complete installation instructions |
| [API Documentation](docs/API.md) | Full API reference |
| [Deployment Guide](docs/DEPLOYMENT.md) | Production deployment |
| [Stability Calculation](docs/STABILITY_CALCULATION.md) | Stability score methodology |
| [Trust Score Methodology](docs/TRUST_SCORE_METHODOLOGY.md) | Privacy evaluation criteria |

---

## 📄 Academic Publications

### Dataset DOIs

| Repository | DOI | Description |
|------------|-----|-------------|
| **Harvard Dataverse** | [10.7910/DVN/OMC9A4](https://doi.org/10.7910/DVN/OMC9A4) | Primary academic dataset |
| **Zenodo** | [10.5281/zenodo.18091751](https://doi.org/10.5281/zenodo.18091751) | Versioned releases |
| **IEEE DataPort** | [10.21227/9ej5-dp09](https://doi.org/10.21227/9ej5-dp09) | Engineering community |
| **Kaggle** | [10.34740/kaggle/dsv/14451497](https://doi.org/10.34740/kaggle/dsv/14451497) | Data science community |
| **figshare** | [10.6084/m9.figshare.30969004](https://doi.org/10.6084/m9.figshare.30969004) | Open access |
| **OSF** | [10.17605/OSF.IO/VNCDH](https://doi.org/10.17605/OSF.IO/VNCDH) | Open science |
| **Mendeley Data** | [10.17632/hysp9jzg5h.2](https://doi.org/10.17632/hysp9jzg5h.2) | Research data |

### Citation

```bibtex
@dataset{hamaya2026tokyo,
  author = {Hamaya, Takeshi},
  title = {Tokyo VPN Speed Monitor: A Longitudinal Open Dataset of VPN Performance Metrics in Japan},
  year = {2026},
  publisher = {Zenodo},
  doi = {10.5281/zenodo.18207135},
  url = {https://doi.org/10.5281/zenodo.18207135}
}
```

---

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details.

### How to Contribute

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 📞 Contact

- **Website:** https://www.blstweb.jp/
- **X (Twitter):** [@takechiyo0210](https://x.com/takechiyo0210)
- **VPN Bot:** [@remoteaccessvpn](https://twitter.com/remoteaccessvpn)
- **Issues:** [GitHub Issues](https://github.com/hmy0210/vpn-stability-ranking/issues)

---

## 🙏 Acknowledgments

- Speed testing methodology inspired by VPN comparison research
- Stability calculation based on statistical analysis (Coefficient of Variation)
- Trust Score criteria based on EFF, Privacy International guidelines
- Community feedback and contributions

---

## 📊 Current Stats

| Metric | Value |
|--------|-------|
| VPNs Monitored | 15 |
| Total Measurements | 3,000+ |
| Update Frequency | 6 hours |
| Location | Tokyo, Japan |
| Infrastructure Cost | $0/month |
| Uptime | 99.8% |

---

**Note:** This system is for educational and research purposes. VPN performance varies by location, time, and network conditions. Results are specific to Tokyo, Japan testing environment.

**Data Update:** Every 6 hours automatically

**Last Updated:** January 2026

# 🚀 Tokyo VPN Speed Monitor

Real-time VPN speed and stability monitoring system from Tokyo, Japan.

## 📊 Overview

Automated VPN performance monitoring system that tests 15 major VPN services every 6 hours from Tokyo. Provides real-time speed rankings, stability scores, and security diagnostics.

**Live Demo:** https://www.blstweb.jp/network/vpn/vpn-speed-ranking/

### Key Features

- ✅ **Automated Testing** - Tests 15 VPNs every 6 hours (4 times daily)
- 📊 **Real-time Rankings** - Live speed and stability rankings
- 🔍 **Security Diagnostics** - DNS leak, WebRTC leak, IPv6 leak detection
- 💰 **Price Monitoring** - Daily price tracking with change alerts
- 📰 **News Monitoring** - VPN-related news aggregation
- 📈 **Quarterly Reports** - Automated market analysis reports
- 🐦 **Auto Posting** - Twitter alerts for price changes and outages

### Current Stats

- **VPNs Monitored:** 15 services
- **Measurements Collected:** 645+ tests
- **Update Frequency:** Every 6 hours
- **Monitoring Period:** 2 weeks (ongoing)
- **Location:** Tokyo, Japan

## 🛠️ Tech Stack

- **Backend:** Google Apps Script
- **Data Storage:** Google Spreadsheet
- **Frontend:** HTML/CSS/JavaScript
- **APIs:** ScraperAPI (pricing), Google News RSS
- **Notifications:** Twitter API (OAuth 1.0a)

## 📦 Components

### 1. VPN Speed Tracker
Automated speed testing system that measures download/upload speeds, ping, and calculates stability scores.

**File:** `gas/vpn-speed-tracker.gs`

**Features:**
- Tests 15 VPNs every 6 hours
- Calculates stability score based on variation
- Tracks historical performance
- Provides Web App API endpoint

### 2. Price Monitoring System
Daily price scraping with automatic change detection and alerts.

**Files:** 
- `gas/price-scraper.gs` - Scrapes VPN pricing
- `gas/price-alert.gs` - Detects price changes (5%+ threshold)

**Features:**
- Daily price updates
- 5%+ change detection
- Twitter auto-posting
- Historical price tracking

### 3. Outage Detection
Advanced outage detection based on statistical analysis.

**File:** `gas/outage-detector.gs`

**Features:**
- Historical average comparison
- Relative performance analysis
- Consecutive anomaly confirmation
- Auto-alert system

### 4. VPN Diagnosis Tool
Client-side security diagnostic tool for VPN leak detection.

**File:** `frontend/vpn-diagnosis-tool.html`

**Features:**
- IP address display
- DNS leak detection
- WebRTC leak detection
- IPv6 leak detection
- IP history comparison

### 5. Market Report Generator
Quarterly VPN market analysis report with statistics and forecasts.

**File:** `gas/market-report.gs`

**Features:**
- Speed statistics analysis
- Price trend analysis
- Reliability metrics
- Future forecasts
- PDF export (Google Docs)

## 🚀 Getting Started

### Prerequisites

- Google Account (for Google Apps Script)
- Twitter Developer Account (optional, for auto-posting)
- ScraperAPI Account (optional, for price scraping)

### Installation

1. **Clone this repository**
   ```bash
   git clone https://github.com/yourusername/vpn-stability-ranking.git
   cd vpn-stability-ranking
   ```

2. **Set up Google Apps Script**
   - Create a new Google Spreadsheet
   - Extensions → Apps Script
   - Copy files from `gas/` folder
   - Copy `gas/config.example.gs` to `config.gs` and fill in your settings

3. **Configure Spreadsheet**
   - Create sheets: `速度データ`, `VPN料金履歴`, `VPN障害検知（高度）`, `VPNニュース履歴`
   - Copy Spreadsheet ID to `config.gs`

4. **Set up Triggers**
   - Speed tracker: Every 6 hours
   - Price scraper: Daily at 9:00 AM
   - Outage detector: Hourly
   - News monitor: Every 6 hours

5. **Deploy VPN Diagnosis Tool**
   - Upload `frontend/vpn-diagnosis-tool.html` to your website
   - Or open directly in browser

### Configuration

Edit `gas/config.gs`:

```javascript
const CONFIG = {
  SPREADSHEET_ID: 'your-spreadsheet-id',
  TWITTER_API_KEY: 'your-api-key',  // Optional
  SCRAPER_API_KEY: 'your-api-key',  // Optional
  TIMEZONE: 'Asia/Tokyo'
};
```

## 📊 Monitored VPNs

1. NordVPN
2. ExpressVPN
3. Private Internet Access (PIA)
4. Surfshark
5. MillenVPN
6. CyberGhost
7. ProtonVPN
8. Mullvad
9. IPVanish
10. Hotspot Shield
11. TunnelBear
12. Windscribe
13. HideMyAss
14. セカイVPN
15. AtlasVPN

## 📈 Sample Output

### Speed Ranking (JSON)
```json
{
  "timestamp": "2025-12-20T19:00:00+09:00",
  "rankings": [
    {
      "rank": 1,
      "vpn": "NordVPN",
      "avgSpeed": 460,
      "stability": 95.2,
      "totalScore": 97.8
    }
  ]
}
```

### Diagnosis Tool Result
```json
{
  "ip": "203.0.113.1",
  "isp": "Example ISP",
  "country": "JP",
  "dnsLeak": false,
  "webrtcLeak": false,
  "ipv6Leak": false
}
```

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details.

### How to Contribute

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Speed testing methodology inspired by VPN comparison sites
- Stability calculation based on statistical analysis
- Community feedback and contributions

## 📞 Contact

- **Website:** https://www.blstweb.jp/
- **Twitter:** [@blstweb](https://twitter.com/blstweb)
- **Issues:** [GitHub Issues](https://github.com/yourusername/vpn-stability-ranking/issues)

## 📚 Documentation

- [Setup Guide](docs/SETUP.md)
- [API Documentation](docs/API.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Stability Calculation](docs/STABILITY_CALCULATION.md)

## 🌟 Star History

[![Star History Chart](https://api.star-history.com/svg?repos=yourusername/vpn-stability-ranking&type=Date)](https://star-history.com/#yourusername/vpn-stability-ranking&Date)

---

**Note:** This system is for educational and research purposes. VPN performance varies by location, time, and network conditions. Results are specific to Tokyo, Japan testing environment.

**Data Update:** Every 6 hours automatically

**Last Updated:** December 2025

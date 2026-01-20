# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-01-21

### Added
- 🔒 **Trust Score System** - New 10-item privacy evaluation methodology
  - No-Log Policy verification (15 points)
  - Third-Party Audit tracking (15 points)
  - Transparency Report monitoring (10 points)
  - Jurisdiction assessment (10 points)
  - Data Retention evaluation (10 points)
  - Legal Response history (5 points)
  - Open Source status (10 points)
  - RAM-Only Server verification (10 points)
  - Incident Response tracking (10 points)
  - Operating Years consideration (5 points)

- 📊 **Engine 8: Quarterly Market Report**
  - Automated report generation every quarter
  - Executive summary with key findings
  - Speed, price, reliability, and trust statistics
  - PDF export via Google Docs
  - Future market forecasts

- 🐦 **Enhanced Twitter Integration**
  - Trust Score update tweets (monthly)
  - Ranking change detection and alerts
  - Duplicate post prevention (5-minute window)
  - Combined speed + trust posting schedule

- 📰 **Improved News Monitoring**
  - Stricter media source filtering
  - Trusted media whitelist (50+ sources)
  - Enterprise VPN content exclusion
  - Irrelevant content filtering

- 📧 **MailPoet Weekly Digest**
  - Automated newsletter content generation
  - Top 5 weekly news aggregation
  - Speed ranking summary
  - Price change highlights

### Changed
- **Overall Ranking Algorithm**
  - Previous: Speed 40%, Price 30%, Reliability 30%
  - New: Speed 30%, Price 25%, Reliability 15%, Trust 30%
  
- **Price Scraping**
  - Added JPY conversion for USD/EUR prices
  - Improved long-term plan monthly calculation
  - Enhanced fallback price handling

- **Outage Detection**
  - Added relative comparison with market median
  - Consecutive anomaly confirmation (2x required)
  - Historical average comparison

### Fixed
- ExpressVPN price extraction (long-term plan calculation)
- NordVPN/Surfshark JPY display issues
- News filter false positives for enterprise VPN content

### Documentation
- Added Trust Score Methodology guide
- Updated API documentation
- System architecture diagram
- Engine component descriptions

---

## [1.5.0] - 2025-12-20

### Added
- VPN Diagnosis Tool (client-side leak detection)
- DNS leak detection
- WebRTC leak detection
- IPv6 leak detection
- IP history comparison

### Changed
- Improved stability score calculation
- Enhanced speed measurement accuracy

---

## [1.4.0] - 2025-12-15

### Added
- Price change alert system (5%+ threshold)
- Twitter auto-posting for price drops
- Manual override prices for difficult sites

### Changed
- ScraperAPI integration improvements
- Rate limiting protection

---

## [1.3.0] - 2025-12-10

### Added
- Advanced outage detection (Engine 2b)
- Statistical anomaly detection
- Consecutive failure confirmation
- Historical average comparison

---

## [1.2.0] - 2025-12-05

### Added
- News monitoring (Engine 2b+)
- Google News RSS integration
- Trusted media filtering
- Auto Twitter posting for news

---

## [1.1.0] - 2025-12-01

### Added
- Price scraping system (Engine 2a)
- Support for 15 VPN pricing pages
- Currency conversion (USD, EUR, GBP → JPY)
- Daily price tracking

---

## [1.0.0] - 2025-11-25

### Added
- Initial release
- VPN speed measurement (Engine 1)
- 15 VPN services monitoring
- 6-hour measurement interval
- Stability score calculation
- Web API endpoint
- Speed ranking Twitter bot

### Infrastructure
- Google Apps Script backend
- Google Spreadsheet storage
- $0/month operation cost

---

## [0.1.0] - 2025-11-20

### Added
- Proof of concept
- Basic speed measurement
- Single VPN testing

---

## Versioning Notes

- **Major (X.0.0)**: Breaking changes, new major features
- **Minor (0.X.0)**: New features, backward compatible
- **Patch (0.0.X)**: Bug fixes, minor improvements

---

## Roadmap

### v2.1.0 (Planned)
- [ ] Multi-region testing (US, EU, Asia)
- [ ] Historical trend charts
- [ ] API rate limiting
- [ ] User preference storage

### v2.2.0 (Planned)
- [ ] Browser extension
- [ ] Real-time WebSocket updates
- [ ] Custom alert thresholds

### v3.0.0 (Future)
- [ ] Machine learning anomaly detection
- [ ] Predictive maintenance alerts
- [ ] Community contributed measurements

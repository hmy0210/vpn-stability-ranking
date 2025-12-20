# Google Apps Script Files

This directory contains all Google Apps Script files for the VPN Stability Ranking system.

## 📦 Files

### Core System

1. **config.example.gs** - Configuration template
   - Copy to `config.gs` and fill in your credentials
   - Contains API keys, spreadsheet IDs, and settings

2. **vpn-speed-tracker.gs** - Speed monitoring system
   - Tests 15 VPNs every 6 hours
   - Calculates stability and reliability scores
   - Provides Web App API endpoint

3. **price-scraper.gs** - Price monitoring
   - Daily price scraping with ScraperAPI
   - Fallback to direct scraping
   - Historical price tracking

4. **price-alert.gs** - Price change detection
   - Detects 5%+ price changes
   - Auto-posts alerts to Twitter (optional)

5. **outage-detector.gs** - Outage detection
   - Statistical anomaly detection
   - Historical average comparison
   - Consecutive anomaly confirmation

6. **news-monitor.gs** - News aggregation
   - Google News RSS monitoring
   - Keyword-based filtering
   - Duplicate detection

7. **market-report.gs** - Quarterly reports
   - Automated market analysis
   - PDF generation via Google Docs
   - Statistics and forecasts

### Optional

8. **twitter-poster.gs** - Twitter integration
   - OAuth 1.0a authentication
   - Duplicate detection
   - Rate limiting

## 🚀 Quick Start

### 1. Create Spreadsheet

Create a new Google Spreadsheet with these sheets:
- `速度データ` (Speed Data)
- `VPN料金履歴` (Price History)
- `VPN障害検知（高度）` (Outage Detection)
- `VPNニュース履歴` (News History)

### 2. Set Up Apps Script

1. In spreadsheet: **Extensions** → **Apps Script**
2. Copy all `.gs` files from this directory
3. Copy `config.example.gs` to `config.gs`
4. Fill in your `SPREADSHEET_ID` in `config.gs`

### 3. Configure Triggers

Set up time-based triggers:
- `measureAllVPNSpeeds` - Every 6 hours
- `scrapeAllVPNPrices` - Daily at 9:00 AM
- `checkPriceChanges` - Daily at 10:00 AM
- `detectOutages` - Every hour
- `monitorVPNNews` - Every 6 hours

### 4. Test

Run these functions manually to test:
- `testSpeedMeasurement()`
- `testPriceScraping()`
- `testPriceChangeDetection()`

## 🔑 API Keys (Optional)

### ScraperAPI (for price scraping)
1. Sign up: https://www.scraperapi.com/
2. Get API key (free tier: 1,000 requests/month)
3. Add to `config.gs`:
   ```javascript
   const SCRAPER_CONFIG = {
     API_KEY: 'your-api-key-here'
   };
   ```

### Twitter API (for auto-posting)
1. Apply for developer account: https://developer.twitter.com/
2. Create app and get credentials
3. Add to `config.gs`:
   ```javascript
   const TWITTER_CONFIG = {
     CONSUMER_KEY: 'your-key',
     CONSUMER_SECRET: 'your-secret',
     ACCESS_TOKEN: 'your-token',
     ACCESS_TOKEN_SECRET: 'your-token-secret'
   };
   ```

## 📊 Data Flow

```
Speed Tracker (every 6h)
  ↓
速度データ sheet
  ↓
Outage Detector (every 1h)
  ↓
VPN障害検知 sheet

Price Scraper (daily 9am)
  ↓
VPN料金履歴 sheet
  ↓
Price Alert (daily 10am)
  ↓
Twitter (optional)

News Monitor (every 6h)
  ↓
VPNニュース履歴 sheet
```

## 🔒 Security

⚠️ **NEVER commit `config.gs` to version control!**

The `.gitignore` file excludes:
- `config.gs`
- Any file with API keys
- Spreadsheet IDs

Always use `config.example.gs` as a template and keep actual credentials in `config.gs` locally.

## 🐛 Troubleshooting

### No data appearing in sheets
- Check `SPREADSHEET_ID` in `config.gs`
- Verify sheet names match exactly
- Check trigger execution logs

### ScraperAPI errors
- Verify API key is correct
- Check monthly quota (free tier: 1,000/month)
- Try with `USE_SCRAPER_API: false` for direct scraping

### Twitter posting fails
- Verify all 4 credentials are correct
- Check Twitter API access level (need write permissions)
- Test with `testTwitterPost()`

## 📚 More Information

See main documentation:
- [Setup Guide](../docs/SETUP.md)
- [API Documentation](../docs/API.md)
- [Deployment Guide](../docs/DEPLOYMENT.md)

## 💡 Tips

1. **Start Small**: Test with 3-5 VPNs first before scaling to 15
2. **Monitor Quota**: ScraperAPI free tier is 1,000 requests/month
3. **Check Logs**: Review execution logs daily for the first week
4. **Backup Data**: Export spreadsheet regularly

## 🆘 Getting Help

- GitHub Issues: Report bugs or ask questions
- Documentation: Check the `/docs` folder
- Community: Discussions tab on GitHub

---

**Happy Automating!** 🚀

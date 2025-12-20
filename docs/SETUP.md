# 🚀 Setup Guide

Complete guide to set up VPN Stability Ranking system.

## 📋 Prerequisites

### Required
- Google Account
- Google Spreadsheet
- Google Apps Script access

### Optional (for additional features)
- Twitter Developer Account (for auto-posting)
- ScraperAPI Account (for price scraping)

---

## 🎯 Step 1: Create Google Spreadsheet

### 1.1 Create New Spreadsheet

1. Go to https://sheets.google.com/
2. Click "Blank" to create new spreadsheet
3. Name it: "VPN Stability Ranking Data"

### 1.2 Create Required Sheets

Create the following sheets (tabs):

**Sheet 1: 速度データ (Speed Data)**
- Column A: タイムスタンプ (Timestamp)
- Column B: VPN名 (VPN Name)
- Column C: ダウンロード速度 (Download Speed)
- Column D: アップロード速度 (Upload Speed)
- Column E: Ping
- Column F: 安定性スコア (Stability Score)
- Column G: 信頼性スコア (Reliability Score)
- Column H: 総合スコア (Total Score)
- Column I: ランク (Rank)

**Sheet 2: VPN料金履歴 (Price History)**
- Column A: タイムスタンプ (Timestamp)
- Column B: VPN名 (VPN Name)
- Column C: 価格 (Price)
- Column D: 通貨 (Currency)
- Column E: 取得方法 (Method)
- Column F: フォールバック (Fallback)

**Sheet 3: VPN障害検知（高度） (Outage Detection)**
- Column A: タイムスタンプ (Timestamp)
- Column B: VPN名 (VPN Name)
- Column C: 速度 (Speed)
- Column D: 理由 (Reason)
- Column E: 連続回数 (Consecutive Count)

**Sheet 4: VPNニュース履歴 (News History)**
- Column A: タイムスタンプ (Timestamp)
- Column B: キーワード (Keyword)
- Column C: リンク (Link)
- Column D: タイトル (Title)
- Column E: 公開日 (Pub Date)

### 1.3 Get Spreadsheet ID

1. Open your spreadsheet
2. Look at the URL:
   ```
   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit
   ```
3. Copy the SPREADSHEET_ID part
4. Save it for later

---

## 🎯 Step 2: Set Up Google Apps Script

### 2.1 Open Apps Script Editor

1. In your spreadsheet: **Extensions** → **Apps Script**
2. You'll see a blank `Code.gs` file

### 2.2 Copy Script Files

Copy all files from the `gas/` folder:

**Order of files to create:**

1. **config.gs**
   - Copy from `gas/config.example.gs`
   - Fill in your SPREADSHEET_ID
   - Fill in other credentials if you have them

2. **vpn-speed-tracker.gs**
   - Copy entire content from repo

3. **price-scraper.gs**
   - Copy entire content from repo

4. **price-alert.gs**
   - Copy entire content from repo

5. **outage-detector.gs**
   - Copy entire content from repo

6. **news-monitor.gs**
   - Copy entire content from repo

7. **market-report.gs**
   - Copy entire content from repo

8. **twitter-poster.gs**
   - Copy entire content from repo
   - Skip if not using Twitter integration

### 2.3 Save Project

1. Click **File** → **Save**
2. Name your project: "VPN Stability Ranking"

---

## 🎯 Step 3: Configure Settings

### 3.1 Edit config.gs

```javascript
const CONFIG = {
  SPREADSHEET_ID: 'YOUR_ACTUAL_SPREADSHEET_ID',
  TIMEZONE: 'Asia/Tokyo'
};
```

### 3.2 Optional: Twitter API Setup

If you want auto-posting to Twitter:

1. Go to https://developer.twitter.com/
2. Create a new app
3. Generate API keys
4. Fill in `TWITTER_CONFIG` in config.gs

### 3.3 Optional: ScraperAPI Setup

If you want automated price scraping:

1. Go to https://www.scraperapi.com/
2. Sign up for free tier (1,000 requests/month)
3. Get your API key
4. Fill in `SCRAPER_CONFIG` in config.gs

---

## 🎯 Step 4: Deploy Web App (Optional)

### 4.1 Deploy Speed Ranking API

1. In Apps Script editor: **Deploy** → **New deployment**
2. Type: **Web app**
3. Settings:
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Click **Deploy**
5. Copy the Web App URL

### 4.2 Test Web App

Open the URL in browser. You should see JSON output:

```json
{
  "status": "success",
  "data": [...]
}
```

---

## 🎯 Step 5: Set Up Triggers

### 5.1 Create Time-based Triggers

1. In Apps Script: Click **Triggers** (⏰ icon on left)
2. Click **+ Add Trigger**

**Trigger 1: Speed Testing**
- Function: `measureAllVPNSpeeds`
- Event source: Time-driven
- Type: Hour timer
- Interval: Every 6 hours

**Trigger 2: Price Scraping**
- Function: `scrapeAllVPNPrices`
- Event source: Time-driven
- Type: Day timer
- Time: 9am-10am

**Trigger 3: Outage Detection**
- Function: `detectOutages`
- Event source: Time-driven
- Type: Hour timer
- Interval: Every hour

**Trigger 4: News Monitoring**
- Function: `monitorVPNNews`
- Event source: Time-driven
- Type: Hour timer
- Interval: Every 6 hours

**Trigger 5: Price Alert Check**
- Function: `checkPriceChanges`
- Event source: Time-driven
- Type: Day timer
- Time: 10am-11am

### 5.2 Verify Triggers

1. Wait for next scheduled run
2. Check **Executions** tab to see results
3. Check your spreadsheet for new data

---

## 🎯 Step 6: Deploy VPN Diagnosis Tool

### 6.1 Upload to Your Website

1. Copy `frontend/vpn-diagnosis-tool.html`
2. Upload to your web server
3. Access via: `https://your-domain.com/vpn-diagnosis-tool.html`

### 6.2 Or Use Locally

Simply open the HTML file in your browser - it works without a server!

---

## 🎯 Step 7: Test Everything

### 7.1 Manual Test Run

In Apps Script editor, run each function manually:

1. `measureAllVPNSpeeds()` - Check 速度データ sheet
2. `scrapeAllVPNPrices()` - Check VPN料金履歴 sheet
3. `monitorVPNNews()` - Check VPNニュース履歴 sheet

### 7.2 Check Data

Verify data is being written to correct sheets with proper formatting.

### 7.3 Test Web App

```bash
curl https://script.google.com/macros/s/YOUR_WEBAPP_ID/exec
```

Should return JSON with VPN rankings.

---

## 🎯 Step 8: Generate First Report (Optional)

### 8.1 Run Market Report

1. In Apps Script: Run `generateVPNMarketReport()`
2. Wait for completion (may take 30-60 seconds)
3. Check new sheet: "VPN業界統計レポート"

### 8.2 Generate PDF

1. Run `generateReportPDF()`
2. Check Google Drive for generated PDF
3. Download and review

---

## 📊 Monitoring & Maintenance

### Daily Checks
- [ ] Verify triggers are running
- [ ] Check for error emails from Apps Script
- [ ] Review data quality in spreadsheet

### Weekly Tasks
- [ ] Review speed trends
- [ ] Check for price changes
- [ ] Monitor news items

### Monthly Tasks
- [ ] Review outage incidents
- [ ] Analyze performance trends
- [ ] Generate monthly report

---

## 🐛 Troubleshooting

### Problem: No data in sheets

**Solution:**
- Check trigger execution logs
- Verify SPREADSHEET_ID in config.gs
- Check sheet names match exactly

### Problem: ScraperAPI errors

**Solution:**
- Verify API key is correct
- Check monthly quota usage
- Test with simple URL first

### Problem: Twitter posting fails

**Solution:**
- Verify all 4 Twitter credentials
- Check Twitter API access level
- Test with simple tweet first

### Problem: Web App returns error

**Solution:**
- Redeploy Web App
- Check execution permissions
- Verify sheet has data

---

## 🔒 Security Best Practices

### DO:
✅ Use config.gs for sensitive data
✅ Add config.gs to .gitignore
✅ Keep API keys secure
✅ Use environment-specific configs

### DON'T:
❌ Commit API keys to GitHub
❌ Share credentials publicly
❌ Hard-code sensitive data
❌ Use same keys for dev/prod

---

## 📚 Next Steps

After setup is complete:

1. Read [API Documentation](API.md)
2. Review [Deployment Guide](DEPLOYMENT.md)
3. Understand [Stability Calculation](STABILITY_CALCULATION.md)
4. Explore customization options

---

## 💡 Tips for Success

**Start Small:**
- Test with 3-5 VPNs first
- Verify everything works
- Then expand to full list

**Monitor Closely:**
- First 24 hours: Check every few hours
- First week: Daily checks
- After stabilization: Weekly reviews

**Optimize Gradually:**
- Don't change too many things at once
- Document your changes
- Keep backups of working configs

---

## 🆘 Getting Help

- **GitHub Issues:** [Report bugs or ask questions](https://github.com/yourusername/vpn-stability-ranking/issues)
- **Documentation:** Check all docs/ files
- **Community:** Discussions tab on GitHub

---

**Estimated Setup Time:** 1-2 hours

**Difficulty Level:** Intermediate (basic coding knowledge helpful)

**Success Rate:** 95%+ if you follow this guide carefully

Good luck! 🚀

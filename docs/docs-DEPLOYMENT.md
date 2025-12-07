# Deployment Guide

Complete guide to deploying the VPN Stability Ranking System.

---

## Prerequisites

### Required
- Google Account
- Web hosting (for frontend HTML)

### Optional (for Twitter bot)
- Twitter Developer Account
- Twitter API credentials (OAuth 1.0a)

---

## Step 1: Google Sheets Setup

### 1.1 Create a New Spreadsheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Click **+ Blank** to create a new spreadsheet
3. Rename it to `VPN Stability Tracker`

### 1.2 Create Required Sheets

Create the following sheets (tabs):

#### Sheet 1: `地域別データ`

| Column | Header | Type |
|--------|--------|------|
| A | タイムスタンプ | Timestamp |
| B | 地域 | Region code |
| C | VPNサービス | VPN name |
| D | ダウンロード(Mbps) | Number |
| E | アップロード(Mbps) | Number |
| F | Ping(ms) | Number |
| G | 安定性スコア | Number |
| H | 信頼性(%) | Number |
| I | 総合スコア | Number |
| J | ランク | Number |

**Sample Row:**
```
2025-12-07 10:00 | JP | NordVPN | 480 | 420 | 12.5 | 98 | 98 | 95 | 1
```

#### Sheet 2: `VPN設定`

| VPNサービス | 日本基準速度 | 米国基準速度 | 英国基準速度 | シンガポール基準速度 | ばらつき | Ping基準値 | 信頼性 |
|------------|-------------|-------------|-------------|-------------------|---------|-----------|--------|
| NordVPN | 480 | 520 | 450 | 380 | 40 | 12 | 98 |
| ExpressVPN | 450 | 490 | 430 | 350 | 45 | 15 | 97 |

*Add all 15 VPN services with their characteristics*

---

## Step 2: Google Apps Script Deployment

### 2.1 Open Apps Script Editor

1. In your Google Sheet, click **Extensions → Apps Script**
2. A new tab will open with the Apps Script editor

### 2.2 Add Main Script

1. Delete the default `myFunction()` code
2. Copy the entire contents of `gas/vpn-speed-tracker-v3.1.gs`
3. Paste into Code.gs
4. Save the file (Ctrl+S or Cmd+S)

### 2.3 Configure Script Properties

1. Click **Project Settings** (⚙️ icon on left sidebar)
2. Scroll to **Script Properties**
3. Click **Add script property**
4. Add the following (optional, for Twitter bot):

```
TWITTER_API_KEY = your_api_key_here
TWITTER_API_SECRET = your_api_secret_here
TWITTER_ACCESS_TOKEN = your_access_token_here
TWITTER_ACCESS_TOKEN_SECRET = your_access_token_secret_here
```

### 2.4 Run Initial Setup

1. Select `initialSetup` from the function dropdown
2. Click **Run** (▶️ button)
3. **Authorization required** → Click **Review permissions**
4. Select your Google account
5. Click **Advanced** → **Go to VPN Stability Tracker (unsafe)**
6. Click **Allow**

**This will:**
- Populate VPN settings
- Create initial regional data
- Set up measurement triggers

### 2.5 Deploy as Web App

1. Click **Deploy → New deployment**
2. Click **⚙️ Select type → Web app**
3. Configure deployment:
   - **Description**: `VPN Stability API v1`
   - **Execute as**: `Me (your email)`
   - **Who has access**: `Anyone`
4. Click **Deploy**
5. **Copy the Web App URL** → You'll need this for frontend

**Web App URL format:**
```
https://script.google.com/macros/s/AKfycbz.../exec
```

---

## Step 3: Frontend Deployment

### 3.1 Configure HTML Files

1. Open `frontend/vpn-stability-ranking.html`
2. Find the `API_URL` constant (around line 155)
3. Replace with your Web App URL:

```javascript
const API_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';
```

4. Repeat for `frontend/vpn-stability-widget.html`

### 3.2 Upload to Web Server

**Option A: WordPress**
1. Create a new Page
2. Set permalink to `/network/vpn/vpn-stability-ranking/`
3. Switch to **Text/HTML** editor
4. Paste the entire HTML content
5. Publish

**Option B: Static Hosting (Netlify, Vercel, GitHub Pages)**
1. Upload `vpn-stability-ranking.html` as `index.html`
2. Upload `vpn-stability-widget.html` to `/widget/index.html`
3. Deploy

**Option C: FTP/cPanel**
1. Create directory: `/public_html/network/vpn-stability-ranking/`
2. Upload `vpn-stability-ranking.html` → rename to `index.html`
3. Create subdirectory: `/widget/`
4. Upload `vpn-stability-widget.html` → rename to `index.html`

### 3.3 Verify Deployment

Visit your URL:
```
https://yourdomain.com/network/vpn/vpn-stability-ranking/
```

**Expected result:**
- Region selection buttons appear
- Stability ranking table loads
- Radar chart displays
- Speed trend chart displays (if 30+ days of data)

---

## Step 4: Twitter Bot Setup (Optional)

### 4.1 Get Twitter API Credentials

1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Create a new **Project** and **App**
3. Navigate to **Keys and tokens**
4. Generate:
   - API Key & Secret
   - Access Token & Secret (with **Read and Write** permissions)

### 4.2 Add Twitter Script

1. In Apps Script editor, click **+ → Script**
2. Name it `twitter-oauth1-fixed`
3. Copy contents from `gas/twitter-oauth1-fixed.gs`
4. Paste and save

### 4.3 Configure Script Properties

Already done in Step 2.3 if you added Twitter credentials.

### 4.4 Setup Triggers

1. In Apps Script editor, select `setupTwitterTriggers` function
2. Click **Run**
3. Verify triggers created:
   - Click **Triggers** (⏰ icon on left sidebar)
   - Should see 3 triggers for `generateAndPostTweet`
   - Times: 10:00, 15:00, 20:00 (your timezone)

### 4.5 Test Tweet

1. Select `generateAndPostTweet` function
2. Click **Run**
3. Check your Twitter account for the posted tweet

---

## Step 5: Verification & Testing

### 5.1 Test API Endpoints

**Stability Ranking:**
```bash
curl "https://script.google.com/macros/s/YOUR_ID/exec?type=stability&region=JP"
```

**Radar Chart:**
```bash
curl "https://script.google.com/macros/s/YOUR_ID/exec?type=radar&region=US"
```

**Speed Trend:**
```bash
curl "https://script.google.com/macros/s/YOUR_ID/exec?type=trend&vpn=NordVPN&region=UK"
```

### 5.2 Verify Measurement Triggers

1. In Apps Script, click **Executions** (📊 icon)
2. Verify `measureAllRegions` runs every 6 hours
3. Check execution logs for errors

### 5.3 Check Data Accumulation

1. Open `地域別データ` sheet
2. Verify new rows are added every 6 hours
3. Each measurement should create 60 rows (15 VPNs × 4 regions)

---

## Troubleshooting

### Problem: "Authorization required" error

**Solution:**
1. Re-run `initialSetup`
2. Grant all requested permissions
3. Make sure "Who has access" is set to "Anyone"

### Problem: API returns empty data

**Solution:**
1. Check `地域別データ` sheet has data
2. Verify timestamps are recent (within 30 days)
3. Run `measureAllRegions` manually to populate data

### Problem: Charts not displaying

**Solution:**
1. Open browser console (F12)
2. Check for JavaScript errors
3. Verify API_URL is correct
4. Ensure Chart.js CDN is loading

### Problem: Twitter bot not posting

**Solution:**
1. Verify Script Properties contain all 4 Twitter credentials
2. Check Executions log for errors
3. Ensure Twitter app has **Read and Write** permissions
4. Test with `generateAndPostTweet` manual run

### Problem: "Script timeout" error

**Solution:**
1. Reduce number of VPNs measured per execution
2. Split measurement across multiple functions
3. Use exponential backoff for retries

---

## Maintenance

### Daily Tasks
- None (fully automated)

### Weekly Tasks
- Check Executions log for errors
- Verify data is accumulating correctly

### Monthly Tasks
- Review Twitter bot engagement
- Update VPN characteristics if needed
- Check Google Apps Script quota usage

---

## Quota Limits

**Google Apps Script (Free Tier):**
- Trigger total runtime: 90 min/day
- URL Fetch calls: 20,000/day
- Email quota: 100/day
- Execution time: 6 min/execution

**Twitter API (Free Tier):**
- Tweet cap: 1,500/month
- Read: 10,000/month

**Current Usage:**
- Measurements: 4/day × ~2 min = 8 min/day
- Twitter: 3 tweets/day = 90/month
- **Well within limits** ✅

---

## Updating the System

### Update Apps Script

1. Edit Code.gs in Apps Script editor
2. Save changes
3. **Deploy → Manage deployments**
4. Click **✏️ Edit** next to active deployment
5. Change **Version** to **New version**
6. Click **Deploy**

**Note:** Web App URL remains the same.

### Update Frontend

1. Edit HTML files
2. Re-upload to web server
3. Clear browser cache (Ctrl+Shift+R)

---

## Backup

### Google Sheets Backup

**Automated:**
- Google Sheets auto-saves every change
- Version history available (File → Version history)

**Manual:**
1. File → Download → Microsoft Excel (.xlsx)
2. Save to local drive or cloud storage

### Apps Script Backup

1. In Apps Script editor, click **⋮ → Download → Download as .zip**
2. Contains all .gs files
3. Save to version control (Git) for best practice

---

## Security Best Practices

1. **Never commit API keys to Git**
   - Use `.gitignore` to exclude config files
   - Store credentials in Script Properties

2. **Restrict Apps Script access**
   - Keep "Execute as: Me"
   - Only set "Who has access: Anyone" for Web App

3. **Monitor API usage**
   - Check Executions log regularly
   - Set up alerts for quota limits

4. **Use HTTPS only**
   - Ensure frontend is served over HTTPS
   - Verify Web App URL uses `https://`

---

## Production Checklist

- [ ] Google Sheets created with correct structure
- [ ] Apps Script deployed as Web App
- [ ] Script Properties configured (if using Twitter bot)
- [ ] Triggers set up for measurements
- [ ] Frontend HTML updated with API_URL
- [ ] Frontend uploaded to web server
- [ ] API endpoints tested successfully
- [ ] Charts rendering correctly
- [ ] Twitter bot posting (if enabled)
- [ ] Data accumulating in sheets
- [ ] Backup strategy in place

---

## Support

If you encounter issues:

1. Check [Troubleshooting](#troubleshooting) section
2. Review [API Documentation](API.md)
3. Open a [GitHub Issue](https://github.com/hmy0210/vpn-stability-ranking/issues)
4. Contact via [Twitter](https://twitter.com/remoteaccessvpn)

---

**Deployment complete! 🎉**

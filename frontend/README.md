# Frontend - VPN Widgets & Tools

Client-side VPN tools and widgets for embedding in websites.

## 📦 Files

### Standalone Tools

**vpn-diagnosis-tool.html** - Complete VPN security diagnostic tool
- DNS leak detection
- WebRTC leak detection
- IPv6 leak detection
- IP address tracking & comparison
- SNS sharing functionality
- 100% client-side (no server required)
- Fully responsive design

### Embeddable Widgets

**vpn-widgets-complete.html** - All-in-one widgets (HTML + CSS + JS)
- VPN speed ranking TOP5
- VPN pricing comparison (with currency conversion)
- Use-case based recommendations
- VPN diagnostic tool
- Ready to use - just open in browser

**vpn-widgets.html** - HTML snippets only
- Markup for all 4 widgets
- Use with separate CSS/JS files
- Perfect for WordPress/CMS integration

**vpn-widgets.css** - Stylesheet for widgets (COMING SOON)
- Scoped styles (won't affect your site)
- Mobile-responsive
- Modern gradient designs

**vpn-widgets.js** - JavaScript for widgets (COMING SOON)
- Real-time data fetching
- API integration
- Interactive functionality
- No dependencies

## 🎯 Features

### 1. VPN Speed Ranking Widget
- Displays TOP5 fastest VPNs
- Real-time data from Google Apps Script API
- Auto-updates every 6 hours
- Shows download speed, ping, stability score
- Affiliate links ready

### 2. VPN Pricing Comparison Widget
- TOP5 cheapest VPNs (JPY converted)
- Real-time currency exchange rates
- Fallback to default prices if API fails
- Shows original price + converted price
- Mobile-optimized layout

### 3. Use-Case Recommendation Widget
- Tab-based interface (Streaming / Gaming / Privacy / Torrenting)
- Algorithm-based recommendations
- Detailed stats for each VPN
- Responsive grid layout

### 4. VPN Diagnosis Tool Widget
- 3-question survey
- Personalized VPN recommendation
- Shows TOP3 alternatives
- Match score calculation
- Based on real performance data

### 5. VPN Security Diagnostic Tool
- IP address detection with geolocation
- DNS leak checking (multiple servers)
- WebRTC leak detection (ICE candidates)
- IPv6 leak detection
- IP history comparison (localStorage)
- Security score (0-100)
- SNS sharing (Twitter, LINE, Facebook)
- Copy link to clipboard

## 🚀 Quick Start

### Option 1: Standalone Diagnostic Tool

```bash
# Just open in browser
open vpn-diagnosis-tool.html
```

No server, no build process, no dependencies!

### Option 2: All-in-One Widgets

```bash
# Open the complete widgets page
open vpn-widgets-complete.html
```

All 4 widgets in one page with live data.

### Option 3: WordPress/CMS Integration

**Step 1:** Add CSS to your theme
```html
<link rel="stylesheet" href="path/to/vpn-widgets.css">
```

**Step 2:** Add HTML where you want widgets
```html
<!-- Copy from vpn-widgets.html -->
<div id="vpn-speed-widget">
  <!-- Widget content -->
</div>
```

**Step 3:** Add JavaScript before `</body>`
```html
<script src="path/to/vpn-widgets.js"></script>
```

## 🔧 Configuration

### API Endpoints

Edit the API configuration in `vpn-widgets.js`:

```javascript
const API_CONFIG = {
  speedRanking: 'https://script.google.com/macros/s/YOUR_ID/exec',
  pricing: 'https://script.google.com/macros/s/YOUR_ID/exec',
  exchangeRate: 'https://open.er-api.com/v6/latest/JPY'
};
```

### VPN Logos

Update logo URLs in `vpn-widgets.js`:

```javascript
const VPN_LOGOS = {
  'NordVPN': 'https://your-domain.com/logos/nordvpn.png',
  'ExpressVPN': 'https://your-domain.com/logos/expressvpn.png',
  // Add more...
};
```

### Affiliate Links

Update affiliate links:

```javascript
const VPN_LINKS = {
  'NordVPN': 'https://your-affiliate-link.com/nordvpn',
  'ExpressVPN': 'https://your-affiliate-link.com/expressvpn',
  // Add more...
};
```

## 📊 Widget Specifications

### Speed Ranking Widget

**Data Source:** Google Apps Script Web App API  
**Update Frequency:** Every 6 hours  
**Data Points:** Download speed, Upload speed, Ping, Stability, Reliability  
**Display:** TOP5 VPNs sorted by overall score  

**API Response Format:**
```json
{
  "status": "success",
  "data": [
    {
      "name": "NordVPN",
      "download": 460,
      "upload": 230,
      "ping": 15,
      "stability": 95.2,
      "reliability": 100,
      "totalScore": 97.8,
      "rank": 1
    }
  ],
  "lastUpdate": "2025-12-20T10:00:00Z"
}
```

### Pricing Widget

**Data Source:** Google Apps Script + Open Exchange Rates API  
**Currency Conversion:** Real-time JPY rates  
**Fallback:** Static prices if API fails  
**Display:** TOP5 cheapest VPNs (monthly price)  

**Supported Currencies:** USD, EUR, GBP, JPY  

### Use-Case Widget

**Categories:**
- Streaming (sorted by download speed)
- Gaming (sorted by ping)
- Privacy (sorted by reliability)
- Torrenting (composite score: speed + reliability)

**Each Card Shows:**
- Rank badge
- VPN logo
- Reason for recommendation
- Key stats (3-4 metrics)
- Affiliate link

### Diagnosis Tool Widget

**Survey Flow:**
1. Purpose selection (5 options)
2. Priority selection (3 options)
3. Budget selection (3 options)

**Recommendation Algorithm:**
- Base score from performance data
- Bonus points based on use case
- Weighted scoring system
- TOP3 results displayed

## 🎨 Customization

### Change Colors

Edit CSS variables:

```css
:root {
  --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --success-color: #10b981;
  --warning-color: #fbbf24;
}
```

### Modify Widget Layout

Widgets use CSS Grid for responsive layouts:

```css
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 10px;
}
```

### Add Custom VPNs

Add to the VPN lists in your backend Google Apps Script:

```javascript
const VPN_LIST = [
  { name: 'NordVPN', url: 'https://nordvpn.com/' },
  { name: 'YourCustomVPN', url: 'https://yourcustomvpn.com/' }
];
```

## 📱 Mobile Responsiveness

All widgets are fully responsive:

- **Desktop (>600px):** Multi-column layouts, larger logos
- **Tablet (600px):** 2-column grids, medium logos
- **Mobile (<600px):** Single column, stacked layouts
- **Small Mobile (<360px):** Compact spacing, smaller fonts

Media queries handle all breakpoints automatically.

## 🔒 Security & Privacy

### Diagnostic Tool
- **100% Client-Side:** No data sent to external servers
- **API Calls:** Only to public IP lookup services (ip-api.com, ipapi.co)
- **Local Storage:** IP history stored in browser only
- **No Tracking:** No analytics, no cookies

### Widgets
- **API Security:** HTTPS only
- **CORS Enabled:** Can be embedded anywhere
- **No User Data:** Only fetches public VPN performance data
- **Rate Limiting:** Cached responses to avoid quota limits

## 🐛 Troubleshooting

### Widgets Not Loading

**Problem:** Widgets show "Loading..." indefinitely  
**Solutions:**
- Check API endpoint URLs in `vpn-widgets.js`
- Verify CORS is enabled on your API
- Check browser console for errors
- Try the fallback mode (static data)

### Incorrect Currency Conversion

**Problem:** Prices don't match official websites  
**Solutions:**
- Verify exchange rate API is accessible
- Check fallback rates in `vpn-widgets.js`
- Update pricing data in backend

### Styling Conflicts

**Problem:** Widgets look broken on your site  
**Solutions:**
- All styles are scoped to widget IDs
- Use `!important` if needed
- Check for conflicting CSS frameworks
- Use iframe for complete isolation

## 📚 Examples

### Embed Single Widget

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="vpn-widgets.css">
</head>
<body>
  <h1>My VPN Review Site</h1>
  
  <!-- Just the speed ranking widget -->
  <div id="vpn-speed-widget">
    <!-- Content from vpn-widgets.html -->
  </div>
  
  <script src="vpn-widgets.js"></script>
</body>
</html>
```

### Embed All Widgets

```html
<!-- Speed Ranking -->
<div id="vpn-speed-widget">...</div>

<!-- Pricing Comparison -->
<div id="vpn-pricing-widget">...</div>

<!-- Use-Case Recommendations -->
<div id="vpn-usecase-widget">...</div>

<!-- Diagnostic Tool -->
<div id="vpn-diagnosis-widget">...</div>

<script src="vpn-widgets.js"></script>
```

### WordPress Shortcode (Example)

```php
function vpn_speed_widget_shortcode() {
  ob_start();
  include 'widgets/vpn-widgets.html';
  return ob_get_clean();
}
add_shortcode('vpn_speed_ranking', 'vpn_speed_widget_shortcode');
```

Usage: `[vpn_speed_ranking]`

## 🔗 Integration with Backend

These widgets connect to Google Apps Script backend:

**Required Scripts:**
- `gas/vpn-speed-tracker.gs` → Speed ranking data
- `gas/price-scraper.gs` → Pricing data
- `gas/config.gs` → Configuration

**API Deployment:**
1. Deploy Apps Script as Web App
2. Set access to "Anyone"
3. Copy deployment URL
4. Update `API_CONFIG` in `vpn-widgets.js`

See `/gas/README.md` for backend setup.

## 🆘 Getting Help

- **GitHub Issues:** Report bugs or request features
- **Discussions:** Ask questions or share ideas
- **Documentation:** Check `/docs` folder
- **Examples:** See `vpn-widgets-complete.html`

## 📈 Performance

### Load Times
- **Diagnostic Tool:** < 1MB, loads in ~500ms
- **Widgets:** < 500KB total, loads in ~300ms
- **API Response:** Cached for 5-10 minutes

### Browser Support
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

### Accessibility
- Semantic HTML5
- ARIA labels on interactive elements
- Keyboard navigation support
- Screen reader friendly

## 🎁 Bonus Features

### IP History Comparison (Diagnostic Tool)
- Stores last IP visit in localStorage
- Shows difference on return visit
- Useful for VPN effectiveness testing

### Real-Time Currency Conversion
- Fetches latest exchange rates
- Displays both original and converted prices
- Updates automatically

### Smart Caching
- API responses cached in browser
- Reduces server load
- Faster subsequent loads

---

**Ready to use!** 🚀

Start with `vpn-widgets-complete.html` to see everything in action, then customize as needed.

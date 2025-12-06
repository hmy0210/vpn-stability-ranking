# VPN Speed Ranking System

🚀 **Automated VPN speed measurement and ranking system**

Automatically measures VPN speeds every 6 hours, updates a live dashboard, and posts rankings to Twitter.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-blstweb.jp-blue)](https://www.blstweb.jp/network/vpn/vpn-speed-ranking/)
[![Twitter Bot](https://img.shields.io/badge/Twitter-@remoteaccessvpn-1DA1F2?logo=twitter)](https://twitter.com/remoteaccessvpn)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- ✅ **Automated measurements** - Runs every 6 hours via Google Apps Script triggers
- ✅ **Real-time dashboard** - Live ranking updates
- ✅ **Twitter integration** - Auto-posts rankings 3x daily
- ✅ **Embeddable widget** - Use on any website
- ✅ **Zero cost** - Runs completely free on Google Apps Script
- ✅ **Historical data** - Tracks speed trends over time

## Live Demo

🔗 **Dashboard:** https://www.blstweb.jp/network/vpn/vpn-speed-ranking/

🔗 **Widget:** https://www.blstweb.jp/network/widget/

🐦 **Twitter Bot:** https://twitter.com/remoteaccessvpn

## Tech Stack

- **Backend:** Google Apps Script
- **Database:** Google Sheets
- **API:** Google Apps Script Web Apps
- **Frontend:** HTML + Vanilla JavaScript
- **Social:** Twitter API v2 (OAuth 1.0a)
- **Hosting:** Any web server

## System Architecture

```
Google Apps Script (Measurement)
    ↓
Google Sheets (Data Storage)
    ↓
Web Apps API (JSON endpoint)
    ↓
HTML/JavaScript (Frontend)
    ↓
Twitter API (Auto-posting)
```

## Quick Start

### 1. Setup Google Apps Script

1. Create a new Google Sheet
2. Extensions → Apps Script
3. Copy code from `src/vpn-speed-tracker.gs`
4. Save and authorize

### 2. Configure Triggers

Run `setupTriggers()` to create automated execution:
- Every 6 hours: Data measurement
- Daily at 10:00, 15:00, 20:00: Twitter posting

### 3. Deploy Web App

1. Click "Deploy" → "New deployment"
2. Type: Web app
3. Execute as: Me
4. Who has access: Anyone
5. Copy the web app URL

### 4. Setup Frontend

1. Update `API_URL` in `frontend/index.html` with your web app URL
2. Upload to your web server
3. Done!

## Configuration

### VPN Services

Edit the VPN list in `vpn-speed-tracker.gs`:

```javascript
const VPN_SERVICES = [
  { name: 'NordVPN', baseSpeed: 500 },
  { name: 'ExpressVPN', baseSpeed: 450 },
  // Add more VPNs...
];
```

### Twitter Integration (Optional)

To enable Twitter auto-posting:

1. Get Twitter API credentials from https://developer.twitter.com
2. Update `TWITTER_CONFIG` in `src/twitter-auto-post.gs`
3. Run `setupTwitterTriggers()`

### Measurement Region

Currently measures from Tokyo, Japan. To add more regions:
- Deploy multiple Google Apps Script instances in different Google Cloud regions
- Aggregate data in a central sheet

## File Structure

```
vpn-speed-ranking/
├── src/
│   ├── vpn-speed-tracker.gs      # Main measurement script
│   ├── twitter-auto-post.gs      # Twitter bot
│   └── data-processor.gs         # Data analysis
├── frontend/
│   ├── index.html                # Main dashboard
│   └── widget.html               # Embeddable widget
├── docs/
│   ├── setup-guide.md            # Detailed setup
│   └── api-reference.md          # API documentation
└── README.md
```

## API Reference

### Get Latest Rankings

```
GET https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

**Response:**
```json
{
  "data": [
    {
      "name": "NordVPN",
      "download": 507,
      "upload": 450,
      "ping": 13,
      "totalScore": 93.8
    }
  ],
  "lastUpdate": "2025-12-06T10:00:00Z",
  "region": "Tokyo"
}
```

## Roadmap

- [ ] Multi-region support (US, UK, SG, DE)
- [ ] Historical trend graphs
- [ ] VPN downtime detection
- [ ] Price tracking & alerts
- [ ] Public dataset on Kaggle
- [ ] Slack/Discord notifications
- [ ] GitHub Actions integration

## Cost

**$0/month** - Completely free to run

| Service | Cost |
|---------|------|
| Google Apps Script | Free |
| Google Sheets | Free |
| Twitter API | Free (Basic tier) |
| Hosting | Free (or use existing) |

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

Built by [blstweb.jp](https://www.blstweb.jp)

- Website: https://www.blstweb.jp
- Twitter: [@remoteaccessvpn](https://twitter.com/remoteaccessvpn)

## Related Articles

- [note (Japanese)](https://note.com/hmy0210/) - Project introduction
- [Qiita (Japanese)](https://qiita.com/blstweb) - Technical deep dive

## Acknowledgments

- Google Apps Script for providing free automation
- Twitter API for social integration
- VPN providers for their services

---

⭐ If you find this project useful, please consider giving it a star!

# 📡 API Documentation

This document describes all API endpoints available in the Tokyo VPN Speed Monitor system.

---

## Base URLs

After deploying the Google Apps Script projects as Web Apps, you'll have two base URLs:

```
Main Project:    https://script.google.com/macros/s/{MAIN_DEPLOYMENT_ID}/exec
Trust Project:   https://script.google.com/macros/s/{TRUST_DEPLOYMENT_ID}/exec
```

---

## Main Project Endpoints

### 1. Speed Ranking

Get the latest speed ranking for all monitored VPNs.

**Endpoint:**
```
GET ?type=ranking
```

**Response:**
```json
{
  "lastUpdate": "2026-01-21T10:00:00.000Z",
  "region": "JP",
  "regionName": "日本（東京）",
  "updateInterval": "6時間ごと",
  "vpnCount": 15,
  "data": [
    {
      "timestamp": "2026-01-21T10:00:00.000Z",
      "name": "NordVPN",
      "download": 485.2,
      "upload": 312.5,
      "ping": 12.3,
      "stability": 87,
      "reliability": 98,
      "totalScore": 97.8,
      "rank": 1,
      "stabilityScore7d": 94.5
    },
    {
      "timestamp": "2026-01-21T10:00:00.000Z",
      "name": "ExpressVPN",
      "download": 452.1,
      "upload": 298.4,
      "ping": 15.2,
      "stability": 88,
      "reliability": 97,
      "totalScore": 95.2,
      "rank": 2,
      "stabilityScore7d": 92.3
    }
  ]
}
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `lastUpdate` | ISO Date | Last measurement timestamp |
| `region` | String | Region code (JP) |
| `regionName` | String | Region name in Japanese |
| `updateInterval` | String | Measurement frequency |
| `vpnCount` | Number | Number of VPNs in ranking |
| `data[].name` | String | VPN service name |
| `data[].download` | Number | Download speed (Mbps) |
| `data[].upload` | Number | Upload speed (Mbps) |
| `data[].ping` | Number | Latency (ms) |
| `data[].stability` | Number | Instant stability score (0-100) |
| `data[].reliability` | Number | Connection reliability (%) |
| `data[].totalScore` | Number | Overall score (0-100) |
| `data[].rank` | Number | Current ranking position |
| `data[].stabilityScore7d` | Number | 7-day stability score |

---

### 2. Stability Scores

Get detailed stability analysis based on 7-day historical data.

**Endpoint:**
```
GET ?type=stability
```

**Response:**
```json
{
  "region": "JP",
  "regionName": "日本（東京）",
  "period": "過去7日間",
  "lastUpdate": "2026-01-21T10:00:00.000Z",
  "data": [
    {
      "name": "NordVPN",
      "stabilityScore": 94.5,
      "avgSpeed": 480,
      "speedStdDev": 15.2,
      "avgPing": 12.5,
      "pingStdDev": 2.1,
      "reliability": 98.0,
      "dataPoints": 28
    }
  ]
}
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `data[].stabilityScore` | Number | Calculated stability (0-100) |
| `data[].avgSpeed` | Number | Average download speed (Mbps) |
| `data[].speedStdDev` | Number | Speed standard deviation |
| `data[].avgPing` | Number | Average latency (ms) |
| `data[].pingStdDev` | Number | Latency standard deviation |
| `data[].reliability` | Number | Average reliability (%) |
| `data[].dataPoints` | Number | Number of measurements |

---

### 3. Price Data

Get the latest pricing information for all VPNs.

**Endpoint:**
```
GET ?action=getPricing
```

**Response:**
```json
{
  "success": true,
  "lastUpdate": "2026-01-21T09:00:00.000Z",
  "count": 15,
  "data": [
    {
      "name": "NordVPN",
      "price": 370,
      "currency": "JPY",
      "lastUpdate": "2026-01-21T09:00:00.000Z",
      "isFallback": false,
      "method": "scraperapi"
    },
    {
      "name": "ExpressVPN",
      "price": 524,
      "currency": "JPY",
      "lastUpdate": "2026-01-21T09:00:00.000Z",
      "isFallback": false,
      "method": "direct"
    }
  ]
}
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `data[].price` | Number | Monthly price |
| `data[].currency` | String | Currency code (JPY, USD, EUR) |
| `data[].isFallback` | Boolean | Whether fallback price was used |
| `data[].method` | String | Scraping method used |

---

## Trust Score Project Endpoints

### 4. Trust Scores

Get privacy and transparency scores for all VPNs.

**Endpoint:**
```
GET ?action=getTrustScores
```

**Response:**
```json
{
  "success": true,
  "lastUpdate": "2026-01-01T10:00:00.000Z",
  "count": 15,
  "data": [
    {
      "vpnName": "Mullvad",
      "headquarters": "スウェーデン",
      "scores": {
        "noLogPolicy": 5,
        "thirdPartyAudit": 5,
        "transparencyReport": 4,
        "jurisdiction": 3,
        "dataRetention": 5,
        "openSource": 5,
        "ramOnlyServers": 5,
        "incidentResponse": 5,
        "legalResponse": 5,
        "operatingYears": 5
      },
      "totalScore": 92,
      "grade": "A",
      "lastUpdate": "2026-01-01T10:00:00.000Z"
    }
  ]
}
```

**Score Fields (1-5 scale):**
| Field | Max Points | Description |
|-------|------------|-------------|
| `noLogPolicy` | 5 | No-log policy clarity and verification |
| `thirdPartyAudit` | 5 | Independent security audits |
| `transparencyReport` | 5 | Transparency report publication |
| `jurisdiction` | 5 | Privacy-friendly jurisdiction |
| `dataRetention` | 5 | Data retention policy |
| `openSource` | 5 | Open source status |
| `ramOnlyServers` | 5 | RAM-only server infrastructure |
| `incidentResponse` | 5 | Security incident handling |
| `legalResponse` | 5 | Response to legal requests |
| `operatingYears` | 5 | Track record length |

**Grade Scale:**
| Grade | Score Range |
|-------|-------------|
| A | 85-100 |
| B | 70-84 |
| C | 55-69 |
| D | 40-54 |
| F | 0-39 |

---

### 5. Integrated Ranking

Get combined ranking with speed, price, and trust scores.

**Endpoint:**
```
GET ?action=getIntegrated
```

**Response:**
```json
{
  "success": true,
  "lastUpdate": "2026-01-21T10:00:00.000Z",
  "count": 15,
  "weights": {
    "trust": "30%",
    "speed": "30%",
    "price": "20%",
    "stability": "20%"
  },
  "data": [
    {
      "rank": 1,
      "vpnName": "NordVPN",
      "headquarters": "パナマ",
      "trustScore": 85,
      "trustGrade": "A",
      "downloadSpeed": 485,
      "uploadSpeed": 312,
      "ping": 12,
      "speedScore": 97.8,
      "stabilityScore": 94.5,
      "price": 370,
      "currency": "JPY",
      "priceScore": 87,
      "integratedScore": 91
    }
  ]
}
```

---

### 6. VPN Detail

Get detailed information for a specific VPN.

**Endpoint:**
```
GET ?action=getVPNDetail&vpn={VPN_NAME}
```

**Example:**
```
GET ?action=getVPNDetail&vpn=NordVPN
```

**Response:**
```json
{
  "success": true,
  "data": {
    "vpnName": "NordVPN",
    "headquarters": "パナマ",
    "scores": {
      "noLogPolicy": 5,
      "thirdPartyAudit": 5,
      "transparencyReport": 4,
      "jurisdiction": 5,
      "dataRetention": 5,
      "openSource": 3,
      "ramOnlyServers": 5,
      "incidentResponse": 4,
      "legalResponse": 5,
      "operatingYears": 4
    },
    "totalScore": 85,
    "grade": "A",
    "jurisdictionInfo": {
      "fiveEyes": false,
      "nineEyes": false,
      "fourteenEyes": false,
      "dataRetention": "なし",
      "score": 5
    },
    "lastUpdate": "2026-01-01T10:00:00.000Z"
  }
}
```

---

### 7. Jurisdiction Database

Get the complete jurisdiction database.

**Endpoint:**
```
GET ?action=getJurisdiction
```

**Response:**
```json
{
  "success": true,
  "count": 12,
  "data": [
    {
      "country": "パナマ",
      "fiveEyes": false,
      "nineEyes": false,
      "fourteenEyes": false,
      "dataRetention": "なし",
      "score": 5
    },
    {
      "country": "アメリカ",
      "fiveEyes": true,
      "nineEyes": true,
      "fourteenEyes": true,
      "dataRetention": "あり",
      "score": 1
    }
  ]
}
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": "Error message",
  "message": "Human-readable description"
}
```

**Common Errors:**
| Error | Description |
|-------|-------------|
| `No data available` | Run measurement/scraping first |
| `VPN not found` | Invalid VPN name parameter |
| `Invalid type parameter` | Unknown endpoint type |
| `Unknown action` | Invalid action parameter |

---

## Rate Limits

- Google Apps Script: 20,000 calls/day per user
- No artificial rate limits imposed
- Recommended: Cache responses for 5+ minutes

---

## CORS

All endpoints support CORS and can be called from any domain.

---

## Usage Examples

### JavaScript (Fetch)

```javascript
// Get speed ranking
fetch('https://script.google.com/macros/s/YOUR_ID/exec?type=ranking')
  .then(response => response.json())
  .then(data => console.log(data));

// Get trust scores
fetch('https://script.google.com/macros/s/YOUR_TRUST_ID/exec?action=getTrustScores')
  .then(response => response.json())
  .then(data => console.log(data));
```

### Python (Requests)

```python
import requests

# Get speed ranking
response = requests.get('https://script.google.com/macros/s/YOUR_ID/exec?type=ranking')
data = response.json()
print(data)

# Get integrated ranking
response = requests.get('https://script.google.com/macros/s/YOUR_TRUST_ID/exec?action=getIntegrated')
data = response.json()
print(data)
```

### cURL

```bash
# Get speed ranking
curl "https://script.google.com/macros/s/YOUR_ID/exec?type=ranking"

# Get trust scores
curl "https://script.google.com/macros/s/YOUR_TRUST_ID/exec?action=getTrustScores"
```

---

## Webhook Integration

For price change alerts and outage notifications, the system posts to Twitter automatically. To receive notifications via other channels, you can:

1. Set up a webhook endpoint
2. Modify `twitter-oauth1-post-fixed.gs` to call your webhook
3. Or periodically poll the API endpoints

---

## Data Freshness

| Data Type | Update Frequency |
|-----------|------------------|
| Speed Ranking | Every 6 hours |
| Stability Score | Calculated on request (7-day window) |
| Price Data | Daily at 9:00 AM JST |
| Trust Score | Monthly on 1st |
| Integrated Ranking | Calculated on request |

---

## Support

For API issues, please open a GitHub issue at:
https://github.com/hmy0210/vpn-stability-ranking/issues

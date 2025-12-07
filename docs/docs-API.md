# API Documentation

The VPN Stability Ranking System provides a REST API for accessing real-time stability data.

## Base URL

```
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

Replace `YOUR_DEPLOYMENT_ID` with your actual Google Apps Script deployment ID.

---

## Endpoints

### 1. Get Stability Ranking

Returns stability scores for all VPNs in a specific region.

**Endpoint:**
```
GET /exec?type=stability&region={REGION}
```

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | string | Yes | Must be `stability` |
| `region` | string | Yes | Region code: `JP`, `US`, `UK`, `SG` |

**Example Request:**
```bash
curl "https://script.google.com/macros/s/YOUR_ID/exec?type=stability&region=JP"
```

**Example Response:**
```json
{
  "region": "JP",
  "regionName": "日本（東京）",
  "lastUpdate": "2025-12-07T10:00:00.000Z",
  "data": [
    {
      "name": "NordVPN",
      "stabilityScore": 98.5,
      "avgSpeed": 480,
      "speedStdDev": 12,
      "avgPing": 12.5,
      "pingStdDev": 1.2,
      "reliability": 98.0,
      "dataPoints": 120
    },
    {
      "name": "ExpressVPN",
      "stabilityScore": 97.2,
      "avgSpeed": 450,
      "speedStdDev": 18,
      "avgPing": 15.3,
      "pingStdDev": 1.8,
      "reliability": 97.0,
      "dataPoints": 118
    }
  ]
}
```

**Response Fields:**
- `region`: Region code
- `regionName`: Region name in Japanese
- `lastUpdate`: ISO 8601 timestamp of last measurement
- `data`: Array of VPN stability data
  - `name`: VPN service name
  - `stabilityScore`: Overall stability score (0-100)
  - `avgSpeed`: Average download speed (Mbps)
  - `speedStdDev`: Standard deviation of speed (Mbps)
  - `avgPing`: Average ping (ms)
  - `pingStdDev`: Standard deviation of ping (ms)
  - `reliability`: Connection success rate (%)
  - `dataPoints`: Number of measurements in 30-day period

---

### 2. Get Radar Chart Data

Returns 5-axis evaluation data for radar chart visualization.

**Endpoint:**
```
GET /exec?type=radar&region={REGION}
```

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | string | Yes | Must be `radar` |
| `region` | string | Yes | Region code: `JP`, `US`, `UK`, `SG` |

**Example Request:**
```bash
curl "https://script.google.com/macros/s/YOUR_ID/exec?type=radar&region=US"
```

**Example Response:**
```json
{
  "region": "US",
  "data": [
    {
      "name": "NordVPN",
      "scores": {
        "speed": 95,
        "stability": 98,
        "regional": 92,
        "ping": 94,
        "reliability": 99
      }
    },
    {
      "name": "ExpressVPN",
      "scores": {
        "speed": 92,
        "stability": 96,
        "regional": 95,
        "ping": 90,
        "reliability": 97
      }
    }
  ]
}
```

**Score Calculation:**
- `speed`: Normalized average speed (0-100)
- `stability`: Stability score from stability calculation
- `regional`: Average performance across all 4 regions (0-100)
- `ping`: Normalized ping score (lower is better)
- `reliability`: Connection success rate (%)

---

### 3. Get Speed Trend

Returns historical speed data for a specific VPN in a region.

**Endpoint:**
```
GET /exec?type=trend&vpn={VPN_NAME}&region={REGION}
```

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | string | Yes | Must be `trend` |
| `vpn` | string | Yes | VPN service name (URL-encoded) |
| `region` | string | Yes | Region code: `JP`, `US`, `UK`, `SG` |

**Example Request:**
```bash
curl "https://script.google.com/macros/s/YOUR_ID/exec?type=trend&vpn=NordVPN&region=UK"
```

**Example Response:**
```json
{
  "vpn": "NordVPN",
  "region": "UK",
  "data": [
    {
      "date": "2025-11-07 10:00",
      "speed": 485
    },
    {
      "date": "2025-11-07 16:00",
      "speed": 478
    },
    {
      "date": "2025-11-07 22:00",
      "speed": 462
    },
    {
      "date": "2025-11-08 04:00",
      "speed": 490
    }
  ]
}
```

**Response Fields:**
- `vpn`: VPN service name
- `region`: Region code
- `data`: Array of historical measurements
  - `date`: Measurement timestamp (YYYY-MM-DD HH:mm format)
  - `speed`: Download speed (Mbps)

---

## Region Codes

| Code | Region | City |
|------|--------|------|
| `JP` | Japan | Tokyo |
| `US` | United States | Virginia |
| `UK` | United Kingdom | London |
| `SG` | Singapore | Singapore |

---

## Supported VPN Services

The API tracks the following VPN services:

1. NordVPN
2. ExpressVPN
3. Surfshark
4. CyberGhost
5. Private Internet Access
6. ProtonVPN
7. IPVanish
8. VyprVPN
9. PureVPN
10. Hotspot Shield
11. Windscribe
12. TunnelBear
13. Hide.me
14. ZenMate
15. PrivateVPN

---

## Rate Limits

The API is hosted on Google Apps Script with the following limits:

- **Executions per day**: 20,000 (Free tier)
- **Execution time**: 6 minutes max per request
- **Bandwidth**: No specific limit

**Best Practices:**
- Cache responses on client-side
- Implement exponential backoff for retries
- Avoid excessive polling (5-minute intervals recommended)

---

## Error Handling

**HTTP Status Codes:**
- `200 OK`: Successful request
- `400 Bad Request`: Invalid parameters
- `500 Internal Server Error`: Server error

**Error Response:**
```json
{
  "error": "Invalid type parameter",
  "message": "type must be one of: stability, radar, trend"
}
```

---

## CORS

The API supports CORS and can be called from any domain.

**Headers:**
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type`

---

## Example Usage

### JavaScript (Fetch API)

```javascript
async function getStabilityRanking(region = 'JP') {
  const API_URL = 'https://script.google.com/macros/s/YOUR_ID/exec';
  
  try {
    const response = await fetch(`${API_URL}?type=stability&region=${region}`);
    const data = await response.json();
    
    console.log(`Top VPN in ${region}:`, data.data[0].name);
    console.log(`Stability Score:`, data.data[0].stabilityScore);
  } catch (error) {
    console.error('API Error:', error);
  }
}

getStabilityRanking('US');
```

### Python (Requests)

```python
import requests

API_URL = 'https://script.google.com/macros/s/YOUR_ID/exec'

def get_stability_ranking(region='JP'):
    params = {
        'type': 'stability',
        'region': region
    }
    
    response = requests.get(API_URL, params=params)
    data = response.json()
    
    print(f"Top VPN in {region}: {data['data'][0]['name']}")
    print(f"Stability Score: {data['data'][0]['stabilityScore']}")

get_stability_ranking('UK')
```

### cURL

```bash
# Get stability ranking
curl "https://script.google.com/macros/s/YOUR_ID/exec?type=stability&region=JP"

# Get radar chart data
curl "https://script.google.com/macros/s/YOUR_ID/exec?type=radar&region=US"

# Get speed trend
curl "https://script.google.com/macros/s/YOUR_ID/exec?type=trend&vpn=NordVPN&region=UK"
```

---

## Webhook Integration

You can integrate the API with automation tools:

### Zapier
1. Use **Webhooks by Zapier**
2. Set URL: `https://script.google.com/macros/s/YOUR_ID/exec?type=stability&region=JP`
3. Method: GET
4. Trigger on schedule (every 6 hours)

### Make (Integromat)
1. HTTP module → Make a request
2. URL: API endpoint with parameters
3. Method: GET
4. Schedule: Every 6 hours

---

## Change Log

### v3.1 (2025-12-07)
- ✅ Added stability scoring
- ✅ Added radar chart endpoint
- ✅ Added trend data endpoint
- ✅ Multi-region support (4 regions)

### v2.0 (2025-12-06)
- Multi-region support (JP, US, UK, SG)
- Regional VPN characteristics database

### v1.0 (2025-12-01)
- Initial release
- Single region (Japan only)
- Basic speed ranking

---

## Support

- GitHub Issues: https://github.com/hmy0210/vpn-stability-ranking/issues
- Twitter: [@remoteaccessvpn](https://twitter.com/remoteaccessvpn)
- Website: https://www.blstweb.jp

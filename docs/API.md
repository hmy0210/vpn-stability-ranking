# API Documentation

The VPN Stability Ranking system provides a public Web App API for accessing speed rankings and statistics.

## 🌐 Base URL

```
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

Replace `YOUR_DEPLOYMENT_ID` with your actual Apps Script Web App deployment ID.

## 📊 Endpoints

### GET / - Get Current Rankings

Returns the latest VPN speed rankings.

**Request:**
```bash
curl https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

**Response:**
```json
{
  "status": "success",
  "timestamp": "2025-12-20T19:00:00.000Z",
  "totalVPNs": 15,
  "rankings": [
    {
      "timestamp": "2025-12-20T18:00:00.000Z",
      "vpnName": "NordVPN",
      "download": 460,
      "upload": 230,
      "ping": 15,
      "stability": 95.2,
      "reliability": 100,
      "totalScore": 97.8,
      "rank": 1
    },
    {
      "timestamp": "2025-12-20T18:00:00.000Z",
      "vpnName": "ExpressVPN",
      "download": 433,
      "upload": 215,
      "ping": 18,
      "stability": 92.1,
      "reliability": 100,
      "totalScore": 95.3,
      "rank": 2
    }
    // ... more VPNs
  ]
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | "success" or "error" |
| `timestamp` | string | ISO 8601 timestamp of response |
| `totalVPNs` | number | Number of VPNs in rankings |
| `rankings` | array | Array of VPN ranking objects |

**Ranking Object Fields:**

| Field | Type | Unit | Description |
|-------|------|------|-------------|
| `timestamp` | string | - | When this measurement was taken |
| `vpnName` | string | - | VPN service name |
| `download` | number | Mbps | Download speed |
| `upload` | number | Mbps | Upload speed |
| `ping` | number | ms | Latency |
| `stability` | number | 0-100 | Stability score |
| `reliability` | number | 0-100 | Reliability score (% uptime) |
| `totalScore` | number | 0-100 | Overall score |
| `rank` | number | - | Current ranking (1 = best) |

**Error Response:**
```json
{
  "status": "error",
  "message": "No data available"
}
```

## 📈 Usage Examples

### JavaScript (Fetch API)

```javascript
fetch('https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec')
  .then(response => response.json())
  .then(data => {
    console.log(`Total VPNs: ${data.totalVPNs}`);
    
    data.rankings.forEach(vpn => {
      console.log(`${vpn.rank}. ${vpn.vpnName}: ${vpn.download} Mbps`);
    });
  })
  .catch(error => console.error('Error:', error));
```

### Python (requests)

```python
import requests

url = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec'
response = requests.get(url)

if response.status_code == 200:
    data = response.json()
    
    for vpn in data['rankings']:
        print(f"{vpn['rank']}. {vpn['vpnName']}: {vpn['download']} Mbps")
else:
    print(f"Error: {response.status_code}")
```

### cURL

```bash
curl -X GET \
  'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec' \
  -H 'Accept: application/json'
```

### jQuery (AJAX)

```javascript
$.ajax({
  url: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec',
  type: 'GET',
  dataType: 'json',
  success: function(data) {
    $('#vpn-list').empty();
    
    data.rankings.forEach(function(vpn) {
      $('#vpn-list').append(
        `<li>${vpn.rank}. ${vpn.vpnName} - ${vpn.download} Mbps</li>`
      );
    });
  },
  error: function(error) {
    console.error('Error:', error);
  }
});
```

## 🔧 Rate Limiting

**Current Limits:**
- No authentication required
- No rate limiting (subject to Google Apps Script quotas)
- Recommended: Cache responses for 5-10 minutes

**Google Apps Script Quotas:**
- Consumer: 20,000 URL Fetch calls/day
- G Suite: 100,000 URL Fetch calls/day

## 📊 Data Freshness

- Rankings updated every 6 hours
- Latest measurement timestamp included in response
- Check `timestamp` field to verify data freshness

## 🎨 Display Widget Example

### HTML/CSS/JavaScript Widget

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    .vpn-widget {
      font-family: Arial, sans-serif;
      max-width: 400px;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 20px;
    }
    
    .vpn-item {
      display: flex;
      justify-content: space-between;
      padding: 10px;
      border-bottom: 1px solid #eee;
    }
    
    .rank {
      font-weight: bold;
      color: #4285f4;
    }
    
    .speed {
      color: #0f9d58;
    }
  </style>
</head>
<body>
  <div class="vpn-widget" id="vpn-widget">
    <h3>VPN Speed Rankings</h3>
    <div id="rankings"></div>
    <small id="updated"></small>
  </div>

  <script>
    const API_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';
    
    fetch(API_URL)
      .then(r => r.json())
      .then(data => {
        const container = document.getElementById('rankings');
        const top5 = data.rankings.slice(0, 5);
        
        top5.forEach(vpn => {
          const div = document.createElement('div');
          div.className = 'vpn-item';
          div.innerHTML = `
            <span><span class="rank">${vpn.rank}.</span> ${vpn.vpnName}</span>
            <span class="speed">${vpn.download} Mbps</span>
          `;
          container.appendChild(div);
        });
        
        const updated = new Date(data.timestamp);
        document.getElementById('updated').textContent = 
          `Updated: ${updated.toLocaleString()}`;
      });
  </script>
</body>
</html>
```

## 🔐 CORS

**Cross-Origin Resource Sharing (CORS) is enabled by default.**

The API can be accessed from any domain.

## ⚠️ Error Handling

### Common Errors

1. **No Data Available**
   ```json
   {
     "status": "error",
     "message": "No data available"
   }
   ```
   **Solution:** Wait for first data collection or trigger `measureAllVPNSpeeds()`

2. **Service Unavailable**
   ```json
   {
     "status": "error",
     "message": "Service temporarily unavailable"
   }
   ```
   **Solution:** Retry after a few seconds

3. **Quota Exceeded**
   ```
   HTTP 429 Too Many Requests
   ```
   **Solution:** Implement exponential backoff

### Recommended Error Handling

```javascript
async function getVPNRankings() {
  const MAX_RETRIES = 3;
  let retries = 0;
  
  while (retries < MAX_RETRIES) {
    try {
      const response = await fetch(API_URL);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status === 'error') {
        throw new Error(data.message);
      }
      
      return data;
      
    } catch (error) {
      retries++;
      
      if (retries >= MAX_RETRIES) {
        console.error('Max retries reached:', error);
        return null;
      }
      
      // Exponential backoff
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, retries)));
    }
  }
}
```

## 📱 Mobile App Integration

### React Native Example

```javascript
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList } from 'react-native';

const VPNRankings = () => {
  const [rankings, setRankings] = useState([]);
  
  useEffect(() => {
    fetch('https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec')
      .then(r => r.json())
      .then(data => setRankings(data.rankings));
  }, []);
  
  return (
    <FlatList
      data={rankings}
      keyExtractor={item => item.vpnName}
      renderItem={({item}) => (
        <View>
          <Text>{item.rank}. {item.vpnName}</Text>
          <Text>{item.download} Mbps</Text>
        </View>
      )}
    />
  );
};
```

## 🔄 Webhooks (Future)

*Webhooks are not currently supported but may be added in future versions.*

Planned features:
- Subscribe to price changes
- Receive outage notifications
- Get new ranking alerts

## 📚 Additional Resources

- [Google Apps Script Web Apps](https://developers.google.com/apps-script/guides/web)
- [Deployment Guide](DEPLOYMENT.md)
- [Setup Guide](SETUP.md)

## 🆘 Support

- GitHub Issues: Report API bugs
- Discussions: Ask questions
- Email: api@your-domain.com

---

**Happy Integrating!** 🚀

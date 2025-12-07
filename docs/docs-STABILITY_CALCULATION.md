# Stability Score Calculation

Detailed explanation of how VPN stability scores are calculated.

---

## Overview

The stability score evaluates VPN performance based on **consistency** rather than peak speed. A VPN with steady 400 Mbps is rated higher than one that fluctuates between 200-600 Mbps.

**Calculation Period:** 30 days (rolling window)  
**Measurement Frequency:** Every 6 hours (4 measurements/day)  
**Total Data Points:** ~120 measurements per VPN per region

---

## Formula

```
Stability Score = 
  (Speed Stability × 40%) + 
  (Ping Stability × 30%) + 
  (Reliability × 30%)
```

### Components

| Component | Weight | Description |
|-----------|--------|-------------|
| Speed Stability | 40% | Consistency of download speed |
| Ping Stability | 30% | Consistency of latency |
| Reliability | 30% | Connection success rate |

---

## 1. Speed Stability (40%)

Measures how consistent download speeds are over time.

### Calculation

```javascript
// Step 1: Collect all speed measurements (past 30 days)
speeds = [480, 475, 490, 465, 472, ...]

// Step 2: Calculate average
avgSpeed = sum(speeds) / count(speeds)

// Step 3: Calculate standard deviation
variance = sum((speed - avgSpeed)² for speed in speeds) / count(speeds)
stdDev = sqrt(variance)

// Step 4: Convert to score (0-100)
speedStability = max(0, 100 - (stdDev / avgSpeed × 100))
```

### Example

**VPN A (Unstable):**
```
Speeds: [600, 450, 550, 400, 500, 350, 575, 425]
Avg: 481 Mbps
StdDev: 81.2 Mbps
Score: 100 - (81.2 / 481 × 100) = 83.1
```

**VPN B (Stable):**
```
Speeds: [480, 475, 485, 478, 482, 477, 483, 479]
Avg: 480 Mbps
StdDev: 3.2 Mbps
Score: 100 - (3.2 / 480 × 100) = 99.3
```

**Result:** VPN B scores higher despite similar average speed.

### Why Standard Deviation?

Standard deviation quantifies variability:
- **Low StdDev**: Speeds cluster around average (stable)
- **High StdDev**: Speeds spread widely (unstable)

---

## 2. Ping Stability (30%)

Measures consistency of latency, crucial for real-time applications (gaming, video calls).

### Calculation

```javascript
// Step 1: Collect all ping measurements
pings = [12.5, 13.2, 11.8, 12.9, 13.5, ...]

// Step 2: Calculate average
avgPing = sum(pings) / count(pings)

// Step 3: Calculate standard deviation
variance = sum((ping - avgPing)² for ping in pings) / count(pings)
stdDev = sqrt(variance)

// Step 4: Convert to score (0-100)
pingStability = max(0, 100 - (stdDev / avgPing × 50))
```

**Note:** The divisor is 50 (not 100) because ping variations have greater impact on user experience.

### Example

**VPN A (Unstable Ping):**
```
Pings: [15, 25, 18, 30, 12, 28, 20, 22] ms
Avg: 21.3 ms
StdDev: 6.2 ms
Score: 100 - (6.2 / 21.3 × 50) = 85.4
```

**VPN B (Stable Ping):**
```
Pings: [12.5, 13.2, 11.8, 12.9, 13.5, 12.1, 13.8, 12.4] ms
Avg: 12.8 ms
StdDev: 0.6 ms
Score: 100 - (0.6 / 12.8 × 50) = 97.7
```

---

## 3. Reliability (30%)

Measures the percentage of successful connections.

### Calculation

```javascript
// Step 1: Count successful vs failed measurements
totalAttempts = 120
successfulMeasurements = 118
failedMeasurements = 2

// Step 2: Calculate success rate
reliability = (successfulMeasurements / totalAttempts) × 100
// Result: (118 / 120) × 100 = 98.3%
```

### Impact

| Success Rate | Reliability Score | Impact |
|--------------|-------------------|--------|
| 100% | 100 | Perfect (0 failures) |
| 99% | 99 | Excellent (1-2 failures) |
| 95% | 95 | Good (5-6 failures) |
| 90% | 90 | Acceptable (12 failures) |
| <90% | <90 | Poor (frequent disconnects) |

---

## Final Score Calculation

### Step-by-Step Example

**NordVPN in Japan (Past 30 days):**

**Raw Data:**
- Speeds: [480, 475, 490, 465, 472, 485, 478, 482, ...] (120 measurements)
- Pings: [12.5, 13.2, 11.8, 12.9, 13.5, 12.1, ...] (120 measurements)
- Successful: 118/120

**Step 1: Speed Stability**
```
Avg Speed: 480 Mbps
StdDev: 12 Mbps
Speed Stability = 100 - (12 / 480 × 100) = 97.5
```

**Step 2: Ping Stability**
```
Avg Ping: 12.8 ms
StdDev: 1.2 ms
Ping Stability = 100 - (1.2 / 12.8 × 50) = 95.3
```

**Step 3: Reliability**
```
Reliability = (118 / 120) × 100 = 98.3%
```

**Step 4: Weighted Average**
```
Stability Score = 
  (97.5 × 0.40) + 
  (95.3 × 0.30) + 
  (98.3 × 0.30)
  
= 39.0 + 28.6 + 29.5
= 97.1
```

**Final Score: 97.1 / 100**

---

## Ranking Logic

VPNs are sorted by stability score in descending order:

```javascript
vpnData.sort((a, b) => b.stabilityScore - a.stabilityScore)
```

| Rank | VPN | Stability Score | Avg Speed | StdDev | Reliability |
|------|-----|-----------------|-----------|--------|-------------|
| 🥇 1 | NordVPN | 98.5 | 480 | 12 | 98.0% |
| 🥈 2 | ExpressVPN | 97.2 | 450 | 18 | 97.0% |
| 🥉 3 | Surfshark | 94.8 | 390 | 25 | 96.5% |

---

## Edge Cases

### Insufficient Data

**Problem:** VPN has <10 measurements in 30-day period.

**Solution:**
```javascript
if (dataPoints < 10) {
  return {
    error: "Insufficient data",
    stabilityScore: null,
    message: "At least 10 measurements required"
  }
}
```

### Zero Standard Deviation

**Problem:** All measurements are identical (theoretical).

**Solution:**
```javascript
if (stdDev === 0) {
  speedStability = 100  // Perfect stability
}
```

### Failed Measurements

**Problem:** Connection failed, no speed/ping data.

**Solution:**
- Count as failed attempt for reliability calculation
- Exclude from speed/ping statistics
- If >50% failures, mark VPN as "Unstable"

---

## Regional Differences

The same VPN can have different stability scores across regions.

### Example: NordVPN

| Region | Avg Speed | StdDev | Ping | Reliability | Stability Score |
|--------|-----------|--------|------|-------------|-----------------|
| 🇯🇵 Japan | 480 | 12 | 12.5 | 98% | **98.5** |
| 🇺🇸 US | 520 | 15 | 8.2 | 99% | **97.8** |
| 🇬🇧 UK | 450 | 20 | 18.5 | 97% | **95.2** |
| 🇸🇬 Singapore | 380 | 35 | 25.3 | 95% | **88.7** |

**Analysis:**
- Best stability in Japan (optimized servers)
- Highest speed in US (more infrastructure)
- Lowest score in Singapore (distance/routing issues)

---

## Comparison with Speed-Only Rankings

### Traditional Speed Ranking

| Rank | VPN | Max Speed |
|------|-----|-----------|
| 1 | VPN A | 650 Mbps |
| 2 | VPN B | 580 Mbps |
| 3 | VPN C | 520 Mbps |

**Problem:** Ignores consistency. VPN A might fluctuate 300-650 Mbps.

### Stability-Based Ranking

| Rank | VPN | Stability | Avg Speed | StdDev |
|------|-----|-----------|-----------|--------|
| 1 | VPN C | 98.5 | 480 | 12 |
| 2 | VPN B | 96.2 | 450 | 20 |
| 3 | VPN A | 85.4 | 475 | 95 |

**Advantage:** VPN C ranks #1 due to consistency, even with lower peak speed.

---

## Use Cases by Priority

### Speed Stability Priority (40% weight)

**Best for:**
- Large file downloads
- Streaming 4K/8K video
- Cloud backups
- Torrent downloads

**Why:** Consistent speed prevents buffering and interrupted transfers.

### Ping Stability Priority (30% weight)

**Best for:**
- Online gaming
- Video conferencing
- VoIP calls
- Remote desktop

**Why:** Low and stable latency prevents lag and stuttering.

### Reliability Priority (30% weight)

**Best for:**
- 24/7 always-on connections
- Business VPNs
- Remote work
- Server access

**Why:** Frequent disconnections disrupt workflows.

---

## Validation

### Data Quality Checks

Before calculating stability score:

```javascript
function validateData(measurements) {
  // Check minimum data points
  if (measurements.length < 10) {
    return { valid: false, reason: "Insufficient data" }
  }
  
  // Check for outliers (>3 standard deviations)
  const outliers = measurements.filter(m => 
    Math.abs(m - avg) > 3 * stdDev
  )
  
  if (outliers.length > measurements.length * 0.1) {
    return { valid: false, reason: "Too many outliers (>10%)" }
  }
  
  return { valid: true }
}
```

### Cross-Region Validation

Compare scores across regions to detect anomalies:

```javascript
// If one region has drastically different score
if (Math.abs(scoreJP - scoreUS) > 30) {
  // Flag for manual review
  logWarning(`Large regional discrepancy for ${vpnName}`)
}
```

---

## Limitations

1. **Simulated Data**: Current implementation uses realistic simulations, not actual VPN connections
2. **Time-of-Day Bias**: 6-hour intervals may miss specific peak/off-peak patterns
3. **Geographic Scope**: Limited to 4 regions (JP, US, UK, SG)
4. **Protocol Agnostic**: Doesn't account for different VPN protocols (OpenVPN, WireGuard, etc.)

---

## Future Improvements

### Short-term
- [ ] Add time-of-day weighting (peak hours count more)
- [ ] Implement outlier detection and removal
- [ ] Add "burst speed" metric for short-term performance

### Long-term
- [ ] Real VPN connection testing (replace simulation)
- [ ] Protocol-specific scoring
- [ ] Geographic diversity score (more regions)
- [ ] User-submitted measurement integration

---

## Code Implementation

See `gas/vpn-speed-tracker-v3.1.gs` for full implementation:

```javascript
function calculateStabilityScores(region, days = 30) {
  // Implementation in main script
  // Returns array of VPNs sorted by stability score
}
```

Key functions:
- `average(arr)`: Calculate mean
- `standardDeviation(arr)`: Calculate standard deviation
- `calculateStabilityScores(region, days)`: Main calculation
- `getRadarChartData(region, topN)`: 5-axis evaluation

---

## References

- [Standard Deviation - Wikipedia](https://en.wikipedia.org/wiki/Standard_deviation)
- [Coefficient of Variation - Statistics How To](https://www.statisticshowto.com/probability-and-statistics/statistics-definitions/coefficient-of-variation/)
- [Network Latency - Cloudflare](https://www.cloudflare.com/learning/performance/glossary/what-is-latency/)

---

**Questions or suggestions? Open an issue on GitHub!**

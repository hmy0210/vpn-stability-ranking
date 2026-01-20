# 🔒 VPN Trust Score Methodology

## Overview

The VPN Trust Score is a comprehensive evaluation system that measures the privacy and transparency practices of VPN providers. Unlike speed tests which measure performance, Trust Score evaluates **trustworthiness** based on publicly verifiable criteria.

---

## Evaluation Categories

### 1. Privacy Policies (40 points)

#### 1.1 No-Log Policy (15 points)

| Score | Criteria |
|-------|----------|
| 5 | Independently verified no-logs policy, no connection/activity logs |
| 4 | Claimed no-logs, audit pending or partial verification |
| 3 | Minimal logging (connection timestamps only, no activity) |
| 2 | Some logging with clear retention limits |
| 1 | Significant logging or unclear policy |
| 0 | Full logging or no published policy |

**Verification Methods:**
- Third-party audit reports (Deloitte, PwC, Cure53, etc.)
- Court cases requiring log disclosure (proven no data available)
- Published transparency reports

#### 1.2 Third-Party Audit (15 points)

| Score | Criteria |
|-------|----------|
| 5 | Annual independent audit by reputable firm, publicly available |
| 4 | Recent audit (within 2 years), publicly available |
| 3 | Audit completed but limited disclosure |
| 2 | Audit in progress or announced |
| 1 | Internal security review only |
| 0 | No audit history |

**Recognized Auditors:**
- Big 4 (Deloitte, PwC, EY, KPMG)
- Cure53
- VerSprite
- Leviathan Security

#### 1.3 Transparency Report (10 points)

| Score | Criteria |
|-------|----------|
| 5 | Regular transparency reports with warrant canary |
| 4 | Annual transparency report |
| 3 | Occasional disclosure of government requests |
| 2 | General privacy statements only |
| 1 | Minimal transparency |
| 0 | No transparency reporting |

---

### 2. Legal Framework (25 points)

#### 2.1 Jurisdiction (10 points)

| Score | Jurisdiction Type | Examples |
|-------|-------------------|----------|
| 5 | Privacy-friendly, no mandatory retention | Panama, BVI, Switzerland |
| 4 | Good privacy laws, limited surveillance | Sweden, Netherlands |
| 3 | Mixed jurisdiction, some protections | Germany, Japan |
| 2 | Five Eyes but with some protections | Canada, Australia |
| 1 | Five Eyes core members | USA, UK |
| 0 | High surveillance states | China, Russia |

**Jurisdictional Considerations:**
- Data retention laws
- Government surveillance programs
- International intelligence sharing (5/9/14 Eyes)
- Historical response to government requests

#### 2.2 Data Retention Policy (10 points)

| Score | Criteria |
|-------|----------|
| 5 | Zero data retention, RAM-only architecture |
| 4 | Minimal retention (<24 hours) for technical purposes |
| 3 | Short-term retention (up to 7 days) |
| 2 | Medium retention (up to 30 days) |
| 1 | Long retention (30+ days) |
| 0 | Indefinite retention or unclear policy |

#### 2.3 Legal Response History (5 points)

| Score | Criteria |
|-------|----------|
| 5 | Proven track record of protecting user data in court |
| 4 | No known data surrenders, clear legal stance |
| 3 | Limited legal challenges, generally positive |
| 2 | Some compliance with government requests |
| 1 | Multiple instances of data disclosure |
| 0 | Known cooperation with surveillance |

---

### 3. Technical Security (30 points)

#### 3.1 Open Source (10 points)

| Score | Criteria |
|-------|----------|
| 5 | Fully open source (apps + servers) |
| 4 | Open source apps, server code partially available |
| 3 | Open source apps only |
| 2 | Some components open source |
| 1 | Proprietary but uses open standards |
| 0 | Fully proprietary, no code transparency |

**Benefits of Open Source:**
- Community audit capability
- Transparency of data handling
- Verifiable security claims

#### 3.2 RAM-Only Servers (10 points)

| Score | Criteria |
|-------|----------|
| 5 | All servers run in RAM-only mode, verified |
| 4 | Majority of servers RAM-only |
| 3 | RAM-only servers available as option |
| 2 | Traditional servers with secure deletion |
| 1 | Standard disk-based servers |
| 0 | Unknown server architecture |

**Why RAM-Only Matters:**
- Data cannot persist after reboot
- Eliminates risk of disk seizure
- Provides technical enforcement of no-logs

#### 3.3 Incident Response (10 points)

| Score | Criteria |
|-------|----------|
| 5 | Excellent incident response, quick disclosure, user protection |
| 4 | Good response to incidents, timely notification |
| 3 | Adequate response, some delays |
| 2 | Slow response, incomplete disclosure |
| 1 | Poor handling of security incidents |
| 0 | No incident response plan or history of cover-ups |

---

### 4. Track Record (5 points)

#### 4.1 Operating Years (5 points)

| Score | Years | Rationale |
|-------|-------|-----------|
| 5 | 10+ years | Proven long-term reliability |
| 4 | 7-9 years | Established provider |
| 3 | 4-6 years | Maturing provider |
| 2 | 2-3 years | Newer provider with some track record |
| 1 | 1 year | Very new provider |
| 0 | <1 year | Unproven |

---

## Scoring Summary

| Category | Max Points | Weight |
|----------|------------|--------|
| No-Log Policy | 15 | 15% |
| Third-Party Audit | 15 | 15% |
| Transparency Report | 10 | 10% |
| Jurisdiction | 10 | 10% |
| Data Retention | 10 | 10% |
| Legal Response | 5 | 5% |
| Open Source | 10 | 10% |
| RAM-Only Servers | 10 | 10% |
| Incident Response | 10 | 10% |
| Operating Years | 5 | 5% |
| **Total** | **100** | **100%** |

---

## Grade Scale

| Grade | Score Range | Description |
|-------|-------------|-------------|
| **A** | 85-100 | Excellent - Industry-leading privacy practices |
| **B** | 70-84 | Good - Strong privacy with minor gaps |
| **C** | 55-69 | Average - Adequate but room for improvement |
| **D** | 40-54 | Below Average - Significant concerns |
| **F** | 0-39 | Poor - Not recommended for privacy-conscious users |

---

## Data Sources

Trust Scores are compiled from:

1. **Official Sources**
   - VPN provider websites
   - Published audit reports
   - Terms of Service / Privacy Policies

2. **Independent Research**
   - Security researcher reports
   - Court documents and legal cases
   - News articles about incidents

3. **Technical Verification**
   - GitHub repositories (for open source)
   - Technical whitepapers
   - Protocol documentation

4. **Community Input**
   - Reddit discussions (r/VPN, r/privacy)
   - Security conferences
   - Expert reviews

---

## Update Frequency

- **Full evaluation:** Monthly
- **Incident updates:** As needed
- **Major changes:** Within 48 hours of public disclosure

---

## Limitations

1. **Self-Reported Data:** Some criteria rely on VPN provider claims
2. **Audit Availability:** Not all audit reports are fully public
3. **Dynamic Nature:** Security posture can change rapidly
4. **Regional Variations:** Some VPNs operate differently in different jurisdictions

---

## Example Evaluation

### Mullvad VPN (Score: 92, Grade: A)

| Criteria | Score | Notes |
|----------|-------|-------|
| No-Log Policy | 5 | Verified through audit and Swedish police case |
| Third-Party Audit | 5 | Annual audits by Cure53, publicly available |
| Transparency Report | 4 | Regular updates, warrant canary |
| Jurisdiction | 5 | Sweden (outside 14 Eyes in practice) |
| Data Retention | 5 | Zero retention, RAM-only |
| Legal Response | 5 | Famous police raid case proved no data |
| Open Source | 5 | Fully open source apps |
| RAM-Only Servers | 5 | All servers RAM-only |
| Incident Response | 4 | Generally excellent |
| Operating Years | 4 | Since 2009 (15+ years) |
| **Total** | **92** | **Grade A** |

---

## Contributing to Trust Score

If you have information that would affect a VPN's Trust Score:

1. Open a GitHub Issue with documentation
2. Provide verifiable sources
3. Allow time for verification

We prioritize accuracy over speed in updates.

---

## References

- Electronic Frontier Foundation (EFF) - VPN Guidelines
- Privacy International - Data Protection Standards
- That One Privacy Site (historical reference)
- VPN Trust Initiative
- Center for Democracy & Technology

---

*Last Updated: January 2026*
*Methodology Version: 2.0*

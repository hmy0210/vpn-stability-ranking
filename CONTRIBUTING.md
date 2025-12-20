# Contributing to Tokyo VPN Speed Monitor

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## 🎯 Ways to Contribute

### 1. Report Bugs
- Use GitHub Issues
- Include reproduction steps
- Provide system information
- Add screenshots if applicable

### 2. Suggest Features
- Open a GitHub Issue with `[Feature Request]` tag
- Describe the use case
- Explain expected behavior

### 3. Submit Code
- Fork the repository
- Create a feature branch
- Make your changes
- Submit a Pull Request

### 4. Improve Documentation
- Fix typos
- Add examples
- Clarify instructions
- Translate to other languages

### 5. Add VPN Services
- Submit PR with new VPN configuration
- Include pricing URL and selector
- Test the integration

## 🔧 Development Setup

### Prerequisites
- Google Account
- GitHub account
- Basic knowledge of JavaScript/Google Apps Script

### Local Setup

1. **Fork the repository**
   ```bash
   gh repo fork yourusername/vpn-stability-ranking
   ```

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR-USERNAME/vpn-stability-ranking.git
   cd vpn-stability-ranking
   ```

3. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

4. **Make changes**
   - Edit files
   - Test your changes
   - Commit with clear messages

5. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

## 📝 Code Style

### JavaScript/Google Apps Script

```javascript
// Use const for constants
const CONFIG = {
  THRESHOLD: 0.5
};

// Use descriptive names
function calculateStabilityScore(vpnName, speeds) {
  // Implementation
}

// Add JSDoc comments
/**
 * Measure VPN speed
 * @param {string} vpnName - Name of VPN service
 * @returns {Object} Speed data
 */
function measureSpeed(vpnName) {
  // Implementation
}
```

### Formatting
- Indentation: 2 spaces
- Line length: Max 100 characters
- Quotes: Single quotes for strings
- Semicolons: Always use them

### Comments
- Explain WHY, not WHAT
- Use JSDoc for functions
- Keep comments updated

## 🧪 Testing

### Before Submitting PR

1. **Test manually**
   ```javascript
   // Run test functions
   testSpeedMeasurement();
   testPriceScraping();
   ```

2. **Check for errors**
   - Review Apps Script execution logs
   - Verify data is saved correctly
   - Test edge cases

3. **Verify documentation**
   - Update README if needed
   - Add comments to new code
   - Update CHANGELOG

## 📋 Pull Request Process

### PR Title Format
```
[Type] Brief description

Types:
- [Feature] - New feature
- [Fix] - Bug fix
- [Docs] - Documentation
- [Refactor] - Code refactoring
- [Test] - Tests
```

### PR Description Template
```markdown
## Description
Brief description of changes

## Changes Made
- Changed X to Y
- Added feature Z
- Fixed bug in W

## Testing
- [ ] Tested manually
- [ ] No errors in logs
- [ ] Documentation updated

## Screenshots (if applicable)
[Add screenshots]

## Related Issues
Closes #123
```

### Review Process

1. Maintainer reviews PR
2. Address any feedback
3. PR is approved
4. Maintainer merges

## 🎨 Adding New VPN Services

### 1. Add to VPN List

In `gas/config.example.gs`:

```javascript
const VPN_LIST = [
  // Existing VPNs...
  { name: 'NewVPN', url: 'https://newvpn.com/' }
];
```

### 2. Add Pricing Configuration

In `gas/price-scraper.gs`:

```javascript
const VPN_PRICING = [
  // Existing VPNs...
  {
    name: 'NewVPN',
    url: 'https://newvpn.com/pricing',
    method: 'scraperapi',
    currency: 'USD'
  }
];
```

### 3. Test Integration

```javascript
// Test speed measurement
testSpeedMeasurement();

// Test price scraping
testPriceScraping();
```

### 4. Submit PR

Include:
- VPN name
- Official website
- Pricing page URL
- Test results

## 🐛 Bug Reports

### Good Bug Report Includes:

1. **Title**: Clear, specific description
2. **Steps to Reproduce**: Numbered list
3. **Expected Behavior**: What should happen
4. **Actual Behavior**: What actually happens
5. **System Info**: Browser, OS, etc.
6. **Screenshots**: If applicable
7. **Logs**: Error messages

### Example

```markdown
## Bug: Speed measurement fails for NordVPN

**Steps to Reproduce:**
1. Run `measureAllVPNSpeeds()`
2. Wait for execution to complete
3. Check logs

**Expected:**
NordVPN speed should be measured

**Actual:**
Error: "Connection timeout"

**System:**
- Browser: Chrome 96
- OS: macOS 12.0
- Apps Script: Latest

**Logs:**
```
[Error] Connection timeout for NordVPN
[Error] measureVPNSpeed failed
```

**Screenshots:**
[Attach screenshot]
```

## ✅ Feature Requests

### Good Feature Request Includes:

1. **Use Case**: Why is this needed?
2. **Proposed Solution**: How should it work?
3. **Alternatives**: Other options considered
4. **Additional Context**: Any other info

### Example

```markdown
## Feature: Add support for Mullvad VPN

**Use Case:**
Mullvad is a popular privacy-focused VPN but not currently monitored.

**Proposed Solution:**
Add Mullvad to VPN_LIST with appropriate configuration.

**Implementation:**
- Add to `config.example.gs`
- Add pricing config
- Test integration

**Why Mullvad:**
- Top 10 VPN by user count
- Strong privacy focus
- Frequently requested
```

## 🔒 Security

### Reporting Security Issues

**Do NOT open public issues for security vulnerabilities.**

Instead:
1. Email: security@your-domain.com
2. Include detailed description
3. Provide steps to reproduce
4. Allow time for fix before disclosure

### Security Best Practices

- Never commit API keys
- Use environment variables
- Validate all inputs
- Sanitize user data
- Follow principle of least privilege

## 📜 Code of Conduct

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone.

### Our Standards

✅ **Do:**
- Be respectful
- Be constructive
- Be patient
- Give credit

❌ **Don't:**
- Harass others
- Use offensive language
- Be dismissive
- Share private information

### Enforcement

Violations may result in:
1. Warning
2. Temporary ban
3. Permanent ban

Report issues to: conduct@your-domain.com

## 🏆 Recognition

Contributors will be:
- Listed in README
- Mentioned in CHANGELOG
- Given credit in releases

## 📞 Questions?

- GitHub Discussions
- GitHub Issues
- Email: contribute@your-domain.com

## 📚 Resources

- [Google Apps Script Docs](https://developers.google.com/apps-script)
- [GitHub Flow](https://guides.github.com/introduction/flow/)
- [Semantic Versioning](https://semver.org/)

---

**Thank you for contributing!** 🙏

Every contribution, no matter how small, helps make this project better.

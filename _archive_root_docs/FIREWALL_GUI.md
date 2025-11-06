# Firewall Management GUI

## Overview
The TurnFix application now includes a graphical user interface for managing Windows Firewall rules, allowing network access to be enabled/disabled for each service independently.

## Features

### 1. Administrator Rights Detection
- **Automatic detection** - Checks on page load if application has admin privileges
- **Visual indicators** - Green checkmark (has rights) or amber warning (needs rights)
- **Smart UI** - Buttons automatically enabled/disabled based on privileges
- **Clear messaging** - Explains what's needed and why

### 2. Service Management
Three services can be controlled independently:
- **Backend Server** (Port 3001) - API endpoints
- **Frontend Client** (Port 5173) - Main application UI
- **Jury Portal** (Port 5174) - Separate jury interface

### 3. Visual Status Indicators
- ✅ **Green checkmark** - Service is accessible from network
- ❌ **Gray X** - Service is blocked by firewall
- 🔄 **Spinning icon** - Status being checked

### 4. One-Click Enable/Disable
- Each service has its own enable/disable button
- Changes take effect immediately
- Success/error messages provide feedback

### 5. Network Information Display
- Shows all local IP addresses
- Provides access URLs for each service on each network interface
- Copy-to-clipboard functionality for easy sharing

### 6. Security Features
- Requires administrator privileges to modify firewall rules
- Clear warning when admin rights are needed
- Automatic detection of admin status on page load
- Security reminder about network exposure

## UI Preview

### With Administrator Rights
```
┌─────────────────────────────────────────────────────────────┐
│ 🛡️ Firewall & Network                                       │
│ Manage Windows Firewall rules for network access           │
├─────────────────────────────────────────────────────────────┤
│ ℹ️ Windows-specific Feature: This feature uses Windows     │
│ Firewall (netsh & PowerShell) and works on Windows only.   │
├─────────────────────────────────────────────────────────────┤
│ ✓ Administrator mode active                          [🔄]   │
│ You can manage firewall rules because the application      │
│ is running with administrator privileges.                   │
├─────────────────────────────────────────────────────────────┤
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│ │ Backend      │ │ Frontend     │ │ Jury Portal  │        │
│ │ Port 3001    │ │ Port 5173    │ │ Port 5174    │        │
│ │              │ │              │ │              │        │
│ │ ✅ Enabled   │ │ ❌ Disabled  │ │ ❌ Disabled  │        │
│ │ [Disable]    │ │ [Enable]     │ │ [Enable]     │        │
│ └──────────────┘ └──────────────┘ └──────────────┘        │
├─────────────────────────────────────────────────────────────┤
│ ℹ️ Platform: This uses Windows Firewall (netsh/PowerShell) │
│ ⚠️ Security: Only enable rules on trusted networks         │
└─────────────────────────────────────────────────────────────┘
```

### Without Administrator Rights
```
┌─────────────────────────────────────────────────────────────┐
│ 🛡️ Firewall & Network                                       │
│ Manage Windows Firewall rules for network access           │
├─────────────────────────────────────────────────────────────┤
│ ℹ️ Windows-specific Feature: This feature uses Windows     │
│ Firewall (netsh & PowerShell) and works on Windows only.   │
├─────────────────────────────────────────────────────────────┤
│ ⚠️ Administrator privileges required                 [🔄]   │
│ This feature requires administrator privileges. Run the    │
│ application as administrator to manage firewall rules.     │
├─────────────────────────────────────────────────────────────┤
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│ │ Backend      │ │ Frontend     │ │ Jury Portal  │        │
│ │ Port 3001    │ │ Port 5173    │ │ Port 5174    │        │
│ │              │ │              │ │              │        │
│ │ ❌ Disabled  │ │ ❌ Disabled  │ │ ❌ Disabled  │        │
│ │ [Disabled]   │ │ [Disabled]   │ │ [Disabled]   │        │
│ └──────────────┘ └──────────────┘ └──────────────┘        │
├─────────────────────────────────────────────────────────────┤
│ ℹ️ Platform: This uses Windows Firewall (netsh/PowerShell) │
│ ⚠️ Security: Only enable rules on trusted networks         │
└─────────────────────────────────────────────────────────────┘
```

## Usage

### Accessing the Firewall Manager
1. Open TurnFix application
2. Navigate to **Configuration** (Einstellungen)
3. Click on **Network & Firewall** section in the left sidebar

### Enabling Network Access
1. Click the **Enable** button on the desired service card
2. Grant administrator privileges if prompted
3. Wait for confirmation message
4. Share the provided access URL with network users

### Disabling Network Access
1. Click the **Disable** button on the desired service card
2. Grant administrator privileges if prompted
3. Wait for confirmation message

### Finding Access URLs
1. Look at the "Network Information" section (blue box)
2. Your local IP addresses are shown (e.g., 192.168.1.100)
3. Access URLs are provided for each service
4. Click the clipboard icon to copy a URL

## Technical Details

### Backend API Endpoints
- `GET /api/firewall/status` - Check which services are accessible
- `POST /api/firewall/enable/:service` - Enable network access
- `POST /api/firewall/disable/:service` - Disable network access
- `GET /api/firewall/network-info` - Get IP addresses and URLs

### Firewall Rules Created
Windows Firewall rules are created with the following names:
- "TurnFix Backend Server" (Port 3001, TCP)
- "TurnFix Frontend Client" (Port 5173, TCP)
- "TurnFix Jury Portal" (Port 5174, TCP)

### Command Used (Windows)
```powershell
# Enable
netsh advfirewall firewall add rule name="TurnFix Backend Server" dir=in action=allow protocol=TCP localport=3001

# Disable
netsh advfirewall firewall delete rule name="TurnFix Backend Server"

# Check status
netsh advfirewall firewall show rule name="TurnFix Backend Server"
```

## Administrator Privileges

### Why Administrator Access is Required
Modifying Windows Firewall rules requires elevated privileges for security reasons.

### How to Grant Access

**Option 1: Run VS Code as Administrator**
1. Right-click on VS Code icon
2. Select "Run as administrator"
3. Open the TurnFix project
4. Changes will work without prompts

**Option 2: Grant Permission When Prompted**
1. Click enable/disable in the UI
2. Accept the User Account Control (UAC) prompt
3. Changes will be applied immediately

### What Happens Without Admin Rights
- A yellow warning banner appears
- Enable/disable buttons are disabled
- An error message explains the issue
- Status checking still works (read-only)

## Security Considerations

### Network Exposure
- Enabling firewall rules allows **ANY device on your network** to access the service
- Only enable access when needed for multi-device scenarios
- Disable access when not required (e.g., single-user testing)

### Recommended Practices
1. **Enable only required services**
   - Backend only: For API testing from other devices
   - Frontend + Backend: For full application access
   - Jury Portal: Only when jury members need separate interface

2. **Use trusted networks**
   - Home networks: Generally safe
   - Office networks: Check with IT department
   - Public WiFi: Avoid enabling access

3. **Disable when done**
   - Close firewall access after competitions
   - Disable during development if not needed
   - Regular security review

### Firewall Rule Scope
- Rules apply to **ALL networks** (private, public, domain)
- Rules persist until manually disabled
- Application restart does not affect rules

## Troubleshooting

### "Permission Denied" Error
**Symptom**: Yellow warning, buttons disabled
**Solution**: Run application as administrator (see above)

### "Cannot Find Rule" Error
**Symptom**: Status shows disabled but cannot enable
**Solution**: 
1. Click "Refresh" button to reload status
2. Try disabling and re-enabling
3. Check Windows Firewall manually

### Network URLs Not Working
**Symptom**: URL shown but cannot connect from other device
**Solution**:
1. Check firewall status shows "Enabled" (green)
2. Verify device is on same network
3. Test with IP address instead of hostname
4. Check if Windows Firewall is running
5. Ensure application server is running

### IP Address Not Shown
**Symptom**: Network information section empty
**Solution**:
1. Check network adapter is connected
2. Verify IP address assigned (check Windows network settings)
3. Try disabling/re-enabling network adapter

### Multiple IP Addresses Shown
**Symptom**: Several IP addresses listed
**Explanation**: Normal if computer has multiple network interfaces:
- WiFi and Ethernet adapters
- VPN connections
- Virtual machine adapters
**Action**: Use the IP that matches your target network

## Alternative: Manual Configuration
If the GUI doesn't work, you can still use the PowerShell script:
```powershell
.\setup-network.ps1
```

Or configure manually (requires admin PowerShell):
```powershell
# Enable all services
netsh advfirewall firewall add rule name="TurnFix Backend Server" dir=in action=allow protocol=TCP localport=3001
netsh advfirewall firewall add rule name="TurnFix Frontend Client" dir=in action=allow protocol=TCP localport=5173
netsh advfirewall firewall add rule name="TurnFix Jury Portal" dir=in action=allow protocol=TCP localport=5174

# Disable all services
netsh advfirewall firewall delete rule name="TurnFix Backend Server"
netsh advfirewall firewall delete rule name="TurnFix Frontend Client"
netsh advfirewall firewall delete rule name="TurnFix Jury Portal"
```

## Localization
The firewall management UI is fully localized:
- **German** (Deutsch): Default language
- **English**: Available

Translation keys are in:
- `client/src/locales/de.json` (German)
- `client/src/locales/en.json` (English)

Section: `configuration.firewall.*`

## Files Involved

### Backend
- `server/src/routes/firewall.ts` - API endpoints
- `server/src/index.ts` - Route registration

### Frontend
- `client/src/components/FirewallManagement.tsx` - Main UI component
- `client/src/pages/Configuration.tsx` - Integration into settings

### Translations
- `client/src/locales/de.json` - German translations
- `client/src/locales/en.json` - English translations

### Documentation
- `FIREWALL_SETUP.md` - Manual setup instructions
- `FIREWALL_GUI.md` - This file
- `NETWORK_SETUP.md` - Network configuration guide

## Future Enhancements
Possible improvements for future versions:
- [ ] Test connectivity from UI (ping service from frontend)
- [ ] Show connected clients/devices
- [ ] Temporary access (auto-disable after time period)
- [ ] Network scope selection (only allow specific IP ranges)
- [ ] QR code generation for easy mobile access
- [ ] Service health monitoring when network-enabled

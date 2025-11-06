# 🌐 TurnFix Network Configuration Guide

This guide explains how to configure your Windows machine and TurnFix application to allow other PCs on the network to access the web interface.

## 📋 Prerequisites

- TurnFix server running on your Windows machine
- Other PCs on the same network (LAN/WiFi)
- Administrator privileges on the Windows machine

## 🔧 Configuration Steps

### 1. Configure Development Servers for Network Access

#### A. Frontend (Vite) Configuration

The client needs to bind to all network interfaces instead of just localhost.

**Update the client start command:**

```powershell
# Navigate to client directory
cd "c:\Users\Dominik Prudlo\Documents\GitHub\turnfix\newWebBased\client"

# Start with host binding to all interfaces
npm run dev -- --host 0.0.0.0
```

**Or permanently update `vite.config.ts`:**

Add `host: '0.0.0.0'` to the server configuration:

```typescript
server: {
  port: 5173,
  host: '0.0.0.0',  // Add this line
  proxy: {
    '/api': {
      target: 'http://localhost:3001',
      changeOrigin: true,
    },
    '/uploads': {
      target: 'http://localhost:3001',
      changeOrigin: true,
    }
  }
}
```

#### B. Backend (Express) Configuration

The Express server already listens on all interfaces (0.0.0.0) by default when no host is specified.

Current configuration is correct:
```typescript
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
```

### 2. Windows Firewall Configuration

#### Option A: Quick Setup (Recommended for Development)

**Allow specific ports through Windows Firewall:**

1. **Open Windows Firewall with Advanced Security:**
   - Press `Win + R`, type `wf.msc`, press Enter

2. **Create Inbound Rules for TurnFix ports:**
   
   **For Frontend (Port 5173):**
   - Right-click "Inbound Rules" → "New Rule"
   - Select "Port" → Next
   - Select "TCP" → "Specific local ports" → Enter `5173`
   - Select "Allow the connection" → Next
   - Check all profiles (Domain, Private, Public) → Next
   - Name: "TurnFix Frontend" → Finish

   **For Backend (Port 3001):**
   - Repeat above steps with port `3001`
   - Name: "TurnFix Backend"

#### Option B: PowerShell Commands (Administrator required)

```powershell
# Open PowerShell as Administrator
# Allow frontend port 5173
New-NetFirewallRule -DisplayName "TurnFix Frontend" -Direction Inbound -Port 5173 -Protocol TCP -Action Allow

# Allow backend port 3001
New-NetFirewallRule -DisplayName "TurnFix Backend" -Direction Inbound -Port 3001 -Protocol TCP -Action Allow
```

#### Option C: Temporary Disable (NOT RECOMMENDED for production)

```powershell
# Disable Windows Firewall (Administrator required)
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled False

# To re-enable later:
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled True
```

### 3. Find Your IP Address

**Get your Windows machine's IP address:**

```powershell
# Find your local IP address
ipconfig | findstr "IPv4"
```

Common IP ranges:
- `192.168.1.x` (Home networks)
- `192.168.0.x` (Home networks)
- `10.x.x.x` (Corporate networks)

### 4. Update Frontend Configuration for Network Access

**Update `vite.config.ts` proxy settings:**

Replace `localhost` with your actual IP address or make it dynamic:

```typescript
server: {
  port: 5173,
  host: '0.0.0.0',
  proxy: {
    '/api': {
      target: process.env.VITE_API_URL || 'http://localhost:3001',
      changeOrigin: true,
    },
    '/uploads': {
      target: process.env.VITE_API_URL || 'http://localhost:3001',
      changeOrigin: true,
    }
  }
}
```

**Create `.env` file in client directory:**

```env
VITE_API_URL=http://YOUR_IP_ADDRESS:3001
```

Replace `YOUR_IP_ADDRESS` with your actual IP (e.g., `192.168.1.100`).

### 5. Start the Servers

**Start Backend:**
```powershell
cd "c:\Users\Dominik Prudlo\Documents\GitHub\turnfix\newWebBased\server"
npm run dev
```

**Start Frontend (with network access):**
```powershell
cd "c:\Users\Dominik Prudlo\Documents\GitHub\turnfix\newWebBased\client"
npm run dev -- --host 0.0.0.0
```

### 6. Access from Other PCs

**From other computers on the network, open a web browser and navigate to:**

```
http://YOUR_IP_ADDRESS:5173
```

Example: `http://192.168.1.100:5173`

## 🔍 Troubleshooting

### Check if Ports are Open

**Test port accessibility from another PC:**

```powershell
# From another PC, test if ports are reachable
Test-NetConnection -ComputerName YOUR_IP_ADDRESS -Port 5173
Test-NetConnection -ComputerName YOUR_IP_ADDRESS -Port 3001
```

### Common Issues

1. **Connection Refused:**
   - Check Windows Firewall rules
   - Verify servers are running with `--host 0.0.0.0`
   - Confirm IP address is correct

2. **API Calls Failing:**
   - Update proxy configuration in `vite.config.ts`
   - Check backend server is accessible on port 3001

3. **Network Discovery:**
   - Ensure all PCs are on the same network
   - Check router settings for device isolation

### Verify Configuration

**Check if services are listening on all interfaces:**

```powershell
# Check what's listening on your ports
netstat -an | findstr ":5173"
netstat -an | findstr ":3001"
```

Should show `0.0.0.0:5173` and `0.0.0.0:3001` instead of `127.0.0.1`.

## 🚀 Production Deployment

For production deployment, consider:

1. **Use a reverse proxy (nginx/IIS)**
2. **Configure proper SSL certificates**
3. **Set up domain names instead of IP addresses**
4. **Implement proper security measures**
5. **Configure production firewall rules**

## 📝 Quick Reference

**Your TurnFix URLs:**
- Frontend: `http://YOUR_IP:5173`
- Backend API: `http://YOUR_IP:3001/api`
- Database Config: Access through frontend

**Firewall Ports to Open:**
- `5173/TCP` (Frontend)
- `3001/TCP` (Backend API)

**Start Commands:**
```powershell
# Backend
cd server && npm run dev

# Frontend with network access
cd client && npm run dev -- --host 0.0.0.0
```

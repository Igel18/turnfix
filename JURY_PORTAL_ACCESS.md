# 🏆 TurnFix Jury Portal - Competition Day Access

## Quick Access for Jury Members

### **Dedicated URL (No Dashboard Confusion)**
- **Local Computer**: http://localhost:5174  
- **Network Access**: http://[YOUR-IP]:5174
- **Mobile/Tablet**: Same network URL

### **Key Benefits**
✅ **Separate from main dashboard** - jury can't access administrative functions  
✅ **Real data** - connected to actual database and participants  
✅ **Mobile optimized** - works on tablets and smartphones  
✅ **Simple workflow** - Event → Squad → Device → Score Entry  

---

## For Competition Organizers

### **Setup Instructions**

1. **Start All Services**:
   ```powershell
   .\start-with-jury.ps1
   ```
   This starts:
   - Main Server (API): http://localhost:3001
   - Main Client: http://localhost:5173  
   - **Jury Portal: http://localhost:5174**

2. **Network Access**:
   - Ensure Windows Firewall allows port 5174
   - Get your IP address: `ipconfig` 
   - Share URL: `http://[YOUR-IP]:5174` with jury members

3. **QR Code Generation** (Optional):
   - Generate QR code for `http://[YOUR-IP]:5174`
   - Print and post at jury stations

### **Jury Workflow**

1. **Access Portal**: Go to dedicated URL (port 5174)
2. **Select Event**: Choose active competition  
3. **Select Squad**: Pick assigned riege/squad
4. **Select Device**: Choose gymnastics apparatus
5. **Score Entry**: 
   - See current participant highlighted
   - View participant list for this device
   - Enter scores and progress automatically

### **Features**

#### **Real Data Integration**
- ✅ Fetches actual events from database
- ✅ Shows real squads with participant counts  
- ✅ Displays actual participants per squad/device
- ✅ Saves scores to database with proper foreign key handling

#### **Participant Management**
- ✅ Shows previous, current, and next participant
- ✅ Displays full participant list for selected device
- ✅ Visual progress tracking
- ✅ Automatic advancement after score entry

#### **Mobile Support**
- ✅ Touch-friendly large buttons
- ✅ Responsive design for tablets
- ✅ Network accessible from any device
- ✅ No app installation required

---

## Technical Details

### **Architecture**
- **Port**: 5174 (dedicated for jury)
- **Backend**: Proxies to main API (port 3001)
- **Frontend**: Simplified React interface
- **Database**: Same as main application

### **Network Requirements**
- Port 5174 open for jury access
- Same network as main TurnFix server
- No additional firewall rules needed

### **Backup Access**
If jury portal is unavailable:
- Use main application: http://localhost:5173
- Navigate to Dashboard → Event Management → "Jury Portal"
- Less optimal but functional fallback

---

## Troubleshooting

### **Common Issues**

1. **"No events found"**
   - Check main server is running (port 3001)
   - Verify database connection

2. **"No participants for device"**
   - Ensure participants are assigned to squads
   - Check competition has participants registered

3. **Network access fails**
   - Verify Windows Firewall settings
   - Check IP address is correct
   - Ensure all devices on same network

### **Support Commands**

```powershell
# Check if services are running
netstat -an | findstr "3001 5174"

# Get current IP address  
ipconfig | findstr "IPv4"

# Test jury portal locally
curl http://localhost:5174/api/health
```

---

## Competition Day Checklist

### **Before Competition**
- [ ] Start all services with `start-with-jury.ps1`
- [ ] Test jury portal access locally
- [ ] Test jury portal from mobile device
- [ ] Share network URL with jury members
- [ ] Print QR codes if needed

### **During Competition**  
- [ ] Jury accesses dedicated URL (port 5174)
- [ ] No access to main dashboard 
- [ ] Real participant data displayed
- [ ] Scores saved automatically
- [ ] Progress tracked visually

### **Emergency Fallback**
- [ ] Main application available at port 5173
- [ ] Dashboard access if needed
- [ ] Manual score entry possible

---

**🎯 Result**: Jury members have a dedicated, simplified interface that eliminates confusion and focuses solely on score entry with real competition data!

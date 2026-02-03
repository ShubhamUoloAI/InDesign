# Running Adobe InDesign on macOS Server

This guide explains how to set up Adobe InDesign desktop application on a macOS Server for automated PDF generation.

## Prerequisites

- macOS Server (or macOS with server capabilities)
- Adobe InDesign license (desktop version)
- SSH or physical access to the server

## Important Considerations

⚠️ **Licensing**: Verify your Adobe license terms permit server automation
⚠️ **Performance**: Desktop InDesign is not optimized for concurrent requests
⚠️ **Stability**: Desktop apps may be less stable than server applications

## Installation Steps

### 1. Install Adobe InDesign

Download and install Adobe InDesign on your server:
- Use Adobe Creative Cloud Desktop App
- Or download directly from Adobe with your license

Typical installation path:
```
/Applications/Adobe InDesign 2024/Adobe InDesign 2024.app
```

### 2. Configure User Session (CRITICAL)

InDesign requires a logged-in user session with a display. Choose one method:

#### Option A: Remote Desktop Session (Recommended for Testing)

1. Enable Screen Sharing on the server:
   ```bash
   sudo /System/Library/CoreServices/RemoteManagement/ARDAgent.app/Contents/Resources/kickstart \
     -activate -configure -access -on -restart -agent -privs -all
   ```

2. Connect via Screen Sharing from another Mac:
   - Open Finder → Go → Connect to Server
   - Enter: `vnc://your-server-ip`
   - Keep the session logged in

3. The backend will use this active user session

#### Option B: LaunchAgent (For Production)

Create a LaunchAgent that keeps InDesign accessible in a persistent user session:

1. Create a launch agent file:
   ```bash
   sudo nano /Library/LaunchAgents/com.indesign.keepalive.plist
   ```

2. Add this content:
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
   <plist version="1.0">
   <dict>
       <key>Label</key>
       <string>com.indesign.keepalive</string>
       <key>ProgramArguments</key>
       <array>
           <string>/bin/bash</string>
           <string>-c</string>
           <string>sleep infinity</string>
       </array>
       <key>RunAtLoad</key>
       <true/>
       <key>KeepAlive</key>
       <true/>
   </dict>
   </plist>
   ```

3. Enable automatic login for your server user:
   ```bash
   sudo defaults write /Library/Preferences/com.apple.loginwindow autoLoginUser YourUsername
   ```

4. Load the agent:
   ```bash
   sudo launchctl load /Library/LaunchAgents/com.indesign.keepalive.plist
   ```

#### Option C: Use `caffeinate` (Simple but requires terminal)

Keep a terminal session open on the server:
```bash
caffeinate -d &
```

This prevents the display from sleeping. Run your Node.js backend in the same session.

### 3. Configure Backend

1. Set the InDesign path in your `.env` file:
   ```bash
   cd /path/to/Backend
   nano .env
   ```

2. Add or update:
   ```
   INDESIGN_APP_PATH=/Applications/Adobe InDesign 2024/Adobe InDesign 2024.app/Contents/MacOS/Adobe InDesign 2024
   ```

3. For different InDesign versions, find the exact path:
   ```bash
   ls -la /Applications | grep -i indesign
   # Then drill down to find the executable:
   ls -la "/Applications/Adobe InDesign XXXX/Adobe InDesign XXXX.app/Contents/MacOS/"
   ```

### 4. Test the Setup

1. Test InDesign availability:
   ```bash
   cd Backend
   node test-indesign.js
   ```

   You should see:
   ```
   ✓ Adobe InDesign is available and ready to use!
   ```

2. Start your backend:
   ```bash
   npm start
   ```

3. Test with a sample InDesign file via your API

### 5. Security Hardening

1. **Run as dedicated user**:
   ```bash
   # Create a dedicated user for InDesign automation
   sudo dscl . -create /Users/indesignuser
   sudo dscl . -create /Users/indesignuser UserShell /bin/bash
   sudo dscl . -create /Users/indesignuser RealName "InDesign Automation"
   sudo dscl . -create /Users/indesignuser UniqueID 505
   sudo dscl . -create /Users/indesignuser PrimaryGroupID 505
   ```

2. **Limit file system access**: Use macOS sandbox or restrict permissions

3. **Monitor resource usage**:
   ```bash
   # Monitor InDesign processes
   ps aux | grep InDesign

   # Check memory usage
   top -l 1 | grep InDesign
   ```

### 6. Production Best Practices

1. **Process Queue**: Implement a job queue (Bull, BullMQ) to handle requests sequentially
2. **Timeout Handling**: Set timeouts for InDesign operations (large files can take time)
3. **Error Recovery**: Restart InDesign if it crashes or hangs
4. **Logging**: Log all conversions for debugging
5. **Health Checks**: Periodically verify InDesign is responding

Example process manager setup with PM2:
```bash
npm install -g pm2

# Start your backend
pm2 start server.js --name indesign-backend

# Enable auto-restart on server reboot
pm2 startup
pm2 save
```

## Troubleshooting

### InDesign Won't Launch
- Verify user session is logged in with GUI access
- Check InDesign license is activated
- Look for crash logs: `~/Library/Logs/DiagnosticReports/`

### Permission Denied Errors
- Ensure the backend process runs as the user with InDesign access
- Check file permissions on temp directories

### Slow Performance
- InDesign startup adds ~5-10 seconds per conversion
- Consider keeping InDesign running between requests (advanced)
- Use a queue system to prevent concurrent conversions

### "Display Required" Error
- Ensure a user session is logged in
- Verify Screen Sharing or automatic login is working
- Check `who` command shows active user

## Monitoring

Create a monitoring script:
```bash
#!/bin/bash
# check-indesign.sh

if pgrep -x "Adobe InDesign" > /dev/null; then
    echo "InDesign is running"
    exit 0
else
    echo "InDesign is not running"
    exit 1
fi
```

Run it as a cron job:
```bash
crontab -e
# Add: */5 * * * * /path/to/check-indesign.sh
```

## Alternative: Docker + macOS

If your server supports it, you could run macOS in a VM with Docker Desktop, though licensing may be complex.

## Support

For issues specific to:
- **InDesign Licensing**: Contact Adobe Support
- **Backend Code**: Check the logs in your application
- **Server Setup**: Consult macOS Server documentation

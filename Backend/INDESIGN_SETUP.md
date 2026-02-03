# Adobe InDesign Server Setup Guide

This guide will help you install and configure Adobe InDesign Server for use with the InDesign to PDF converter backend.

## Table of Contents
- [What is InDesign Server?](#what-is-indesign-server)
- [System Requirements](#system-requirements)
- [Installation](#installation)
  - [macOS Installation](#macos-installation)
  - [Windows Installation](#windows-installation)
- [Configuration](#configuration)
- [Testing the Connection](#testing-the-connection)
- [Troubleshooting](#troubleshooting)

## What is InDesign Server?

Adobe InDesign Server is a server-based solution that enables automated publishing workflows. It provides the same layout and typographic engine as Adobe InDesign desktop but in a server environment. It exposes a SOAP API that allows programmatic access to InDesign's document processing capabilities.

## System Requirements

### Minimum Requirements
- **Processor**: Multi-core Intel processor (64-bit support)
- **RAM**: 8 GB minimum (16 GB recommended)
- **Storage**: 3 GB available hard-disk space for installation
- **Operating System**:
  - macOS: macOS 10.15 (Catalina) or later
  - Windows: Windows Server 2016 or later, Windows 10 (64-bit)

### Software Requirements
- Adobe InDesign Server license (contact Adobe for licensing)
- Java Runtime Environment (JRE) 8 or later (for SOAP interface)

## Installation

### macOS Installation

1. **Obtain InDesign Server**
   - Purchase or obtain a license from Adobe
   - Download the InDesign Server installer from Adobe
   - The installer will be a `.dmg` file

2. **Run the Installer**
   ```bash
   # Mount the DMG
   open InDesignServer_<version>.dmg

   # Run the installer
   sudo /Volumes/InDesignServer/Install\ InDesign\ Server.app/Contents/MacOS/Install\ InDesign\ Server
   ```

3. **Default Installation Location**
   - InDesign Server will be installed to:
     ```
     /Applications/Adobe InDesign Server <version>/
     ```

4. **Start InDesign Server**
   ```bash
   cd "/Applications/Adobe InDesign Server <version>/"
   sudo ./InDesignServer -port 8080
   ```

5. **Configure as a Service (Optional)**
   Create a LaunchDaemon for automatic startup:

   ```bash
   sudo nano /Library/LaunchDaemons/com.adobe.indesignserver.plist
   ```

   Add the following content:
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
   <plist version="1.0">
   <dict>
       <key>Label</key>
       <string>com.adobe.indesignserver</string>
       <key>ProgramArguments</key>
       <array>
           <string>/Applications/Adobe InDesign Server 2024/InDesignServer</string>
           <string>-port</string>
           <string>8080</string>
       </array>
       <key>RunAtLoad</key>
       <true/>
       <key>KeepAlive</key>
       <true/>
       <key>StandardOutPath</key>
       <string>/var/log/indesignserver.log</string>
       <key>StandardErrorPath</key>
       <string>/var/log/indesignserver-error.log</string>
   </dict>
   </plist>
   ```

   Load the daemon:
   ```bash
   sudo launchctl load /Library/LaunchDaemons/com.adobe.indesignserver.plist
   ```

### Windows Installation

1. **Obtain InDesign Server**
   - Purchase or obtain a license from Adobe
   - Download the InDesign Server installer (`.exe` file)

2. **Run the Installer**
   - Right-click the installer and select "Run as Administrator"
   - Follow the installation wizard
   - Choose installation directory (default: `C:\Program Files\Adobe\Adobe InDesign Server <version>`)

3. **Start InDesign Server**

   Open Command Prompt as Administrator:
   ```cmd
   cd "C:\Program Files\Adobe\Adobe InDesign Server <version>"
   InDesignServer.exe -port 8080
   ```

4. **Configure as a Windows Service (Recommended)**

   Using NSSM (Non-Sucking Service Manager):

   a. Download NSSM from https://nssm.cc/download

   b. Install the service:
   ```cmd
   nssm install InDesignServer "C:\Program Files\Adobe\Adobe InDesign Server <version>\InDesignServer.exe" -port 8080
   ```

   c. Start the service:
   ```cmd
   nssm start InDesignServer
   ```

   d. Configure service to start automatically:
   ```cmd
   sc config InDesignServer start=auto
   ```

## Configuration

### SOAP Endpoint Configuration

By default, InDesign Server exposes a SOAP endpoint at:
```
http://localhost:8080
```

The WSDL can be accessed at:
```
http://localhost:8080?wsdl
```

### Changing the Port

To run InDesign Server on a different port:

**macOS/Linux:**
```bash
./InDesignServer -port 8888
```

**Windows:**
```cmd
InDesignServer.exe -port 8888
```

**Important:** If you change the port, update your backend `.env` file:
```
INDESIGN_SERVER_URL=http://localhost:8888
```

### Additional Configuration Options

InDesign Server supports various command-line options:

```bash
-port <port>              # SOAP port (default: 8080)
-configuration <file>     # Configuration file path
-maxrecords <number>      # Maximum number of records to process
-timeout <seconds>        # Script execution timeout
```

Example with multiple options:
```bash
./InDesignServer -port 8080 -timeout 300 -maxrecords 100
```

## Testing the Connection

### 1. Check if InDesign Server is Running

**macOS/Linux:**
```bash
ps aux | grep InDesignServer
```

**Windows:**
```cmd
tasklist | findstr InDesignServer
```

### 2. Test SOAP Endpoint

Using curl:
```bash
curl http://localhost:8080?wsdl
```

You should see XML output describing the SOAP service.

### 3. Test with the Backend

Start your Node.js backend:
```bash
cd Backend
npm run dev
```

Look for the connection test message in the console:
```
Testing InDesign Server connection at http://localhost:8080...
✓ InDesign Server is reachable
```

### 4. Test with a Simple Script

Create a test file `test-indesign.js`:

```javascript
import soap from 'soap';

const wsdlUrl = 'http://localhost:8080?wsdl';

async function testConnection() {
  try {
    const client = await soap.createClientAsync(wsdlUrl);
    console.log('✓ Successfully connected to InDesign Server');
    console.log('Available methods:', Object.keys(client));

    // Test a simple script
    const result = await client.RunScriptAsync({
      scriptText: 'app.name',
      scriptLanguage: 'javascript',
      scriptArgs: []
    });

    console.log('Script result:', result);
  } catch (error) {
    console.error('✗ Connection failed:', error.message);
  }
}

testConnection();
```

Run it:
```bash
node test-indesign.js
```

## Troubleshooting

### InDesign Server Won't Start

**Issue:** Server fails to start or immediately exits

**Solutions:**
1. Check if another process is using port 8080:
   ```bash
   # macOS/Linux
   lsof -i :8080

   # Windows
   netstat -ano | findstr :8080
   ```

2. Verify license is properly installed
   - Check Adobe Creative Cloud or license file
   - Ensure license is valid and not expired

3. Check system logs:
   ```bash
   # macOS
   tail -f /var/log/indesignserver-error.log

   # Windows
   Check Event Viewer > Application Logs
   ```

### Cannot Connect to SOAP Endpoint

**Issue:** Backend cannot connect to InDesign Server

**Solutions:**
1. Verify InDesign Server is running
2. Check firewall settings:
   ```bash
   # macOS - allow incoming connections
   sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /Applications/Adobe\ InDesign\ Server\ <version>/InDesignServer
   sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblock /Applications/Adobe\ InDesign\ Server\ <version>/InDesignServer
   ```

3. Test connectivity:
   ```bash
   telnet localhost 8080
   ```

4. Ensure `INDESIGN_SERVER_URL` in `.env` matches the actual port

### PDF Export Fails

**Issue:** InDesign file uploads but PDF is not generated

**Solutions:**
1. Check InDesign file is not corrupted
   - Try opening in InDesign Desktop first

2. Verify fonts are available on the server
   - Install required fonts system-wide
   - InDesign Server uses system fonts

3. Check linked assets are included in the package
   - Ensure zip contains all images and resources

4. Increase timeout in backend configuration
   - Large files may need more processing time

5. Check InDesign Server logs for script errors

### Memory Issues

**Issue:** Server crashes or becomes unresponsive with large files

**Solutions:**
1. Increase available memory
   - Allocate more RAM to the server machine
   - Close unnecessary applications

2. Process files in batches
   - Limit concurrent conversions

3. Restart InDesign Server periodically
   - Schedule automatic restarts during low-usage periods

### Permission Issues (macOS)

**Issue:** "Permission denied" errors

**Solutions:**
1. Grant necessary permissions:
   ```bash
   # Grant full disk access in System Preferences > Security & Privacy
   ```

2. Run with appropriate permissions:
   ```bash
   sudo ./InDesignServer -port 8080
   ```

3. Check folder permissions for temp directories:
   ```bash
   chmod -R 755 ./temp
   ```

## Additional Resources

- [Adobe InDesign Server Documentation](https://www.adobe.com/products/indesignserver.html)
- [InDesign Server SDK](https://developer.adobe.com/)
- [SOAP API Reference](https://www.adobe.com/devnet/indesign/sdk.html)

## Support

For InDesign Server licensing and technical support:
- Contact Adobe Enterprise Support
- Visit Adobe Support Community
- Check Adobe Developer Forums

For issues specific to this integration:
- Check the main project README
- Review backend logs in `Backend` directory
- Ensure all dependencies are properly installed

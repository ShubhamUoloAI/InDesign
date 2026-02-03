# InDesign to PDF Conversion Backend

Node.js backend service that converts Adobe InDesign files (.indd, .idml) to PDF using desktop Adobe InDesign automation.

## Features

- Converts InDesign documents to PDF via ExtendScript automation
- Supports both .indd and .idml file formats
- RESTful API for file upload and conversion
- Automatic temp file cleanup
- Cross-platform support (macOS and Windows)

## Prerequisites

- **Node.js**: v18 or higher
- **Adobe InDesign**: Desktop version installed and licensed
- **Operating System**: macOS or Windows (with GUI/display access)

## Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Install Adobe InDesign

Download and install Adobe InDesign on your server/machine:
- Via Adobe Creative Cloud Desktop App
- Or direct download with your license key

### 3. Configure Environment

Copy the example environment configuration:

```bash
cp .env.example .env  # If example exists, or just edit .env
```

Edit `.env` and configure:

```env
PORT=5000

# Optional: Path to InDesign executable (auto-detected if not set)
# macOS: /Applications/Adobe InDesign 2024/Adobe InDesign 2024.app/Contents/MacOS/Adobe InDesign 2024
# Windows: C:\Program Files\Adobe\Adobe InDesign 2024\InDesign.exe
INDESIGN_APP_PATH=

TEMP_UPLOAD_PATH=./temp/uploads
TEMP_EXTRACT_PATH=./temp/extracted
MAX_FILE_SIZE_MB=100
```

### 4. Find Your InDesign Installation

Run the helper script to locate InDesign:

```bash
npm run find:indesign
# or directly: ./find-indesign.sh
```

Copy the suggested `INDESIGN_APP_PATH` to your `.env` file.

### 5. Test InDesign Connection

```bash
npm run test:indesign
```

You should see: `✓ Adobe InDesign is available and ready to use!`

### 6. Run Health Check

```bash
npm run health
```

This checks all system requirements and dependencies.

## Usage

### Development Mode

```bash
npm run dev
```

Runs with auto-reload on file changes.

### Production Mode

```bash
npm start
```

Or use a process manager like PM2:

```bash
npm install -g pm2
pm2 start server.js --name indesign-backend
pm2 save
```

## API Endpoints

### POST /convert

Converts an InDesign file to PDF.

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body: Form data with InDesign file

**Example using curl:**

```bash
curl -X POST \
  -F "file=@/path/to/document.indd" \
  http://localhost:5000/convert \
  -o output.pdf
```

**Example using JavaScript:**

```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch('http://localhost:5000/convert', {
  method: 'POST',
  body: formData
});

const blob = await response.blob();
// Handle PDF blob
```

**Response:**
- Success: PDF file (application/pdf)
- Error: JSON with error message

## Server Setup (macOS)

For production deployment on macOS Server, see [MACOS-SERVER-SETUP.md](MACOS-SERVER-SETUP.md) for detailed instructions on:
- Configuring headless display sessions
- Setting up LaunchAgents
- Security hardening
- Production best practices

## Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start development server with auto-reload |
| `npm run test:indesign` | Test InDesign connection |
| `npm run health` | Run comprehensive health check |
| `npm run find:indesign` | Find InDesign installation path |

## Troubleshooting

### InDesign Not Found

1. Run `npm run find:indesign` to locate installation
2. Verify the path in your `.env` file
3. Ensure InDesign is properly installed and licensed

### Display/GUI Errors

InDesign requires a graphical session. On servers:
- macOS: Enable Screen Sharing or configure LaunchAgent
- Windows: Use Remote Desktop or configure virtual display

See [MACOS-SERVER-SETUP.md](MACOS-SERVER-SETUP.md) for details.

### Permission Denied

Ensure the Node.js process has permission to:
- Execute InDesign
- Write to temp directories
- Access uploaded files

### Slow Performance

Desktop InDesign adds 5-10 seconds startup time per conversion. For better performance:
- Implement a job queue (Bull/BullMQ) for sequential processing
- Avoid concurrent conversions
- Consider keeping InDesign running between requests (advanced)

### Memory Issues

InDesign is memory-intensive. Ensure:
- At least 4GB RAM available
- Monitor memory usage with `npm run health`
- Consider rate limiting requests

## Architecture

```
Backend/
├── config/
│   └── config.js           # Configuration management
├── services/
│   └── indesignService.js  # InDesign automation logic
├── temp/                   # Temporary files (auto-created)
│   ├── uploads/
│   └── extracted/
├── server.js               # Express server
├── test-indesign.js        # Connection test script
├── health-check.js         # System health check
├── find-indesign.sh        # InDesign finder script
└── MACOS-SERVER-SETUP.md   # Server deployment guide
```

## How It Works

1. Client uploads InDesign file via API
2. File is saved to temp directory
3. Backend generates ExtendScript (.jsx) for PDF export
4. ExtendScript is executed via spawned InDesign process
5. InDesign opens document, exports to PDF, and closes
6. PDF is returned to client
7. Temp files are cleaned up

## Limitations

- **Sequential Processing**: Desktop InDesign handles one conversion at a time
- **Startup Overhead**: Each conversion requires launching InDesign
- **GUI Requirement**: Requires logged-in user session with display
- **Platform**: Only works on macOS and Windows (no Linux support)
- **Licensing**: Verify your Adobe license permits server automation

## Security Considerations

- Validate and sanitize file uploads
- Implement rate limiting
- Run as dedicated user with minimal permissions
- Regularly update dependencies
- Monitor for resource exhaustion

## Monitoring

Use the health check script in cron or monitoring tools:

```bash
# Add to crontab
*/5 * * * * cd /path/to/Backend && node health-check.js
```

Or with PM2:

```bash
pm2 start health-check.js --cron-restart="*/5 * * * *"
```

## License

Ensure compliance with Adobe InDesign licensing terms when deploying to servers.

## Support

- For InDesign licensing: Contact Adobe Support
- For backend issues: Check logs and run `npm run health`
- For server setup: See MACOS-SERVER-SETUP.md

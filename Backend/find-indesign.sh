#!/bin/bash

echo "=== Adobe InDesign Installation Finder ==="
echo ""

# Check macOS Applications folder
echo "Searching for InDesign in /Applications..."
INDESIGN_APPS=$(find /Applications -maxdepth 1 -name "*InDesign*" -type d 2>/dev/null)

if [ -z "$INDESIGN_APPS" ]; then
    echo "❌ No InDesign installations found in /Applications"
    echo ""
    echo "Please install Adobe InDesign from:"
    echo "  - Adobe Creative Cloud Desktop App"
    echo "  - Direct download from Adobe with your license"
    exit 1
fi

echo "✓ Found InDesign installation(s):"
echo ""

# For each found InDesign app, find the executable
while IFS= read -r APP_PATH; do
    if [ -n "$APP_PATH" ]; then
        echo "📁 $APP_PATH"

        # Find the actual executable inside the .app bundle
        MACOS_DIR="$APP_PATH/Contents/MacOS"
        if [ -d "$MACOS_DIR" ]; then
            EXECUTABLE=$(find "$MACOS_DIR" -maxdepth 1 -type f -perm +111 -name "*InDesign*" | head -1)
            if [ -n "$EXECUTABLE" ]; then
                echo "   Executable: $EXECUTABLE"
                echo ""
                echo "   Add this to your .env file:"
                echo "   INDESIGN_APP_PATH=$EXECUTABLE"
                echo ""

                # Test if executable
                if [ -x "$EXECUTABLE" ]; then
                    echo "   ✓ Executable is accessible"
                else
                    echo "   ⚠️  Executable may not have proper permissions"
                fi
            fi
        fi
        echo ""
    fi
done <<< "$INDESIGN_APPS"

# Check if user has a display session (required for InDesign)
echo "=== Display Session Check ==="
if who | grep -q console; then
    echo "✓ User session with display is active"
else
    echo "⚠️  No active display session detected"
    echo "   InDesign requires a logged-in user with GUI access."
    echo "   See MACOS-SERVER-SETUP.md for configuration instructions."
fi
echo ""

# Check if InDesign is currently running
echo "=== InDesign Process Check ==="
if pgrep -x "Adobe InDesign" > /dev/null; then
    echo "✓ InDesign is currently running"
    ps aux | grep -i "Adobe InDesign" | grep -v grep
else
    echo "ℹ️  InDesign is not currently running (this is normal)"
fi

echo ""
echo "=== Next Steps ==="
echo "1. Copy the INDESIGN_APP_PATH line above to your .env file"
echo "2. Run: node test-indesign.js"
echo "3. If successful, start your backend: npm start"

#!/bin/bash
# ─────────────────────────────────────────────────────────────────
# Brilliant Academy — RTMP Server Setup Script
# 
# Run this on a fresh Ubuntu VPS (DigitalOcean, Hetzner, etc.):
#   curl -fsSL https://raw.githubusercontent.com/arshathrizvi1/physics-beast/main/rtmp-server/setup.sh | bash
#
# OR manually:
#   chmod +x setup.sh && ./setup.sh
# ─────────────────────────────────────────────────────────────────

set -e

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║   Brilliant Academy — RTMP Streaming Server Setup        ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# 1. Update system and install dependencies
echo "📦 Installing system dependencies..."
sudo apt-get update -qq
sudo apt-get install -y -qq nodejs npm ffmpeg git curl

# Install Node 20 if needed
if ! node -v | grep -q "v20\|v21\|v22"; then
  echo "📦 Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y -qq nodejs
fi

echo "✅ Node $(node -v) | npm $(npm -v) | ffmpeg installed"

# 2. Clone or update the repo
APP_DIR="/opt/brilliant-academy-rtmp"
if [ -d "$APP_DIR" ]; then
  echo "📁 Updating existing installation..."
  cd "$APP_DIR"
  git pull
else
  echo "📁 Cloning repository..."
  sudo mkdir -p "$APP_DIR"
  sudo chown $USER:$USER "$APP_DIR"
  git clone https://github.com/arshathrizvi1/physics-beast.git /tmp/ba-temp
  cp -r /tmp/ba-temp/rtmp-server/* "$APP_DIR/"
  rm -rf /tmp/ba-temp
fi

cd "$APP_DIR"

# 3. Install npm dependencies
echo "📦 Installing Node.js dependencies..."
npm install --production

# 4. Create .env if it doesn't exist
if [ ! -f ".env" ]; then
  echo ""
  echo "⚙️  Creating .env configuration..."
  
  # Generate a random callback secret
  RANDOM_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  SERVER_IP=$(curl -s ifconfig.me || echo "YOUR_SERVER_IP")
  
  cat > .env << EOF
WEBSITE_URL=https://brilliantacademy.vercel.app
CALLBACK_SECRET=${RANDOM_SECRET}
BUNNY_STREAM_LIBRARY_ID=748058
BUNNY_STREAM_API_KEY=PASTE_YOUR_BUNNY_API_KEY_HERE
RTMP_PORT=1935
HTTP_PORT=8000
SERVER_HOST=${SERVER_IP}
FFMPEG_PATH=/usr/bin/ffmpeg
MEDIA_ROOT=./media
VALID_STREAM_KEYS=any
EOF
  
  echo "✅ .env created with auto-detected IP: ${SERVER_IP}"
  echo ""
  echo "⚠️  IMPORTANT: Edit .env and set your BUNNY_STREAM_API_KEY!"
  echo "   nano /opt/brilliant-academy-rtmp/.env"
  echo ""
  echo "Also add this CALLBACK_SECRET to your Vercel environment variables:"
  echo "   RTMP_CALLBACK_SECRET=${RANDOM_SECRET}"
  echo "   NEXT_PUBLIC_RTMP_SERVER_HOST=${SERVER_IP}"
  echo ""
fi

# 5. Create media directories
mkdir -p media/live media/recordings

# 6. Create systemd service for auto-restart
echo "🔧 Creating systemd service..."
sudo tee /etc/systemd/system/ba-rtmp.service > /dev/null << EOF
[Unit]
Description=Brilliant Academy RTMP Streaming Server
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable ba-rtmp
sudo systemctl restart ba-rtmp

# 7. Open firewall ports
echo "🔓 Opening firewall ports (1935 for RTMP, 8000 for HLS)..."
sudo ufw allow 1935/tcp 2>/dev/null || true
sudo ufw allow 8000/tcp 2>/dev/null || true

# 8. Install Cloudflare WARP (bypasses YouTube AWS IP blocks)
echo ""
echo "🌐 Installing Cloudflare WARP (YouTube bot-bypass)..."

# Add Cloudflare WARP repo
curl -fsSL https://pkg.cloudflareclient.com/pubkey.gpg | sudo gpg --dearmor -o /usr/share/keyrings/cloudflare-warp-archive-keyring.gpg 2>/dev/null
echo "deb [signed-by=/usr/share/keyrings/cloudflare-warp-archive-keyring.gpg] https://pkg.cloudflareclient.com/ $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/cloudflare-client.list > /dev/null
sudo apt-get update -qq
sudo apt-get install -y -qq cloudflare-warp || echo "⚠️  WARP install failed - will try manual setup"

# Register and connect WARP
if command -v warp-cli &> /dev/null; then
  warp-cli --accept-tos registration new 2>/dev/null || true
  warp-cli --accept-tos mode proxy 2>/dev/null || true
  warp-cli --accept-tos proxy port 40000 2>/dev/null || true
  warp-cli --accept-tos connect 2>/dev/null || true
  echo "✅ Cloudflare WARP connected on socks5://127.0.0.1:40000"

  # Add WARP auto-start to systemd service
  sudo sed -i '/ExecStart=\/usr\/bin\/node/i ExecStartPre=warp-cli connect' /etc/systemd/system/ba-rtmp.service 2>/dev/null || true
  sudo systemctl daemon-reload
else
  echo "⚠️  WARP not available. YouTube downloads may be blocked by AWS IP."
  echo "   Manually install: https://pkg.cloudflareclient.com/"
fi

# 9. Update yt-dlp to latest version (fixes new YouTube bot checks)
echo ""
echo "📦 Updating yt-dlp to latest..."
if command -v yt-dlp &> /dev/null; then
  yt-dlp --update || pip install --upgrade yt-dlp 2>/dev/null || true
else
  pip install yt-dlp 2>/dev/null || pip3 install yt-dlp 2>/dev/null || \
    sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    sudo chmod +x /usr/local/bin/yt-dlp
fi
echo "✅ yt-dlp version: $(yt-dlp --version 2>/dev/null || echo 'installed')"

# 10. Create placeholder cookies file
COOKIES_PATH="$APP_DIR/cookies.txt"
if [ ! -f "$COOKIES_PATH" ]; then
  cat > "$COOKIES_PATH" << 'COOKIES_PLACEHOLDER'
# Netscape HTTP Cookie File
# This file is a placeholder. Replace with real YouTube cookies to bypass bot checks.
# How to get cookies:
#   1. Install the "Get cookies.txt LOCALLY" browser extension on Chrome/Firefox
#   2. Go to youtube.com and sign in with a BURNER Google account
#   3. Click the extension and export cookies.txt
#   4. Upload the file to: /opt/brilliant-academy-rtmp/cookies.txt
#      Command: scp cookies.txt ubuntu@YOUR_EC2_IP:/opt/brilliant-academy-rtmp/cookies.txt
#   5. Restart the server: sudo systemctl restart ba-rtmp
COOKIES_PLACEHOLDER
  echo "✅ Placeholder cookies.txt created at $COOKIES_PATH"
  echo "   ⚠️  Replace with real YouTube cookies for best results (see file for instructions)"
fi

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║   ✅ RTMP Server is now running!                         ║"
echo "╠═══════════════════════════════════════════════════════════╣"
echo "║                                                           ║"
echo "║   RTMP URL:  rtmp://$(curl -s ifconfig.me):1935/live      ║"
echo "║   Status:    http://$(curl -s ifconfig.me):8000/status     ║"
echo "║                                                           ║"
echo "║   Service:   sudo systemctl status ba-rtmp                ║"
echo "║   Logs:      sudo journalctl -u ba-rtmp -f                ║"
echo "║   Restart:   sudo systemctl restart ba-rtmp               ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "📝 Next steps:"
echo "   1. Edit .env: nano $APP_DIR/.env"
echo "   2. Add BUNNY_STREAM_API_KEY to .env"
echo "   3. Add RTMP_CALLBACK_SECRET and NEXT_PUBLIC_RTMP_SERVER_HOST to Vercel"
echo "   4. Test from OBS: Server = rtmp://YOUR_IP:1935/live"
echo ""

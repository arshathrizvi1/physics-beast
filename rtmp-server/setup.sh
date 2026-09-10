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

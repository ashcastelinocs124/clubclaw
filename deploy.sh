#!/bin/bash
# ClubClaw VPS Deployment Script
# Run on a fresh Ubuntu 22.04/24.04 Hetzner VPS
# Usage: ssh root@YOUR_VPS_IP 'bash -s' < deploy.sh

set -e

echo "=== ClubClaw Deployment ==="

# 1. Install Node.js 22
echo "Installing Node.js 22..."
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs build-essential

# 2. Install PM2
echo "Installing PM2..."
npm install -g pm2

# 3. Create clubclaw user
echo "Creating clubclaw user..."
id -u clubclaw &>/dev/null || useradd -m -s /bin/bash clubclaw

# 4. Clone the repo
echo "Cloning ClubClaw..."
su - clubclaw -c '
  git clone https://github.com/ashcastelinocs124/clubclaw.git ~/clubclaw
  cd ~/clubclaw/clubclaw
  npm install
  npm run build
'

echo ""
echo "=== Setup complete! ==="
echo ""
echo "Next steps:"
echo "  1. Create the config file:"
echo "     su - clubclaw"
echo "     cp ~/clubclaw/clubclaw.example.yaml ~/clubclaw/clubclaw.yaml"
echo "     nano ~/clubclaw/clubclaw.yaml"
echo ""
echo "  2. Set your Discord bot token and guild ID in clubclaw.yaml"
echo ""
echo "  3. Start ClubClaw:"
echo "     cd ~/clubclaw/clubclaw"
echo "     pm2 start dist/index.js --name clubclaw"
echo "     pm2 save"
echo "     pm2 startup"
echo ""
echo "  4. Check logs:"
echo "     pm2 logs clubclaw"

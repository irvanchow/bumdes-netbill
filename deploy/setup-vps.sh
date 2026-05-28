#!/bin/bash
# Setup script for BumDes NetBill on Ubuntu 24.04 VPS
# Domain: netbill.bumdesagirimandala.com
# Run as root: sudo bash setup-vps.sh

set -e

DOMAIN="netbill.bumdesagirimandala.com"
REPO_URL="https://github.com/irvanchow/netbill-bumdes.git"
APP_DIR="/var/www/bumdes-netbill"
DB_USER="bumdes"
DB_NAME="bumdes"
DB_PASS=$(openssl rand -base64 16 | tr -dc 'a-zA-Z0-9' | head -c 20)

echo "=== BumDes NetBill VPS Setup (Ubuntu 24.04) ==="
echo "Domain: $DOMAIN"
echo ""

# 1. Update system
echo "[1/10] Updating system..."
apt update && apt upgrade -y

# 2. Install Node.js 20
echo "[2/10] Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g pm2

# 3. Install PostgreSQL
echo "[3/10] Installing PostgreSQL..."
apt install -y postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql

# 4. Setup database
echo "[4/10] Setting up database..."
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';"
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"

# 5. Install Nginx
echo "[5/10] Installing Nginx..."
apt install -y nginx
systemctl enable nginx

# 6. Install Certbot (SSL)
echo "[6/10] Installing Certbot..."
apt install -y certbot python3-certbot-nginx

# 7. Create app directory & clone repo
echo "[7/10] Cloning repository..."
mkdir -p $APP_DIR
mkdir -p /var/log/pm2
git clone $REPO_URL $APP_DIR
mkdir -p $APP_DIR/public/uploads/bukti-transfer

# 8. Setup environment
echo "[8/10] Setting up environment..."
NEXTAUTH_SECRET=$(openssl rand -base64 32)
CRON_SECRET=$(openssl rand -base64 16)

cat > $APP_DIR/.env.local << EOF
DATABASE_URL=postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME
NEXTAUTH_URL=https://$DOMAIN
NEXTAUTH_SECRET=$NEXTAUTH_SECRET
CRON_SECRET=$CRON_SECRET
NODE_ENV=production
EOF

# 9. Install dependencies, migrate & build
echo "[9/10] Installing dependencies & building..."
cd $APP_DIR
npm install
npm run db:push
npm run db:seed
npm run build

# 10. Setup firewall
echo "[10/10] Configuring firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo ""
echo "=== Setup selesai! ==="
echo ""
echo "============================================"
echo "  DATABASE PASSWORD: $DB_PASS"
echo "  NEXTAUTH_SECRET: $NEXTAUTH_SECRET"
echo "  CRON_SECRET: $CRON_SECRET"
echo "============================================"
echo ""
echo "SIMPAN CREDENTIALS DI ATAS!"
echo ""
echo "Langkah selanjutnya:"
echo ""
echo "1. Setup Nginx:"
echo "   cp $APP_DIR/deploy/nginx.conf /etc/nginx/sites-available/netbill"
echo "   ln -s /etc/nginx/sites-available/netbill /etc/nginx/sites-enabled/"
echo "   rm -f /etc/nginx/sites-enabled/default"
echo "   nginx -t && systemctl reload nginx"
echo ""
echo "2. Setup SSL (pastikan DNS A record sudah pointing ke IP VPS):"
echo "   certbot --nginx -d $DOMAIN"
echo ""
echo "3. Start app:"
echo "   cd $APP_DIR"
echo "   pm2 start ecosystem.config.js"
echo "   pm2 save"
echo "   pm2 startup"
echo ""
echo "4. Setup cron backup (opsional):"
echo "   crontab -e"
echo "   0 2 * * * pg_dump -U $DB_USER $DB_NAME > /var/backups/bumdes-\$(date +\%Y\%m\%d).sql"
echo ""
echo "Done! Akses: https://$DOMAIN"

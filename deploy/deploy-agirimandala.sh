#!/bin/bash
# =============================================================
# FULL DEPLOY SCRIPT - BumDes NetBill
# VPS: Ubuntu 24.04 | IP: 103.133.56.58
# Domain: netbill.bumdesagirimandala.com
# =============================================================
# Run as root: sudo bash deploy-agirimandala.sh
# PASTIKAN DNS A record sudah pointing ke 103.133.56.58
# =============================================================

set -e

DOMAIN="netbill.bumdesagirimandala.com"
REPO_URL="https://github.com/irvanchow/netbill-bumdes.git"
APP_DIR="/var/www/bumdes-netbill"
DB_USER="bumdes"
DB_NAME="bumdes"
DB_PASS=$(openssl rand -base64 16 | tr -dc 'a-zA-Z0-9' | head -c 20)
NEXTAUTH_SECRET=$(openssl rand -base64 32)
CRON_SECRET=$(openssl rand -base64 16)

echo "==========================================="
echo "  BumDes NetBill - Full Deploy"
echo "  Domain: $DOMAIN"
echo "  IP: 103.133.56.58"
echo "==========================================="
echo ""

# -------------------------------------------
# 1. SYSTEM UPDATE
# -------------------------------------------
echo "[1/12] Updating system..."
apt update && apt upgrade -y
apt install -y curl git build-essential

# -------------------------------------------
# 2. INSTALL NODE.JS 20
# -------------------------------------------
echo "[2/12] Installing Node.js 20..."
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
fi
echo "Node.js version: $(node -v)"
echo "npm version: $(npm -v)"
npm install -g pm2

# -------------------------------------------
# 3. INSTALL POSTGRESQL
# -------------------------------------------
echo "[3/12] Installing PostgreSQL..."
apt install -y postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql

# -------------------------------------------
# 4. SETUP DATABASE
# -------------------------------------------
echo "[4/12] Setting up database..."
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"

# -------------------------------------------
# 5. INSTALL NGINX
# -------------------------------------------
echo "[5/12] Installing Nginx..."
apt install -y nginx
systemctl enable nginx

# -------------------------------------------
# 6. INSTALL CERTBOT
# -------------------------------------------
echo "[6/12] Installing Certbot..."
apt install -y certbot python3-certbot-nginx

# -------------------------------------------
# 7. CLONE REPOSITORY
# -------------------------------------------
echo "[7/12] Cloning repository..."
if [ -d "$APP_DIR" ]; then
  echo "Directory exists, pulling latest..."
  cd $APP_DIR
  git pull origin main
else
  git clone $REPO_URL $APP_DIR
fi
mkdir -p $APP_DIR/public/uploads/bukti-transfer
mkdir -p /var/log/pm2

# -------------------------------------------
# 8. SETUP ENVIRONMENT
# -------------------------------------------
echo "[8/12] Setting up environment variables..."
cat > $APP_DIR/.env.local << EOF
DATABASE_URL=postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME
NEXTAUTH_URL=https://$DOMAIN
NEXTAUTH_SECRET=$NEXTAUTH_SECRET
CRON_SECRET=$CRON_SECRET
NODE_ENV=production
EOF

# -------------------------------------------
# 9. BUILD APPLICATION
# -------------------------------------------
echo "[9/12] Installing dependencies & building..."
cd $APP_DIR
npm install
npm run db:push
npm run db:seed
npm run build

# -------------------------------------------
# 10. CONFIGURE NGINX
# -------------------------------------------
echo "[10/12] Configuring Nginx..."

cat > /etc/nginx/sites-available/netbill << 'NGINX_CONF'
server {
    listen 80;
    server_name netbill.bumdesagirimandala.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Max upload size (for bukti transfer)
    client_max_body_size 10M;

    # Next.js static assets
    location /_next/static/ {
        alias /var/www/bumdes-netbill/.next/static/;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    # Proxy to Next.js
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX_CONF

ln -sf /etc/nginx/sites-available/netbill /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# -------------------------------------------
# 11. SETUP SSL WITH LET'S ENCRYPT
# -------------------------------------------
echo "[11/12] Setting up SSL certificate..."
certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --redirect

# -------------------------------------------
# 12. START APPLICATION WITH PM2
# -------------------------------------------
echo "[12/12] Starting application..."
cd $APP_DIR
pm2 stop bumdes-netbill 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root

# -------------------------------------------
# SETUP FIREWALL
# -------------------------------------------
echo "Configuring firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# -------------------------------------------
# SETUP CRON JOBS
# -------------------------------------------
echo "Setting up cron jobs..."
CRON_HEADER="# BumDes NetBill Cron Jobs"
if ! crontab -l 2>/dev/null | grep -q "$CRON_HEADER"; then
  (crontab -l 2>/dev/null; echo "$CRON_HEADER") | crontab -
  # Generate tagihan setiap tanggal 1 jam 00:05
  (crontab -l; echo "5 0 1 * * curl -s -H 'x-cron-secret: $CRON_SECRET' https://$DOMAIN/api/cron/generate-tagihan") | crontab -
  # Update status setiap hari jam 01:00
  (crontab -l; echo "0 1 * * * curl -s -H 'x-cron-secret: $CRON_SECRET' https://$DOMAIN/api/cron/update-status") | crontab -
  # Backup database setiap hari jam 02:00
  (crontab -l; echo "0 2 * * * pg_dump -U $DB_USER $DB_NAME > /var/backups/bumdes-\$(date +\%Y\%m\%d).sql") | crontab -
fi
mkdir -p /var/backups

# -------------------------------------------
# DONE!
# -------------------------------------------
echo ""
echo "==========================================="
echo "  DEPLOY SELESAI!"
echo "==========================================="
echo ""
echo "  URL: https://$DOMAIN"
echo ""
echo "  CREDENTIALS (SIMPAN!):"
echo "  ─────────────────────────────────────"
echo "  DB User    : $DB_USER"
echo "  DB Password: $DB_PASS"
echo "  DB Name    : $DB_NAME"
echo "  NEXTAUTH_SECRET: $NEXTAUTH_SECRET"
echo "  CRON_SECRET    : $CRON_SECRET"
echo "  ─────────────────────────────────────"
echo ""
echo "  Login default:"
echo "  Email   : admin@bumdes.com"
echo "  Password: admin123"
echo ""
echo "  Commands:"
echo "  pm2 status          - cek status app"
echo "  pm2 logs            - lihat logs"
echo "  pm2 restart all     - restart app"
echo "  certbot renew --dry-run  - test SSL renewal"
echo ""
echo "==========================================="

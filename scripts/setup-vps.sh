#!/bin/bash

# Script Setup VPS untuk BumDes Billing
# Ubuntu 24.04

set -e

echo "=========================================="
echo "Setup VPS untuk BumDes Billing"
echo "=========================================="
echo ""

# Update sistem
echo "📦 Update sistem..."
apt update && apt upgrade -y

# Install Node.js 20.x
echo "📦 Install Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
echo "✅ Node.js version: $(node --version)"
echo "✅ NPM version: $(npm --version)"

# Install PostgreSQL 16
echo "📦 Install PostgreSQL 16..."
apt install -y postgresql postgresql-contrib
systemctl start postgresql
systemctl enable postgresql
echo "✅ PostgreSQL installed"

# Install Nginx
echo "📦 Install Nginx..."
apt install -y nginx
systemctl start nginx
systemctl enable nginx
echo "✅ Nginx installed"

# Install PM2
echo "📦 Install PM2..."
npm install -g pm2
echo "✅ PM2 installed"

# Install Certbot
echo "📦 Install Certbot..."
apt install -y certbot python3-certbot-nginx
echo "✅ Certbot installed"

# Install Git
echo "📦 Install Git..."
apt install -y git
echo "✅ Git installed"

# Setup firewall
echo "🔒 Setup firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
echo "y" | ufw enable
echo "✅ Firewall configured"

echo ""
echo "=========================================="
echo "✅ Setup VPS selesai!"
echo "=========================================="
echo ""
echo "Langkah selanjutnya:"
echo "1. Setup database PostgreSQL"
echo "2. Upload aplikasi"
echo "3. Setup Nginx dan SSL"
echo ""

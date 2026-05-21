# Quick Deployment Guide - BumDes Billing

## Persiapan di Komputer Lokal

### 1. Siapkan file untuk upload
```bash
# Buka PowerShell di folder project
cd C:\PROJECTS\claudecode-project\bumdes-jelijihpunggang

# Compress project (exclude node_modules dan .next)
tar --exclude=node_modules --exclude=.next --exclude=.git -czf bumdes.tar.gz .
```

---

## Deployment di VPS (SSH ke 38.47.176.110)

### 2. Login ke VPS
```bash
ssh root@38.47.176.110
```

### 3. Upload dan jalankan script setup
```bash
# Upload script dari komputer lokal (buka PowerShell baru)
scp C:\PROJECTS\claudecode-project\bumdes-jelijihpunggang\scripts\setup-vps.sh root@38.47.176.110:/root/
scp C:\PROJECTS\claudecode-project\bumdes-jelijihpunggang\scripts\setup-database.sh root@38.47.176.110:/root/

# Kembali ke SSH VPS, jalankan setup
chmod +x /root/setup-vps.sh
chmod +x /root/setup-database.sh

# Install semua dependencies
/root/setup-vps.sh

# Setup database (akan diminta password)
/root/setup-database.sh
```

### 4. Upload aplikasi
```bash
# Dari komputer lokal (PowerShell)
scp C:\PROJECTS\claudecode-project\bumdes-jelijihpunggang\bumdes.tar.gz root@38.47.176.110:/root/

# Di VPS
mkdir -p /var/www/bumdes
cd /var/www/bumdes
tar -xzf /root/bumdes.tar.gz
npm install --production
```

### 5. Setup environment
```bash
cd /var/www/bumdes
nano .env.production
```

Isi dengan (ganti PASSWORD_DATABASE dengan password yang Anda buat tadi):
```env
DATABASE_URL=postgresql://bumdes:PASSWORD_DATABASE@localhost:5432/bumdes
NEXTAUTH_URL=https://netbill.matadewa.my.id
NEXTAUTH_SECRET=GENERATE_RANDOM_32_CHARS
CRON_SECRET=GENERATE_RANDOM_32_CHARS
NODE_ENV=production
```

Generate secret:
```bash
openssl rand -base64 32
```

### 6. Migrate database dan buat user admin
```bash
cd /var/www/bumdes

# Push schema ke database
npx drizzle-kit push

# Buat user admin
node -e "
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://bumdes:PASSWORD_DATABASE@localhost:5432/bumdes'
});
(async () => {
  const hash = await bcrypt.hash('admin123', 10);
  await pool.query('INSERT INTO users (name, email, password_hash, role) VALUES (\$1, \$2, \$3, \$4)', ['Admin', 'admin@bumdes.id', hash, 'admin']);
  console.log('✅ Admin user created: admin@bumdes.id / admin123');
  await pool.end();
})();
"
```

### 7. Build aplikasi
```bash
cd /var/www/bumdes
npm run build
```

### 8. Setup PM2
```bash
cd /var/www/bumdes

# Buat ecosystem config
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'bumdes-billing',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/bumdes',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
EOF

# Start dengan PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
# Jalankan command yang diberikan oleh pm2 startup

# Cek status
pm2 status
pm2 logs bumdes-billing --lines 20
```

### 9. Setup Nginx
```bash
# Buat konfigurasi Nginx
cat > /etc/nginx/sites-available/bumdes << 'EOF'
server {
    listen 80;
    server_name netbill.matadewa.my.id;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Aktifkan konfigurasi
ln -s /etc/nginx/sites-available/bumdes /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

### 10. Setup SSL
```bash
certbot --nginx -d netbill.matadewa.my.id --non-interactive --agree-tos --email your-email@example.com --redirect
```

Ganti `your-email@example.com` dengan email Anda.

---

## Verifikasi

```bash
# Cek aplikasi
pm2 status
curl http://localhost:3000

# Cek Nginx
systemctl status nginx

# Cek dari browser
# Buka: https://netbill.matadewa.my.id
# Login: admin@bumdes.id / admin123
```

---

## Update Aplikasi (untuk deployment berikutnya)

```bash
# Upload file baru
scp bumdes.tar.gz root@38.47.176.110:/root/

# Di VPS
cd /var/www/bumdes
tar -xzf /root/bumdes.tar.gz
npm install --production
npm run build
pm2 restart bumdes-billing
```

---

## Troubleshooting

### Aplikasi tidak bisa diakses
```bash
pm2 logs bumdes-billing --lines 50
systemctl status nginx
tail -f /var/log/nginx/error.log
```

### Database error
```bash
sudo -u postgres psql -c "\l"
sudo -u postgres psql -d bumdes -c "SELECT * FROM users;"
```

### Port sudah digunakan
```bash
lsof -i :3000
# Kill process jika perlu
kill -9 <PID>
pm2 restart bumdes-billing
```

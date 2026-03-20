# Deploy to Debian 13 (Trixie) VPS - Complete Guide

This guide covers deploying the full-stack application (FastAPI backend + React frontend + MongoDB) on a Debian 13.3 VPS.

---

## Prerequisites

- Debian 13.3 VPS with root/sudo access
- A domain name (optional but recommended for SSL)
- SSH access to your server

---

## Step 1: Initial Server Setup

```bash
# Connect to your VPS
ssh root@YOUR_SERVER_IP

# Update system
apt update && apt upgrade -y

# Install essential packages
apt install -y curl wget git build-essential software-properties-common \
  ufw sudo nano htop unzip gnupg2 ca-certificates lsb-release

# Create a deploy user (don't run the app as root)
adduser deploy
usermod -aG sudo deploy

# Switch to deploy user
su - deploy
```

---

## Step 2: Configure Firewall (UFW)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

---

## Step 3: Install Node.js 20 LTS

```bash
# Install Node.js via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node -v   # Should show v20.x.x
npm -v

# Install Yarn (used by this project)
sudo npm install -g yarn
```

---

## Step 4: Install Python 3.11+

```bash
# Debian 13 ships with Python 3.12+ by default
python3 --version

# Install pip and venv
sudo apt install -y python3-pip python3-venv python3-dev
```

---

## Step 5: Install MongoDB 7.0

```bash
# Import MongoDB GPG key
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
  sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Add MongoDB repository (use Debian bookworm repo, compatible with Trixie)
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

sudo apt update
sudo apt install -y mongodb-org

# Start and enable MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
sudo systemctl status mongod

# Verify MongoDB is running
mongosh --eval "db.runCommand({ ping: 1 })"
```

### Secure MongoDB (Recommended)

```bash
# Open MongoDB shell
mongosh

# Create admin user
use admin
db.createUser({
  user: "admin",
  pwd: "YOUR_STRONG_ADMIN_PASSWORD",
  roles: [ { role: "userAdminAnyDatabase", db: "admin" } ]
})

# Create application database and user
use erpnext_db
db.createUser({
  user: "erpnext_user",
  pwd: "YOUR_STRONG_APP_PASSWORD",
  roles: [ { role: "readWrite", db: "erpnext_db" } ]
})

exit
```

```bash
# Enable MongoDB authentication
sudo nano /etc/mongod.conf
```

Add/uncomment in `mongod.conf`:
```yaml
security:
  authorization: enabled
```

```bash
sudo systemctl restart mongod
```

---

## Step 6: Clone and Set Up the Application

```bash
# As deploy user
cd /home/deploy

# Clone the repository
git clone https://github.com/ibrahim303404/erpnext.git
cd erpnext
```

### 6a: Set Up Backend

```bash
cd /home/deploy/erpnext/backend

# Create Python virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Create .env file
cat > .env << 'EOF'
MONGO_URL=mongodb://erpnext_user:YOUR_STRONG_APP_PASSWORD@localhost:27017/erpnext_db
DB_NAME=erpnext_db
EOF

# Test the backend starts
uvicorn server:app --host 0.0.0.0 --port 8001
# Press Ctrl+C after confirming it works
```

### 6b: Set Up Frontend

```bash
cd /home/deploy/erpnext/frontend

# Install dependencies
yarn install

# Create production build
# Set the backend API URL for production
cat > .env.production << 'EOF'
REACT_APP_API_URL=https://YOUR_DOMAIN.com
EOF

# Build the React app
yarn build
```

---

## Step 7: Set Up Systemd Service for Backend

```bash
sudo nano /etc/systemd/system/erpnext-backend.service
```

Paste:
```ini
[Unit]
Description=ERPNext FastAPI Backend
After=network.target mongod.service
Wants=mongod.service

[Service]
Type=simple
User=deploy
Group=deploy
WorkingDirectory=/home/deploy/erpnext/backend
Environment=PATH=/home/deploy/erpnext/backend/venv/bin:/usr/bin:/bin
ExecStart=/home/deploy/erpnext/backend/venv/bin/uvicorn server:app --host 127.0.0.1 --port 8001 --workers 4
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable erpnext-backend
sudo systemctl start erpnext-backend
sudo systemctl status erpnext-backend
```

---

## Step 8: Install and Configure Nginx

```bash
sudo apt install -y nginx

sudo nano /etc/nginx/sites-available/erpnext
```

Paste (replace `YOUR_DOMAIN.com` with your domain or server IP):

```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN.com;

    # Frontend - serve React build
    root /home/deploy/erpnext/frontend/build;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
    gzip_min_length 1000;

    # API requests -> FastAPI backend
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
        client_max_body_size 50M;
    }

    # React SPA - all other routes serve index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/erpnext /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

## Step 9: Set Up SSL with Let's Encrypt (if you have a domain)

```bash
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d YOUR_DOMAIN.com

# Auto-renewal is set up automatically. Test it:
sudo certbot renew --dry-run
```

---

## Step 10: Set Up Log Rotation

```bash
sudo nano /etc/logrotate.d/erpnext
```

Paste:
```
/var/log/erpnext/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 deploy deploy
    sharedscripts
    postrotate
        systemctl reload nginx > /dev/null 2>&1 || true
    endscript
}
```

---

## Step 11: MongoDB Backup (Cron Job)

```bash
# Create backup directory
sudo mkdir -p /var/backups/mongodb
sudo chown deploy:deploy /var/backups/mongodb

# Add cron job for daily backups
crontab -e
```

Add this line:
```
0 2 * * * mongodump --uri="mongodb://erpnext_user:YOUR_STRONG_APP_PASSWORD@localhost:27017/erpnext_db" --out=/var/backups/mongodb/$(date +\%Y-\%m-\%d) --gzip 2>&1 | logger -t mongodb-backup
```

---

## Step 12: Deploy Updates (Future Deployments)

Create a deploy script at `/home/deploy/deploy.sh`:

```bash
#!/bin/bash
set -e

echo "=== Deploying ERPNext ==="
cd /home/deploy/erpnext

# Pull latest code
git pull origin main

# Update backend
echo ">>> Updating backend..."
cd backend
source venv/bin/activate
pip install -r requirements.txt
deactivate

# Update frontend
echo ">>> Building frontend..."
cd ../frontend
yarn install
yarn build

# Restart services
echo ">>> Restarting services..."
sudo systemctl restart erpnext-backend

echo "=== Deployment complete ==="
```

```bash
chmod +x /home/deploy/deploy.sh
```

---

## Quick Reference - Useful Commands

| Action | Command |
|---|---|
| Check backend status | `sudo systemctl status erpnext-backend` |
| View backend logs | `sudo journalctl -u erpnext-backend -f` |
| Restart backend | `sudo systemctl restart erpnext-backend` |
| Restart Nginx | `sudo systemctl restart nginx` |
| Check MongoDB status | `sudo systemctl status mongod` |
| View Nginx error log | `sudo tail -f /var/log/nginx/error.log` |
| Run deploy script | `bash /home/deploy/deploy.sh` |

---

## Troubleshooting

### Backend won't start
```bash
# Check logs
sudo journalctl -u erpnext-backend -n 50 --no-pager

# Test manually
cd /home/deploy/erpnext/backend
source venv/bin/activate
uvicorn server:app --host 127.0.0.1 --port 8001
```

### MongoDB connection issues
```bash
# Check MongoDB is running
sudo systemctl status mongod

# Check connection
mongosh --eval "db.runCommand({ ping: 1 })"

# Check .env file
cat /home/deploy/erpnext/backend/.env
```

### Nginx 502 Bad Gateway
```bash
# Backend is probably not running
sudo systemctl restart erpnext-backend
sudo systemctl status erpnext-backend
```

### Permission issues
```bash
# Fix ownership
sudo chown -R deploy:deploy /home/deploy/erpnext
```

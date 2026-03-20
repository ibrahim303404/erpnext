#!/bin/bash
set -e

echo "========================================="
echo "  ERPNext VPS Deployment Script"
echo "  For Debian 13.3 (Trixie)"
echo "========================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_step() { echo -e "\n${GREEN}[STEP]${NC} $1"; }
print_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_err()  { echo -e "${RED}[ERROR]${NC} $1"; }

# Must run as root for initial setup
if [ "$EUID" -ne 0 ]; then
  print_err "Please run as root: sudo bash deploy.sh"
  exit 1
fi

DEPLOY_USER="deploy"
APP_DIR="/home/$DEPLOY_USER/erpnext"
DOMAIN="${1:-_}"

echo ""
read -p "Enter your domain name (or press Enter for IP-only setup): " DOMAIN_INPUT
DOMAIN="${DOMAIN_INPUT:-_}"

read -sp "Enter MongoDB application password: " MONGO_APP_PASS
echo ""

read -sp "Enter MongoDB admin password: " MONGO_ADMIN_PASS
echo ""

# ---- Step 1: System Update ----
print_step "1/10 - Updating system packages..."
apt update && apt upgrade -y
apt install -y curl wget git build-essential \
  ufw sudo nano htop unzip gnupg2 ca-certificates lsb-release

# ---- Step 2: Create deploy user ----
print_step "2/10 - Setting up deploy user..."
if ! id "$DEPLOY_USER" &>/dev/null; then
  adduser --disabled-password --gecos "" $DEPLOY_USER
  usermod -aG sudo $DEPLOY_USER
  echo "$DEPLOY_USER ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/$DEPLOY_USER
  echo "Deploy user created."
else
  echo "Deploy user already exists."
fi

# ---- Step 3: Firewall ----
print_step "3/10 - Configuring firewall..."
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
yes | ufw enable || true
ufw status

# ---- Step 4: Install Node.js 20 ----
print_step "4/10 - Installing Node.js 20 LTS..."
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
  npm install -g yarn
fi
echo "Node.js: $(node -v)"

# ---- Step 5: Install Python ----
print_step "5/10 - Installing Python..."
apt install -y python3 python3-pip python3-venv python3-dev
echo "Python: $(python3 --version)"

# ---- Step 6: Install MongoDB 7.0 ----
print_step "6/10 - Installing MongoDB 7.0..."
if ! command -v mongod &>/dev/null; then
  curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
    gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
  echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main" | \
    tee /etc/apt/sources.list.d/mongodb-org-7.0.list
  apt update
  apt install -y mongodb-org
fi
systemctl start mongod
systemctl enable mongod
echo "MongoDB: $(mongod --version | head -1)"

# Set up MongoDB users
sleep 2
mongosh --quiet --eval "
  use admin;
  try {
    db.createUser({
      user: 'admin',
      pwd: '$MONGO_ADMIN_PASS',
      roles: [ { role: 'userAdminAnyDatabase', db: 'admin' } ]
    });
  } catch(e) { print('Admin user may already exist: ' + e.message); }

  use erpnext_db;
  try {
    db.createUser({
      user: 'erpnext_user',
      pwd: '$MONGO_APP_PASS',
      roles: [ { role: 'readWrite', db: 'erpnext_db' } ]
    });
  } catch(e) { print('App user may already exist: ' + e.message); }
" || print_warn "MongoDB user setup may need manual configuration"

# Enable auth in MongoDB
if ! grep -q "authorization: enabled" /etc/mongod.conf; then
  sed -i '/^#security:/c\security:\n  authorization: enabled' /etc/mongod.conf 2>/dev/null || \
  echo -e "\nsecurity:\n  authorization: enabled" >> /etc/mongod.conf
  systemctl restart mongod
fi

# ---- Step 7: Deploy Application ----
print_step "7/10 - Deploying application..."
if [ ! -d "$APP_DIR" ]; then
  sudo -u $DEPLOY_USER git clone https://github.com/ibrahim303404/erpnext.git "$APP_DIR"
else
  sudo -u $DEPLOY_USER bash -c "cd $APP_DIR && git pull origin main"
fi

# Backend setup
print_step "Setting up backend..."
sudo -u $DEPLOY_USER bash -c "
  cd $APP_DIR/backend
  python3 -m venv venv
  source venv/bin/activate
  pip install --upgrade pip
  pip install -r requirements.txt
"

# Create backend .env
cat > "$APP_DIR/backend/.env" << EOF
MONGO_URL=mongodb://erpnext_user:${MONGO_APP_PASS}@localhost:27017/erpnext_db
DB_NAME=erpnext_db
EOF
chown $DEPLOY_USER:$DEPLOY_USER "$APP_DIR/backend/.env"
chmod 600 "$APP_DIR/backend/.env"

# Frontend setup
print_step "Setting up frontend..."
sudo -u $DEPLOY_USER bash -c "
  cd $APP_DIR/frontend
  yarn install
  REACT_APP_API_URL='' yarn build
"

# ---- Step 8: Systemd Service ----
print_step "8/10 - Creating systemd service..."
cat > /etc/systemd/system/erpnext-backend.service << EOF
[Unit]
Description=ERPNext FastAPI Backend
After=network.target mongod.service
Wants=mongod.service

[Service]
Type=simple
User=$DEPLOY_USER
Group=$DEPLOY_USER
WorkingDirectory=$APP_DIR/backend
Environment=PATH=$APP_DIR/backend/venv/bin:/usr/bin:/bin
ExecStart=$APP_DIR/backend/venv/bin/uvicorn server:app --host 127.0.0.1 --port 8001 --workers 4
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable erpnext-backend
systemctl start erpnext-backend

# ---- Step 9: Nginx ----
print_step "9/10 - Configuring Nginx..."
apt install -y nginx

cat > /etc/nginx/sites-available/erpnext << NGINXEOF
server {
    listen 80;
    server_name $DOMAIN;

    root $APP_DIR/frontend/build;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
    gzip_min_length 1000;

    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 60s;
        proxy_read_timeout 60s;
        client_max_body_size 50M;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
NGINXEOF

ln -sf /etc/nginx/sites-available/erpnext /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx
systemctl enable nginx

# ---- Step 10: MongoDB Backup Cron ----
print_step "10/10 - Setting up backups..."
mkdir -p /var/backups/mongodb
chown $DEPLOY_USER:$DEPLOY_USER /var/backups/mongodb

(crontab -u $DEPLOY_USER -l 2>/dev/null; echo "0 2 * * * mongodump --uri='mongodb://erpnext_user:${MONGO_APP_PASS}@localhost:27017/erpnext_db' --out=/var/backups/mongodb/\$(date +\%Y-\%m-\%d) --gzip 2>&1 | logger -t mongodb-backup") | sort -u | crontab -u $DEPLOY_USER -

# ---- Done ----
echo ""
echo "========================================="
echo -e "${GREEN}  DEPLOYMENT COMPLETE!${NC}"
echo "========================================="
echo ""
echo "Backend service: sudo systemctl status erpnext-backend"
echo "Nginx status:    sudo systemctl status nginx"
echo "MongoDB status:  sudo systemctl status mongod"
echo ""
if [ "$DOMAIN" != "_" ]; then
  echo "Your site: http://$DOMAIN"
  echo ""
  echo "To add SSL, run:"
  echo "  sudo apt install -y certbot python3-certbot-nginx"
  echo "  sudo certbot --nginx -d $DOMAIN"
else
  echo "Your site: http://YOUR_SERVER_IP"
fi
echo ""
echo "View logs: sudo journalctl -u erpnext-backend -f"
echo "========================================="

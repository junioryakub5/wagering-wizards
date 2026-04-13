#!/bin/bash
# ─── Wagering Wizards — One-command startup ───────────────────────────────────
# Kills everything, starts backend + frontend + two Cloudflare tunnels,
# auto-updates .env.local with the fresh backend tunnel URL.

set -e
export PATH=/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:$PATH

BACKEND_DIR="$(cd "$(dirname "$0")/backend" && pwd)"
FRONTEND_DIR="$(cd "$(dirname "$0")/frontend" && pwd)"
ENV_LOCAL="$FRONTEND_DIR/.env.local"
PAYSTACK_KEY="pk_test_5ea5e36fe127df1e71403fc3d5a558c326767c01"

echo ""
echo "🧙 Wagering Wizards — Starting up..."
echo "─────────────────────────────────────"

# ── 1. Kill anything already running ─────────────────────────────────────────
echo "⏹  Stopping old processes..."
pkill -f "node server.js"     2>/dev/null || true
pkill -f "next dev"           2>/dev/null || true
pkill -f "next-server"        2>/dev/null || true
pkill -f "cloudflared tunnel" 2>/dev/null || true
sleep 1

# ── 2. Start backend ──────────────────────────────────────────────────────────
echo "⚙️  Starting backend..."
cd "$BACKEND_DIR"
node server.js > /tmp/ww-backend.log 2>&1 &
BACKEND_PID=$!

# Wait until backend is up
for i in {1..15}; do
  if curl -s http://localhost:5001/api/health > /dev/null 2>&1; then
    echo "✅ Backend running (PID $BACKEND_PID)"
    break
  fi
  sleep 1
done

# ── 3. Tunnel backend ─────────────────────────────────────────────────────────
echo "🌐 Creating backend tunnel..."
cloudflared tunnel --url http://localhost:5001 > /tmp/ww-tunnel-backend.log 2>&1 &
sleep 6

BACKEND_URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' /tmp/ww-tunnel-backend.log | head -1)
if [ -z "$BACKEND_URL" ]; then
  echo "❌ Could not get backend tunnel URL. Check /tmp/ww-tunnel-backend.log"
  exit 1
fi
echo "✅ Backend tunnel: $BACKEND_URL"

# ── 4. Update frontend .env.local with new backend URL ───────────────────────
echo "📝 Updating .env.local..."
cat > "$ENV_LOCAL" <<EOF
NEXT_PUBLIC_API_URL=${BACKEND_URL}/api
NEXT_PUBLIC_PAYSTACK_KEY=${PAYSTACK_KEY}
EOF

# ── 5. Start frontend ─────────────────────────────────────────────────────────
echo "🖥  Starting frontend..."
cd "$FRONTEND_DIR"
npm run dev > /tmp/ww-frontend.log 2>&1 &
FRONTEND_PID=$!

# Wait until frontend is up
for i in {1..20}; do
  if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend running (PID $FRONTEND_PID)"
    break
  fi
  sleep 1
done

# ── 6. Tunnel frontend ────────────────────────────────────────────────────────
echo "🌐 Creating frontend tunnel..."
cloudflared tunnel --url http://localhost:3000 > /tmp/ww-tunnel-frontend.log 2>&1 &
sleep 6

FRONTEND_URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' /tmp/ww-tunnel-frontend.log | head -1)
if [ -z "$FRONTEND_URL" ]; then
  echo "❌ Could not get frontend tunnel URL. Check /tmp/ww-tunnel-frontend.log"
  exit 1
fi
echo "✅ Frontend tunnel: $FRONTEND_URL"

# ── 7. Print summary ──────────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════"
echo "  🎉 Wagering Wizards is LIVE!"
echo "══════════════════════════════════════════════"
echo ""
echo "  📱 Share this link (phone / public):"
echo "     $FRONTEND_URL"
echo ""
echo "  🔧 Admin panel:"
echo "     $FRONTEND_URL/portal"
echo ""
echo "  ⚙️  Backend API:"
echo "     $BACKEND_URL/api/health"
echo ""
echo "  💻 Local (your Mac only):"
echo "     http://localhost:3000"
echo ""
echo "  ⚠️  Tunnels are temporary — run ./start.sh again if they expire"
echo "══════════════════════════════════════════════"
echo ""

# Keep script alive so tunnels stay up (Ctrl+C to stop everything)
wait

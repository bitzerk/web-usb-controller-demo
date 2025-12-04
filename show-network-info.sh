#!/bin/bash

echo "==================================="
echo "📱 Network Configuration for Phone"
echo "==================================="
echo ""

# Get local IP addresses
echo "Your local IP addresses:"
ip addr show | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | grep -v '127.0.0.1' | while read ip; do
  echo "  • $ip"
done

echo ""
echo "Update your .env file with:"
echo ""
echo "VITE_SOCKET_SERVER_URL=http://YOUR_IP:3000"
echo "VITE_APP_BASE_URL=http://YOUR_IP:5173"
echo ""
echo "Replace YOUR_IP with one of the IP addresses above"
echo "that matches your WiFi network (usually 192.168.x.x)"
echo ""
echo "Then restart the dev server: bun run dev"
echo "==================================="

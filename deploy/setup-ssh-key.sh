#!/bin/bash
set -e

echo "Setting up SSH key for GitHub Actions deployment"
echo "=================================================="

KEY_NAME="github_deploy_crm"
KEY_PATH="$HOME/.ssh/$KEY_NAME"

if [ -f "$KEY_PATH" ]; then
    echo "Key already exists at $KEY_PATH"
    echo "Delete it first if you want a new one: rm $KEY_PATH $KEY_PATH.pub"
    exit 1
fi

echo "Generating SSH key pair..."
ssh-keygen -t ed25519 -C "github-deploy-crm" -f "$KEY_PATH" -N ""

echo ""
echo "Adding public key to VPS..."
echo "   Enter VPS root password when prompted..."
cat "$KEY_PATH.pub" | ssh root@194.238.19.57 "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && echo 'Key added to VPS'"

echo ""
echo "Testing SSH connection..."
ssh -i "$KEY_PATH" -o StrictHostKeyChecking=no root@194.238.19.57 "echo 'SSH connection successful'"

echo ""
echo "=================================================="
echo "NEXT STEPS:"
echo "=================================================="
echo ""
echo "1. Add these GitHub Secrets (Settings → Secrets → Actions):"
echo ""
echo "   VPS_HOST  = 194.238.19.57"
echo "   VPS_USER  = root"
echo "   VPS_SSH_KEY = (copy the private key below)"
echo ""
echo "2. Private key for VPS_SSH_KEY:"
echo "   ─────────────────────────────"
cat "$KEY_PATH"
echo "   ─────────────────────────────"
echo ""
echo "3. Copy the ENTIRE private key (including BEGIN/END lines)"
echo "   and paste it as the VPS_SSH_KEY secret value."
echo ""
echo "4. Push to main branch to trigger deployment:"
echo "   git push origin main"
echo ""

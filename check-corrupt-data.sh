#!/bin/bash

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║          CHECKING FOR CORRUPT AMOUNTS IN DATABASE             ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "This script will scan your database for corrupt amount data..."
echo ""

node fix-corrupt-amounts-final.mjs

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                       SCAN COMPLETE                           ║"
echo "╚═══════════════════════════════════════════════════════════════╝"


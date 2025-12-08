#!/bin/bash
# Simple launcher script for Backup & Restore Manager

cd "$(dirname "$0")"
exec node backup-restore-manager.mjs

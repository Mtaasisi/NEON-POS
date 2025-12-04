#!/bin/bash

# Quick Test Script for Scheduled Messages
# This creates a test scheduled message to verify the system is working

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     SCHEDULED MESSAGES - QUICK TEST                       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if server is running
echo -e "${BLUE}Checking if server is running...${NC}"
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Server is running"
else
    echo -e "${RED}❌ Server is not running${NC}"
    echo "Please start the server first:"
    echo "  cd server && npm start"
    exit 1
fi

echo ""
echo -e "${BLUE}This test will:${NC}"
echo "1. Create a test scheduled message"
echo "2. Schedule it for 2 minutes from now"
echo "3. Display the message details"
echo "4. Show how to monitor it"
echo ""

read -p "Press Enter to continue..."

echo ""
echo -e "${BLUE}Creating test message...${NC}"

# Get current time + 2 minutes
SCHEDULE_TIME=$(date -u -d '+2 minutes' '+%Y-%m-%dT%H:%M:%S.000Z' 2>/dev/null || date -u -v+2M '+%Y-%m-%dT%H:%M:%S.000Z' 2>/dev/null)

if [ -z "$SCHEDULE_TIME" ]; then
    echo -e "${RED}❌ Failed to calculate schedule time${NC}"
    echo "Please enter your phone number and we'll schedule for a specific time:"
    read -p "Schedule time (YYYY-MM-DDTHH:MM:SS.000Z): " SCHEDULE_TIME
fi

# Prompt for phone number
echo ""
read -p "Enter your phone number (with country code, e.g., +255123456789): " PHONE_NUMBER

if [ -z "$PHONE_NUMBER" ]; then
    echo -e "${RED}❌ Phone number is required${NC}"
    exit 1
fi

# Prompt for user ID
echo ""
echo "You need your user ID from Supabase."
echo "You can find it in:"
echo "  - Browser: localStorage.getItem('supabase.auth.token')"
echo "  - Database: SELECT id FROM users LIMIT 1"
echo ""
read -p "Enter your user ID: " USER_ID

if [ -z "$USER_ID" ]; then
    echo -e "${RED}❌ User ID is required${NC}"
    exit 1
fi

# Create the test message
echo ""
echo -e "${BLUE}Sending request to API...${NC}"

RESPONSE=$(curl -s -X POST http://localhost:8000/api/scheduled-messages \
  -H "Content-Type: application/json" \
  -d "{
    \"user_id\": \"$USER_ID\",
    \"name\": \"Test Message - $(date '+%Y-%m-%d %H:%M')\",
    \"message_type\": \"sms\",
    \"message_content\": \"🎉 Test message from Scheduled Messages system! Sent at {time} on {date}\",
    \"recipients\": [{
      \"phone\": \"$PHONE_NUMBER\",
      \"name\": \"Test User\"
    }],
    \"schedule_type\": \"once\",
    \"scheduled_for\": \"$SCHEDULE_TIME\",
    \"timezone\": \"Africa/Dar_es_Salaam\",
    \"execution_mode\": \"server\",
    \"auto_execute\": true,
    \"settings\": {
      \"use_personalization\": true,
      \"random_delay\": true,
      \"min_delay\": 1000,
      \"max_delay\": 3000
    }
  }")

# Check if successful
if echo "$RESPONSE" | grep -q "success.*true"; then
    echo -e "${GREEN}✓${NC} Test message created successfully!"
    
    # Extract message ID
    MESSAGE_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║              TEST MESSAGE DETAILS                          ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    echo -e "${GREEN}Message ID:${NC} $MESSAGE_ID"
    echo -e "${GREEN}Phone Number:${NC} $PHONE_NUMBER"
    echo -e "${GREEN}Scheduled For:${NC} $SCHEDULE_TIME"
    echo -e "${GREEN}Message:${NC} Test message from Scheduled Messages system!"
    echo ""
    echo "The message will be sent in approximately 2 minutes."
    echo ""
    
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║           HOW TO MONITOR THE MESSAGE                       ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    echo "1. View in UI:"
    echo "   ${BLUE}http://localhost:5173/sms/scheduled${NC}"
    echo ""
    echo "2. Check status via API:"
    echo "   ${BLUE}curl http://localhost:8000/api/scheduled-messages/$MESSAGE_ID${NC}"
    echo ""
    echo "3. Watch server logs:"
    echo "   Look for: '📤 Executing:' messages"
    echo ""
    echo "4. Execute immediately (optional):"
    echo "   ${BLUE}curl -X POST http://localhost:8000/api/scheduled-messages/$MESSAGE_ID/execute${NC}"
    echo ""
    echo "5. Check your phone:"
    echo "   You should receive the SMS in ~2 minutes"
    echo ""
    
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║              NEXT STEPS                                    ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    echo "1. Wait for the message (or execute immediately using the command above)"
    echo "2. Check your phone for the test SMS"
    echo "3. If received successfully: ${GREEN}✅ System is working!${NC}"
    echo "4. If not received: Check troubleshooting guide"
    echo ""
    echo "Read the complete guide:"
    echo "  ${BLUE}SCHEDULED_BULK_MESSAGES_GUIDE.md${NC}"
    echo ""
    echo -e "${GREEN}Test setup complete! 🎉${NC}"
    
else
    echo -e "${RED}❌ Failed to create test message${NC}"
    echo ""
    echo "Response from server:"
    echo "$RESPONSE"
    echo ""
    echo "Possible issues:"
    echo "1. Server not running properly"
    echo "2. Database not set up"
    echo "3. Invalid user ID"
    echo "4. API endpoint not configured"
    echo ""
    echo "Check the server logs for more details"
fi


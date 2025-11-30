#!/bin/bash

echo "🔍 Checking ALL pages for unified loading system usage..."
echo "=========================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

pages_with_unified=0
pages_without_unified=0
total_pages=0

# Find all page files
page_files=$(find src/features -name "*Page*.tsx" -type f | grep -v "node_modules" | sort)

for file in $page_files; do
    ((total_pages++))
    filename=$(basename "$file")
    
    # Check if file uses useLoadingJob
    if grep -q "useLoadingJob" "$file" 2>/dev/null; then
        echo -e "${GREEN}✅${NC} $filename - Using unified loading"
        ((pages_with_unified++))
    else
        # Check if it has old loading patterns
        if grep -q "isLoading\|animate-spin\|LoadingOverlay\|Loading\.\.\." "$file" 2>/dev/null; then
            echo -e "${RED}❌${NC} $filename - Using OLD loading pattern"
        else
            echo -e "${YELLOW}⚠️${NC}  $filename - No loading detected"
        fi
        ((pages_without_unified++))
    fi
done

echo ""
echo "=========================================================="
echo "📊 Summary:"
echo "  Total pages found: $total_pages"
echo "  ✅ Using unified loading: $pages_with_unified"
echo "  ❌ Using old patterns: $pages_without_unified"
echo ""
percentage=$((pages_with_unified * 100 / total_pages))
echo "  📈 Coverage: $percentage%"
echo "=========================================================="

#!/bin/bash

# Feature Branch Creation Script
# Usage: ./create-feature-branch.sh feature-name

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   Feature Branch Creator                           ${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════${NC}"
echo ""

# Check if feature name is provided
if [ -z "$1" ]; then
    echo -e "${RED}❌ Error: Feature name required${NC}"
    echo ""
    echo "Usage: ./create-feature-branch.sh <feature-name>"
    echo ""
    echo "Examples:"
    echo "  ./create-feature-branch.sh customer-search"
    echo "  ./create-feature-branch.sh payment-integration"
    echo "  ./create-feature-branch.sh ui-improvements"
    echo ""
    echo "Branch will be created as: feature/<feature-name>"
    exit 1
fi

FEATURE_NAME=$1
BRANCH_NAME="feature/${FEATURE_NAME}"

echo -e "${YELLOW}📋 Feature Name:${NC} $FEATURE_NAME"
echo -e "${YELLOW}🌿 Branch Name:${NC} $BRANCH_NAME"
echo ""

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Not in a git repository${NC}"
    exit 1
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo -e "${YELLOW}⚠️  Warning: You have uncommitted changes${NC}"
    echo ""
    echo "Options:"
    echo "  1. Commit them first"
    echo "  2. Stash them: git stash"
    echo "  3. Continue anyway (changes will be in new branch)"
    echo ""
    read -p "Continue? (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}❌ Aborted${NC}"
        exit 1
    fi
fi

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${BLUE}📍 Current branch:${NC} $CURRENT_BRANCH"

# Checkout clean-main (or main if clean-main doesn't exist)
echo ""
echo -e "${YELLOW}🔄 Switching to clean-main...${NC}"

if git show-ref --verify --quiet refs/heads/clean-main; then
    git checkout clean-main
    BASE_BRANCH="clean-main"
elif git show-ref --verify --quiet refs/heads/main; then
    git checkout main
    BASE_BRANCH="main"
else
    echo -e "${RED}❌ Error: Neither clean-main nor main branch exists${NC}"
    exit 1
fi

# Pull latest changes
echo -e "${YELLOW}⬇️  Pulling latest changes...${NC}"
git pull origin $BASE_BRANCH 2>/dev/null || echo -e "${YELLOW}⚠️  Could not pull (may be offline or remote not configured)${NC}"

# Check if branch already exists
if git show-ref --verify --quiet refs/heads/$BRANCH_NAME; then
    echo ""
    echo -e "${RED}❌ Branch '$BRANCH_NAME' already exists${NC}"
    echo ""
    echo "Options:"
    echo "  1. Use a different name"
    echo "  2. Delete the existing branch: git branch -D $BRANCH_NAME"
    echo "  3. Switch to it: git checkout $BRANCH_NAME"
    exit 1
fi

# Create new feature branch
echo ""
echo -e "${GREEN}✨ Creating new branch: $BRANCH_NAME${NC}"
git checkout -b $BRANCH_NAME

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Success! Feature branch created                   ${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}📝 Next Steps:${NC}"
echo ""
echo "  1. Work on your feature (only modify files related to this feature)"
echo "  2. Commit regularly:"
echo -e "     ${YELLOW}git add .${NC}"
echo -e "     ${YELLOW}git commit -m \"feat: your change description\"${NC}"
echo ""
echo "  3. When ready, push to remote:"
echo -e "     ${YELLOW}git push origin $BRANCH_NAME${NC}"
echo ""
echo "  4. Create Pull Request to merge back to $BASE_BRANCH"
echo ""
echo -e "${BLUE}💡 Tips:${NC}"
echo "  - Keep this branch focused on ONE feature"
echo "  - Commit often with clear messages"
echo "  - Test your changes before pushing"
echo "  - Use conventional commits (feat:, fix:, refactor:, docs:)"
echo ""
echo -e "${BLUE}🔗 Useful Commands:${NC}"
echo -e "  ${YELLOW}git status${NC}           - Check what's modified"
echo -e "  ${YELLOW}git diff${NC}             - See changes"
echo -e "  ${YELLOW}git log --oneline${NC}    - See commit history"
echo -e "  ${YELLOW}git checkout $BASE_BRANCH${NC} - Go back to $BASE_BRANCH"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"
echo ""


# 🎯 Git Workflow Guide - Your New Development Process

**Created:** October 18, 2025  
**For:** POS System Development  
**Status:** ✅ Ready to Use

---

## 🌟 Overview

This guide shows you the **proper Git workflow** for developing features in isolation. No more mixing 20 features in one branch! 🎉

---

## 🎨 Branch Structure

```
main (or clean-main)
│
├── feature/customer-search       ← One feature
├── feature/payment-integration   ← Another feature
├── feature/inventory-ui          ← Another feature
├── fix/stock-transfer-bug        ← Bug fix
└── hotfix/critical-payment       ← Urgent fix
```

**Key Rule:** ONE branch = ONE feature ✅

---

## 📋 Quick Reference

### Create Feature Branch
```bash
# Using the helper script (recommended)
./create-feature-branch.sh your-feature-name

# Or manually
git checkout clean-main
git pull origin clean-main
git checkout -b feature/your-feature-name
```

### Work on Feature
```bash
# Make changes to files
# ...

# Check what changed
git status
git diff

# Stage changes
git add .

# Commit
git commit -m "feat: add customer search functionality"

# Push to remote
git push origin feature/your-feature-name
```

### Merge Back
```bash
# Switch to clean-main
git checkout clean-main

# Pull latest
git pull origin clean-main

# Merge your feature
git merge feature/your-feature-name

# Push
git push origin clean-main

# Delete feature branch (optional)
git branch -d feature/your-feature-name
```

---

## 🚀 Complete Workflow (Step by Step)

### Step 1: Start New Feature
```bash
# Make sure you're on clean-main
git checkout clean-main

# Get latest changes
git pull origin clean-main

# Create feature branch
git checkout -b feature/customer-search
```

**Or use the helper script:**
```bash
./create-feature-branch.sh customer-search
```

---

### Step 2: Work on Your Feature

**Only modify files related to THIS feature!**

Good examples:
- ✅ Working on customer search → only modify search-related files
- ✅ Working on payment UI → only modify payment components
- ✅ Working on inventory → only modify inventory files

Bad examples:
- ❌ Working on customer search but also fixing unrelated bugs
- ❌ Working on payments but also updating inventory
- ❌ Mixing multiple features in one branch

---

### Step 3: Commit Your Changes

```bash
# Check what you modified
git status

# See the actual changes
git diff

# Stage all changes
git add .

# OR stage specific files
git add src/features/customers/SearchComponent.tsx
git add src/lib/customerApi.ts

# Commit with clear message
git commit -m "feat: add customer search with filters"
```

**Commit Message Format:**
```
feat: add new feature
fix: fix a bug
refactor: improve code without changing functionality
docs: update documentation
test: add tests
chore: maintenance tasks
style: formatting, no code change
```

Examples:
```bash
git commit -m "feat: add customer search functionality"
git commit -m "fix: resolve payment calculation error"
git commit -m "refactor: optimize database queries"
git commit -m "docs: update API documentation"
```

---

### Step 4: Push to Remote

```bash
# First time pushing this branch
git push -u origin feature/customer-search

# Subsequent pushes
git push origin feature/customer-search

# Or just (if upstream is set)
git push
```

---

### Step 5: Create Pull Request (Optional but Recommended)

If you're using GitHub/GitLab:
1. Go to your repository
2. Click "Create Pull Request"
3. Select: `feature/customer-search` → `clean-main`
4. Add description of changes
5. Request review (or self-review)
6. Merge when approved

---

### Step 6: Merge Back to clean-main

**Option A: Via Pull Request (Recommended)**
- Merge through GitHub/GitLab interface
- Keeps history clean
- Allows code review

**Option B: Manually**
```bash
# Switch to clean-main
git checkout clean-main

# Pull latest changes
git pull origin clean-main

# Merge your feature
git merge feature/customer-search

# Resolve any conflicts if they occur

# Push to remote
git push origin clean-main
```

---

### Step 7: Clean Up (Optional)

```bash
# Delete local branch
git branch -d feature/customer-search

# Delete remote branch
git push origin --delete feature/customer-search
```

---

## 🎯 Branch Naming Conventions

### Feature Branches
```
feature/customer-search
feature/payment-integration
feature/inventory-dashboard
feature/whatsapp-notifications
```

### Bug Fix Branches
```
fix/stock-transfer-calculation
fix/login-validation
fix/product-image-upload
fix/payment-rounding
```

### Hotfix Branches (Urgent Production Fixes)
```
hotfix/critical-payment-bug
hotfix/data-loss-issue
hotfix/security-vulnerability
```

### Refactor Branches
```
refactor/customer-api
refactor/database-queries
refactor/component-structure
```

### Documentation Branches
```
docs/api-documentation
docs/user-guide
docs/setup-instructions
```

### Test Branches
```
test/customer-search
test/payment-flow
test/integration-tests
```

---

## 💡 Best Practices

### DO ✅

1. **Create a new branch for each feature**
   ```bash
   git checkout -b feature/new-feature
   ```

2. **Keep branches small and focused**
   - One feature per branch
   - Easy to review
   - Easy to test
   - Easy to rollback

3. **Commit often with clear messages**
   ```bash
   git commit -m "feat: add search input component"
   git commit -m "feat: add search API integration"
   git commit -m "feat: add search results display"
   ```

4. **Pull before you push**
   ```bash
   git pull origin clean-main
   git push origin feature/my-feature
   ```

5. **Test before merging**
   - Test your feature thoroughly
   - Check for console errors
   - Verify functionality works
   - Run linter if available

6. **Delete merged branches**
   - Keeps repository clean
   - Avoids confusion
   - Reduces clutter

---

### DON'T ❌

1. **Don't mix multiple features in one branch**
   ```bash
   # ❌ Bad
   git checkout -b feature/everything
   # Now working on payments, inventory, customers, etc.
   
   # ✅ Good
   git checkout -b feature/payment-integration
   # Only work on payment feature
   ```

2. **Don't commit everything at once**
   ```bash
   # ❌ Bad - 89 files changed!
   git add .
   git commit -m "lots of changes"
   
   # ✅ Good - logical commits
   git add src/features/payments/*
   git commit -m "feat: add payment form"
   
   git add src/lib/paymentApi.ts
   git commit -m "feat: add payment API"
   ```

3. **Don't work directly on clean-main**
   ```bash
   # ❌ Bad
   git checkout clean-main
   # Make changes directly
   
   # ✅ Good
   git checkout clean-main
   git checkout -b feature/my-feature
   # Make changes in feature branch
   ```

4. **Don't leave branches unmerged for too long**
   - Merge within 1-3 days if possible
   - Longer = more conflicts
   - Shorter = easier integration

5. **Don't push broken code**
   - Test locally first
   - Fix linter errors
   - Verify functionality works
   - Then push

6. **Don't use vague commit messages**
   ```bash
   # ❌ Bad
   git commit -m "updates"
   git commit -m "fixes"
   git commit -m "changes"
   
   # ✅ Good
   git commit -m "feat: add customer search with filters"
   git commit -m "fix: resolve stock transfer calculation"
   git commit -m "refactor: optimize POS search query"
   ```

---

## 🔥 Common Scenarios

### Scenario 1: Starting a New Feature
```bash
./create-feature-branch.sh customer-loyalty
# Work on customer loyalty feature only
git add .
git commit -m "feat: add loyalty points system"
git push origin feature/customer-loyalty
```

---

### Scenario 2: Found a Bug While Working on Feature
```bash
# You're on feature/customer-search
# Found a bug in payment system

# Option A: Fix in separate branch (recommended)
git stash                          # Save current work
git checkout clean-main            # Go to main branch
git checkout -b fix/payment-bug    # Create fix branch
# Fix the bug
git commit -m "fix: resolve payment rounding"
git checkout feature/customer-search
git stash pop                      # Continue your work

# Option B: Note it and fix later
# Add to TODO list, fix in separate branch after current feature
```

---

### Scenario 3: Need to Update from clean-main
```bash
# You're working on feature/inventory-ui
# clean-main has new changes you need

git checkout clean-main
git pull origin clean-main
git checkout feature/inventory-ui
git merge clean-main

# Or use rebase (advanced)
git checkout feature/inventory-ui
git rebase clean-main
```

---

### Scenario 4: Merge Conflict
```bash
# After merge, you get conflicts
git merge clean-main

# Auto-merging src/features/customers/List.tsx
# CONFLICT (content): Merge conflict in src/features/customers/List.tsx

# Open the file, resolve conflicts
# Look for <<<<<<< HEAD markers

# After fixing
git add src/features/customers/List.tsx
git commit -m "merge: resolve conflicts with clean-main"
```

---

### Scenario 5: Accidentally Worked on Wrong Branch
```bash
# Oh no! Made changes on clean-main instead of feature branch

# Stash your changes
git stash

# Create proper branch
git checkout -b feature/my-feature

# Apply your changes
git stash pop

# Now commit properly
git add .
git commit -m "feat: my feature"
```

---

### Scenario 6: Want to Discard Changes
```bash
# Discard all uncommitted changes
git checkout .

# OR restore specific file
git restore src/features/customers/List.tsx

# OR reset to last commit
git reset --hard HEAD
```

---

## 📊 Visual Workflow

```
1. Start
   ↓
2. git checkout clean-main
   ↓
3. git pull origin clean-main
   ↓
4. git checkout -b feature/name
   ↓
5. Make changes (only to feature files!)
   ↓
6. git add .
   ↓
7. git commit -m "feat: description"
   ↓
8. git push origin feature/name
   ↓
9. Create Pull Request (optional)
   ↓
10. Code Review (optional)
    ↓
11. git checkout clean-main
    ↓
12. git merge feature/name
    ↓
13. git push origin clean-main
    ↓
14. git branch -d feature/name
    ↓
15. Done! Start next feature (back to step 2)
```

---

## 🎓 Learning Resources

### Git Basics
- Check status: `git status`
- See changes: `git diff`
- View history: `git log --oneline`
- View branches: `git branch -a`

### Useful Git Commands
```bash
# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes)
git reset --hard HEAD~1

# View commit history graphically
git log --graph --oneline --all

# See who changed what
git blame filename.tsx

# Find when a bug was introduced
git bisect start

# Create branch and switch to it
git checkout -b feature/name

# Switch branches
git checkout branch-name

# Delete branch
git branch -d branch-name

# Stash changes temporarily
git stash
git stash pop

# Cherry-pick a commit
git cherry-pick commit-hash
```

---

## 🎯 Checklist for Every Feature

Before starting:
- [ ] Created feature branch from clean-main
- [ ] Branch name is descriptive
- [ ] Pulled latest changes

While working:
- [ ] Only modifying files related to this feature
- [ ] Committing regularly with clear messages
- [ ] Testing changes as I go
- [ ] No linter errors

Before merging:
- [ ] Feature is complete and tested
- [ ] All files related to feature are committed
- [ ] No console errors
- [ ] Linter passes
- [ ] Pushed to remote
- [ ] Created PR (if using)

After merging:
- [ ] Merged to clean-main
- [ ] Pushed clean-main
- [ ] Deleted feature branch
- [ ] Verified merge was successful

---

## 🚨 Emergency Procedures

### "I Messed Up Everything!"
```bash
# Don't panic! Your commits are safe

# See all your commits (even "lost" ones)
git reflog

# Go back to a previous state
git reset --hard HEAD@{n}  # Replace n with number from reflog
```

### "I Need to Undo My Last Commit"
```bash
# Keep changes, undo commit
git reset --soft HEAD~1

# Discard everything including changes
git reset --hard HEAD~1
```

### "I Committed to Wrong Branch"
```bash
# Copy the commit hash
git log --oneline

# Switch to correct branch
git checkout correct-branch

# Apply that commit
git cherry-pick commit-hash

# Go back and remove from wrong branch
git checkout wrong-branch
git reset --hard HEAD~1
```

---

## 📝 Summary

### The Golden Rules:
1. ✅ Always create a feature branch
2. ✅ One feature = one branch
3. ✅ Commit often with clear messages
4. ✅ Test before merging
5. ✅ Delete branches after merging

### Your New Workflow:
```bash
# Every single time you start new work:
./create-feature-branch.sh feature-name
# Work on feature
git commit -m "feat: description"
git push origin feature/feature-name
# Merge when done
```

---

## 🎉 You're Ready!

You now have:
- ✅ Clean commit history
- ✅ Isolated features
- ✅ Easy rollbacks
- ✅ Safe deployments
- ✅ Better code reviews
- ✅ Team collaboration ready

**Next feature you work on, use this workflow!**

---

## 🆘 Need Help?

Common issues and solutions:

**Q: Branch already exists?**
```bash
git branch -d feature/name  # Delete it
# Or
git checkout feature/name   # Switch to it
```

**Q: Changes in wrong branch?**
```bash
git stash                  # Save changes
git checkout correct-branch
git stash pop              # Restore changes
```

**Q: Want to see all branches?**
```bash
git branch -a
```

**Q: Forgot what I changed?**
```bash
git status
git diff
```

---

**Created:** October 18, 2025  
**Version:** 1.0  
**Status:** ✅ Production Ready

**Happy branching! 🌿**


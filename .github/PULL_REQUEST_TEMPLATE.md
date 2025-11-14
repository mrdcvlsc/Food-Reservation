# Pull Request

## Description
<!-- Provide a clear and concise description of the changes -->

## Type of Change
<!-- Mark the relevant option with an 'x' -->
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Accessibility improvement

## Testing Checklist

### Functional Testing
- [ ] Tested on Chrome/Edge
- [ ] Tested on Firefox
- [ ] Tested on mobile viewport (responsive)
- [ ] No console errors or warnings
- [ ] All automated tests pass

### Accessibility Testing (Keyboard Navigation)
**Manual keyboard testing steps:**

1. **Dashboard Header**
   - [ ] Press `Tab` to focus on the Wallet button
   - [ ] Verify a visible focus ring appears (indigo outline)
   - [ ] Press `Enter` to navigate to profile

2. **Quick Actions Cards**
   - [ ] `Tab` through all 4 quick action cards (Order Food, Top-Up, History, Logout)
   - [ ] Each card should show a clear, visible focus indicator
   - [ ] Ensure focus ring has proper contrast against white card background
   - [ ] Press `Enter` on any card to verify navigation

3. **Recent Activity Section**
   - [ ] `Tab` to the "See all" link
   - [ ] Verify focus ring is visible
   - [ ] Press `Enter` to navigate to transactions page

4. **Category Buttons**
   - [ ] `Tab` through all 6 category buttons (Rice Meals, Noodles, Snacks, etc.)
   - [ ] Each button should display a consistent focus ring
   - [ ] Focus order should follow logical left-to-right, top-to-bottom flow

5. **Error States (if applicable)**
   - [ ] If error banner appears, `Tab` to the Retry button
   - [ ] Verify white focus ring is visible on the red button background
   - [ ] Press `Enter` to trigger retry

6. **General Keyboard Accessibility**
   - [ ] No focus trap (can `Tab` forward and `Shift+Tab` backward freely)
   - [ ] Focus never gets lost or invisible
   - [ ] Skip to main content link works (if present)
   - [ ] All interactive elements are keyboard accessible

### Screen Reader Testing (Optional but Recommended)
- [ ] Tested with NVDA/JAWS (Windows) or VoiceOver (Mac)
- [ ] All interactive elements have proper labels
- [ ] Loading states announce properly (aria-live regions)

## Screenshots
<!-- Add screenshots or screen recordings if applicable -->

## Related Issues
<!-- Link any related issues using #issue_number -->

## Additional Notes
<!-- Any additional information that reviewers should know -->

# Backend Cookie-Based Authentication Implementation Guide

## Overview

The frontend has been migrated to cookie-first authentication. This document outlines what needs to be implemented on the backend to support this architecture.

## ⚠️ CRITICAL: What Must Be Implemented

### 1. POST /api/auth/login

**Current Behavior:** Returns JWT token in response body  
**Required Behavior:** Set httpOnly cookie AND return user object

```javascript
// Example Express implementation
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  // Validate credentials (existing logic)
  const user = await validateUser(email, password);
  
  // Generate JWT token (existing logic)
  const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, {
    expiresIn: '7d'
  });
  
  // NEW: Set httpOnly cookie
  res.cookie('accessToken', token, {
    httpOnly: true,           // Cannot be accessed by JavaScript (XSS protection)
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'strict',       // CSRF protection
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
  });
  
  // Return user object (NOT the token)
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    balance: user.balance,
    grade: user.grade,
    section: user.section,
    createdAt: user.createdAt
  });
});
```

### 2. GET /api/auth/me

**NEW ENDPOINT** - Returns current authenticated user from cookie

```javascript
const { authenticateToken } = require('../middleware/auth');

router.get('/me', authenticateToken, async (req, res) => {
  // req.user is set by authenticateToken middleware from cookie
  const user = await User.findById(req.user.userId);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    balance: user.balance,
    grade: user.grade,
    section: user.section,
    createdAt: user.createdAt
  });
});
```

### 3. POST /api/auth/logout

**Current Behavior:** N/A or client-side only  
**Required Behavior:** Clear httpOnly cookie

```javascript
router.post('/logout', (req, res) => {
  // Clear the cookie
  res.clearCookie('accessToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  
  res.json({ message: 'Logged out successfully' });
});
```

### 4. POST /api/auth/refresh (Optional but Recommended)

For implementing refresh token pattern (more secure):

```javascript
router.post('/refresh', async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  
  if (!refreshToken) {
    return res.status(401).json({ error: 'No refresh token' });
  }
  
  try {
    const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
    
    // Generate new access token
    const accessToken = jwt.sign(
      { userId: decoded.userId, role: decoded.role },
      JWT_SECRET,
      { expiresIn: '15m' }
    );
    
    // Set new access token cookie
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000 // 15 minutes
    });
    
    res.json({ message: 'Token refreshed' });
  } catch (err) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});
```

### 5. Update Authentication Middleware

Modify existing middleware to read token from cookie instead of Authorization header:

```javascript
// src/middleware/auth.js
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  // Primary: Read from cookie
  let token = req.cookies?.accessToken;
  
  // Fallback: Read from Authorization header (for backward compatibility)
  if (!token) {
    const authHeader = req.headers['authorization'];
    token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  }
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    
    req.user = user; // { userId, role }
    next();
  });
};

module.exports = { authenticateToken };
```

### 6. Update Registration Endpoint

Similar to login, set cookie on successful registration:

```javascript
router.post('/register', async (req, res) => {
  const { name, email, password, role, grade, section } = req.body;
  
  // Create user (existing logic)
  const user = await createUser({ name, email, password, role, grade, section });
  
  // Generate token
  const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, {
    expiresIn: '7d'
  });
  
  // Set httpOnly cookie
  res.cookie('accessToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
  
  res.status(201).json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    balance: user.balance || 0,
    grade: user.grade,
    section: user.section,
    createdAt: user.createdAt
  });
});
```

## Required Express Middleware

Install and configure cookie-parser:

```bash
npm install cookie-parser
```

```javascript
// src/index.js or app.js
const cookieParser = require('cookie-parser');

app.use(cookieParser());
```

## CORS Configuration

Update CORS to allow credentials:

```javascript
const cors = require('cors');

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true // REQUIRED for cookies to work
}));
```

## Environment Variables

Add to `.env`:

```bash
# JWT Secrets
JWT_SECRET=your_jwt_secret_key_here
REFRESH_TOKEN_SECRET=your_refresh_token_secret_here

# Frontend URL for CORS
FRONTEND_URL=http://localhost:3000

# Cookie settings
COOKIE_DOMAIN=localhost
```

## Security Checklist

- [x] Set `httpOnly: true` on all auth cookies (prevents XSS)
- [x] Set `secure: true` in production (HTTPS only)
- [x] Set `sameSite: 'strict'` (CSRF protection)
- [x] Set appropriate `maxAge` (7 days for access, 30 days for refresh)
- [x] Use different secrets for access and refresh tokens
- [x] Implement token rotation on refresh
- [x] Clear cookies on logout
- [x] Enable CORS with `credentials: true`
- [x] Validate token on every protected endpoint

## Migration Strategy

### Phase 1: Dual Support (Current)
- Backend accepts both cookies AND Authorization headers
- Frontend sends Authorization header (legacy) + cookies
- No breaking changes

### Phase 2: Cookie-Only (Future)
- Remove Authorization header support
- Frontend uses cookies exclusively
- Update all documentation

### Phase 3: Refresh Token Pattern (Optional)
- Implement short-lived access tokens (15 min)
- Implement long-lived refresh tokens (30 days)
- Auto-refresh on 401 errors

## Testing Checklist

```bash
# Test login sets cookie
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"student@test.com","password":"password123"}' \
  -c cookies.txt

# Test /auth/me reads cookie
curl -X GET http://localhost:4000/api/auth/me \
  -b cookies.txt

# Test logout clears cookie
curl -X POST http://localhost:4000/api/auth/logout \
  -b cookies.txt \
  -c cookies.txt

# Verify cookie is cleared
cat cookies.txt
```

## Frontend Compatibility

The frontend is already configured to work with cookie-based auth:

- ✅ All requests include `credentials: "include"`
- ✅ Auth helper calls `/auth/me` for session validation
- ✅ No manual token management required
- ✅ Automatic cookie handling by browser
- ✅ Legacy localStorage token support (dev only)

## Common Issues

### Issue: Cookies not being sent
**Solution:** Ensure CORS allows credentials and frontend includes `credentials: "include"`

### Issue: Cookie not visible in browser DevTools
**Solution:** This is expected! httpOnly cookies are hidden from JavaScript for security

### Issue: 401 errors after implementing cookies
**Solution:** Check middleware reads from both cookie AND Authorization header during migration

### Issue: Cookies not working across subdomains
**Solution:** Set cookie domain explicitly: `domain: '.yourdomain.com'`

## Resources

- [MDN: Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie)
- [OWASP: Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [Express cookie-parser](https://expressjs.com/en/resources/middleware/cookie-parser.html)

## Support

For questions or issues during implementation, refer to:
- Frontend implementation: `frontend/src/lib/auth.js`
- API client: `frontend/src/lib/api.js`
- Unit tests: `frontend/src/lib/__tests__/auth.test.js`

# Production Deployment Checklist

## Pre-Deployment Verification

### Code Quality
- [ ] Run `npm run lint` - No errors
- [ ] Run `npm run type-check` - All types pass
- [ ] No console.error or warnings in code
- [ ] All TODO comments resolved
- [ ] No commented-out code

### Testing
- [ ] Login flow tested
- [ ] Register flow tested
- [ ] Logout functionality works
- [ ] Protected routes redirect properly
- [ ] API errors handled gracefully
- [ ] Loading states working
- [ ] Toast notifications working

### Browser Compatibility
- [ ] Tested in Chrome
- [ ] Tested in Firefox
- [ ] Tested in Safari
- [ ] Tested on mobile (iOS/Android)
- [ ] No console errors

### Responsive Design
- [ ] Desktop (1920px) - ✓
- [ ] Tablet (768px) - ✓
- [ ] Mobile (375px) - ✓
- [ ] Hamburger menu works
- [ ] Forms are readable
- [ ] Images are responsive

### Security
- [ ] No hardcoded secrets
- [ ] Environment variables configured
- [ ] API URL uses HTTPS in production
- [ ] CORS configured on backend
- [ ] Auth tokens stored securely
- [ ] No sensitive data in logs

### Performance
- [ ] Build size checked (`npm run build`)
- [ ] Images optimized (if any)
- [ ] Code splitting working
- [ ] No memory leaks in dev tools
- [ ] Lighthouse score checked

---

## Environment Setup

### Production `.env`
```env
VITE_API_URL=https://api.yourdomain.com
VITE_API_TIMEOUT=30000
VITE_APP_NAME=Apollo Key
VITE_ENVIRONMENT=production
```

### Backend CORS Configuration
```python
# If Django backend
CORS_ALLOWED_ORIGINS = [
    "https://yourdomain.com",
    "https://www.yourdomain.com",
]
```

---

## Build & Optimization

### 1. Create Production Build
```bash
npm run build
```

### 2. Check Build Size
```bash
# Files should be reasonably sized
# JS bundle typically 100-200KB
# CSS typically 20-50KB
```

### 3. Test Production Build
```bash
npm run preview
```

### 4. Verify in Production Mode
- [ ] All pages load
- [ ] API calls work
- [ ] No 404 errors
- [ ] Performance is acceptable

---

## Deployment Options

### Option 1: Vercel (Recommended)
```bash
npm install -g vercel
vercel
# Follow prompts
```

### Option 2: Netlify
1. Push to GitHub
2. Connect to Netlify
3. Set build command: `npm run build`
4. Set publish directory: `dist`

### Option 3: Docker
```dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
RUN npm install -g http-server
WORKDIR /app
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["http-server", "dist", "-p", "3000", "-c-1"]
```

### Option 4: Traditional Server (Nginx)
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        root /var/www/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
    }
}
```

---

## Post-Deployment Checks

### Functionality
- [ ] Landing page loads
- [ ] Login page loads
- [ ] Register page loads
- [ ] Can login successfully
- [ ] Can register new account
- [ ] Dashboard loads after login
- [ ] Can logout
- [ ] Navigation works

### API Integration
- [ ] API calls succeed
- [ ] Auth tokens working
- [ ] Errors handled properly
- [ ] Loading states show
- [ ] Toast notifications appear

### Performance
- [ ] Page load time < 3s
- [ ] No network errors
- [ ] No JavaScript errors
- [ ] Lighthouse score > 80

### Security
- [ ] HTTPS configured
- [ ] No console errors
- [ ] No exposed secrets
- [ ] Auth tokens secure

---

## Monitoring & Analytics

### Error Tracking
Consider adding:
- Sentry (error monitoring)
- LogRocket (session replay)
- Datadog (performance)

### Analytics
Consider adding:
- Google Analytics
- Mixpanel
- Amplitude

### Example: Add Sentry
```bash
npm install @sentry/react
```

```typescript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  environment: process.env.VITE_ENVIRONMENT,
});
```

---

## Performance Optimization

### Cache Headers
```nginx
# Static assets (long cache)
location ~* \.(js|css|png|jpg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# HTML (no cache)
location ~* \.html$ {
    expires 0;
    add_header Cache-Control "no-cache, no-store";
}
```

### CDN Configuration
- [ ] Enable CDN caching
- [ ] Set cache TTL appropriately
- [ ] Invalidate cache after deployments

### Database Connection
- [ ] Connection pooling enabled
- [ ] Timeouts configured
- [ ] Retries configured

---

## Maintenance

### Regular Tasks
- [ ] Monitor error logs daily
- [ ] Check performance metrics weekly
- [ ] Update dependencies monthly
- [ ] Security audit quarterly
- [ ] Load testing before high traffic

### Automated Updates
```bash
npm outdated  # Check for updates
npm update    # Update packages
npm audit fix # Fix vulnerabilities
```

---

## Rollback Plan

### If Deployment Fails
1. Revert to previous version from Git
2. Deploy previous build
3. Notify stakeholders
4. Investigate issue
5. Fix and test thoroughly
6. Redeploy

### Keep Previous Builds
```bash
# Archive each build
tar -czf builds/build-$(date +%s).tar.gz dist/
```

---

## Maintenance Window

If downtime needed:
1. Create maintenance page
2. Deploy maintenance page
3. Fix issues
4. Deploy production build
5. Remove maintenance page

---

## Success Criteria

- ✅ All pages load without errors
- ✅ Authentication working correctly
- ✅ All API endpoints functional
- ✅ Responsive on all devices
- ✅ Performance acceptable
- ✅ No security vulnerabilities
- ✅ Error handling working
- ✅ Monitoring configured
- ✅ Team trained on deployment
- ✅ Documentation updated

---

## Useful Commands

```bash
# Build for production
npm run build

# Preview production build locally
npm run preview

# Check dependencies for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Check outdated packages
npm outdated

# Update packages
npm update

# Type check
npm run type-check

# Lint
npm run lint
```

---

## Support & Escalation

### Issues to Monitor
- High error rates
- Slow API responses
- Memory leaks
- CSS/JS loading issues
- CORS errors

### Escalation Path
1. Check error logs
2. Check API server
3. Check browser console
4. Review recent changes
5. Contact team lead
6. Initiate rollback if necessary

---

**Deployment Status**: Ready for production  
**Last Updated**: May 2024  
**Maintained By**: Engineering Team

---

👉 **Next Step**: Follow this checklist before each deployment!

# 🚀 Quick Start Guide

## Installation & Setup (5 minutes)

### 1. Install Dependencies
```bash
cd /home/thread/APOLLO-KEY/frontend
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```

Update `.env`:
```env
VITE_API_URL=http://localhost:8000
VITE_API_TIMEOUT=30000
VITE_APP_NAME=Apollo Key
VITE_ENVIRONMENT=development
```

### 3. Start Development Server
```bash
npm run dev
```

Visit: **http://localhost:5173**

---

## Available Scripts

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run type-check   # Check TypeScript types
```

---

## Testing the Application

### Test Credentials
You can use any credentials to test (backend validates):
- Email: `test@example.com`
- Password: `TestPassword123!`

### Test Flow
1. Go to http://localhost:5173
2. Click "Get Started" or "Sign In"
3. Create account or login
4. Dashboard page appears
5. Click user menu top-right
6. Logout to return to landing

---

## Project Structure Overview

### Pages
- **`/`** - Landing page (public)
- **`/login`** - Login page
- **`/register`** - Registration page
- **`/dashboard`** - Main dashboard (protected)
- **`/unauthorized`** - Access denied page
- Other routes use PlaceholderPage template

### Key Directories
```
src/
├── components/ui/        # Button, Card, Input, Alert, Loading, Toast
├── components/common/    # Navbar, Sidebar, ProtectedRoute, ErrorBoundary
├── components/layouts/   # DashboardLayout
├── pages/               # Page components
├── hooks/               # useAuth, useNotification, useFetch, etc.
├── services/            # API client, auth service
├── store/               # Zustand stores
├── types/               # TypeScript definitions
├── utils/               # Utility functions
└── config/              # Configuration
```

---

## Using Components

### Button
```tsx
import { Button } from '@components/ui';

<Button variant="primary">Click me</Button>
<Button isLoading={isLoading} loadingText="Saving...">Save</Button>
```

### Card
```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui';

<Card>
  <CardHeader>
    <CardTitle>My Card</CardTitle>
  </CardHeader>
  <CardContent>Content here</CardContent>
</Card>
```

### Input
```tsx
import { Input } from '@components/ui';

<Input 
  label="Email" 
  type="email"
  error={errors.email}
  helperText="Helper text"
/>
```

---

## Using Hooks

### useAuth
```tsx
import { useAuth } from '@hooks';

const { user, login, logout, isLoading } = useAuth();
```

### useNotification
```tsx
import { useNotification } from '@hooks';

const { success, error, warning } = useNotification();
success('Title', 'Message');
```

### useFetch
```tsx
import { useFetch } from '@hooks';

const { data, isLoading, error } = useFetch(
  'key',
  () => apiCall(),
  { staleTime: 5 * 60 * 1000 }
);
```

---

## API Integration

### Using API Client
```tsx
import { apiClient } from '@services/apiClient';

// GET
const { data } = await apiClient.get('/api/endpoint');

// POST
const { data } = await apiClient.post('/api/endpoint', { /* data */ });

// With auth (automatic)
// Authorization header injected automatically
```

### Auth Service
```tsx
import { authService } from '@services/authService';

const response = await authService.login({ email, password });
// Returns: { access, refresh, user }
```

---

## Creating New Pages

### 1. Create Page Component
```tsx
// src/pages/MyPage.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui';

export const MyPage: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>My Page</CardTitle>
      </CardHeader>
      <CardContent>Content</CardContent>
    </Card>
  );
};

export default MyPage;
```

### 2. Add Route in App.tsx
```tsx
<Route path="/my-page" element={<MyPage />} />
```

### 3. Add Navigation Link
Update Sidebar.tsx to include new route

---

## File Organization

**All files should be:**
- Named with `.tsx` extension (components) or `.ts` (services/utils)
- Type-safe with proper TypeScript
- Well-commented
- Properly organized in folders
- Exported from index files

---

## Styling

### Using Tailwind CSS
```tsx
<div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
  <h1 className="text-2xl font-bold text-gray-900">Title</h1>
  <p className="text-gray-600 mt-2">Description</p>
</div>
```

### Using Predefined Colors
- Primary: `bg-primary-600`, `text-primary-600`
- Secondary: `bg-secondary-600`
- Success: `bg-green-600`
- Danger: `bg-red-600`
- Warning: `bg-yellow-600`

---

## Deployment

### Build
```bash
npm run build
# Creates optimized dist/ folder
```

### Deploy to Vercel
```bash
npm install -g vercel
vercel
```

### Deploy to Other Services
Upload `dist/` folder to:
- Netlify
- AWS S3 + CloudFront
- Google Cloud Storage
- Docker container

---

## Troubleshooting

### Dependencies not installed
```bash
rm -rf node_modules package-lock.json
npm install
```

### Port 5173 already in use
```bash
npm run dev -- --port 3000
```

### TypeScript errors
```bash
npm run type-check
```

### Build errors
```bash
npm run build
# Check error messages
```

---

## Next Steps

1. **Start Dev Server**: `npm run dev`
2. **Test Auth Flow**: Login/Register
3. **Explore Components**: Check component examples
4. **Create Pages**: Add new pages as needed
5. **Connect Backend**: Integrate your API
6. **Deploy**: Build and deploy

---

## Need Help?

- Check `IMPLEMENTATION_SUMMARY.md` for detailed info
- Review `README_NEW.md` for full documentation
- Look at component examples in source code
- Check type definitions for API shapes

---

**Happy Coding! 🎉**

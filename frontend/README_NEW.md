# Apollo Key Frontend

Production-grade React TypeScript frontend for the Apollo Key Academy Management System.

## Technology Stack

- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Lightning-fast build tool
- **TailwindCSS** - Utility-first CSS framework
- **React Router v7** - Client-side routing
- **Zustand** - State management
- **TanStack Query (React Query)** - Server state management
- **Axios** - HTTP client
- **Framer Motion** - Animations
- **Lucide React** - Icon library
- **shadcn/ui** - Reusable components (upcoming)

## Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # Base UI components (Button, Card, Input, etc.)
│   ├── common/         # Common components (Navbar, Sidebar, etc.)
│   ├── forms/          # Form components
│   └── layouts/        # Layout components
├── pages/              # Page components
├── hooks/              # Custom React hooks
├── services/           # API service layers
├── store/              # Zustand stores
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
├── lib/                # Third-party integrations (React Query, etc.)
├── config/             # Configuration files
├── App.tsx             # Root component
├── main.tsx            # Entry point
└── index.css           # Global styles
```

## Getting Started

### Prerequisites

- Node.js 18+ or npm 9+
- Modern web browser

### Installation

1. Install dependencies:

```bash
npm install
```

2. Create `.env` file from `.env.example`:

```bash
cp .env.example .env
```

3. Update `.env` with your backend API URL:

```env
VITE_API_URL=http://localhost:8000
```

### Development

Start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build

Create production build:

```bash
npm run build
```

### Preview

Preview production build:

```bash
npm run preview
```

### Linting

Run ESLint:

```bash
npm run lint
```

### Type Checking

Check TypeScript types:

```bash
npm run type-check
```

## Architecture

### State Management

- **Zustand Stores**: Client state (auth, notifications)
- **React Query**: Server state (API data)
- **Context API**: Global theme/settings (if needed)

### Authentication Flow

1. User submits credentials
2. `useAuth` hook calls `authService.login()`
3. API returns access and refresh tokens
4. Tokens stored in localStorage
5. User data stored in Zustand store
6. Redirect to dashboard

### API Client

Centralized Axios instance with:
- Automatic token injection
- Token refresh on 401
- Request/response interceptors
- Error handling
- Request timeout (30s default)

### Data Fetching

Use `useFetch` hook for server state:

```typescript
const { data, isLoading, error } = useFetch(
  'students-list',
  () => academicsService.getStudents(),
  { staleTime: 5 * 60 * 1000 }
);
```

### Error Handling

- Global error boundary
- Toast notifications
- Validation messages
- API error interceptor

## Key Features

### ✨ Current

- [x] TypeScript support
- [x] Modern UI components
- [x] Authentication pages (Login/Register)
- [x] Protected routes
- [x] Responsive layout
- [x] Error boundary
- [x] Toast notifications
- [x] API client with auth
- [x] State management setup
- [x] Type definitions

### 🚀 Coming Soon

- [ ] Dashboard widgets
- [ ] Attendance management
- [ ] Grade management
- [ ] Analytics
- [ ] Messaging system
- [ ] Report generation
- [ ] Data tables
- [ ] Advanced forms
- [ ] PWA support
- [ ] Offline support

## Component Examples

### Using Buttons

```typescript
import { Button } from '@components/ui';

<Button variant="primary" onClick={handleClick}>
  Save Changes
</Button>

<Button variant="outline" isLoading={isLoading} loadingText="Saving...">
  Click me
</Button>
```

### Using Forms

```typescript
import { Input, Button } from '@components/ui';

<form onSubmit={handleSubmit}>
  <Input 
    label="Email" 
    type="email" 
    error={errors.email}
    helperText="Enter a valid email"
  />
  <Button type="submit">Submit</Button>
</form>
```

### Using Hooks

```typescript
import { useAuth, useNotification, useFetch } from '@hooks';

const { user, login, isLoading } = useAuth();
const { success, error } = useNotification();
const { data, isLoading } = useFetch('key', fetchFn);
```

## Environment Variables

- `VITE_API_URL` - Backend API URL (default: http://localhost:8000)
- `VITE_API_TIMEOUT` - Request timeout in ms (default: 30000)
- `VITE_APP_NAME` - Application name (default: Apollo Key)
- `VITE_ENVIRONMENT` - Environment (development/production)

## Deployment

### Vercel

```bash
npm run build
# Upload dist/ folder to Vercel
```

### Docker

```dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
RUN npm install -g http-server
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["http-server", "dist", "-p", "3000"]
```

## Performance Optimization

- Code splitting with lazy loading
- Tree-shaking to remove unused code
- CSS minification with TailwindCSS
- Image optimization (when added)
- Caching with React Query
- Bundle analysis available

## Testing (Coming Soon)

```bash
npm run test
npm run test:coverage
```

## Contributing

1. Follow TypeScript strict mode
2. Use functional components with hooks
3. Keep components modular
4. Add proper types
5. Write meaningful commit messages
6. Keep PRs focused and small

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

Proprietary - All rights reserved

## Support

For issues or questions, please contact the development team or open an issue in the internal repository.

---

**Last Updated**: May 2024  
**Maintained By**: Engineering Team

# API Configuration

This directory contains global configuration for the application's API endpoints.

## Usage

### Changing the Base URL

To change the base URL for all API calls, edit `src/config/api.ts`:

```typescript
export const API_CONFIG = {
  // Change this line to switch environments
  BASE_URL: 'https://your-new-api-url.com',
  
  // ... rest of the configuration
};
```

### Available Environments

The configuration includes predefined environments:

```typescript
ENVIRONMENTS: {
  DEVELOPMENT: 'https://localhost:5001',
  STAGING: 'https://staging.fourdotsapp.azurewebsites.net', 
  PRODUCTION: 'https://fourdotsapp.azurewebsites.net',
}
```

### Using API Endpoints

Instead of hardcoding URLs, use the configuration:

```typescript
import { API_CONFIG } from '@/config/api';

// Get full URL for an endpoint
const url = API_CONFIG.getFullUrl(API_CONFIG.ENDPOINTS.ORDERS);

// Or use the axios instance from lib/axios.ts (recommended)
import api from '@/lib/axios';
const response = await api.get('/orders');
```

### Adding New Endpoints

To add new API endpoints:

1. Add the endpoint to `API_CONFIG.ENDPOINTS` in `src/config/api.ts`
2. Export it for convenience if needed
3. Use `API_CONFIG.getFullUrl()` to get the full URL

```typescript
ENDPOINTS: {
  // ... existing endpoints
  NEW_ENDPOINT: '/api/new-endpoint',
  DYNAMIC_ENDPOINT: (id: string) => `/api/endpoint/${id}`,
}
```

## Files Updated

The following files have been updated to use the global configuration:

- `src/lib/axios.ts` - Main axios instance
- `src/contexts/AuthContext.tsx` - Authentication endpoints
- `src/hooks/useSiteSettings.ts` - Site settings endpoints  
- `src/pages/orders/[id].tsx` - Order management endpoints

## Benefits

- **Single source of truth** for API URLs
- **Easy environment switching** by changing one value
- **Type safety** with TypeScript
- **Centralized endpoint management**
- **Consistent error handling** across all API calls


# Booking Web-App Code Overview

## Project Structure

The booking web-app is organized into two main subdirectories:

- **`client/`** - Frontend code and modules
- **`server/`** - Backend code and modules

</br>

## Technology Stack

### Frontend (Client)
- **Build Tool**: Vite
- **Framework**: React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: React hooks (useState, useEffect)
- **Routing**: React Router
- **HTTP Client**: Fetch API with custom wrapper functions
- **Internationalization**: react-i18next

### Backend (Server)
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MySQL with mysql2 driver
- **Authentication**: JWT tokens
- **Password Hashing**: Argon2
- **Email Service**: Nodemailer
- **File Handling**: Multer

</br>

## Development Environment Setup

### Prerequisites
- Node.js 18+
- MySQL 8.0+
- npm or yarn

### Getting Started
1. **Clone and Install Dependencies**
   ```bash
   # Install server dependencies
   cd server && npm install
   
   # Install client dependencies  
   cd client && npm install
   ```

2. **Database Setup**
   * Create MySQL database using Database Schema.sql
   * Configure connection in server/.env

3. **Environment Configuration**
   * Configure database, email, and JWT settings in `server/.env`

4. **Run Development Servers**
   ```bash
   # Run server (from server/)
   npm run dev

   # Run client (from client/ )  
   npm run dev
   ```

</br>

## App Architecture Overview

### 1. Shared Type Definitions
Both client and server maintain nearly identical TypeScript interfaces, ensuring type safety across the full stack while allowing for platform-specific extensions (e.g., server types extend `RowDataPacket` for database queries).

### 2. API Function Abstraction
Instead of making raw fetch calls throughout components, all server communication goes through `apiFunctions.ts` or `apiFunctionsAuth.ts`. This provides:
- Centralized authentication handling
- Consistent error management
- Easy API modification
- Better testability

### 3. Role-Based Architecture
The entire application is organized around user roles:
- **Database**: Role-based permissions and table relationships
- **Server**: Role-specific route files and middleware
- **Client**: Role-specific component directories and route protection

### 4. Token-Based Email Actions
Critical operations (guest booking confirmations, password resets, etc.) use secure tokens derived from email links.

</br>

## Database Architecture

### Database Tables
The database schema defines several key tables:

1. **`users`** - User accounts with roles (admin, manager, faculty, student, guest)
2. **`infrastructures`** - Available facilities/resources for booking
3. **`bookings`** - Both actual bookings and available timeslots
4. **`infrastructure_managers`** - Links managers to their assigned infrastructures
5. **`infrastructure_questions`** - Custom questions for booking requests
6. **`booking_answers`** - User responses to infrastructure questions
7. **`email_action_tokens`** - Secure tokens for email-based actions

### Key Database Concepts
- **Dual-purpose bookings table**: The `bookings` table stores both available timeslots (`booking_type = 'timeslot'`) and actual bookings (`booking_type = 'booking'`)
- **Status management**: Automated stored procedures handle status transitions (available → pending → approved/rejected)
- **Event scheduler**: MySQL events automatically update expired bookings and clean up tokens

</br>

## Shared TypeScript Types

### Type Architecture
Both client and server share similar TypeScript interfaces, ensuring consistency.

**Location**: 
- Client: `client/src/utils/types.ts`
- Server: `server/utils/types.ts`

**Key Shared Types**:
```typescript
// User roles and authentication
export type UserRole = 'admin' | 'manager' | 'faculty' | 'student' | 'guest';

// Booking statuses
export type BookingStatus = 'available' | 'pending' | 'approved' | 'rejected' | 'completed' | 'expired' | 'canceled';

// Core entities
interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  is_blacklisted: boolean;
}

interface Infrastructure {
  id: number;
  name: string;
  description?: string;
  location?: string;
  is_active?: boolean;
}

interface BookingEntry {
  id: number;
  booking_type: 'booking' | 'timeslot';
  infrastructure_id: number;
  booking_date: Date;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  user_email: string | null;
  purpose: string | null;
}
```

</br>

## Server-Side Architecture

### Directory Structure
```
server/
├── configuration/      # Database and environment config
├── middleware/         # Authentication and authorization
├── routes/             # API route handlers organized by functionality
├── utils/              # Utility-functions files (email service, helper functions, etc.)
├── .env                # Environment configuration file (environment variables)
├── package.json        # NPM's package.json
└── server.ts           # Main application entry point
```

### Authentication & Authorization

**Middleware**: `server/middleware/authMiddleware.ts`

The app uses JWT-based authentication with role-based access control:

- **`authenticateToken`** - Verifies JWT and adds user to request
- **`authenticateAdmin`** - Admin-only access
- **`authenticateManager`** - Manager-only access  
- **`authenticateAdminOrManager`** - Admin or manager access
- **`hasInfrastructureAccess`** - Checks if manager can access specific infrastructure

### API Route Organization

Routes are organized by functionality and user role:

```
[BACKEND_URL]/api/
├── authentication            # Login, register, password reset
├── infrastructures/
│   ├── admin                 # Infrastructure CRUD (admin only)
│   ├── manager-admin         # Infrastructure management (admin + managers)
│   ├── manager               # Manager's assigned infrastructures
│   └── user-guest            # Public infrastructure viewing
├── bookings/
│   ├── manager-admin         # Booking management (admin + managers)
│   ├── user                  # User booking operations
│   ├── guest                 # Guest booking confirmation
│   └── (shared)              # Common booking operations
├── user_management           # User CRUD (admin only)
├── preferences/user-manager  # User notification preferences
└── email-action              # Email-based booking actions
```

### Key API Patterns

1. **Role-based routing**: Different route files for different user roles
2. **Middleware stacking**: Authentication → authorization → business logic
3. **Database connection pooling**: Reused connections with transaction support
4. **Error handling**: Consistent JSON error responses
5. **Email integration**: Secure token-based email actions

### Email Service Setup
The app uses Nodemailer for email functionality (booking notifications, password resets, etc.).

**Configuration**: `server/.env`
```
EMAIL_HOST=smtp.yourprovider.com
EMAIL_PORT=587
EMAIL_SECURE=true   # set false if mailbox is fot tests (i.e. mailtrap)
EMAIL_USERNAME=your_username
EMAIL_PASSWORD=your_password
EMAIL_FROM=booking-system@yourdomain.com
EMAIL_FROM_NAME=Your Organization Name
```

### File Upload System

The app supports file uploads for booking attachments using Multer. The server sends uploads to the `server/uploads/` directory.

</br>

## Client-Side Architecture

### Directory Structure
```
client/src/
├── _Admin/                       # Admin-specific pages
├── _Manager/                     # Manager-specific pages
├── _Manager_Admin/               # Manager/Admin shared pages
├── _User/                        # User-specific pages
├── _User_Manager/                # User/Manager shared pages
├── _LoginEtc/                    # Login, registration, email-verification (etc.) pages
├── components/
│   ├── ui/                       # shadcn/ui components
│   ├── _AuthenticationGuard.tsx  # Wrapper for routings, controls access to pages
│   ├── _BasePageLayout.tsx       # Common page wrapper
│   ├── _LanguageSelector         # Provides runtime language switching
│   └── ...                       # Other custom React components
├── utils/
│   ├── apiFunctions.ts           # API communication layer
│   ├── apiFunctionsAuth.ts       # API communication layer - for authentication functions
│   ├── localAuthUtils.ts         # Local authentication utilities
│   ├── types.ts                  # Shared type definitions
│   └── ...                       # Other utility-functions files (organized by theme)
├── App.tsx                       # Main routing component for the React frontend
├── main.tsx                      # Application entry point
├── RoutePaths.tsx                # Centralized route definitions
└── ...                           # Other general frontend files
```

### API Communication Layer

**Location**: `client/src/utils/apiFunctions.ts`

This file centralizes all (non-authenticative) server communication through wrapper functions:

```typescript
// Core API wrapper with authentication
const apiRequest = async (url: string, options: RequestInit = {}) => {
  // Adds authentication headers
  // Handles JSON serialization
  // Provides consistent error handling
};

// Examples for specific API functions for different operations
export const fetchAllInfrastructures = () => apiRequest('/infrastructures/user-guest');
export const createBooking = (bookingData) => apiRequest('/bookings/user', { method: 'POST', body: JSON.stringify(bookingData) });
export const fetchManagerInfrastructures = () => apiRequest('/infrastructures/manager');
```

**Benefits of this approach**:
- Centralized authentication header management
- Consistent error handling across the app
- Type-safe API calls
- Easy to modify base URL or add interceptors
- Simplified component logic (components just call functions)


### Authentication API Communication Layer

**Location**: `client/src/utils/apiFunctionsAuth.ts`

This file centralizes all authentication-related server communication through wrapper functions:

```typescript
// Core authentication API wrapper with error handling
const authApiRequest = async (endpoint: string, options: RequestInit = {}) => {
  // Adds authentication headers when token is available
  // Handles JSON vs FormData serialization
  // Returns consistent { success, data } format
  // Provides graceful error handling without throwing
};

// Examples of specific authentication functions
export const login = (email, password) => authApiRequest('/login', { method: 'POST', body: JSON.stringify({ email, password }) });
export const register = (userData) => authApiRequest('/register', { method: 'POST', body: JSON.stringify(userData) });
export const requestPasswordReset = (email) => authApiRequest('/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
```

**Benefits of this approach**:
- Consistent `{ success, data }` return format for predictable error handling
- Automatic localStorage management for user data and tokens (on successful login)
- No thrown exceptions - errors are returned in the response object
- Centralized authentication header management
- Seamless handling of both authenticated and non-authenticated requests
- Role-based verification functions for protected route access

### Component Architecture

#### Route Protection
**`_AuthenticationGuard.tsx`** provides role-based route protection:
- Checks JWT token validity
- Verifies user roles against route requirements
- Handles token-based flows (email verification, password reset)
- Redirects unauthorized users appropriately

#### Reusable Components (examples)
- **`_PaginatedTable.tsx`** - Feature-rich table with sorting, pagination, and filtering
- **`_BasePageLayout.tsx`** - Common layout wrapper with navigation and styling
- **UI Components** - shadcn/ui components for consistent design system

#### Page Organization by Role
Components are organized into directories by user role:
- `_Admin/` - Admin-only pages (user management, system settings)
- `_Manager_Admin/` - Shared between managers and admins (booking management)
- `_User/` - User-facing pages (booking creation, history)

### State Management

The app primarily uses React's built-in state management:
- **`useState`** for component-level state
- **`useEffect`** for side effects and data fetching
- **Local Storage** for authentication persistence
- **No global state library** - keeps architecture simple and focused

</br>

## Data Flow Patterns

### Login Authentication Flow
1. User submits credentials via login form
2. Client calls `login()` from `apiFunctions.ts`
3. Server validates credentials and returns JWT token
4. Client stores token and user data in localStorage
5. Subsequent API requests automatically include token and user data

### Booking Management Flow
1. **Timeslot Creation** (Admin/Manager):
   - Admin creates new available timeslots, in singles or in batch
   - Stored as `booking_type = 'timeslot'` with `status = 'available'`

2. **Booking Creation** (User):
   - User selects available timeslot
   - System changes timeslot to booking (`booking_type = 'booking'`)
   - Status changes to `pending`, it now awaits approval/rejection

3. **Booking Approval/rejection** (Admin/Manager):
   - Admin or manager reviews pending bookings
   - Can approve or reject bookings (can also cancel available timeslots)
   - Rejected bookings become available timeslots again

### Data Synchronization
- **Server-side validation**: All business logic on server
- **Client-side optimistic updates**: UI updates immediately, syncs with server
- **Automatic status updates**: MySQL events handle status transitions
- **Email notifications**: Automatic emails for booking status changes

</br>

## Development Guidelines

### Adding New Features

1. **Database Changes**:
   - Update `Database Schema.sql`
   - Add corresponding TypeScript interfaces in both client and server `types.ts`

2. **Server-Side**:
   - Create new routes in appropriate role-based files
   - Add authentication middleware as needed
   - Implement business logic with proper error handling

3. **Client-Side**:
   - Add API functions to `apiFunctions.ts`
   - Create components in role-appropriate directories
   - Update route definitions in `RoutePaths.tsx`
   - Add route in `App.tsx` (if needed surround with `<AuthenticationGuard>` for authentication protection)

### Best Practices

1. **Type Safety**: Always use TypeScript interfaces for data structures
2. **Authentication**: Never bypass authentication middleware on server
3. **Error Handling**: Provide consistent error responses across API
4. **Database**: Use connection pooling and transactions for data integrity
5. **Security**: Validate all inputs, use parameterized queries, implement proper CORS

### Common Patterns

1. **API Function Pattern**:
```typescript
export const createSomething = (data: SomeType) => {
  return apiRequest('/endpoint', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};
```

2. **Protected Route Pattern**:
```typescript
<AuthenticationGuard requiredRoles={['admin', 'manager']}>
  <YourComponent />
</AuthenticationGuard>
```

3. **Database Query Pattern**:
```typescript
const [rows] = await pool.execute(
  'SELECT * FROM table WHERE id = ?',
  [id]
);
```

### Adding File Upload to New Features
1. Server: Add Multer middleware to route
2. Client: Use FormData in API function
3. Database: Store file paths/metadata in relevant tables

### **Translation System (i18n)**

The app uses `react-i18next` for its translation feature (support for English and Hebrew).
The configuration for translations are in `client/src/i18n.ts`

### Adding New Translations

1. **Add Translation Keys in Components**:
   ```typescript
   import { useTranslation } from "react-i18next";
   const { t } = useTranslation();
   
   // With fallback text
   <span>{t('text', 'Default English Text')}</span>
   
   // With interpolation
   <span>{t('welcome', 'Welcome {{name}}', { name: userName })}</span>
   ```
2. **Update translation in `client/src/i18n.ts`**
   ```typescript
   he: {
      translation: {
        text: "טקסט",
        welcome: "ברוך הבא, {{name}}",
      }
    }

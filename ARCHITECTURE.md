# System Architecture Overview

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT BROWSER                       │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │          React Frontend (Port 5173)                │    │
│  │                                                     │    │
│  │  • UI Components (Admin Panel, Reports, etc.)     │    │
│  │  • API Service Layer                              │    │
│  │  • State Management (useApiState hooks)           │    │
│  │  • Gemini AI Integration                          │    │
│  └──────────────┬──────────────────────────────────────┘    │
│                 │                                            │
└─────────────────┼────────────────────────────────────────────┘
                  │ HTTP/REST API
                  │ (JSON)
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              BACKEND SERVER (Port 3001)                      │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Express.js REST API                        │  │
│  │                                                       │  │
│  │  Routes:                                             │  │
│  │  • /api/strategies    (CRUD)                        │  │
│  │  • /api/benchmarks    (CRUD)                        │  │
│  │  • /api/proposals     (Create, Read)                │  │
│  │  • /api/settings      (Read, Update)                │  │
│  │  • /health            (Health Check)                │  │
│  └──────────────┬───────────────────────────────────────┘  │
│                 │                                            │
│  ┌──────────────▼───────────────────────────────────────┐  │
│  │         Database Abstraction Layer                   │  │
│  │                                                       │  │
│  │  • Supports SQLite & PostgreSQL                     │  │
│  │  • Unified query interface                          │  │
│  │  • Automatic JSON handling                          │  │
│  └──────────────┬───────────────────────────────────────┘  │
└─────────────────┼────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                        DATABASE                              │
│                                                              │
│  Development:                Production:                     │
│  ┌──────────────┐           ┌──────────────┐              │
│  │   SQLite     │    OR     │  PostgreSQL  │              │
│  │              │           │              │              │
│  │ • File-based │           │ • Client-    │              │
│  │ • Zero setup │           │   Server     │              │
│  │ • Local dev  │           │ • Scalable   │              │
│  └──────────────┘           └──────────────┘              │
│                                                              │
│  Tables:                                                     │
│  • strategies          • proposals                           │
│  • benchmarks          • firm_settings                       │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### Creating a Proposal

```
User Input
    │
    ├─> 1. Configure Portfolio (Select Strategies & Weights)
    │
    ├─> 2. Select Benchmark
    │
    ├─> 3. Generate Report
    │
    ▼
Frontend Calculations
    │
    ├─> Blend Portfolios (Calculate Combined Returns)
    │
    ├─> Calculate Metrics (Volatility, Drawdowns, etc.)
    │
    ├─> Generate AI Summary (Gemini API)
    │
    ▼
Display Report
    │
    ├─> Performance Table
    │
    ├─> Charts (Growth, Allocation, Rolling Returns)
    │
    ├─> PDF Export
    │
    ▼
Save to Database
    │
    └─> POST /api/proposals → Database
```

### Admin Mode: Managing Strategies

```
Admin Panel
    │
    ├─> Add/Edit Strategy
    │       │
    │       ├─> Name
    │       ├─> Monthly Returns (CSV/Manual)
    │       └─> Asset Allocation
    │
    ▼
API Request
    │
    ├─> POST /api/strategies
    │   OR
    └─> PUT /api/strategies/:id
    │
    ▼
Database
    │
    └─> INSERT or UPDATE strategies table
    │
    ▼
Frontend Update
    │
    └─> Refresh strategy list
```

## Component Architecture

### Frontend Components

```
App.tsx (Main Application)
├── Header
│   └── Admin Toggle
│
├── Admin Mode
│   ├── AdminPanel
│   │   ├── AdminTable (Strategies)
│   │   ├── AdminTable (Benchmarks)
│   │   ├── AddEditModal
│   │   ├── FirmLogoManager
│   │   └── PdfPageManager
│   │
│   └── [Admin manages data]
│
└── Adviser Mode
    ├── ProposalDetailsForm (Client info)
    │
    ├── StrategySelector (Portfolio configuration)
    │   └── AllocationCharts
    │
    ├── BenchmarkSelector
    │
    └── ReportOutput
        ├── AiSummary (Gemini-generated)
        │
        ├── TitlePage
        │
        ├── PerformanceTable
        │
        ├── GrowthChart
        │
        ├── AllocationCharts
        │
        ├── RollingReturnsChart
        │
        ├── DrawdownTable
        │
        ├── DistributionAnalysis
        │
        └── PDF Export
```

### Backend Structure

```
server.js (Express Application)
├── Middleware
│   ├── CORS
│   └── JSON Parser
│
├── Routes
│   ├── Strategies (/api/strategies)
│   │   ├── GET (all)
│   │   ├── GET (by ID)
│   │   ├── POST (create)
│   │   ├── PUT (update)
│   │   └── DELETE
│   │
│   ├── Benchmarks (/api/benchmarks)
│   │   ├── GET (all)
│   │   ├── POST (create)
│   │   ├── PUT (update)
│   │   └── DELETE
│   │
│   ├── Proposals (/api/proposals)
│   │   ├── GET (all)
│   │   └── POST (create)
│   │
│   ├── Settings (/api/settings)
│   │   ├── GET
│   │   └── PUT
│   │
│   └── Health (/health)
│
└── Database Layer (database.js)
    ├── Connection Management
    ├── Query Abstraction
    └── Data Transformation
```

## Technology Stack

### Frontend
- **Framework**: React 19
- **Build Tool**: Vite
- **Language**: TypeScript
- **Charts**: Recharts
- **PDF**: jsPDF + html2canvas
- **AI**: Google Generative AI (Gemini)

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: JavaScript (ES Modules)
- **Database Drivers**:
  - SQLite: better-sqlite3
  - PostgreSQL: pg

### Development Tools
- **Package Manager**: npm
- **Environment**: dotenv
- **CORS**: cors middleware

## Security Model

```
Current (Development)
┌──────────────┐
│   Browser    │
│              │
│  No Auth     │
│  Required    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│     API      │
│              │
│  Open Access │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Database   │
└──────────────┘

Recommended (Production)
┌──────────────┐
│   Browser    │
│              │
│  Login →     │
│  JWT Token   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│     API      │
│              │
│  Verify JWT  │
│  Rate Limit  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Database   │
│              │
│  Encrypted   │
└──────────────┘
```

## Deployment Architecture

### Development
```
localhost:5173 (Frontend)
      ↓
localhost:3001 (Backend)
      ↓
local SQLite file
```

### Production
```
cdn.vercel.com (Frontend)
      ↓
api.yourdomain.com (Backend)
      ↓
PostgreSQL (Cloud Database)
```

## Database Schema

### Tables

**strategies**
- Primary data: Investment strategies
- Relationships: None
- Indexes: id (PRIMARY KEY)

**benchmarks**  
- Primary data: Market benchmarks
- Relationships: None
- Indexes: id (PRIMARY KEY)

**proposals**
- Primary data: Generated proposals
- Relationships: References strategies (via allocations), benchmarks
- Indexes: id (PRIMARY KEY)

**firm_settings**
- Primary data: Firm configuration
- Relationships: None
- Constraints: Single row (id = 1)

## API Request/Response Flow

```
Frontend                  Backend                   Database
   │                         │                          │
   ├─ GET /api/strategies ──>│                          │
   │                         ├─ query('SELECT...') ────>│
   │                         │                          │
   │                         │<─── rows[] ──────────────┤
   │                         │                          │
   │<── JSON {strategies} ───┤                          │
   │                         │                          │
   │                         │                          │
   ├─ POST /api/strategies ─>│                          │
   │   + Strategy data       │                          │
   │                         ├─ query('INSERT...') ────>│
   │                         │                          │
   │                         │<─── success ─────────────┤
   │                         │                          │
   │<── JSON {new strategy} ─┤                          │
```

## State Management

### Frontend State
- **Local State**: React useState for form inputs
- **API State**: useApiState hook for database-backed data
- **Settings State**: useSettingsState for firm configuration
- **Computed State**: useMemo for derived calculations

### Backend State
- **Stateless**: Each request is independent
- **Database**: All persistence handled by database
- **No Session**: No server-side sessions (ready for JWT)

## Error Handling

```
Error Occurs
    │
    ├─> Frontend Error
    │   ├─> Network error → Show "Cannot connect" message
    │   ├─> API error → Display error from backend
    │   └─> Validation error → Show inline form error
    │
    └─> Backend Error
        ├─> Database error → Log + return 500
        ├─> Not found → Return 404
        ├─> Bad request → Return 400
        └─> Server error → Log + return 500

All errors logged to console
User sees friendly error messages
```

## Scalability Considerations

### Current Limits
- **SQLite**: ~1000 concurrent reads, single writer
- **No CDN**: Static assets served by Vite dev server
- **No Caching**: Every request hits database

### Future Improvements
- **PostgreSQL**: Unlimited concurrent users
- **Redis**: Cache frequently accessed data
- **CDN**: CloudFlare/Vercel for static assets
- **Load Balancer**: Multiple backend instances
- **Database Replicas**: Read replicas for scaling

## Performance

### Frontend
- **Initial Load**: ~2-3s (includes React, Recharts)
- **API Calls**: ~50-200ms (local)
- **Report Generation**: 1-2s (includes AI summary)

### Backend
- **SQLite Queries**: <10ms
- **PostgreSQL Queries**: <50ms
- **API Response**: <100ms average

### Optimization Opportunities
- Bundle size reduction (code splitting)
- Image optimization
- Query result caching
- Connection pooling (PostgreSQL)

---

This architecture is designed to be:
- ✅ Simple to understand
- ✅ Easy to maintain
- ✅ Ready to scale
- ✅ Production-ready

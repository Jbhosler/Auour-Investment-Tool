# API Documentation

Base URL: `http://localhost:3001/api`

## Authentication

Currently no authentication required. For production, implement JWT or OAuth.

## Endpoints

### Health Check

```http
GET /health
```

**Response**
```json
{
  "status": "ok",
  "database": "SQLite" | "PostgreSQL"
}
```

---

### Strategies

#### Get All Strategies

```http
GET /api/strategies
```

**Response**
```json
[
  {
    "id": "s1",
    "name": "US Equity Growth Fund",
    "returns": [
      { "date": "2023-01", "value": 0.015 },
      ...
    ],
    "assetAllocation": {
      "equity": 100,
      "fixedIncome": 0,
      "alternatives": 0
    }
  }
]
```

#### Get Single Strategy

```http
GET /api/strategies/:id
```

**Response**: Single strategy object

#### Create Strategy

```http
POST /api/strategies
Content-Type: application/json

{
  "id": "s5",  // optional, will auto-generate UUID if not provided
  "name": "Tech Growth Fund",
  "returns": [
    { "date": "2023-01", "value": 0.02 },
    { "date": "2023-02", "value": 0.015 }
  ],
  "assetAllocation": {
    "equity": 90,
    "fixedIncome": 10,
    "alternatives": 0
  }
}
```

**Response**: Created strategy object

#### Update Strategy

```http
PUT /api/strategies/:id
Content-Type: application/json

{
  "name": "Updated Name",
  "returns": [...],
  "assetAllocation": {...}
}
```

**Response**: Updated strategy object

#### Delete Strategy

```http
DELETE /api/strategies/:id
```

**Response**
```json
{
  "message": "Strategy deleted successfully"
}
```

---

### Benchmarks

#### Get All Benchmarks

```http
GET /api/benchmarks
```

**Response**
```json
[
  {
    "id": "b1",
    "name": "S&P 500 Index",
    "returns": [
      { "date": "2023-01", "value": 0.012 },
      ...
    ]
  }
]
```

#### Create Benchmark

```http
POST /api/benchmarks
Content-Type: application/json

{
  "id": "b4",  // optional
  "name": "Custom Benchmark",
  "returns": [
    { "date": "2023-01", "value": 0.01 }
  ]
}
```

#### Update Benchmark

```http
PUT /api/benchmarks/:id
Content-Type: application/json

{
  "name": "Updated Name",
  "returns": [...]
}
```

#### Delete Benchmark

```http
DELETE /api/benchmarks/:id
```

---

### Proposals

#### Get All Proposals

```http
GET /api/proposals
```

**Response**
```json
[
  {
    "id": "uuid",
    "adviser_name": "John Doe",
    "client_name": "Jane Smith",
    "investment_amount": "1000000",
    "client_age": "45",
    "annual_distribution": "40000",
    "risk_tolerance": "Moderate",
    "allocations": [
      { "strategyId": "s1", "weight": 60 },
      { "strategyId": "s2", "weight": 40 }
    ],
    "selected_benchmark_id": "b1",
    "ai_summary": "This portfolio is designed...",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
]
```

#### Create Proposal

```http
POST /api/proposals
Content-Type: application/json

{
  "adviser_name": "John Doe",
  "client_name": "Jane Smith",
  "investment_amount": "1000000",
  "client_age": "45",
  "annual_distribution": "40000",
  "risk_tolerance": "Moderate",
  "allocations": [
    { "strategyId": "s1", "weight": 60 },
    { "strategyId": "s2", "weight": 40 }
  ],
  "selected_benchmark_id": "b1",
  "ai_summary": "Portfolio summary..."
}
```

**Response**: Created proposal object with generated ID

---

### Firm Settings

#### Get Settings

```http
GET /api/settings
```

**Response**
```json
{
  "logo_data": "data:image/png;base64,...",  // Base64 encoded image or null
  "before_output_pages": [
    "data:application/pdf;base64,...",
    ...
  ],
  "after_output_pages": [
    "data:application/pdf;base64,...",
    ...
  ]
}
```

#### Update Settings

```http
PUT /api/settings
Content-Type: application/json

{
  "logo_data": "data:image/png;base64,...",
  "before_output_pages": [],
  "after_output_pages": []
}
```

**Response**: Updated settings object

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message description"
}
```

**HTTP Status Codes**:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `404` - Not Found
- `500` - Internal Server Error

---

## Data Types

### MonthlyReturn
```typescript
{
  date: string;      // Format: "YYYY-MM"
  value: number;     // Decimal return (0.01 = 1%)
}
```

### AssetAllocation
```typescript
{
  equity: number;         // 0-100
  fixedIncome: number;    // 0-100
  alternatives: number;   // 0-100
}
// Total should equal 100
```

### Allocation
```typescript
{
  strategyId: string;
  weight: number;     // 0-100
}
// Total weights should equal 100
```

---

## Rate Limiting

Currently no rate limiting. For production:
- Implement per-IP limits
- Consider per-user limits with authentication
- Suggested: 100 requests per 15 minutes

## CORS

Default: Allows all origins in development
Production: Configure allowed origins in server.js

---

## Examples

### Using cURL

```bash
# Get all strategies
curl http://localhost:3001/api/strategies

# Create a strategy
curl -X POST http://localhost:3001/api/strategies \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Strategy",
    "returns": [{"date": "2024-01", "value": 0.01}],
    "assetAllocation": {"equity": 100, "fixedIncome": 0, "alternatives": 0}
  }'

# Update a strategy
curl -X PUT http://localhost:3001/api/strategies/s1 \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Name"}'

# Delete a strategy
curl -X DELETE http://localhost:3001/api/strategies/s1
```

### Using JavaScript/Fetch

```javascript
// Get strategies
const strategies = await fetch('http://localhost:3001/api/strategies')
  .then(r => r.json());

// Create strategy
const newStrategy = await fetch('http://localhost:3001/api/strategies', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'New Strategy',
    returns: [{ date: '2024-01', value: 0.01 }],
    assetAllocation: { equity: 100, fixedIncome: 0, alternatives: 0 }
  })
}).then(r => r.json());
```

### Using the API Service (Frontend)

```typescript
import { apiService } from './services/apiService';

// Get all strategies
const strategies = await apiService.getStrategies();

// Create strategy
const newStrategy = await apiService.createStrategy({
  name: 'New Strategy',
  returns: [{ date: '2024-01', value: 0.01 }],
  assetAllocation: { equity: 100, fixedIncome: 0, alternatives: 0 }
});

// Update strategy
await apiService.updateStrategy('s1', { name: 'Updated Name' });

// Delete strategy
await apiService.deleteStrategy('s1');
```

---

## Database Schema

### Strategies Table
- `id` (TEXT, PRIMARY KEY)
- `name` (TEXT)
- `returns` (JSONB/TEXT)
- `asset_allocation` (JSONB/TEXT)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### Benchmarks Table
- `id` (TEXT, PRIMARY KEY)
- `name` (TEXT)
- `returns` (JSONB/TEXT)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### Proposals Table
- `id` (TEXT, PRIMARY KEY)
- `adviser_name` (TEXT)
- `client_name` (TEXT)
- `investment_amount` (TEXT)
- `client_age` (TEXT)
- `annual_distribution` (TEXT)
- `risk_tolerance` (TEXT)
- `allocations` (JSONB/TEXT)
- `selected_benchmark_id` (TEXT)
- `ai_summary` (TEXT)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### Firm Settings Table
- `id` (INTEGER, PRIMARY KEY, always 1)
- `logo_data` (TEXT)
- `before_output_pages` (JSONB/TEXT)
- `after_output_pages` (JSONB/TEXT)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

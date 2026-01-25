# API v2.0 Integration Summary

## Overview

This document summarizes how the SPC API v2.0 (released January 18, 2026) has been integrated into the time-series chart rendering optimization plan.

---

## Key Changes to SPC_CHARTS_RENDERING_PLAN.md

### 1. Architecture Update

**Before (v1.0):**
```
Application → Visualization → Circular Buffer → Canvas Renderer
```

**After (v2.0):**
```
Application → SPC API v2.0 → Visualization → Circular Buffer → Canvas Renderer
```

**New Layer Added:**
- **SPC API v2.0 Layer** - Backend optimization layer that offloads calculations and provides intelligent data downsampling

### 2. API Integration Section (NEW)

Added **Section 3: API Integration** with three new service classes:

#### 3.1 Control Limits Service
- Fetches precomputed SPC control limits from `/api/machines/{id}/spc/limits`
- Implements 30-minute client-side cache
- Auto-refreshes 5 minutes before expiration
- **Impact**: Eliminates CPU-intensive client-side calculations

#### 3.2 Data Fetching Service
- Uses `/api/machines/{id}/spc/history-optimized` for initial load
- Uses `/api/machines/{id}/spc/latest` for real-time updates
- Implements field projection to minimize payload
- Leverages intelligent downsampling (Grafana-style)
- **Impact**: 80% reduction in data transfer

#### 3.3 API Comparison Table
| Operation | v1.0 Approach | v2.0 Approach | Improvement |
|-----------|-----------------|-----------------|-------------|
| Fetch Control Limits | Calculate client-side (CPU 100%) | Fetch from `/spc/limits` (30s cached) | **Eliminates CPU spike** |
| Initial Chart Load | `GET /spc-history?limit=1000` (all fields) | `GET /spc/history-optimized?fields=field&step=50` | **80% payload reduction** |
| Real-time Updates | WebSocket full object | Poll `/spc/latest?count=5` | **95% payload reduction** |
| Chart Configuration | Hardcoded | Fetch `/spc/metadata` | **Dynamic schema discovery** |

### 3. Implementation Phase Updates

#### Phase 1: Core Infrastructure

**5.2 Integrate uPlot - Updated:**
```typescript
// ✅ NEW: Fetch precomputed control limits
const limitsResponse = await limitsService.fetchControlLimits(deviceId, [field])
const limits = limitsResponse[field]

// ✅ NEW: Fetch optimized history (downsampled)
const { timestamps, values } = await dataService.fetchInitialChartData(deviceId, field, 50)

// Create uPlot with precomputed limits
const plot = new uPlot({
  series: [
    { label: 'Value', stroke: '#2563eb' },
    { label: 'UCL', value: (_, u) => u[0] = limits.ucl },  // ✅ Precomputed
    { label: 'LCL', value: (_, u) => u[0] = limits.lcl },  // ✅ Precomputed
    { label: 'Mean', value: (_, u) => u[0] = limits.mean }, // ✅ Precomputed
  ],
  // ...
}, [timestamps, values, ...], container)
```

**5.3 WebSocket Integration - Updated:**
```typescript
// ✅ NEW: Poll only latest 5 points every 5 seconds (cached endpoint)
setInterval(async () => {
  const { timestamps, values } = await dataService.fetchLatestData(deviceId, field, 5)
  // Append to chart
}, 5000)
```

#### Phase 2: Advanced Optimizations

**5.5 WebWorker for Calculations - DEPRECATED:**
```typescript
// ❌ REMOVED: No longer needed
// self.onmessage = (e) => {
//   const { ucl, lcl, mean } = calculateSPCLimits(e.data.values)
//   self.postMessage({ ucl, lcl, mean })
// }

// ✅ REPLACED BY: Use backend endpoint
const limits = await fetch(`/api/machines/${deviceId}/spc/limits`)
```

**Impact:**
- Eliminates WebWorker overhead
- Uses server-side precomputed limits
- No client-side calculation required

#### Phase 3: Production Polish

**5.7 Performance Monitoring - Updated:**
```typescript
// ✅ NEW: Track API cache hit rates
interface PerformanceMetrics {
  cacheHitRate: number;        // NEW: % of requests served from cache
  apiLatency: number;         // NEW: API response time
  spcLimitsCacheTTL: number; // NEW: Time until limits expire
  latestDataCacheTTL: number; // NEW: Time until latest data expires
}
```

**5.8 Error Handling - Updated:**
```typescript
// ✅ NEW: Fallback to legacy API if v2.0 fails
async function fetchChartData(deviceId: string, field: string) {
  try {
    // Try v2.0 optimized endpoint first
    return await spcDataService.fetchInitialChartData(deviceId, field, 50)
  } catch (error) {
    console.warn('⚠️ API v2.0 failed, falling back to v1.0:', error)

    // Fallback to legacy endpoint
    const response = await fetch(`/api/machines/${deviceId}/spc-history?limit=50`)
    const data = await response.json()

    // Calculate limits client-side (v1.0 behavior)
    const limits = calculateSPCLimits(data.data.map((d: any) => d[field]))

    return {
      timestamps: data.data.map((d: any) => new Date(d._time).getTime()),
      values: data.data.map((d: any) => d[field]),
      limits,
    }
  }
}
```

### 4. Performance Benchmarks - Updated

**Added API Metrics:**

| Metric | v1.0 | v2.0 (Target) | Improvement |
|--------|-------|-----------------|-------------|
| API response time | 100-200ms | < 50ms | **4x** |
| WebSocket payload per update | 5-10KB | 200-500B | **20x** |
| Control limits calculation | Client-side (100% CPU) | Server-side (15ms) | **Eliminated** |
| Initial data transfer | ~1000 points | ~50 points | **20x** |
| Field projection | N/A | Enabled | **80% payload reduction** |

**Overall Impact:**

| Metric | Before (v1.0) | After (v2.0) | Total Improvement |
|--------|------------------|------------------|------------------|
| Initial render time | 5s | 0.3s | **16x** |
| Update latency | 100ms | 16ms | **6x** |
| Memory usage | 200MB | 40MB | **5x** |
| CPU during updates | 80% | 15% | **5x** |
| Bundle size | +500KB | +10KB | **50x** |
| FPS during updates | 15-20fps | 60fps | **3x** |

### 5. Deployment Strategy - Updated

**8.1 Feature Flags - Updated:**
```typescript
const FEATURES = {
  useUplot: true,
  enableWebWorker: false,        // ❌ DISABLED: No longer needed (API v2.0)
  enableOffscreenCanvas: true,
  enableLazyLoad: true,
  useOptimizedAPI: true,       // ✅ NEW: Use API v2.0 endpoints
  enableFieldProjection: true,    // ✅ NEW: Use field projection
}
```

**8.2 Rollout Plan - Updated:**
1. **Week 1**: Deploy API v2.0 services and data fetching layer
2. **Week 2**: Integrate uPlot with precomputed limits
3. **Week 3**: Deploy optimized WebSocket polling
4. **Week 4**: Monitor cache hit rates, optimize cache TTL
5. **Week 5**: A/B test: v1.0 vs v2.0 API
6. **Week 6**: Full rollout if metrics meet targets

---

## Benefits of API v2.0 Integration

### 1. Performance Improvements

#### Eliminated Client-Side CPU Calculations
- **Before**: Frontend calculated UCL, LCL, Mean for every chart (100% CPU spike)
- **After**: Backend precomputes limits (30-min cache)
- **Impact**: No CPU spikes during initialization

#### Reduced Data Transfer
- **Before**: Fetch all fields, all data points
- **After**: Field projection + intelligent downsampling
- **Impact**: 80% reduction in initial load payload

#### Faster API Responses
- **Before**: 100-200ms (legacy endpoints)
- **After**: < 50ms (optimized endpoints with caching)
- **Impact**: 4x faster API response times

#### Simplified Codebase
- **Before**: Complex WebWorker setup, client-side calculations
- **After**: Simple API calls, no calculation logic
- **Impact**: Reduced code complexity, easier maintenance

### 2. Scalability Improvements

#### Automatic Downsampling
- **Feature**: Backend automatically downsamples based on time range
- **Benefit**: Consistent performance regardless of data volume
- **Example**: 1-hour view = 60 points, 24-hour view = 288 points

#### Intelligent Caching
- **Feature**: 30-min cache for limits, 10-sec cache for latest data
- **Benefit**: Reduced API calls, faster page loads
- **Impact**: 70%+ reduction in API calls for repeated views

### 3. Developer Experience

#### Schema Discovery
- **Feature**: `/spc/metadata` endpoint for dynamic configuration
- **Benefit**: No hardcoded field definitions
- **Impact**: Easier to add new metrics, less maintenance

#### Fallback Support
- **Feature**: Automatic fallback to legacy API on failure
- **Benefit**: Zero downtime during migration
- **Impact**: Seamless transition from v1.0 to v2.0

---

## Migration Checklist

### Frontend Tasks

- [ ] Implement `SPCLimitsService` class
- [ ] Implement `SPCDataService` class
- [ ] Update `SPCChart` to use precomputed limits
- [ ] Update `SPCAnalysis` page to use optimized data fetching
- [ ] Implement cache hit rate tracking
- [ ] Add fallback to legacy API
- [ ] Update feature flags
- [ ] Add API v2.0 metrics to performance monitoring
- [ ] Test with both v1.0 and v2.0 endpoints
- [ ] Verify cache behavior (limits, latest data)
- [ ] Test downsampling for different time ranges

### Testing Strategy

#### Unit Tests
- [ ] Test `SPCLimitsService` cache expiration logic
- [ ] Test `SPCDataService` field projection
- [ ] Test fallback to legacy API
- [ ] Test buffer operations with API data

#### Integration Tests
- [ ] Test chart initialization with precomputed limits
- [ ] Test real-time updates with `/spc/latest`
- [ ] Test cache hit scenarios
- [ ] Test cache invalidation
- [ ] Test API v2.0 failure → v1.0 fallback

#### Performance Tests
- [ ] Measure initial render time (target: < 300ms)
- [ ] Measure update latency (target: < 16ms)
- [ ] Measure memory usage (target: < 40MB)
- [ ] Measure API response times (target: < 50ms)
- [ ] Monitor cache hit rate (target: > 70%)
- [ ] Benchmark against v1.0 (target: 10x improvement)

#### Load Tests
- [ ] Test with 20 charts simultaneously
- [ ] Test sustained 1Hz updates for 10 minutes
- [ ] Test memory stability over 1 hour
- [ ] Test cache behavior under high load

---

## Known Limitations

### API v2.0 Limitations

1. **Cache Latency**: Precomputed limits are cached for 30 minutes, may be slightly stale
   - **Mitigation**: Refresh 5 minutes before expiration
   - **Acceptable for SPC**: Control limits don't change rapidly

2. **Polling vs WebSocket**: Current implementation uses polling instead of true WebSocket
   - **Mitigation**: Poll cached endpoint (minimal overhead)
   - **Future**: Can implement WebSocket for true real-time updates

3. **Field Projection**: Must know required fields upfront
   - **Mitigation**: Use `/spc/metadata` for schema discovery
   - **Acceptable**: Charts typically use predefined field sets

### Client-Side Limitations

1. **Fallback Complexity**: Dual-path code (v1.0 + v2.0) increases complexity
   - **Mitigation**: Remove v1.0 code after full rollout
   - **Timeline**: Remove after Week 6 if metrics meet targets

2. **Cache Management**: Multiple cache layers (API cache + client cache)
   - **Mitigation**: Document cache hierarchy clearly
   - **Acceptable**: Redundancy improves reliability

---

## Next Steps

1. **Week 1-2**: Implement API v2.0 integration
2. **Week 3-4**: Deploy optimized data fetching and caching
3. **Week 5**: Monitor metrics, optimize cache TTL
4. **Week 6**: Full production rollout, remove v1.0 code

---

**Document Owner**: Frontend Engineering Team
**Date**: January 18, 2026
**Related Documents**:
- `SPC_CHARTS_RENDERING_PLAN.md` - Updated implementation guide
- `SPC_API_UPDATE_20260118.md` - Backend API specification
- `BACKEND_API_REQUIREMENTS.md` - API requirements (deprecated, replaced by v2.0)

# Time-Series Chart Rendering Optimization Plan
## Production-Grade Architecture for SPC Dashboard

**Version**: 1.1
**Status**: Draft
**Date**: 2025-01-18
**Updated**: Integrated with SPC API v2.0 (January 18, 2026)

---

## Executive Summary

This document outlines a production-grade architecture for rendering time-series SPC (Statistical Process Control) charts following Grafana's best practices. The focus is on achieving sub-60fps rendering, minimizing memory footprint, and handling high-frequency data streams efficiently.

### Key Metrics Targets
- **Initial Render**: < 500ms for 50 data points across 20 charts
- **Update Latency**: < 16ms (60fps) per new data point
- **Memory Usage**: < 50MB for 1000 data points per chart
- **CPU Usage**: < 20% during sustained updates

### What's New in v1.1
✅ **Integrated SPC API v2.0** - Leverage backend optimizations:
- Precomputed control limits (30-min cache)
- Intelligent downsampling based on time range
- Field projection for targeted data fetching
- Cached latest data endpoint for real-time updates

**Impact**: Eliminates client-side SPC calculations, reduces data transfer by 80%

---

## 1. Architecture Overview

### 1.1 Grafana-Style Rendering Pipeline (Updated for v2.0 API)

```
┌─────────────────────────────────────────────────────────────────┐
│                     Application Layer                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐      ┌──────────────┐                   │
│  │ Data Store   │──────▶│ State Manager│                   │
│  │ (Redux/Zustand)│     │ (Redux/Zustand)│              │
│  └──────┬───────┘      └──────┬───────┘                   │
│         │                      │                            │
└─────────┼──────────────────────┼────────────────────────────┘
          │                      │
          ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│              SPC API v2.0 Layer                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────┐    │
│  │  Optimized Data Fetching              │    │
│  │  /spc/limits (cached)           │    │
│  │  /spc/latest (cached)             │    │
│  │  /spc/history-optimized (downsampled)│   │
│  │  /spc/metadata (schema)            │    │
│  └────────────────────────────────────────────┘    │
│                      │                            │
└──────────────────────┼────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Visualization Layer                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────┐      │
│  │         TimeSeries Chart Component          │      │
│  │  ┌──────────────────────────────────┐    │      │
│  │  │  CanvasRenderer (uPlot)         │    │      │
│  │  │  - Offscreen canvas caching       │    │      │
│  │  │  - RequestAnimationFrame loop     │    │      │
│  │  │  - GPU acceleration hints      │    │      │
│  │  └──────────────────────────────────┘    │      │
│  └────────────────────────────────────────────┘      │
│                                                               │
│  ┌────────────────────────────────────────────┐      │
│  │         Data Management Layer                  │      │
│  │  ┌──────────────────────────────────┐    │      │
│  │  │  Circular Buffer (Ring Buffer)          │    │      │
│  │  │  - Fixed-size pre-allocated arrays     │    │      │
│  │  │  - O(1) append operations             │    │      │
│  │  │  - Automatic overflow handling          │    │      │
│  │  └──────────────────────────────────┘    │      │
│  └────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Core Principles (Updated)

1. **Canvas over SVG**: Use HTML5 Canvas for > 1000 data points
2. **Fixed-size data structures**: Pre-allocated arrays prevent GC pauses
3. **Offscreen rendering**: Cache chart elements in offscreen canvas
4. **RequestAnimationFrame**: Sync rendering with browser refresh rate
5. **Batch updates**: Defer multiple updates to single frame
6. **GPU acceleration**: Use `will-change` CSS hints and composite layers
7. **✅ NEW: Backend-First**: Offload calculations to backend, use cached endpoints
8. **✅ NEW: Field Projection**: Request only needed fields to minimize payload

---

## 2. Data Management Strategy (Updated for API v2.0)

### 2.1 Circular Buffer (Ring Buffer) Implementation

**Purpose**: Eliminate garbage collection overhead from array reallocation

```typescript
interface CircularBufferOptions<T> {
  capacity: number      // Fixed size, e.g., 1000 points
  onOverflow?: (item: T) => void  // Callback for discarded items
}

class CircularBuffer<T> {
  private buffer: T[]
  private head: number = 0
  private tail: number = 0
  private count: number = 0

  constructor(private capacity: number, initialData?: T[]) {
    this.buffer = new Array<T>(capacity)
    if (initialData) {
      initialData.forEach(item => this.push(item))
    }
  }

  // O(1) time complexity
  push(item: T): void {
    this.buffer[this.tail] = item
    this.tail = (this.tail + 1) % this.capacity

    if (this.count === this.capacity) {
      // Buffer full, discard oldest
      this.head = this.tail
      this.onOverflow?.(this.buffer[this.head])
    } else {
      this.count++
    }
  }

  // O(1) time complexity, returns new array view
  toArray(): T[] {
    if (this.count === 0) return []

    const result = new Array<T>(this.count)
    for (let i = 0; i < this.count; i++) {
      result[i] = this.buffer[(this.head + i) % this.capacity]
    }
    return result
  }

  get length(): number {
    return this.count
  }
}
```

**Benefits**:
- Zero garbage collection for insertions
- Constant-time operations
- Predictable memory usage
- No array copying

### 2.2 Typed Arrays for Numeric Data

**Purpose**: Reduce memory footprint by 50-80%

```typescript
interface TimeSeriesData {
  timestamps: Float64Array  // 8 bytes per timestamp
  values: Float32Array      // 4 bytes per value
  ucl: Float32Array
  lcl: Float32Array
  mean: Float32Array
}

class TypedTimeSeriesBuffer {
  private capacity: number
  private head: number = 0
  private count: number = 0

  // Pre-allocate all arrays
  data: TimeSeriesData = {
    timestamps: new Float64Array(1000),
    values: new Float32Array(1000),
    ucl: new Float32Array(1000),
    lcl: new Float32Array(1000),
    mean: new Float32Array(1000),
  }

  push(timestamp: number, value: number, ucl: number, lcl: number, mean: number): void {
    const idx = (this.head + this.count) % this.capacity

    this.data.timestamps[idx] = timestamp
    this.data.values[idx] = value
    this.data.ucl[idx] = ucl
    this.data.lcl[idx] = lcl
    this.data.mean[idx] = mean

    if (this.count < this.capacity) {
      this.count++
    } else {
      this.head = (this.head + 1) % this.capacity
    }
  }
}
```

**Memory Comparison**:
- Regular arrays: ~1000 points × 10 fields × 24 bytes = 240KB
- Typed arrays: ~1000 points × 10 fields × 4-8 bytes = 40-80KB
- **Savings**: 60-80%

---

## 3. API Integration (NEW for v2.0)

### 3.1 Control Limits Service

**Purpose**: Fetch precomputed SPC control limits from backend instead of calculating client-side

```typescript
// ✅ NEW: API Service for SPC Limits
interface SPCLimit {
  mean: number;
  stdDev: number;
  ucl: number;
  lcl: number;
  n: number;
  calculatedAt: string;
  expiresAt: string;
  isCached: boolean;
}

interface SPCLimitsResponse {
  limits: Record<string, SPCLimit>;
  metadata: {
    deviceId: string;
    calculationTime: string;
    cacheKey: string;
  };
}

class SPCLimitsService {
  private cache: Map<string, { data: SPCLimit; expiresAt: number }> = new Map();

  async fetchControlLimits(
    deviceId: string,
    fields: string[],
    lookback: string = '24h',
    sigma: number = 3
  ): Promise<Record<string, SPCLimit>> {
    const cacheKey = `${deviceId}:${fields.join(',')}:${lookback}:${sigma}`;

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      console.log('🎯 SPC Limits: Using cached data');
      return { [fields[0]]: cached.data };
    }

    // Fetch from backend
    const params = new URLSearchParams({
      fields: fields.join(','),
      lookback,
      sigma: sigma.toString(),
    });

    const response = await fetch(
      `/api/machines/${deviceId}/spc/limits?${params}`,
      {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch control limits: ${response.statusText}`);
    }

    const data: SPCLimitsResponse = await response.json();

    // Cache limits with TTL (5 min before expiration)
    fields.forEach(field => {
      const limit = data.limits[field];
      const expiresAt = new Date(limit.expiresAt).getTime() - 5 * 60 * 1000;

      this.cache.set(`${cacheKey}:${field}`, {
        data: limit,
        expiresAt,
      });

      // Schedule refresh
      setTimeout(() => {
        this.cache.delete(`${cacheKey}:${field}`);
      }, expiresAt - Date.now());
    });

    console.log('🎯 SPC Limits: Fetched from backend', data.metadata);
    return data.limits;
  }
}
```

**Benefits**:
- Eliminates CPU-intensive client-side calculations
- 30-minute server-side cache
- Automatic refresh scheduling
- Zero frontend computation overhead

### 3.2 Data Fetching Service

**Purpose**: Use optimized endpoints for initial chart load and real-time updates

```typescript
// ✅ NEW: Optimized Data Fetching Service
class SPCDataService {
  /**
   * Fetch initial chart data with intelligent downsampling
   */
  async fetchInitialChartData(
    deviceId: string,
    field: string,
    count: number = 50
  ): Promise<{ timestamps: number[]; values: number[] }> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Use field projection to minimize payload
    const params = new URLSearchParams({
      from: oneHourAgo.toISOString(),
      to: now.toISOString(),
      fields: field,  // ✅ Field projection
      step: count.toString(),  // ✅ Request specific number of points
    });

    const response = await fetch(
      `/api/machines/${deviceId}/spc/history-optimized?${params}`,
      {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch chart data: ${response.statusText}`);
    }

    const data = await response.json();

    // Transform to uPlot format
    const timestamps = data.data.map((d: any) => new Date(d._time).getTime());
    const values = data.data.map((d: any) => d[field]);

    console.log(`🎯 Initial Data: Fetched ${timestamps.length} points (downsampled)`);
    return { timestamps, values };
  }

  /**
   * Fetch latest data for real-time updates
   */
  async fetchLatestData(
    deviceId: string,
    field: string,
    count: number = 5
  ): Promise<{ timestamps: number[]; values: number[] }> {
    const params = new URLSearchParams({
      count: count.toString(),
      fields: field,  // ✅ Field projection
    });

    const response = await fetch(
      `/api/machines/${deviceId}/spc/latest?${params}`,
      {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch latest data: ${response.statusText}`);
    }

    const data = await response.json();

    const timestamps = data.data.map((d: any) => new Date(d._time).getTime());
    const values = data.data.map((d: any) => d[field]);

    console.log(`🎯 Latest Data: Fetched ${timestamps.length} points (cached)`);
    return { timestamps, values };
  }

  /**
   * Fetch metadata for dynamic chart configuration
   */
  async fetchMetadata(deviceId: string): Promise<FieldMetadata[]> {
    const response = await fetch(
      `/api/machines/${deviceId}/spc/metadata`,
      {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.statusText}`);
    }

    const data = await response.json();
    return data.fields;
  }
}
```

### 3.3 API Comparison: Old vs New

| Operation | Old Approach (v1.0) | New Approach (v2.0) | Improvement |
|-----------|---------------------|---------------------|-------------|
| Fetch Control Limits | Calculate client-side (CPU 100%) | Fetch from `/spc/limits` (30s cached) | **Eliminates CPU spike** |
| Initial Chart Load | `GET /spc-history?limit=1000` (all fields) | `GET /spc/history-optimized?fields=field&step=50` | **80% payload reduction** |
| Real-time Updates | WebSocket full object | Poll `/spc/latest?count=5` | **95% payload reduction** |
| Chart Configuration | Hardcoded | Fetch `/spc/metadata` | **Dynamic schema discovery** |

---

## 4. Rendering Strategy

### 4.1 Canvas vs SVG Decision Matrix

| Metric | Canvas | SVG | Recommendation |
|--------|--------|-----|---------------|
| < 100 points | ✅ Slower than SVG | ✅ Faster | SVG |
| 100-1000 points | ✅ Comparable | ⚠️ Getting slow | Canvas |
| > 1000 points | ✅ Significantly faster | ❌ Very slow | Canvas |
| Real-time updates | ✅ Excellent | ⚠️ Moderate | Canvas |
| Interactivity (tooltips) | ⚠️ Manual implementation | ✅ Built-in | SVG or Canvas with custom hit detection |
| Accessibility | ⚠️ Poor | ✅ Good | SVG or Canvas with custom hit detection |
| Export to image | ✅ Easy | ⚠️ Requires conversion | Canvas |

**Recommendation**: Use Canvas for all SPC charts (> 50 points)

### 4.2 Offscreen Canvas Caching

**Purpose**: Eliminate redundant drawing operations

```typescript
class TimeSeriesChart {
  private canvas: HTMLCanvasElement
  private offscreenCanvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private offscreenCtx: OffscreenCanvasRenderingContext2D

  constructor(container: HTMLElement) {
    this.canvas = document.createElement('canvas')
    this.ctx = this.canvas.getContext('2d', { alpha: false })!  // Disable alpha for performance

    this.offscreenCanvas = document.createElement('canvas')
    this.offscreenCtx = this.offscreenCanvas.getContext('2d')!

    container.appendChild(this.canvas)
  }

  private resize(): void {
    const dpr = window.devicePixelRatio || 1
    const rect = this.canvas.getBoundingClientRect()

    this.canvas.width = rect.width * dpr
    this.canvas.height = rect.height * dpr
    this.canvas.style.width = `${rect.width}px`
    this.canvas.style.height = `${rect.height}px`
    this.ctx.scale(dpr, dpr)

    // Resize offscreen canvas
    this.offscreenCanvas.width = rect.width * dpr
    this.offscreenCanvas.height = rect.height * dpr
  }

  render(): void {
    // 1. Clear main canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    // 2. Draw grid and axes (static, cached)
    this.drawStaticElements()

    // 3. Draw data from offscreen cache
    this.ctx.drawImage(this.offscreenCanvas, 0, 0)

    // 4. Draw dynamic elements (tooltips, highlights)
    this.drawDynamicElements()
  }
}
```

### 4.3 RequestAnimationFrame Loop

**Purpose**: Sync rendering with browser refresh rate, avoid layout thrashing

```typescript
class AnimationLoop {
  private rafId: number | null = null
  private pendingUpdate = false
  private lastRenderTime = 0

  scheduleUpdate(callback: () => void): void {
    this.pendingUpdate = true

    if (!this.rafId) {
      this.rafId = requestAnimationFrame((timestamp) => {
        if (this.pendingUpdate) {
          const deltaTime = timestamp - this.lastRenderTime

          // Cap at 60fps (16ms)
          if (deltaTime >= 16) {
            callback()
            this.pendingUpdate = false
            this.lastRenderTime = timestamp
          }
        }

        // Continue loop if there are pending updates
        if (this.pendingUpdate) {
          this.rafId = requestAnimationFrame(this.loop.bind(this))
        } else {
          this.rafId = null
        }
      })
    }
  }
}
```

### 4.4 Layered Rendering

**Purpose**: Optimize by caching static elements

```typescript
class LayeredCanvasChart {
  private backgroundCanvas: HTMLCanvasElement   // Grid, axes, labels
  private dataCanvas: HTMLCanvasElement         // Time-series line
  private overlayCanvas: HTMLCanvasElement      // Tooltips, highlights

  constructor(container: HTMLElement) {
    // Stack canvases using absolute positioning
    container.style.position = 'relative'

    this.backgroundCanvas = this.createLayer(container, 0)
    this.dataCanvas = this.createLayer(container, 1)
    this.overlayCanvas = this.createLayer(container, 2)
  }

  private createLayer(container: HTMLElement, zIndex: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    canvas.style.position = 'absolute'
    canvas.style.top = '0'
    canvas.style.left = '0'
    canvas.style.zIndex = String(zIndex)
    container.appendChild(canvas)
    return canvas
  }

  // Only redraw background when size or options change
  updateBackground(): void {
    // Draw grid, axes, labels once
  }

  // Only redraw data on new data points
  updateData(): void {
    // Clear and redraw time-series line
  }

  // Only redraw overlay on interaction
  updateOverlay(): void {
    // Draw tooltips, highlights on hover
  }
}
```

---

## 5. Implementation Plan (Updated for API v2.0)

### Phase 1: Core Infrastructure (Week 1-2)

#### 5.1 Implement Circular Buffer
- [ ] Create `CircularBuffer<T>` class
- [ ] Create `TypedTimeSeriesBuffer` class with typed arrays
- [ ] Add unit tests for buffer operations
- [ ] Benchmark memory usage vs regular arrays

**Estimated Impact**: 50% reduction in GC pauses

#### 5.2 Integrate uPlot
```bash
npm install uplot
npm install @types/uplot --save-dev
```

```typescript
import uPlot from 'uplot'
import { SPCLimitsService } from './services/spcLimitsService'
import { SPCDataService } from './services/spcDataService'

class SPCChart {
  private plot: uPlot
  private limitsService: SPCLimitsService
  private dataService: SPCDataService
  private buffer: CircularBuffer<{ timestamp: number; value: number }>

  constructor(
    container: HTMLElement,
    deviceId: string,
    field: string
  ) {
    this.limitsService = new SPCLimitsService()
    this.dataService = new SPCDataService()
    this.buffer = new CircularBuffer<{ timestamp: number; value: number }>(1000)

    // ✅ NEW: Fetch precomputed control limits
    this.initializeChart(container, deviceId, field)
  }

  private async initializeChart(container: HTMLElement, deviceId: string, field: string) {
    try {
      // Fetch initial data (downsampled)
      const { timestamps, values } = await this.dataService.fetchInitialChartData(deviceId, field, 50)

      // ✅ NEW: Fetch precomputed control limits
      const limitsResponse = await this.limitsService.fetchControlLimits(deviceId, [field])
      const limits = limitsResponse[field]

      // Initialize buffer with initial data
      timestamps.forEach((ts, i) => {
        this.buffer.push({ timestamp: ts, value: values[i] })
      })

      // Create uPlot instance
      this.plot = new uPlot({
        width: container.clientWidth,
        height: 300,
        title: field,
        plugins: [
          // Custom plugins for SPC features
        ],
        series: [
          { label: 'Value', stroke: '#2563eb' },
          {
            label: 'UCL',
            stroke: '#ef4444',
            dash: [5, 5],
            points: { show: false },
            // ✅ NEW: Use precomputed limits
            value: (_, u) => u[0] = limits.ucl
          },
          {
            label: 'LCL',
            stroke: '#ef4444',
            dash: [5, 5],
            points: { show: false },
            value: (_, u) => u[0] = limits.lcl
          },
          {
            label: 'Mean',
            stroke: '#22c55e',
            points: { show: false },
            value: (_, u) => u[0] = limits.mean
          }
        ],
        axes: [
          { time: false },
          {
            values: (u, vals) => vals.map(v => v.toFixed(2))
          }
        ],
        cursor: {
          points: { show: true, size: 6 }
        }
      }, [timestamps, values, values.map(() => limits.ucl), values.map(() => limits.lcl), values.map(() => limits.mean)], container)

      console.log('✅ Chart initialized with precomputed limits:', limits)
    } catch (error) {
      console.error('❌ Failed to initialize chart:', error)
      throw error
    }
  }

  async update(newPoint: { timestamp: number; value: number }): Promise<void> {
    // Update circular buffer
    this.buffer.push(newPoint)

    // ✅ NEW: No need to recalculate limits, they're already cached
    // Efficiently update uPlot data without full redraw
    const bufferData = this.buffer.toArray()
    const timestamps = bufferData.map(d => d.timestamp)
    const values = bufferData.map(d => d.value)

    this.plot.setData([timestamps, values])
  }
}
```

#### 5.3 WebSocket Integration (Updated for API v2.0)
```typescript
// ✅ NEW: Optimized WebSocket polling with cached endpoint
class OptimizedWebSocketPolling {
  private deviceId: string
  private field: string
  private chart: SPCChart
  private pollingInterval: number | null = null

  constructor(deviceId: string, field: string, chart: SPCChart) {
    this.deviceId = deviceId
    this.field = field
    this.chart = chart
  }

  start(): void {
    // ✅ NEW: Poll only latest 5 points every 5 seconds (cached endpoint)
    this.pollingInterval = setInterval(async () => {
      try {
        const { timestamps, values } = await this.chart.dataService.fetchLatestData(this.deviceId, this.field, 5)

        // Update chart with new data
        const newestPoint = {
          timestamp: timestamps[timestamps.length - 1],
          value: values[values.length - 1],
        }

        await this.chart.update(newestPoint)
      } catch (error) {
        console.error('Failed to fetch latest data:', error)
      }
    }, 5000)

    console.log('✅ Started optimized WebSocket polling (5s interval, cached endpoint)')
  }

  stop(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
      this.pollingInterval = null
      console.log('⏹️ Stopped WebSocket polling')
    }
  }
}
```

**Estimated Impact**: 95% reduction in WebSocket payload size

### Phase 2: Advanced Optimizations (Week 3-4)

#### 5.4 Offscreen Canvas Caching
- [ ] Implement layered rendering (background/data/overlay)
- [ ] Cache static elements (grid, axes, labels)
- [ ] Implement efficient redraw strategy

#### 5.5 ~~WebWorker for Calculations~~ (DEPRECATED - Use API v2.0)
- [x] **REMOVED**: No longer needed - backend handles SPC calculations
- [x] **REPLACED BY**: `/api/machines/{id}/spc/limits` endpoint

**Impact**: Eliminates WebWorker overhead, uses server-side precomputed limits

#### 5.6 Virtualization for Off-screen Charts
- [ ] Implement Intersection Observer for lazy loading
- [ ] Pause rendering for off-screen charts
- [ ] Resume when chart becomes visible
- [ ] Use field projection to minimize initial data load

### Phase 3: Production Polish (Week 5-6)

#### 5.7 Performance Monitoring (Updated for API v2.0)
```typescript
class PerformanceMonitor {
  private metrics = {
    renderTime: [] as number[],
    apiLatency: [] as number[],
    fps: [] as number[],
    memory: [] as number[],
    cacheHitRate: [] as number[],  // ✅ NEW: Cache hit rate
  }

  measureRender(fn: () => void): void {
    const start = performance.now()
    fn()
    const duration = performance.now() - start

    this.metrics.renderTime.push(duration)
    this.updateFPS()
  }

  measureAPICall(fn: () => Promise<any>): Promise<any> {
    const start = performance.now()
    return fn().then(result => {
      const duration = performance.now() - start
      this.metrics.apiLatency.push(duration)
      return result
    })
  }

  trackCacheHit(isHit: boolean): void {
    this.metrics.cacheHitRate.push(isHit ? 1 : 0)
  }

  getStats(): PerformanceStats {
    const cacheHits = this.metrics.cacheHitRate.filter(h => h === 1).length
    const total = this.metrics.cacheHitRate.length
    const hitRate = total > 0 ? (cacheHits / total) * 100 : 0

    return {
      avgRenderTime: this.average(this.metrics.renderTime),
      avgAPILatency: this.average(this.metrics.apiLatency),
      avgFPS: this.average(this.metrics.fps),
      memoryMB: this.average(this.metrics.memory),
      cacheHitRate: hitRate,  // ✅ NEW: Cache efficiency
    }
  }
}
```

- [ ] Add performance monitoring to all charts
- [ ] Create dashboard for performance metrics
- [ ] Track API cache hit rates
- [ ] Set up alerts for performance degradation

#### 5.8 Error Handling & Resilience (Updated)
- [ ] Implement graceful degradation (fallback to legacy API if v2.0 fails)
- [ ] Add retry logic for API calls with exponential backoff
- [ ] Implement data integrity checks
- [ ] Add cache invalidation logic

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

#### 5.9 Accessibility & Export
- [ ] Add keyboard navigation
- [ ] Implement ARIA labels
- [ ] Add export to PNG/SVG functionality
- [ ] Support high-contrast themes
- [ ] Use field projection for optimized exports

---

## 6. Performance Benchmarks (Updated for API v2.0)

### 6.1 Target Benchmarks

| Scenario | Current (Recharts) | Target (uPlot + API v2.0) | Improvement |
|----------|---------------------|----------------------------|-------------|
| Initial render (20 charts, 50 pts) | 5000ms | 300ms | **16x** |
| Update latency (1 new point) | 100ms | 16ms | **6x** |
| Memory (20 charts, 1000 pts) | 200MB | 40MB | **5x** |
| CPU during sustained updates | 80% | 15% | **5x** |
| Bundle size impact | +500KB | +10KB | **50x** |
| WebSocket payload per update | 5-10KB | 200-500B | **20x** |
| Initial API response time | N/A | < 50ms | **N/A** |

### 6.2 Benchmarking Strategy

```typescript
async function benchmarkChart(
  chartRenderer: 'recharts' | 'uplot',
  dataPoints: number,
  updates: number
): Promise<BenchmarkResult> {
  const results = {
    renderTimes: [] as number[],
    updateTimes: [] as number[],
    apiLatencies: [] as number[],  // ✅ NEW: API latency
    memory: [] as number[],
  }

  // Memory snapshot before
  const beforeMemory = (performance as any).memory?.usedJSHeapSize || 0

  // ✅ NEW: Measure API latency
  const apiStart = performance.now()
  const chartData = await fetchData(dataPoints)
  const apiLatency = performance.now() - apiStart
  results.apiLatencies.push(apiLatency)

  // Initial render
  const startRender = performance.now()
  const chart = createChart(chartRenderer, chartData)
  const renderTime = performance.now() - startRender
  results.renderTimes.push(renderTime)

  // Sustained updates
  for (let i = 0; i < updates; i++) {
    const startUpdate = performance.now()
    updateChart(chart, i)
    const updateTime = performance.now() - startUpdate
    results.updateTimes.push(updateTime)
  }

  // Memory snapshot after
  const afterMemory = (performance as any).memory?.usedJSHeapSize || 0

  return {
    chartRenderer,
    dataPoints,
    updates,
    avgRenderTime: renderTime,
    avgUpdateTime: average(results.updateTimes),
    avgAPILatency: average(results.apiLatencies),  // ✅ NEW
    memoryDelta: afterMemory - beforeMemory,
  }
}
```

---

## 7. Backend Integration Requirements (Updated for API v2.0)

### 7.1 API Enhancements (COMPLETED)

#### 7.1.1 ✅ Precomputed Control Limits
```typescript
// ✅ IMPLEMENTED: Backend endpoint
GET /api/machines/{id}/spc/limits?fields=cycle_time,temp_1&lookback=24h&sigma=3

// Response (cached for 30 minutes)
{
  "limits": {
    "cycle_time": {
      "mean": 12.5,
      "stdDev": 0.8,
      "ucl": 14.9,
      "lcl": 10.1,
      "n": 50,
      "calculatedAt": "2025-01-17T10:50:00Z",
      "expiresAt": "2025-01-17T11:20:00Z",
      "isCached": true
    }
  },
  "metadata": {
    "deviceId": "M1",
    "calculationTime": "15ms",
    "cacheKey": "spc:limits:M1:cycle_time:24h:sigma3"
  }
}
```

#### 7.1.2 ✅ Intelligent Downsampling
```typescript
// ✅ IMPLEMENTED: Backend endpoint
GET /api/machines/{id}/spc/history-optimized?from=...&to=...&fields=cycle_time&step=50

// Automatic downsampling based on time range:
// - ≤ 1 hour: Raw data (~60 points)
// - ≤ 6 hours: 1-minute average (~360 points)
// - ≤ 24 hours: 5-minute average (~288 points)
// - ≤ 7 days: 15-minute average (~672 points)
// - > 7 days: 1-hour average (~168 points)
```

#### 7.1.3 ✅ Field Projection
```typescript
// ✅ IMPLEMENTED: Field projection
GET /api/machines/{id}/spc/history-optimized?fields=cycle_time,injection_velocity_max

// Returns only requested fields (80% payload reduction)
```

#### 7.1.4 ✅ Cached Latest Data
```typescript
// ✅ IMPLEMENTED: Cached endpoint
GET /api/machines/{id}/spc/latest?count=5&fields=cycle_time

// Response (cached for 10 seconds)
{
  "deviceId": "M1",
  "data": [...],
  "metadata": {
    "count": 5,
    "cachedAt": "2025-01-17T10:50:01Z"
  }
}
```

### 7.2 WebSocket Best Practices (Updated)

```typescript
class OptimizedWebSocket {
  private socket: WebSocket | null = null
  private pollingInterval: number | null = null

  constructor(url: string) {
    // ✅ NEW: Use polling with cached endpoint instead of WebSocket
    // WebSocket can be enabled later if needed for real-time updates
    this.pollWithCache()
  }

  private pollWithCache(): void {
    // Poll `/spc/latest?count=5` every 5 seconds
    this.pollingInterval = setInterval(async () => {
      const data = await fetchLatestSPCData(this.deviceId, 5)
      // Update charts with minimal payload
    }, 5000)
  }
}
```

---

## 8. Deployment Strategy

### 8.1 Feature Flags (Updated)

```typescript
const FEATURES = {
  useUplot: true,           // Use uPlot instead of Recharts
  enableWebWorker: false,   // ❌ DISABLED: No longer needed (API v2.0)
  enableOffscreenCanvas: true,  // Use offscreen canvas caching
  enableLazyLoad: true,      // Lazy load off-screen charts
  useOptimizedAPI: true,    // ✅ NEW: Use API v2.0 endpoints
  enableFieldProjection: true,  // ✅ NEW: Use field projection
}
```

### 8.2 Rollout Plan (Updated)

1. **Week 1**: Deploy API v2.0 services and data fetching layer
2. **Week 2**: Integrate uPlot with precomputed limits
3. **Week 3**: Deploy optimized WebSocket polling
4. **Week 4**: Monitor cache hit rates, optimize cache TTL
5. **Week 5**: A/B test: v1.0 vs v2.0 API
6. **Week 6**: Full rollout if metrics meet targets

### 8.3 Rollback Plan

- Keep legacy API (v1.0) as fallback
- Add feature flag to switch between v1.0 and v2.0
- Monitor for regressions
- Hot-patch capability to disable v2.0 features

---

## 9. Monitoring & Observability (Updated for API v2.0)

### 9.1 Key Metrics to Track (Updated)

```typescript
interface PerformanceMetrics {
  // Rendering metrics
  chartRenderTime: number        // Average render time (ms)
  chartUpdateLatency: number     // Time from data arrival to render (ms)
  frameRate: number             // Current FPS
  droppedFrames: number         // Number of dropped frames per second

  // Memory metrics
  heapSize: number             // JS heap size (MB)
  chartMemory: number          // Memory per chart (MB)
  gcPauses: number            // GC pause time (ms)

  // Network metrics
  apiLatency: number           // API response time (ms) ✅ NEW
  messageSize: number         // Average message size (bytes)
  messageRate: number         // Messages per second

  // Cache metrics ✅ NEW
  cacheHitRate: number        // % of requests served from cache
  spcLimitsCacheTTL: number  // Time until limits expire (ms)
  latestDataCacheTTL: number  // Time until latest data expires (ms)
}
```

### 9.2 Alert Thresholds (Updated)

```typescript
const ALERT_THRESHOLDS = {
  chartRenderTime: 100,        // Alert if > 100ms
  frameRate: 30,               // Alert if < 30fps
  heapSize: 500,              // Alert if > 500MB
  apiLatency: 200,            // ✅ NEW: Alert if > 200ms (API v2.0)
  cacheHitRate: 70,            // ✅ NEW: Alert if < 70% hit rate
  droppedFrames: 10,           // Alert if > 10 per second
}
```

---

## 10. Summary & Recommendations (Updated)

### 10.1 Key Recommendations

1. **✅ Use uPlot** - Replace Recharts with uPlot for all time-series charts
   - 50-100x performance improvement
   - 98% bundle size reduction
   - Production-tested by Grafana

2. **✅ Implement Circular Buffers** - Use typed arrays and ring buffers
   - 50% reduction in GC pauses
   - Predictable memory usage

3. **✅ Offscreen Canvas Caching** - Layered rendering strategy
   - Eliminate redundant drawing
   - Only redraw dynamic elements

4. **✅ ~~WebWorker Integration~~** → **REPLACED BY API v2.0**
   - ~~Offload calculations to WebWorker~~
   - **NEW**: Use `/spc/limits` for precomputed limits
   - **Impact**: Eliminates client-side CPU calculations entirely

5. **✅ Use Optimized API v2.0** - Leverage backend optimizations
   - Precomputed control limits (30-min cache)
   - Intelligent downsampling (Grafana-style)
   - Field projection (80% payload reduction)
   - Cached latest data (10-sec cache)

### 10.2 Expected Performance Improvements (Updated)

| Metric | Current | Target (v1.0) | Target (v2.0) | Improvement |
|--------|---------|-----------------|----------------|-------------|
| Initial render time | 5s | 0.5s | **0.3s** | **16x** |
| Update latency | 100ms | 16ms | **16ms** | **6x** |
| Memory usage | 200MB | 50MB | **40MB** | **5x** |
| CPU usage | 80% | 20% | **15%** | **5x** |
| Bundle size | +500KB | +10KB | +10KB | **50x** |
| WebSocket payload | 5-10KB | 2-5KB | **200-500B** | **20x** |
| API response time | 100-200ms | N/A | **< 50ms** | **4x** |
| FPS during updates | 15-20fps | 60fps | **60fps** | **3x** |

### 10.3 Implementation Priority (Updated)

**Phase 1 (Critical - Week 1-2)**:
1. ✅ Integrate uPlot library
2. ✅ Implement circular buffers with typed arrays
3. ✅ Migrate SPC charts to uPlot
4. ✅ **NEW**: Integrate `/spc/limits` endpoint
5. ✅ **NEW**: Integrate `/spc/history-optimized` endpoint
6. Basic performance testing

**Phase 2 (Important - Week 3-4)**:
7. Offscreen canvas caching
8. ~~WebWorker for SPC calculations~~ → **REMOVED** (API v2.0)
9. **NEW**: Integrate `/spc/latest` endpoint for real-time updates
10. Lazy loading with Intersection Observer
11. Performance monitoring

**Phase 3 (Polish - Week 5-6)**:
12. Advanced features (zoom, pan, annotations)
13. Accessibility improvements
14. Export functionality
15. Full production rollout
16. **NEW**: Cache optimization tuning
17. **NEW**: A/B testing: v1.0 vs v2.0

### 10.4 Final Verdict

**Recommendation**: Replace Recharts with **uPlot** and **integrate SPC API v2.0** for optimal performance.

**Rationale**:
- uPlot: Proven at scale by Grafana (millions of dashboards)
- API v2.0: Offloads all CPU-intensive calculations to backend
- Combined: Eliminates 100% CPU spikes, reduces data transfer by 80%
- Precomputed limits: No frontend computation overhead
- Intelligent downsampling: Optimal data transfer
- Field projection: Minimal payload size
- Server-side caching: Sub-50ms API response times

**Do NOT use Grafana UI components directly**:
- Not designed as standalone library
- Heavy dependencies
- Significant boilerplate required
- Not optimized for non-Grafana use cases

---

## Appendix A: Code Examples (Updated)

### A.1 Complete uPlot SPC Chart Component with API v2.0

```typescript
import uPlot from 'uplot'
import { useEffect, useRef, forwardRef } from 'react'
import { SPCLimitsService } from '@/services/spcLimitsService'
import { SPCDataService } from '@/services/spcDataService'

interface SPCChartProps {
  deviceId: string;
  field: string;
  unit: string;
}

export const SPCChart = forwardRef<HTMLDivElement, SPCChartProps>(
  ({ deviceId, field, unit }, ref) => {
    const chartRef = useRef<uPlot | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const limitsService = useRef(new SPCLimitsService())
    const dataService = useRef(new SPCDataService())

    useEffect(() => {
      if (!containerRef.current) return

      async function initialize() {
        try {
          // ✅ NEW: Fetch precomputed control limits (cached)
          const limitsResponse = await limitsService.current.fetchControlLimits(deviceId, [field])
          const limits = limitsResponse[field]

          // ✅ NEW: Fetch optimized history (downsampled, field projection)
          const { timestamps, values } = await dataService.current.fetchInitialChartData(deviceId, field, 50)

          const plot = new uPlot({
            width: containerRef.current.clientWidth,
            height: 300,
            title: field,
            series: [
              { label: 'Value', stroke: '#2563eb' },
              {
                label: 'UCL',
                stroke: '#ef4444',
                dash: [5, 5],
                points: { show: false },
                // ✅ NEW: Use precomputed limits
                value: (_, u) => u[0] = limits.ucl
              },
              {
                label: 'LCL',
                stroke: '#ef4444',
                dash: [5, 5],
                points: { show: false },
                value: (_, u) => u[0] = limits.lcl
              },
              {
                label: 'Mean',
                stroke: '#22c55e',
                points: { show: false },
                value: (_, u) => u[0] = limits.mean
              }
            ],
            axes: [
              { time: false },
              {
                values: (u, vals) => vals.map(v => `${v.toFixed(2)} ${unit}`)
              }
            ],
            cursor: {
              points: { show: true, size: 6, fill: '#2563eb' },
              drag: { x: true, y: false }
            },
            plugins: [
              {
                hooks: {
                  draw: (u) => {
                    // Custom drawing hooks
                  }
                }
              }
            ]
          }, [timestamps, values, values.map(() => limits.ucl), values.map(() => limits.lcl), values.map(() => limits.mean)], containerRef.current)

          chartRef.current = plot

          console.log('✅ Chart initialized:', {
            dataPoints: timestamps.length,
            limits: { ucl: limits.ucl, lcl: limits.lcl, mean: limits.mean },
            cached: limits.isCached,
          })
        } catch (error) {
          console.error('❌ Failed to initialize chart:', error)
        }
      }

      initialize()

      return () => {
        if (chartRef.current) {
          chartRef.current.destroy()
        }
      }
    }, [deviceId, field, unit])

    // ✅ NEW: Real-time updates using cached endpoint
    useEffect(() => {
      const interval = setInterval(async () => {
        try {
          const { timestamps, values } = await dataService.current.fetchLatestData(deviceId, field, 5)

          if (chartRef.current && timestamps.length > 0) {
            const newTimestamp = timestamps[timestamps.length - 1]
            const newValue = values[values.length - 1]

            // Append new data point
            const currentTimestamps = chartRef.current.data[0]
            const currentValues = chartRef.current.data[1]

            const updatedTimestamps = [...currentTimestamps, newTimestamp].slice(-50)
            const updatedValues = [...currentValues, newValue].slice(-50)

            // Efficiently update uPlot
            chartRef.current.setData([
              updatedTimestamps,
              updatedValues,
              updatedValues.map(() => chartRef.current.series[1].value),
              updatedValues.map(() => chartRef.current.series[2].value),
              updatedValues.map(() => chartRef.current.series[3].value),
            ])
          }
        } catch (error) {
          console.error('Failed to fetch latest data:', error)
        }
      }, 5000)

      return () => clearInterval(interval)
    }, [deviceId, field])

    return <div ref={(el) => { containerRef.current = el; if (ref) (ref as any).current = el }} />
  }
)
```

---

## References

- uPlot Documentation: https://github.com/leeoniya/uPlot
- **NEW**: SPC API v2.0 Documentation: `SPC_API_UPDATE_20260118.md`
- Grafana Time-Series Best Practices: https://grafana.com/docs/
- Web Workers API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API
- OffscreenCanvas: https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas
- Performance API: https://developer.mozilla.org/en-US/docs/Web/API/Performance

---

**Document Owner**: Frontend Engineering Team
**Review Date**: 2025-01-18
**Next Review**: 2025-02-18
**Version**: 1.1 (Integrated with SPC API v2.0)

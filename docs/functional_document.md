## 1) Executive Summary

**Purpose.** Deliver a real‑time, role‑aware MES dashboard that surfaces machine status, process capability (SPC), OEE and maintenance insights for injection molding—backed by AI that detects anomalies, recommends actions, and prevents failures.

**Key benefits.**

* **Shorter reaction time** to alarms, drifts, and downtime via live status and intelligent alerting.
* **Higher yield & stability** through SPC, recipe/parameter governance, and AI root‑cause suggestions.
* **Productivity gains** with OEE transparency by machine/shift/tool and automated loss Pareto.
* **Lower maintenance cost** through predictive insights and planned interventions.
* **Auditability & compliance** using parameter change logs and access control.

---

## 2) Personas & User Journeys

**Operator (cell/press).**

* Goals: run parts to standard, respond to alarms, minimize scrap.
* Journeys:

  * Start of shift: confirm job/recipe, machine “ready”, check set vs actual temps.
  * During run: watch cycle time, alarms, and SPC traffic light; acknowledge alerts; record scrap reason if prompted.
  * End of shift: handover notes and signoff.

**Shift Leader / Supervisor.**

* Goals: keep plan on track, balance machines, clear bottlenecks.
* Journeys:

  * Hourly: Control Room view → see machine heatmap, OEE, WIP, top losses; reassign work; trigger maintenance ticket.
  * Investigate: drill from line to machine, open event timeline and live trends, communicate actions in comments.

**Process Engineer (molding).**

* Goals: maintain a capable window, reduce variability.
* Journeys:

  * When CpK deteriorates: open SPC/Quality page → control charts (cycle time, injection time, switch‑over pressure, ET vs TS deltas) → AI suggestions → apply new setpoints → e‑sign parameter change.

**Maintenance Engineer.**

* Goals: maximize reliability, reduce unplanned stops.
* Journeys:

  * Daily: Maintenance/OEE page → predictive risk list (hydraulic/servo/thermal) → planned work orders → verify effectiveness after intervention.

**Plant Manager.**

* Goals: throughput, cost, and service level.
* Journeys:

  * Morning: dashboard KPI rollup (OEE, Availability, Performance, Quality), yesterday vs target; exception summary and top 3 actions.

---

## 3) Information Architecture & Pages

> **Global filters** (persistent header): Time range (relative & absolute), Machine(s), Line/Cell, Tool/Mold, Product/Part, Order/Work‑order, Shift, Operator, Material/Resin, Alarm type, Tag set.
> **Common actions:** Save view, share deep link, export CSV/XLSX, schedule snapshot email, add comment/task, subscribe to alert.

### 3.1 Factory Overview / Control Room View

* **Purpose:** Live, at‑a‑glance status and performance for all machines.
* **Main KPIs & charts:**

  * Machine **status heatmap** (color by STS; icon for OPM).
  * OEE tiles per machine & line; sparkline of last 2h cycle time.
  * **Downtime/Alarm Pareto** (by wmId/wmMsg).
  * Production tally (good/total/scrap*) by shift/order. (*If scrap source available; else operator entry.)
* **Filters:** Time, area, cell, product/order, shift.
* **Actions:** Open Machine Detail; acknowledge/assign event; mute low‑priority alert; start maintenance ticket; reassign order.

### 3.2 Machine List & Status View

* **Purpose:** Tabular fleet view for sorting/filtering.
* **KPIs:** Status (STS), OPM, current ECYCT vs target, last alarm time, temperature deviation max(|ETi–TSi|), predicted risk score.
* **Actions:** Bulk select → subscribe to alerts; open compare view; export list.

### 3.3 Machine Detail (Realtime) View

* **Purpose:** Deep, live machine telemetry.
* **Main elements:**

  * **Now panel:** STS, OPM, current cycle time (ECYCT), cycle counter (CYCN), oil temperature (OT), shot rate, job/order context.
  * **Trend lanes:** cycle time (ECYCT), injection time (EIPT), switch‑over (ESIPT/ESIPP/ESIPS), **actual barrel temps ET1..ET10 vs set TS1..TS10 vs measured T1..T10**, pressures (EIPM/EPLSPM/IPx), with overlay of alarms/opLog events.
  * **Recipe panel:** current setpoints snapshot from `/tech`.
  * **Event timeline:** alarms `/wm`, parameter changes `/opLog`, state changes (STS/OPM) and job changes.
* **Filters:** Time window (live + history), tag presets (Temps/Pressures/Timers).
* **Actions:** Pin chart, compare to golden run, capture anomaly, raise task, request parameter change.

### 3.4 SPC / Quality Analysis View

* **Purpose:** Statistical stability and capability.
* **KPIs & charts:**

  * X‑bar/R charts for ECYCT, EIPT, ESIPP, ETi; Cp/Cpk; histogram and trend.
  * **Traffic‑light grid** of zones (ΔTi = ETi–TSi); out‑of‑control rule hits.
  * Correlation matrix (e.g., ECYCT vs ET zones, vs EIVM/EIPM).
* **Filters:** Time, product/tool, cavity (if available), shift.
* **Actions:** Lock recipe, create corrective action, attach evidence, export control chart.

### 3.5 Alarms & Events View

* **Purpose:** Prioritized alarm management & audit.
* **Content:** Queue of active/cleared alarms from `/wm` with wmId, wmMsg, time; **grouped & deduplicated**, correlated to recent `/opLog` changes.
* **Charts:** Alarm Pareto, MTBF/MTTR trend, timeline overlays.
* **Actions:** Acknowledge, assign, comment, link to CMMS work order, add runbook.

### 3.6 Maintenance / OEE / Historical Analysis View

* **Purpose:** Long‑term performance and reliability.
* **KPIs & charts:**

  * **OEE** = Availability × Performance × Quality, by machine/shift/tool, with loss waterfall (planned stop, changeover, minor stop, speed loss, defects).
  * Condition indicators (oil temp trend OT, thermal drift, pressure peaks EIPM/EPLSPM).
  * Predictive health score and recommended work orders.
* **Filters:** Time range (days/months), asset, order/tool.
* **Actions:** Generate RCA report, schedule PM, download OEE pack, compare periods.

### 3.7 Admin / Configuration View

* **Purpose:** Device and governance administration.
* **Sections:**

  * **Devices:** register machine ↔ devId, topic prefix, protocol (MQTT/OPC UA/Modbus/HTTP), heartbeat, time sync strategy. 
  * **Data model:** tag mapping (see §7), engineering units, scaling, enumerations (OPM/STS). 
  * **Thresholds & SPC:** control limits, spec limits, alert rules.
  * **Recipes:** approved parameter sets per product/tool; versioning & e‑sign.
  * **Roles & permissions:** RBAC (see §5).
  * **Integrations:** ERP (orders), QMS (nonconformance), CMMS (work orders).

---

## 4) AI‑Driven Features (5+)

> **Notation:** Inputs reference topics/fields. Outputs describe UI artifacts.

1. **Cycle‑time anomaly detection (per machine & product).**

* **Inputs:** `/spc` ECYCT, CYCN; state (STS/OPM from `/realtime`); alarms `/wm`; parameter changes `/opLog`. 
* **Output:** Real‑time “Anomaly” badge on Machine Detail and Control Room; red markers on ECYCT trend; explanation (which features deviated).
* **Impact:** Earlier detection of drift/minor stops → higher Availability and Performance.

2. **Thermal window guardian (zone temperature drift).**

* **Inputs:** `/spc` ET1..ET10, `/tech` TS1..TS10, `/realtime` T1..T10, OT. 
* **Output:** Traffic‑light per zone (ΔTi=ETi–TSi); ranked root‑cause hints (e.g., upstream setpoint change, oil temp rise, ambient trend).
* **Impact:** Reduced thermal‑related defects; faster stabilization after changeovers.

3. **Switch‑over optimization (transfer timing/pressure/position).**

* **Inputs:** ESIPT, ESIPP, ESIPS, EIPT, ECYCT; defect tags (from QMS or operator entry). 
* **Output:** Recommended window for switch‑over (time/pressure/position) with confidence; “Apply to trial” workflow and rollback.
* **Impact:** Improves fill consistency; reduces short shots/flash.

4. **Predictive maintenance (hydraulic/thermal/servo).**

* **Inputs:** OT (oil temperature), pressure maxima EIPM/EPLSPM, cycle‑time variance, alarm patterns `/wm`, operating modes `/realtime`. 
* **Output:** Health score (0–100), predicted failure mode (e.g., hydraulic overheating), lead time to risk window, recommended PM.
* **Impact:** Fewer unplanned stops; better spares planning.

5. **Intelligent alerting & grouping.**

* **Inputs:** Alarms `/wm`, parameter changes `/opLog`, context (order/tool, shift, STS/OPM). 
* **Output:** Group correlated alarms into an “incident” with one notification; priority score; runbook suggestions; noise suppression.
* **Impact:** Reduces alarm fatigue; focuses action.

6. **Automatic RCA suggestion for scrap or downtime spikes.**

* **Inputs:** Spike detection on ECYCT, EIPT, ESIPP, ETi, wmId patterns, recent opLog edits. 
* **Output:** ranked hypotheses (e.g., “recent TS3 +10 °C; correlates with flash alarms”), plus recommended tests.
* **Impact:** Faster troubleshooting; knowledge capture.

7. **Golden‑run comparison & recipe recommendation.**

* **Inputs:** Best historical runs (low variance, high CpK) + current `/tech` & `/spc`.
* **Output:** “Distance from golden run” KPI; suggested setpoint deltas to re‑enter capable window.
* **Impact:** Standardization; reduced startup time.

---

## 5) Functional Requirements

**Global**

* Real‑time updates ≤ **2 s** end‑to‑end for Machine Detail; ≤ **5 s** for fleet pages.
* Time travel: live (auto‑refresh) and historical playback with scroll/zoom.
* Compare mode: machine‑to‑machine, shift‑to‑shift, recipe‑to‑recipe.
* Export: CSV/XLSX for tables; PNG for charts; PDF executive pack.

**Control Room**

* Status heatmap from STS; OPM icon overlay; tooltips show last ECYCT, last alarm, ΔTmax.
* OEE tiles with drill‑through; downtime Pareto from alarms `/wm` + detected states.
* Bulk actions: subscribe, assign, maintenance request.

**Machine Detail**

* Trend navigator with tag presets (Temps/Pressures/Timers).
* Event timeline merging `/wm`, `/opLog`, OPM/STS transitions, order changes. 
* Recipes: show `/tech` snapshot; diff vs previous; e‑sign on apply.
* SPC sidebar: on‑chart control limits; rule violations highlight.

**SPC / Quality**

* Control charts (X‑bar/R, IMR) selectable per tag (ECYCT, EIPT, ESIPP, ETi).
* Capability metrics (Cp/Cpk, Pp/Ppk) with period and subgroup control.
* Outlier drill‑in to raw cycles; annotate assignable causes.

**Alarms & Events**

* Ingest `/wm` and correlate with `/opLog` within ±5 min to suggest causal edits. 
* Acknowledge/assign with SLA timers; MTTR measured from alarm appear → clear.
* Noise suppression rules (dedupe repeats, cool‑down windows).

**Maintenance / OEE**

* OEE calculator configurable: Availability from STS/OPM/alarms; Performance from ECYCT vs standard; Quality from **good/scrap** counts (from QMS or operator entries).
* Predictive risk list; generate CMMS work order with context link.

**Admin / Config**

* Device registry: devId ↔ asset; protocol endpoints (MQTT/OPC UA/Modbus/HTTP), broker credentials, NTP/time source; topic prefix verification. 
* Tag dictionary with units, scaling, enumerations, visibility, and alertability.
* SPC limits and alert thresholds per product/tool/machine.
* Roles (see RBAC) and SSO integration.
* Integration keys for ERP/QMS/CMMS; webhook destinations.

**RBAC (Role‑Based Access Control)**

* **Operator:** read real‑time & SPC for assigned machines; acknowledge alarms; enter scrap; cannot edit thresholds/recipes.
* **Supervisor:** all operator rights; assign incidents; edit schedules; request maintenance; view OEE.
* **Process Engineer:** edit SPC/spec limits; propose/apply recipes with e‑sign; view RCA and AI recommendations.
* **Maintenance:** view telemetry, health, alarms; create/close WO; update maintenance status.
* **Quality Engineer:** full SPC, nonconformance link, approval of recipe changes.
* **Admin:** device onboarding, tag mapping, roles, integrations, global thresholds.

**Filtering, Search, Drill‑down, Export**

* Faceted search across machines/orders/tools; quick filters for “Out‑of‑control”, “High ΔT”.
* Drill paths: Control Room → Machine → Tag trend → Event → RCA/Task.
* Exports respect current filter & column set.

---

## 6) Technical Architecture (High‑Level)

**Data flow**

1. **Elink Gateway** on each press publishes MQTT topics `/deviceId/realtime`, `/deviceId/spc`, `/deviceId/tech`, plus `/deviceId/opLog` and `/deviceId/wm`. Alternative northbound interfaces (OPC UA, Modbus TCP, HTTP varValue API) are available if needed. 
2. **Ingestion layer** (MQTT broker with TLS) → **Stream processor** normalizes messages (devId → assetId), validates timestamps (`time` vs `sendTime`), and enriches with order/tool context. 
3. **Storage layers:**

   * **Time‑series DB** (per‑cycle & per‑second) for telemetry and SPC.
   * **Events store** for alarms `/wm`, op logs `/opLog`, state changes, and AI incidents.
   * **Config store** for devices, recipes, units, limits, roles.
4. **Services:** OEE calculator, SPC service, alerting engine, AI services (anomaly, prediction, recommendation).
5. **Dashboard (web app):** WebSocket/SSE subscriptions for live tiles and charts; REST/GraphQL for queries.

**Real‑time updates**

* **WebSocket or SSE** to push updates; fallback to 5‑s polling if disconnected.
* Change events (alarm, opLog) propagated instantly to subscribers.

**Integration points (high‑level)**

* **ERP/MES:** work orders, product/part, routing, standards (target cycle time).
* **QMS:** defects, scrap reasons, NCs; return quality rate per order.
* **CMMS:** create/close work orders from incidents; sync asset hierarchy.
* **User directory/SSO:** SAML/OIDC for identity and RBAC.

**Edge & network**

* NTP/time sync configured per gateway to ensure aligned timestamps. 
* Optional offline buffering on gateway or site collector; guaranteed backfill.

---

## 7) Data Model & Tag Mapping

> Units below are **assumptions** typical for injection molding; validate with vendor: Temperature = °C; Pressure = bar; Speed = mm/s; Position = mm; Time = s.

### 7.1 Topic Overview (source → meaning)

* `/deviceId/realtime`: current **operate mode (OPM)**, **status (STS)**, measured temps **T1..T10**, **OT** (oil temperature). STS: 1=Standby, 2=Production. OPM: 0=Manual, 1=Semi‑auto, 2=Photo‑eye auto, 3=Time auto, 4=Mold adjust. 
* `/deviceId/spc`: per‑cycle process values: **CYCN**, **ECYCT** (cycle time), **EISS** (inj start), **EIVM/EIPM** (max inj speed/pressure), **ESIPT/ESIPP/ESIPS** (transfer), **EIPT** (inj time), **EPLST/EPLSSE/EPLSPM** (plasticizing), **ET1..ET10** (actual temps). 
* `/deviceId/tech`: setpoints/recipes: **TS1..TS10** (set temps), **IPx/IVx/ISx/ITx**, switch‑over targets (IPT/IPS/IPP), holding (PPx/PVx/PTx), plasticizing, clamp/open/close speeds & pressures, etc. 
* `/deviceId/opLog`: parameter change log: varId, lastValue → value, modifyTime. 
* `/deviceId/wm`: alarms: wmId, wmMsg, wmTime (appear/clear). 

### 7.2 Selected field mapping (sample + usage)

| Field                 | Human name                            | Unit          | Used as        | Display / KPI / AI                  |
| --------------------- | ------------------------------------- | ------------- | -------------- | ----------------------------------- |
| `OPM`                 | Operate mode                          | enum          | State context  | Badges/icons; filter; AI context.   |
| `STS`                 | Production status                     | enum          | Run/idle state | Heatmap color; OEE Availability.    |
| `OT`                  | Oil temperature                       | °C            | Condition      | Trend; health indicator; PM model.  |
| `T1..T10`             | Barrel/Nozzle temps (measured)        | °C            | Realtime       | Trend lanes; ΔT vs TS/ET; alerts.   |
| `CYCN`                | Cycle count                           | –             | Counter        | Throughput; SPC subgrouping.        |
| `ECYCT`               | Cycle time                            | s             | Core SPC       | KPI; control charts; anomaly.       |
| `EIPT`                | Injection time                        | s             | SPC            | Charts; capability; RCA.            |
| `EIVM`                | Max injection speed                   | mm/s          | SPC            | Peak monitor; AI features.          |
| `EIPM`                | Max injection pressure                | bar           | SPC            | Peaks; machine loading.             |
| `ESIPT/ESIPP/ESIPS`   | Switch‑over time/pressure/position    | s/bar/mm      | SPC            | Window guard; optimizer.            |
| `EPLST/EPLSSE/EPLSPM` | Plasticizing time/end/press max       | s/mm/bar      | SPC            | Screw return condition.             |
| `ET1..ET10`           | Actual production temps               | °C            | SPC            | ΔT vs TS; capability.               |
| `TS1..TS10`           | Temperature setpoints                 | °C            | Recipe         | Compare vs ET/T; recipe mgmt.       |
| `IPx/IVx/ISx/ITx`     | Inj pressure/speed/pos/time setpoints | bar/mm/s/mm/s | Recipe         | Recipe diff; SPC expectations.      |
| `opLog.varId/value`   | Parameter change                      | –             | Governance     | Audit trail; on‑chart flags.        |
| `wmId/wmMsg`          | Alarm id/message                      | –             | Events         | Queue; Pareto; MTTR.                |
| `ATST` *(assumed)*    | Auto‑state / Aux status               | enum          | Context        | Display only; confirm mapping.      |

**Derivatives (computed):**

* **ΔTi = ETi – TSi** (zone deviation); **ΔTmax = max_i |ΔTi|**.
* **Performance ratio** = Standard cycle time / Average ECYCT.
* **State timeline** from STS/OPM transitions + alarms.

---

## 8) Non‑Functional Requirements

**Performance & latency**

* Machine Detail: **p95 ≤ 2 s** from message ingest to UI update; charts stream at 1 Hz (or per cycle).
* Fleet pages: **p95 ≤ 5 s** refresh; pagination and virtualized lists for >200 machines.

**Scalability**

* Linear scale to 200 presses / 50k tags / 5k msg/s sustained.
* Downsample policy: raw per‑message (30 days), per‑cycle (1 year), hourly/daily rollups (5 years).

**Availability & resiliency**

* Service SLO **99.9%** monthly; stateless frontends; active‑active broker; back‑pressure and retry queues.
* Edge buffering & backfill for site network outages.

**Security**

* TLS 1.2+ for MQTT/HTTP; broker auth (mutual TLS or token). 
* SSO (OIDC/SAML); RBAC (least privilege); audit logs for sign‑in and data/recipe changes.
* Network segmentation (OT/IT), firewall allow‑list, no default credentials in production. (Change Elink defaults during commissioning.) 
* Data retention & privacy per policy; PII‑free by design.

**Compliance & audit**

* Parameter change e‑sign & immutable log (from `/opLog`); timestamp sources & drift monitoring. 

---

## 9) Assumptions & Open Questions

**Assumptions**

* Units: °C (temp), bar (pressure), mm (position), mm/s (speed), s (time).
* **OPM** and **STS** enumerations as per Elink manual; **STS=2** indicates “production/running.” 
* **ECYCT** provided per shot via `/spc`; **CYCN** is monotonically increasing count. 
* **ATST** is an auxiliary/auto status flag (not defined in manual); treated as contextual only.
* Good/scrap counts either come from QMS/PLC counters or operator UI; if absent, **Quality** component of OEE is computed from available sources or marked “unknown.”
* Number of zones (T/ET/TS 1..10) varies by machine; dashboard handles variable zone counts. 
* Time semantics: prefer `time` (generation) over `sendTime`; fall back to `timestamp` if missing. 

**Open questions (to vendor/stakeholders)**

1. Confirm **units** for pressure/speed/position and any scaling factors for IPx/IVx/ISx/ITx. 
2. Provide complete **state model** beyond STS/OPM (e.g., warm‑up, changeover, alarm lockout) for more precise Availability. 
3. Clarify the exact meaning of **ATST** and any additional realtime flags.
4. Will machines provide **part counts** and **scrap by reason** natively, or should the dashboard collect operator inputs and/or integrate with QMS?
5. Define standard **cycle‑time target** source (ERP routing vs. engineering standard vs. learned baseline).
6. Confirm **alarm catalog** (wmId ↔ message, severity) and whether clear events always publish with `wmId:0`. 
7. Recipe governance: should recipe **apply** be pushed via control system or managed as **recommendation + manual set** with verification?
8. Data retention policies by site; any need for **edge‑only** deployments (air‑gapped)?
9. Do we need **e‑sign/Part 11‑like** controls for parameter changes and approvals?

---

### Appendix A — Ingestion & Normalization Rules (implementation notes)

* **Topic contracts:**

  * Realtime: `/deviceId/realtime` → { OPM, STS, T1..Tn, OT, … }.
  * SPC (per cycle): `/deviceId/spc` → { CYCN, ECYCT, EISS, EIVM, EIPM, ESIPT, ESIPP, ESIPS, EIPT, EPLST, EPLSSE, EPLSPM, ET1..ETn }.
  * Tech (setpoints): `/deviceId/tech` → { TS1..TSn, IP1.., IV1.., IS1.., IT1.., … }
  * Changes: `/deviceId/opLog` → { varId, lastValue, value, modifyTime }.
  * Alarms: `/deviceId/wm` → { wmId, wmMsg, wmTime }. 
* **Timestamping:** prefer `time`; accept `sendTime` if `time` missing; store publisher `timestamp` in metadata; track drift (NTP). 
* **Schema registry:** Tag dictionary with: key, display name, unit, scaling, limits, visibility, source topic, and AI eligibility.
* **Quality gates:** Drop or quarantine messages missing `devId`, malformed timestamps, or out‑of‑range values (configurable).
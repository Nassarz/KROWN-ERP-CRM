# SUPER_ADMIN_REDESIGN_TODO

Audit + phase plan for the KROWN Super Admin premium redesign.
Blueprints: `~/Downloads/ChatGPT Image Sep 27, 2026, *.png` (11 images) + master prompt.
Baseline git: `0e2a3a0 chore: baseline before super-admin premium redesign`.

## 0. Architecture audit (AS-IS)

| Fact | Detail |
|---|---|
| Entry | `app/super-admin/page.tsx` + `app/super-admin/[section]/page.tsx` → both render `components/super-admin.tsx` with `initialTab` |
| Monolith | `components/super-admin.tsx` — **6489 lines**, all 17 tabs as conditional JSX in one component |
| State | ~120 useState hooks in one component; data fetchers `fetchDashboardData`, `fetchDashboardExtras`, `fetchSaList` |
| Backend | 17+ `/api/super-admin/*` routes, token auth via `Authorization: Bearer`, param-safe SQL, `lib/cache.ts` |
| Design so far (this branch) | Dark sidebar (KROWN ERP footer, System Status card), topbar (⌘K search, bell, avatar menu), redesigned Dashboard (hero, 5 stat cards, Platform Overview, restaurants panel, distribution map, activity, health grid), 5 new tabs (Organizations, Payments, Orders, Products, Inventory) with list+summary views |
| Tooling | Tailwind v4 (CSS config), recharts, motion, lucide, cva+clsx+tailwind-merge, vitest (48 tests), eslint, tsc 5.9 |
| Routes with own pages | `/super-admin/onboard`, `/super-admin/users`, `/super-admin/users/[id]`, `/super-admin/restaurants/[id]` (pre-existing, keep) |
| Auth/RBAC | JWT `super_admin` role enforced server-side on every SA API; do not weaken |

## 1. Gap analysis (target vs current)

| Screen | Blueprint | Current state | Gap |
|---|---|---|---|
| Shell (sidebar/topbar) | all images | ✅ built, but inline in monolith | Extract to `components/super-admin/shell/`; active pill = orange gradient; System Status card rows w/ chevrons; mobile drawer |
| Dashboard | prior design + prompt §10 | ✅ done (hero/KPI/overview/panel/map/activity/health) | Date-range control, trend-only deltas already real; light-mode check |
| Analytics | 06_44 | ⚠️ legacy tab | Rebuild: range segmented control, 5 KPI + sparklines, Performance Overview, Growth Summary, Monthly Goal, Staff Breakdown donut, Top Restaurants, Highlights |
| Organizations | 06_48 | ⚠️ list-only (new tab) | KPI row, filter bar + view toggle, table columns (ORG/STATUS/PLAN/BRANCHES/USERS/REVENUE/EFRIS/CREATED/ACTIONS), right detail panel w/ tabs Overview/Branches/Users/Billing/EFRIS/Settings |
| Restaurants | 06_51 | ⚠️ legacy tab | KPI + sparklines, grid/list/map views, card grid w/ cover, detail panel (Revenue Trend, Orders donut, Business Info, Quick Actions) |
| Users & Roles | 06_53 | ⚠️ legacy tab | KPI, filter bar, table w/ role chips, right panel Profile/Roles/Permissions/Activity/Security |
| Devices | prompt §14 | ⚠️ legacy tab | KPI (Total/Online/Offline/Types), filters, table, drawer Overview/Settings/Performance/Logs/Maintenance — **only real metrics (no fake Restart)** |
| Billing | 06_56 + 06_59 | ⚠️ legacy tab | KPI, tabs Overview/Subscriptions/Invoices/Payments/Plans/Usage/Reports, Revenue Trend, Subscriptions by Plan donut, subs table, right restaurant billing panel (Current Plan, Billing Info, Usage, Recent Invoices) |
| Payments | 07_01 | ⚠️ new tab (list-only) | KPI + 3 chart cards (trend/method/status donuts), transactions table w/ method icons, Payment Methods card, Recent Activity; keep "orders-as-payments" data model |
| Orders | 07_05 | ⚠️ new tab (list-only) | KPI (Total/Completed/Pending/Cancelled/Refunded), filters, table, right order detail (Overview/Items/Payment/Customer/Timeline/Actions), **tax row stays 0 (no auto-tax)** |
| Products | prompt §18 | ⚠️ new tab (list-only) | Platform monitoring: KPI, filters, table w/ EFRIS mapping, tenant-scoped |
| Inventory | prompt §19 | ⚠️ new tab (list-only) | KPI (tracked/low/out/issues), alerts, org drill-down |
| Support | 07_09/07_12 | ⚠️ legacy tab | KPI (Total/Open/In Progress/Resolved), tabs Tickets/KB/Live Chat/Announcements/Settings, ticket list + conversation workspace + Customer Info/Quick Actions/KB suggestions |
| Notifications | 07_17 | ⚠️ legacy tab | KPI, category pills, notification list w/ category chips, right Notification Filters + Recent Activity Summary + Settings card; reuse `/api/notifications` |
| Security | prompt §23 | ⚠️ legacy tab | Alerts/Login events/Audit tables, severity badges, KPI |
| Super Admins | prompt §24 | ⚠️ legacy tab | Admin table + add/edit/disable w/ confirm; protect last-admin |
| System Health | prompt §25 | ⚠️ legacy tab | KPIs (db size, connections, memory, uptime…), services grid w/ 4 states, refresh/diagnostics; real probes only |
| Settings | prompt §26 | ⚠️ legacy tab | Sectioned forms, unsaved-changes warning, confirm for dangerous |
| Shared | §28-40 | ❌ partial | Detail drawer, confirm dialog, toast, date-range, chart card, filter chips, empty/error states — build as shared primitives |

## 2. Phase plan (executing in order)

- [x] **P0 Infra** — LB restored (pm2 `krown-lb-8080` → :8080), git baseline, audit doc
- [ ] **P1 Design system + shared primitives** — `components/super-admin/shared/`: tokens, PageHeader, MetricCard(+sparkline), FilterBar, TabsRow, StatusBadge, Chip, EmptyState, SectionCard, DetailPanel, ConfirmDialog, DataTable shell
- [ ] **P1b Shell extraction** — `shell/sidebar.tsx`, `shell/topbar.tsx`, `shell/index.tsx`; monolith renders shell; mobile nav
- [ ] **P2 Dashboard** — polish to §10 (date range, trends) ✅ mostly done
- [ ] **P3 Organizations** — blueprint 06_48 incl. detail panel
- [ ] **P4 Restaurants** — blueprint 06_51
- [ ] **P5 Users & Roles** — blueprint 06_53
- [ ] **P6 Devices** — prompt §14 (real metrics only)
- [ ] **P7 Billing** — blueprints 06_56/06_59
- [ ] **P8 Payments** — blueprint 07_01
- [ ] **P9 Orders** — blueprint 07_05
- [ ] **P10 Products** — prompt §18
- [ ] **P11 Inventory** — prompt §19
- [ ] **P12 Support** — blueprints 07_09/07_12
- [ ] **P13 Analytics** — blueprint 06_44
- [ ] **P14 Notifications** — blueprint 07_17
- [ ] **P15 Security** — prompt §23
- [ ] **P16 Super Admins** — prompt §24
- [ ] **P17 System Health** — prompt §25
- [ ] **P18 Settings** — prompt §26
- [ ] **P19 Motion system** — §30 timings, prefers-reduced-motion
- [ ] **P20 Responsive + dark mode** — 1920/1440/1024/390, light+dark
- [ ] **P21 Accessibility + performance** — §43/§44
- [ ] **P22 Full QA** — visual QA per screen, gates: lint/tsc/test/build, browser QA

## 3. Hard rules (from master prompt)

- Real data only; never fabricate revenue/orders/users/health/EFRIS state
- No destructive DB ops; RBAC + tenant scoping stay server-side
- No tax auto-add; EFRIS ≠ production if only UAT/mock exists
- No `alert()`/`confirm()`; typed ConfirmDialog for destructive actions
- No raw stack traces to admins; designed error states
- Gates after every screen: `npm run lint && npx tsc --noEmit && npm run test && npm run build`
- Commit per milestone: `feat(super-admin): …`

## 4. Status log

| Date | Phase | Result |
|---|---|---|
| 2026-09-27 | P0 | LB restored, git baseline `0e2a3a0`, audit done |

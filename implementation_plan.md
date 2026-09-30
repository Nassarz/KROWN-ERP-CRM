# KROWN ERP-CRM — PHASE 2 IMPLEMENTATION PLAN
## DISTRIBUTION, FIELD SALES & VAN SALES BUSINESS REQUIREMENTS

### Overview
This document outlines the multi-wave roadmap for extending the **KROWN ERP-CRM** platform with first-class capabilities for:
- **KROWN Distribution**
- **KROWN Van Sales**
- **KROWN Field Sales**

---

### Implementation Waves

#### WAVE 1: Core Master Data & Distribution Foundations (ACTIVE)
- **Commodities Engine**: Full commodity domain model supporting barcodes, SKU, packaging hierarchy (Units, Packs, Crates, Cartons), pricing tiers (Retail, Wholesale, Distributor, Agent), batch/lot tracking, expiry, and profit analytics.
- **Customers Directory & Credit Profiles**: Retailers, Wholesalers, Distributors, Key Accounts, multi-location support, assigned agents, routes, price lists, credit limits, and credit days.
- **Suppliers Directory & Accounts**: Supplier profiles, payables subledger link, performance ratings, purchase history, and statements.
- **Warehouses & Stock Locations**: Multi-warehouse registry, stock locations (sellable, quarantine, transit, truck stock).
- **Vehicles & Fleet Integration**: Vehicle registry (trucks, vans), driver/agent assignment, weight/volume capacities, route mapping.
- **Sales Agents & HR Link**: Employee-to-Sales-Agent linking, assigned truck, assigned device, territories, route schedules, cash limits, and credit/discount permissions.
- **Routes & Territories**: Geographic and custom territory hierarchies, route stop sequencing, visit schedules.

#### WAVE 2: Stock Movement & Transfer Engine
- Warehouse → Warehouse, Warehouse → Truck, Truck → Warehouse, Truck → Truck transfers.
- Transfer pick/pack/load lifecycle (Draft → Requested → Approved → Picking → Loaded → In Transit → Received → Completed).
- Automatic Stock Balancing and variance logging.

#### WAVE 3: Field Operations & Mobile Workspace
- Mobile-first agent experience for route execution.
- Offline-first transactional queue (Idempotent sync for offline orders, sales, bookings, collections).
- Direct Van Sales checkout (Cash, Mobile Money, Bank, Card, Credit).
- Customer Visit workflow & proof-of-delivery.

#### WAVE 4: Evening Agent & Truck Reconciliation
- 13-Step Evening Route Closing workflow.
- Automated calculation of expected stock vs. physical count & expected cash vs. collected cash.
- Supervisor approval drawer with exception highlighting and reason code enforcement.

#### WAVE 5: Financial Subledger Integration & Banking
- Canonical financial posting for Supplier Payables, Customer Receivables, Receipts, Payouts, Deposits, and Expenses.
- Multi-invoice collection allocation and undeposited cash workflow.
- Bank statement reconciliation engine (1-to-many, many-to-1 matching).

#### WAVE 6: Budgets, Requisitions & Tax Obligations
- Multi-dimensional budget tracking (Branch, Department, Route, Project).
- Requisition lifecycle with pre-approval budget availability checks.
- Configurable tax engine and liability schedule tracking.

#### WAVE 7: Performance, Commissions, AI & Advanced Analytics
- Multi-dimensional sales scorecards and performance ratings.
- Automated target tracking and tiered commission plans.
- KROWN AI load suggestions, stockout prediction, and route intelligence.

---

### Strict Architecture Rules
1. **Canonical Accounting Truth**: No duplicate financial ledgers. Sales Receivables and Purchasing Payables reference the exact same subledger tables (`customer_receivables`, `supplier_payables`, `financial_receipts`, `financial_payouts`).
2. **Stock Ledger Integrity**: Truck inventory is represented as standard stock ledger movements, never arbitrary numeric counters.
3. **RBAC & Isolation**: Strict multi-tenant isolation, branch-scoped queries, and role-based permissions for agents, supervisors, accountants, and distribution managers.

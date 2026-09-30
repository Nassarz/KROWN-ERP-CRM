# KROWN ERP-CRM — MODULES & NAVIGATION SPECIFICATION
## Phase 2 Navigation Hierarchy & Functional Specification

### 1. Inventory Module Navigation
```
Inventory
  ├── Overview
  ├── Commodities
  │   ├── All Commodities
  │   ├── Categories
  │   ├── Brands
  │   ├── Variants
  │   ├── Units & Packaging
  │   ├── Price Lists
  │   ├── Batch / Lot Tracking
  │   ├── Expiry
  │   ├── Commodity Movements
  │   └── Commodity Profitability
  ├── Devices
  │   ├── Device Registry
  │   ├── Assigned Devices
  │   ├── Agent Devices
  │   ├── POS Devices
  │   ├── Device Sessions
  │   ├── Device Status
  │   └── Lost / Disabled Devices
  ├── Purchases
  │   ├── Purchase Requests
  │   ├── RFQs
  │   ├── Purchase Orders
  │   ├── Goods Received
  │   ├── Purchase Returns
  │   └── Supplier Bills
  ├── Suppliers
  │   ├── Supplier Directory
  │   ├── Supplier Accounts
  │   ├── Supplier Performance
  │   ├── Purchase History
  │   └── Supplier Statements
  ├── Stock Transfers
  │   ├── Warehouse Transfers
  │   ├── Warehouse → Truck
  │   ├── Truck → Warehouse
  │   ├── Truck → Truck
  │   ├── Branch Transfers
  │   ├── Transfer Requests
  │   ├── Transfer Approvals
  │   ├── In Transit
  │   └── Completed Transfers
  ├── Supplier Payables (Contextual View of Canonical Finance Payables)
  │   ├── Outstanding
  │   ├── Due Today
  │   ├── Due This Week
  │   ├── Overdue
  │   ├── Paid
  │   └── Supplier Statements
  ├── Supplier Payouts (Contextual View of Canonical Finance Disbursals)
  │   ├── Pending
  │   ├── Approved
  │   ├── Paid
  │   ├── Failed
  │   └── Payment History
  ├── Stock Changes
  │   ├── Stock Ledger
  │   ├── Adjustments
  │   ├── Damaged Stock
  │   ├── Expired Stock
  │   ├── Lost Stock
  │   ├── Returned Stock
  │   ├── Count Variances
  │   ├── Automatic Balancing
  │   └── Reconciliation History
  ├── Warehouses
  ├── Locations
  ├── Truck Stock
  ├── Stock Counts
  ├── Replenishment
  └── Inventory Reports
```

---

### 2. Sales Module Navigation
```
Sales
  ├── Overview
  ├── Orders
  │   ├── All Orders
  │   ├── Draft
  │   ├── Pending
  │   ├── Approved
  │   ├── Processing
  │   ├── Delivered
  │   ├── Completed
  │   ├── Cancelled
  │   └── Returns
  ├── Bookings
  │   ├── All Bookings
  │   ├── Today
  │   ├── Upcoming
  │   ├── Pending
  │   ├── Converted
  │   ├── Expired
  │   └── Cancelled
  ├── Customers
  │   ├── All Customers
  │   ├── Retailers
  │   ├── Wholesalers
  │   ├── Distributors
  │   ├── Key Accounts
  │   ├── Customer Groups
  │   ├── Customer Locations
  │   ├── Statements
  │   └── Credit Profiles
  ├── Sales Agents
  │   ├── Agent Directory
  │   ├── Territories
  │   ├── Routes
  │   ├── Targets
  │   ├── Performance
  │   ├── Collections
  │   ├── Truck Stock
  │   ├── Commission
  │   ├── Agent Statements
  │   └── Agent Activity
  ├── Receivables (Contextual View of Canonical Finance Receivables)
  │   ├── Outstanding
  │   ├── Due Today
  │   ├── Due This Week
  │   ├── Overdue
  │   ├── Collections
  │   └── Customer Statements
  ├── Receipts (Contextual View of Canonical Finance Receipts)
  │   ├── Cash
  │   ├── Mobile Money
  │   ├── Bank
  │   ├── Card
  │   ├── Cheque
  │   ├── Other
  │   └── Unallocated Receipts
  ├── Packages
  │   ├── Product Packages
  │   ├── Bundles
  │   ├── Promotional Packages
  │   └── Price Packages
  ├── Vouchers
  │   ├── Sales Vouchers
  │   ├── Customer Vouchers
  │   ├── Discount Vouchers
  │   ├── Credit Vouchers
  │   └── Voucher Usage
  ├── Routes
  ├── Territories
  ├── Van Sales
  ├── Returns
  ├── Sales Targets
  ├── Commissions
  └── Reports
```

---

### 3. Finance Module Navigation
```
Finance
  ├── Overview
  ├── Expenses
  │   ├── All Expenses
  │   ├── Agent Expenses
  │   ├── Vehicle Expenses
  │   ├── Branch Expenses
  │   ├── Expense Categories
  │   └── Approval Queue
  ├── Budgets
  │   ├── Budgets
  │   ├── Budget Versions
  │   ├── Departments
  │   ├── Branch Budgets
  │   └── Project Budgets
  ├── Budget Lines
  │   ├── All Budget Lines
  │   ├── Allocated
  │   ├── Committed
  │   ├── Used
  │   └── Remaining
  ├── Payments
  │   ├── All Payments
  │   ├── Supplier Payments
  │   ├── Customer Refunds
  │   └── Other Payments
  ├── Payables (Canonical Payables Master)
  │   ├── Supplier
  │   ├── Employee
  │   ├── General
  │   ├── Due
  │   └── Overdue
  ├── Deposits
  │   ├── Cash Deposits
  │   ├── Bank Deposits
  │   ├── Agent Deposits
  │   └── Undeposited Funds
  ├── Budget Requisitions
  │   ├── Draft
  │   ├── Submitted
  │   ├── Approved
  │   ├── Rejected
  │   └── Disbursed
  ├── Receivables (Canonical Receivables Master)
  │   ├── Customer
  │   ├── Other
  │   ├── Due
  │   ├── Overdue
  │   └── Collections
  ├── Bank Reconciliation
  │   ├── Bank Accounts
  │   ├── Reconciliation Sessions
  │   ├── Unmatched
  │   ├── Matched
  │   └── Exceptions
  ├── Withdrawals
  │   ├── Cash Withdrawal
  │   ├── Bank Withdrawal
  │   ├── Approved
  │   └── Completed
  ├── Tax Obligations
  │   ├── Tax Types
  │   ├── Obligations
  │   ├── Due Dates
  │   ├── Filed
  │   ├── Paid
  │   └── Overdue
  ├── Chart of Accounts
  ├── Journals
  ├── General Ledger
  ├── Banking
  └── Financial Reports
```

---

### 4. HR Module Navigation
```
HR
  ├── Overview
  ├── Employee Records
  │   ├── Employees
  │   ├── Personal Information
  │   ├── Employment
  │   ├── Departments
  │   ├── Branches
  │   ├── Roles
  │   ├── Documents
  │   └── Emergency Contacts
  ├── Sales Agent Profiles
  ├── Drivers
  ├── Supervisors
  ├── Attendance
  ├── Shifts
  ├── Leave
  ├── Payroll
  ├── Performance
  │   ├── Performance Reviews
  │   ├── KPIs
  │   ├── Targets
  │   ├── Sales Performance
  │   ├── Route Performance
  │   ├── Customer Acquisition
  │   ├── Collection Performance
  │   └── Attendance Performance
  ├── Commissions
  ├── Bonuses
  ├── Disciplinary Records
  ├── Training
  ├── Recruitment
  ├── Onboarding
  ├── Offboarding
  └── HR Reports
```

---

### 5. Distribution & Field Operations Workspaces
- **Van Sales Workspace**: Morning load sheets, live route monitor, mobile-first agent portal, evening route close & 13-step reconciliation center.
- **Field Agent Mobile App**: High-contrast, minimal tap mobile workspace for offline sales, bookings, visits, receipts, and returns.

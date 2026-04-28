# Requirements Document

## 1. Application Overview

**Application Name**: Glass Company ERP Management System

**Description**: An all-in-one web-based management platform designed for glass companies to manage projects, human resources, inventory, gate passes, and provide comprehensive operational dashboards. The system supports offline operation with local-first data storage and online synchronization capabilities.

## 2. Users and Usage Scenarios

**Target Users**:
- Admin: Full system access and configuration
- Manager: Cross-module oversight and approval authority
- Store Keeper: Inventory and gate pass management
- HR: Employee and attendance management
- Employee: Limited access to personal information and assigned tasks

**Core Usage Scenarios**:
- Project teams tracking task progress and collaboration
- HR department managing employee records, attendance, and leave requests
- Store keepers controlling inventory inbound/outbound operations
- Security personnel issuing and tracking gate passes for material movement
- Management reviewing operational dashboards for decision-making

## 3. Page Structure and Functional Description

### 3.1 Page Structure

```
Glass Company ERP System
├── Login Page
├── Dashboard (Home)
├── Project/Task Manager
│   ├── Kanban Board View
│   ├── Task Detail Page
│   └── Project List View
├── HR Management
│   ├── Employee List
│   ├── Employee Profile Page
│   ├── Attendance Tracking
│   ├── Leave Management
│   ├── Payroll Records
│   └── Department Management
├── Store/Inventory Management
│   ├── Item Master List
│   ├── Item Detail Page
│   ├── Stock Receiving (Inward)
│   ├── Stock Issuing (Outward)
│   ├── Inventory Dashboard
│   └── Low Stock Alerts
├── Gate Pass Management
│   ├── Gate Pass List
│   ├── Create Gate Pass
│   ├── Gate Pass Detail Page
│   └── Return Tracking
└── User Management
    ├── User List
    └── Role Configuration
```

### 3.2 Functional Description

#### 3.2.1 Login Page
- User enters username and password to authenticate
- System validates credentials and assigns role-based access
- Supported roles: Admin, Manager, Store Keeper, HR, Employee

#### 3.2.2 Dashboard (Home)
- Display overview cards for all modules
- Show recent activities across projects, HR, inventory, gate passes
- Present stock summary with current levels
- List pending gate passes requiring action
- Show HR attendance summary for current period
- Display project status overview with task completion metrics

#### 3.2.3 Project/Task Manager

**Kanban Board View**:
- Display projects as columns with drag-and-drop cards representing tasks
- Each card shows task name, assigned members, deadline, priority
- Users can drag tasks between project columns to update status
- Filter tasks by assignee, priority, or deadline

**Task Detail Page**:
- Show task name, description, assigned team members
- Display deadline, priority level, current status
- List subtasks with completion checkboxes
- Show activity log with timestamp and user actions
- Allow editing task details and adding comments

**Project List View**:
- Display all projects with task count and completion percentage
- Create new projects with name and description
- Archive or delete completed projects

#### 3.2.4 HR Management

**Employee List**:
- Display all employees with name, role, department, contact information
- Search and filter employees by department or role
- Add new employee records

**Employee Profile Page**:
- Show employee details: name, role, department, contact, joining date
- Upload and view employee documents
- Display attendance history and leave balance
- Show payroll records for the employee

**Attendance Tracking**:
- Record employee check-in and check-out times
- Display daily attendance status for all employees
- Generate attendance reports for selected date ranges

**Leave Management**:
- Employees apply for leave with type, start date, end date, reason
- HR or Manager approves or rejects leave requests
- Display leave balance and history per employee

**Payroll Records**:
- Record employee salary information
- View salary history and payment dates

**Department Management**:
- Create and manage departments with name and description
- Assign employees to departments

#### 3.2.5 Store/Inventory Management

**Item Master List**:
- Display all inventory items with item code, name, category, current stock
- Search items by code, name, or category
- Add new items with code, name, category, unit, description

**Item Detail Page**:
- Show item information: code, name, category, unit, description
- Display current stock level
- Show inward and outward transaction history

**Stock Receiving (Inward)**:
- Create inward entry with item selection, quantity, supplier name, date
- Update item stock level upon saving

**Stock Issuing (Outward)**:
- Create outward entry with item selection, quantity, purpose, date
- Reduce item stock level upon saving

**Inventory Dashboard**:
- Display current stock levels for all items
- Show items by category with stock quantities
- Highlight low stock items

**Low Stock Alerts**:
- Automatically flag items below minimum stock threshold
- Display alert list with item name and current quantity

**Item Categories**:
- Predefined categories: glass sheets, hardware, tools, chemicals, others
- Assign items to categories during creation

#### 3.2.6 Gate Pass Management

**Gate Pass List**:
- Display all gate passes with gate pass number, date, status, person responsible
- Filter by status: Pending, Approved, Returned, Closed
- Search by gate pass number or person name

**Create Gate Pass**:
- Auto-generate gate pass number
- Select items from store database with quantity and description
- Enter person responsible details: name, designation, contact
- Enter vehicle details: vehicle number, driver name, vehicle type
- Set initial status as Pending
- Mark items as returnable or non-returnable

**Gate Pass Detail Page**:
- Display gate pass number, date, status
- Show item list with quantities and descriptions
- Show person responsible and vehicle details
- Allow status updates: Approve, Mark as Returned, Close
- Print or export gate pass as PDF

**Return Tracking**:
- For returnable items, record return date and returned quantity
- Update gate pass status to Returned when items are returned
- Close gate pass when all returnable items are accounted for

#### 3.2.7 User Management

**User List**:
- Display all system users with username, role, status
- Add new users with username, password, assigned role
- Edit user roles or deactivate users

**Role Configuration**:
- Define role-based access control for each module
- Admin: Full access to all modules
- Manager: Access to all modules with approval authority
- Store Keeper: Access to Store/Inventory and Gate Pass modules
- HR: Access to HR Management module
- Employee: Access to Dashboard and assigned tasks in Project Manager

## 4. Business Rules and Logic

### 4.1 Offline and Synchronization Logic
- All data is stored locally using IndexedDB when offline
- When online, data syncs to Supabase backend automatically
- Conflict resolution: last-write-wins for concurrent edits
- User can manually trigger sync from settings

### 4.2 Stock Level Calculation
- Current stock = Initial stock + Total inward quantity - Total outward quantity
- Stock updates occur immediately upon saving inward or outward entries

### 4.3 Gate Pass Status Workflow
- New gate pass starts with status: Pending
- Admin or Manager can approve, changing status to Approved
- When returnable items are returned, status changes to Returned
- Gate pass is marked Closed when all actions are complete

### 4.4 Leave Balance Calculation
- Leave balance decreases when leave is approved
- Leave balance resets annually or per company policy

### 4.5 Low Stock Alert Threshold
- System flags items when current stock falls below predefined minimum level
- Minimum level is configurable per item

### 4.6 Role-Based Access Control
- Each module checks user role before granting access
- Unauthorized users are redirected to Dashboard with error message

## 5. Exceptions and Boundary Cases

| Scenario | Handling |
|----------|----------|
| User attempts to issue stock exceeding available quantity | Display error message, prevent transaction |
| Duplicate item code during item creation | Display error, require unique item code |
| Employee applies leave with invalid date range | Display error, require valid start and end dates |
| Gate pass created without selecting items | Display error, require at least one item |
| User loses internet connection during sync | Queue changes locally, retry sync when connection restored |
| Concurrent edits to same record by multiple users | Last-write-wins, notify users of conflict |
| User forgets password | Admin resets password manually |
| Low stock alert threshold not set for item | Use default threshold or skip alert for that item |

## 6. Acceptance Criteria

1. Admin logs in and accesses Dashboard showing overview of all modules
2. Admin creates a new project in Project Manager and assigns tasks to employees
3. Store Keeper adds a new item to Item Master and records inward stock entry
4. Store Keeper creates a gate pass for outward items, enters vehicle and person details, and exports as PDF
5. HR adds a new employee profile and records attendance check-in
6. Employee applies for leave, Manager approves the leave request
7. System operates offline, stores data locally, and syncs to Supabase when online
8. Admin exports inventory data as CSV for backup

## 7. Features Not Included in This Release

- Advanced reporting and analytics dashboards
- Email or SMS notifications for approvals and alerts
- Multi-language support
- Integration with third-party accounting software
- Barcode or QR code scanning for inventory items
- Mobile native applications (iOS/Android)
- Automated payroll calculation with tax deductions
- Biometric attendance integration
- Customizable workflows for approvals
- Real-time collaboration features (chat, video calls)
- Advanced conflict resolution for offline sync
- Audit logs for all user actions
- Data encryption at rest and in transit
- Role hierarchy with custom permission sets
- Bulk import/export for all modules
- Scheduled reports and automated backups
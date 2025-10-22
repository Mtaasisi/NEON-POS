# Permissions Reference Guide

Quick reference for all available permissions in the system.

## Permission IDs

### General Access
| Permission ID | Name | Description |
|--------------|------|-------------|
| `all` | Full Access | Complete system access (Admin only) |
| `dashboard` | Dashboard Access | View dashboard and analytics |
| `pos` | POS Access | Access point of sale system |
| `reports` | View Reports | View business reports |
| `settings` | Manage Settings | Manage system settings |

### Inventory Management
| Permission ID | Name | Description |
|--------------|------|-------------|
| `inventory_view` | View Inventory | View inventory levels and products |
| `inventory_add` | Add Products | Add new products to inventory |
| `inventory_edit` | Edit Products | Modify existing products |
| `inventory_delete` | Delete Products | Remove products from inventory |
| `inventory_adjust` | Adjust Stock | Adjust stock levels |
| `inventory_history` | View Stock History | View stock movement history |

### Customer Management
| Permission ID | Name | Description |
|--------------|------|-------------|
| `customers_view` | View Customers | View customer information |
| `customers_add` | Add Customers | Create new customers |
| `customers_edit` | Edit Customers | Modify customer details |
| `customers_delete` | Delete Customers | Remove customers |
| `customers_history` | View Customer History | View customer purchase history |

### Device & Repair Management
| Permission ID | Name | Description |
|--------------|------|-------------|
| `devices_view` | View Devices | View device repairs |
| `devices_add` | Add Devices | Register new device repairs |
| `devices_edit` | Edit Devices | Modify device repair information |
| `diagnostics` | Diagnostics | Perform device diagnostics |
| `spare_parts` | Spare Parts | Manage spare parts inventory |

### Financial Operations
| Permission ID | Name | Description |
|--------------|------|-------------|
| `sales_process` | Process Sales | Complete sales transactions |
| `sales_refund` | Process Refunds | Issue refunds to customers |
| `sales_discount` | Apply Discounts | Apply discounts to sales |
| `financial_reports` | Financial Reports | View financial reports |
| `pricing_manage` | Manage Pricing | Set and modify product prices |
| `payments_view` | View Payments | View payment transactions |

### User Management
| Permission ID | Name | Description |
|--------------|------|-------------|
| `users_view` | View Users | View user accounts |
| `users_create` | Create Users | Create new user accounts |
| `users_edit` | Edit Users | Modify user accounts |
| `users_delete` | Delete Users | Remove user accounts |
| `roles_manage` | Manage Roles | Manage user roles and permissions |

### System Administration
| Permission ID | Name | Description |
|--------------|------|-------------|
| `audit_logs` | View Audit Logs | View system audit logs |
| `backup_data` | Backup Data | Create data backups |
| `restore_data` | Restore Data | Restore from backups |
| `integrations` | Manage Integrations | Configure system integrations |
| `database_setup` | Database Setup | Manage database configuration |

### Additional Features
| Permission ID | Name | Description |
|--------------|------|-------------|
| `appointments` | Appointments | Manage appointments |
| `whatsapp` | WhatsApp Integration | Use WhatsApp features |
| `sms` | SMS Features | Send SMS messages |
| `loyalty` | Loyalty Program | Manage loyalty programs |
| `employees` | Employee Management | Manage employee records |

## Role Default Permissions

### Admin
```json
["all"]
```

### Manager
```json
[
  "dashboard", "pos", "reports",
  "inventory_view", "inventory_add", "inventory_edit", "inventory_adjust", "inventory_history",
  "customers_view", "customers_add", "customers_edit", "customers_history",
  "devices_view", "devices_add", "devices_edit",
  "sales_process", "sales_refund", "sales_discount",
  "financial_reports", "payments_view",
  "employees"
]
```

### Technician
```json
[
  "dashboard",
  "devices_view", "devices_add", "devices_edit",
  "diagnostics", "spare_parts",
  "customers_view", "inventory_view"
]
```

### Customer Care
```json
[
  "dashboard", "pos",
  "customers_view", "customers_add", "customers_edit", "customers_history",
  "devices_view", "devices_add",
  "diagnostics", "appointments",
  "whatsapp", "sms"
]
```

### User
```json
[
  "dashboard",
  "inventory_view",
  "customers_view"
]
```

## Checking Permissions in Code

### Example: Check if user can add products

```typescript
const hasPermission = user.permissions?.includes('inventory_add') || user.permissions?.includes('all');
```

### Example: Check multiple permissions

```typescript
const canManageInventory = user.permissions?.some(p => 
  ['inventory_add', 'inventory_edit', 'inventory_delete', 'all'].includes(p)
);
```

### Example: Check if admin (full access)

```typescript
const isAdmin = user.permissions?.includes('all') || user.role === 'admin';
```

## Using Permissions in Components

### Import permissions

```typescript
import { ALL_PERMISSIONS, ROLE_DEFAULT_PERMISSIONS } from '../components/CreateUserModal';
```

### Get all permission IDs

```typescript
const allPermissionIds = Object.values(ALL_PERMISSIONS)
  .flatMap(category => category.permissions.map(p => p.id));
```

### Get permissions for a category

```typescript
const inventoryPermissions = ALL_PERMISSIONS.inventory.permissions;
```

## Permission Hierarchy

```
all (Full Access)
  ├── General Access
  │   ├── dashboard
  │   ├── pos
  │   ├── reports
  │   └── settings
  ├── Inventory Management
  │   ├── inventory_view
  │   ├── inventory_add
  │   ├── inventory_edit
  │   ├── inventory_delete
  │   ├── inventory_adjust
  │   └── inventory_history
  ├── Customer Management
  │   ├── customers_view
  │   ├── customers_add
  │   ├── customers_edit
  │   ├── customers_delete
  │   └── customers_history
  ├── Device & Repair Management
  │   ├── devices_view
  │   ├── devices_add
  │   ├── devices_edit
  │   ├── diagnostics
  │   └── spare_parts
  ├── Financial Operations
  │   ├── sales_process
  │   ├── sales_refund
  │   ├── sales_discount
  │   ├── financial_reports
  │   ├── pricing_manage
  │   └── payments_view
  ├── User Management
  │   ├── users_view
  │   ├── users_create
  │   ├── users_edit
  │   ├── users_delete
  │   └── roles_manage
  ├── System Administration
  │   ├── audit_logs
  │   ├── backup_data
  │   ├── restore_data
  │   ├── integrations
  │   └── database_setup
  └── Additional Features
      ├── appointments
      ├── whatsapp
      ├── sms
      ├── loyalty
      └── employees
```

## Database Schema

### users table - permissions column

```sql
-- PostgreSQL JSON array
permissions jsonb DEFAULT '[]'::jsonb

-- Example values:
-- Admin: ["all"]
-- Manager: ["dashboard", "pos", "reports", "inventory_view", ...]
-- Custom: ["dashboard", "customers_view", "customers_add", "pos"]
```

## Best Practices

1. **Always check for 'all' permission first**
   ```typescript
   if (user.permissions?.includes('all')) {
     // User has full access
     return true;
   }
   ```

2. **Use descriptive permission names**
   - Use pattern: `{category}_{action}`
   - Examples: `inventory_add`, `customers_edit`, `users_delete`

3. **Group related permissions**
   - Keep permissions organized by functional area
   - Makes it easier to grant/revoke related permissions

4. **Document custom permission sets**
   - When creating custom permissions, document the business reason
   - Keep track of which users have non-standard permissions

5. **Regular permission audits**
   - Review user permissions periodically
   - Remove unnecessary permissions
   - Ensure principle of least privilege

## Common Permission Combinations

### Sales Staff
```json
["dashboard", "pos", "customers_view", "customers_add", "inventory_view", "sales_process"]
```

### Inventory Manager
```json
["dashboard", "inventory_view", "inventory_add", "inventory_edit", "inventory_adjust", "inventory_history", "reports"]
```

### Support Staff
```json
["dashboard", "customers_view", "customers_add", "customers_edit", "devices_view", "devices_add", "appointments"]
```

### Accountant
```json
["dashboard", "reports", "financial_reports", "payments_view", "sales_refund"]
```

---

**Last Updated**: October 22, 2025
**Total Permissions**: 50+
**Permission Categories**: 8


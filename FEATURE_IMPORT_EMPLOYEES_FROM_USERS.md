# Import Employees from Users Feature

## Overview
This feature allows you to easily create employee records from existing user accounts. This is useful when you have users in your system who need employee records to track additional HR information like salary, hire date, department details, and more.

## How to Use

### Accessing the Feature
1. Navigate to **Employee Management** page
2. Click the **"Import from Users"** button (purple button with UserPlus icon)
3. The Import modal will open showing all users in the system

### Importing Employees

#### Step 1: View Available Users
The modal displays all active users with the following information:
- Full name
- Email address
- Phone number
- Role
- Department
- Employee record status (whether they already have an employee record)

#### Step 2: Filter and Search
- **Search**: Type in the search box to filter by name, email, or role
- **Filter dropdown**: 
  - "All Users" - Show all users
  - "Without Employee Record" (default) - Show only users who don't have employee records
  - "With Employee Record" - Show users who already have employee records

#### Step 3: Select Users
- Click on individual users to select them
- Use the checkbox at the top to select/deselect all visible users
- Selected users are highlighted in blue
- Users with existing employee records are grayed out and cannot be selected

#### Step 4: Import
- Click the **"Import"** button at the bottom right
- The system will:
  - Create employee records for each selected user
  - Use the user's information (name, email, phone) as the base
  - Set default values:
    - Position: User's role
    - Department: User's department or "General"
    - Status: Active
    - Employment Type: Full-time
    - Salary: 0 (can be updated later)
    - Hire Date: Today's date
- After import, you'll see a success message with the count of imported employees

### After Import

Once employees are imported, you can:
1. Edit each employee record to add additional information:
   - Salary details
   - Emergency contacts
   - Address information
   - Skills
   - Performance ratings
   - And more...

2. The employee records are automatically linked to their user accounts via the `user_id` field

## Features

### Automatic Prevention of Duplicates
- Users who already have employee records are clearly marked
- Cannot select or import users who already have employee records
- Prevents accidental duplicate creation

### Bulk Import
- Select and import multiple users at once
- Progress feedback during import
- Error handling for individual import failures

### Smart Defaults
- Automatically splits full names into first and last names
- Uses existing user information (email, phone) 
- Sets sensible defaults for required fields
- All imported data can be edited later

## Technical Details

### Files Created/Modified
1. **New Component**: `src/features/employees/components/ImportEmployeesFromUsersModal.tsx`
   - Modal component with user selection interface
   - Handles the import logic
   
2. **Updated**: `src/features/employees/pages/EmployeeManagementPage.tsx`
   - Added "Import from Users" button
   - Integrated the import modal
   - Added success feedback

3. **Updated**: `src/features/employees/components/index.ts`
   - Exported the new modal component

### API Usage
- Uses `supabase.from('users')` to fetch user data
- Uses `supabase.from('employees')` to check for existing records
- Uses `employeeService.createEmployee()` to create new employee records

### Data Flow
```
Users Table → Import Modal → Employee Service → Employees Table
     ↓                                              ↓
User data fetched                           Employee record created
with user_id link                           with user_id reference
```

## Benefits

1. **Time-Saving**: Quickly create employee records without manually re-entering user information
2. **Consistency**: Ensures user and employee data stays in sync
3. **Easy Management**: Clear visibility of which users have employee records
4. **Flexible**: Import one or many users at once
5. **Safe**: Prevents duplicates and handles errors gracefully

## Future Enhancements

Potential improvements:
- Auto-sync user changes to employee records
- Bulk edit imported employees
- CSV export of import results
- Template-based imports with custom field mappings


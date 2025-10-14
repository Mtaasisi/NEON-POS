# ⭐ START HERE - Branch Feature Improvements

**Quick Start Guide to Complete Your Multi-Branch System**

---

## 📋 QUICK SUMMARY

Your branch system is **65% complete**. Here's what's missing:

### 🔴 **Critical (Must Build)**
1. **Stock Transfer UI** - Can't actually transfer stock between branches
2. **Branch Reports** - Can't see performance per branch
3. **User-Branch Assignments** - Can't assign users to specific branches via UI

### 🟡 **Important (Should Build)**
4. Activity log viewer
5. Branch-specific notifications
6. Enhanced branch selector with stats

---

## 🚀 FASTEST PATH TO PRODUCTION

### **Step 1: Build Stock Transfer System (PRIORITY #1)**

This is the **most critical** missing piece. Follow this order:

#### A. Create the API Layer

Create: `src/lib/branchTransferApi.ts`

```typescript
import { supabase } from './supabaseClient';

export interface TransferRequest {
  from_branch_id: string;
  to_branch_id: string;
  entity_type: string;
  entity_id: string;
  quantity: number;
  notes?: string;
  requested_by: string;
}

export const branchTransferApi = {
  // Create new transfer request
  createTransfer: async (transfer: TransferRequest) => {
    const { data, error } = await supabase
      .from('branch_transfers')
      .insert({
        ...transfer,
        transfer_type: 'stock',
        status: 'pending',
        requested_at: new Date().toISOString()
      })
      .select('*, from_branch:store_locations!from_branch_id(*), to_branch:store_locations!to_branch_id(*)')
      .single();

    if (error) throw error;
    return data;
  },

  // Get transfers for current branch
  getTransfers: async (branchId: string, status?: string) => {
    let query = supabase
      .from('branch_transfers')
      .select(`
        *,
        from_branch:store_locations!from_branch_id(name, code),
        to_branch:store_locations!to_branch_id(name, code),
        product:lats_products!entity_id(name, sku)
      `)
      .or(`from_branch_id.eq.${branchId},to_branch_id.eq.${branchId}`)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  // Approve transfer
  approveTransfer: async (transferId: string, approvedBy: string) => {
    const { data, error } = await supabase
      .from('branch_transfers')
      .update({
        status: 'approved',
        approved_by: approvedBy,
        approved_at: new Date().toISOString()
      })
      .eq('id', transferId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Complete transfer (updates inventory)
  completeTransfer: async (transferId: string) => {
    // First get transfer details
    const { data: transfer, error: fetchError } = await supabase
      .from('branch_transfers')
      .select('*')
      .eq('id', transferId)
      .single();

    if (fetchError) throw fetchError;
    if (!transfer) throw new Error('Transfer not found');

    // Update transfer status
    const { error: updateError } = await supabase
      .from('branch_transfers')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', transferId);

    if (updateError) throw updateError;

    // TODO: Update inventory quantities
    // This requires updating product variants for both branches
    // For now, this can be done manually or via a database function

    return transfer;
  },

  // Reject transfer
  rejectTransfer: async (transferId: string, reason: string) => {
    const { data, error } = await supabase
      .from('branch_transfers')
      .update({
        status: 'rejected',
        notes: reason
      })
      .eq('id', transferId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get pending approvals for a branch
  getPendingApprovals: async (branchId: string) => {
    const { data, error } = await supabase
      .from('branch_transfers')
      .select(`
        *,
        from_branch:store_locations!from_branch_id(name),
        to_branch:store_locations!to_branch_id(name),
        product:lats_products!entity_id(name, sku)
      `)
      .eq('from_branch_id', branchId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
};
```

#### B. Create the Main Transfer Page

Create: `src/features/branch-transfers/pages/BranchTransfersPage.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { branchTransferApi } from '../../../lib/branchTransferApi';
import { useBranch } from '../../../context/BranchContext';
import { Package, ArrowRight, Check, X, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const BranchTransfersPage = () => {
  const { currentBranch } = useBranch();
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, approved, completed

  useEffect(() => {
    if (currentBranch) {
      loadTransfers();
    }
  }, [currentBranch, filter]);

  const loadTransfers = async () => {
    try {
      setLoading(true);
      const filterStatus = filter === 'all' ? undefined : filter;
      const data = await branchTransferApi.getTransfers(currentBranch.id, filterStatus);
      setTransfers(data);
    } catch (error) {
      console.error('Error loading transfers:', error);
      toast.error('Failed to load transfers');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (transferId: string) => {
    try {
      await branchTransferApi.approveTransfer(transferId, 'current-user-id');
      toast.success('Transfer approved successfully');
      loadTransfers();
    } catch (error) {
      toast.error('Failed to approve transfer');
    }
  };

  const handleReject = async (transferId: string) => {
    const reason = prompt('Reason for rejection:');
    if (!reason) return;

    try {
      await branchTransferApi.rejectTransfer(transferId, reason);
      toast.success('Transfer rejected');
      loadTransfers();
    } catch (error) {
      toast.error('Failed to reject transfer');
    }
  };

  const handleComplete = async (transferId: string) => {
    try {
      await branchTransferApi.completeTransfer(transferId);
      toast.success('Transfer completed - Inventory updated');
      loadTransfers();
    } catch (error) {
      toast.error('Failed to complete transfer');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      in_transit: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
      </span>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'approved':
        return <Check className="w-5 h-5 text-blue-600" />;
      case 'completed':
        return <Check className="w-5 h-5 text-green-600" />;
      case 'rejected':
        return <X className="w-5 h-5 text-red-600" />;
      default:
        return <Package className="w-5 h-5 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Stock Transfers</h1>
        <p className="text-gray-600 mt-1">
          Manage inventory transfers for {currentBranch?.name}
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {['all', 'pending', 'approved', 'in_transit', 'completed'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Create Transfer Button */}
      <button
        onClick={() => {/* Open create modal */}}
        className="mb-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        + Request Transfer
      </button>

      {/* Transfers List */}
      <div className="space-y-4">
        {transfers.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No transfers found</p>
          </div>
        ) : (
          transfers.map((transfer) => (
            <div key={transfer.id} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  {/* Status Icon */}
                  <div className="mt-1">
                    {getStatusIcon(transfer.status)}
                  </div>

                  {/* Transfer Details */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-gray-900">
                        {transfer.product?.name || 'Product'}
                      </h3>
                      {getStatusBadge(transfer.status)}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <span className="font-medium">{transfer.from_branch?.name}</span>
                      <ArrowRight className="w-4 h-4" />
                      <span className="font-medium">{transfer.to_branch?.name}</span>
                    </div>

                    <p className="text-sm text-gray-600">
                      Quantity: <span className="font-medium">{transfer.quantity}</span> units
                    </p>

                    {transfer.notes && (
                      <p className="text-sm text-gray-500 mt-2 italic">
                        Note: {transfer.notes}
                      </p>
                    )}

                    <p className="text-xs text-gray-400 mt-2">
                      Requested: {new Date(transfer.requested_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {transfer.status === 'pending' && transfer.from_branch_id === currentBranch.id && (
                    <>
                      <button
                        onClick={() => handleApprove(transfer.id)}
                        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(transfer.id)}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                      >
                        Reject
                      </button>
                    </>
                  )}

                  {transfer.status === 'approved' && transfer.to_branch_id === currentBranch.id && (
                    <button
                      onClick={() => handleComplete(transfer.id)}
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                    >
                      Mark Received
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default BranchTransfersPage;
```

#### C. Add Route to App.tsx

```typescript
// In your App.tsx, add this route:
import BranchTransfersPage from './features/branch-transfers/pages/BranchTransfersPage';

// In your routes:
<Route path="/branch-transfers" element={<BranchTransfersPage />} />
```

#### D. Add to Sidebar Menu

```typescript
// In your sidebar component, add:
<SidebarItem
  icon={<ArrowRightLeft className="w-5 h-5" />}
  label="Stock Transfers"
  path="/branch-transfers"
/>
```

---

### **Step 2: Add Branch Filter to Reports (PRIORITY #2)**

Update your existing sales reports to include branch filtering:

#### A. Modify Sales Reports Page

Find your sales reports page and add:

```typescript
import { useBranch } from '../context/BranchContext';

const SalesReportsPage = () => {
  const { currentBranch, availableBranches, isDataShared } = useBranch();
  const [selectedBranch, setSelectedBranch] = useState(currentBranch?.id);

  // Add branch filter to your sales query
  const loadSalesData = async () => {
    let query = supabase
      .from('lats_sales')
      .select('*')
      .order('created_at', { ascending: false });

    // Only filter if not in shared mode
    if (!isDataShared('sales') && selectedBranch) {
      query = query.eq('branch_id', selectedBranch);
    }

    const { data, error } = await query;
    // ... rest of logic
  };

  // Add branch selector UI
  return (
    <div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Filter by Branch
        </label>
        <select
          value={selectedBranch}
          onChange={(e) => setSelectedBranch(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">All Branches</option>
          {availableBranches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
      </div>
      
      {/* Rest of your reports UI */}
    </div>
  );
};
```

#### B. Create Branch Performance Dashboard

Create: `src/features/reports/pages/BranchPerformanceReport.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const BranchPerformanceReport = () => {
  const [branchStats, setBranchStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBranchPerformance();
  }, []);

  const loadBranchPerformance = async () => {
    try {
      // Get sales by branch for last 30 days
      const { data: sales, error } = await supabase
        .from('lats_sales')
        .select(`
          total_amount,
          branch_id,
          store_locations (name, code)
        `)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      // Group by branch
      const stats = {};
      sales.forEach((sale) => {
        const branchName = sale.store_locations?.name || 'Unknown';
        if (!stats[branchName]) {
          stats[branchName] = {
            name: branchName,
            sales: 0,
            revenue: 0,
            count: 0
          };
        }
        stats[branchName].count++;
        stats[branchName].revenue += parseFloat(sale.total_amount) || 0;
      });

      setBranchStats(Object.values(stats));
    } catch (error) {
      console.error('Error loading branch performance:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Branch Performance (Last 30 Days)</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {branchStats.map((branch) => (
          <div key={branch.name} className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="font-medium text-gray-900 mb-2">{branch.name}</h3>
            <p className="text-2xl font-bold text-blue-600 mb-1">
              TSh {branch.revenue.toLocaleString()}
            </p>
            <p className="text-sm text-gray-600">
              {branch.count} transactions
            </p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-lg font-medium mb-4">Revenue Comparison</h2>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={branchStats}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="revenue" fill="#3b82f6" name="Revenue (TSh)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default BranchPerformanceReport;
```

---

### **Step 3: Quick Wins (Can Do in 1 Hour)**

#### A. Add Transfer Request Button in Inventory

In your inventory management page, add:

```typescript
<button
  onClick={() => {
    // Open transfer modal
    setShowTransferModal(true);
    setSelectedProduct(product);
  }}
  className="text-blue-600 hover:text-blue-700 text-sm"
>
  Transfer Stock
</button>
```

#### B. Show Branch Name in Page Headers

Update your page headers to show current branch:

```typescript
const PageHeader = () => {
  const { currentBranch } = useBranch();
  
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold">Your Page Title</h1>
      {currentBranch && (
        <p className="text-sm text-gray-600 mt-1">
          Viewing data for: <span className="font-medium">{currentBranch.name}</span>
        </p>
      )}
    </div>
  );
};
```

#### C. Add Pending Transfers Badge in Sidebar

```typescript
const { currentBranch } = useBranch();
const [pendingCount, setPendingCount] = useState(0);

useEffect(() => {
  if (currentBranch) {
    branchTransferApi.getPendingApprovals(currentBranch.id)
      .then(data => setPendingCount(data.length));
  }
}, [currentBranch]);

// In sidebar:
<SidebarItem
  icon={<ArrowRightLeft />}
  label="Stock Transfers"
  path="/branch-transfers"
  badge={pendingCount > 0 ? pendingCount : null}
/>
```

---

## 🧪 TESTING YOUR IMPROVEMENTS

### Test Stock Transfers

1. Switch to Branch A
2. Go to /branch-transfers
3. Click "Request Transfer"
4. Select product, quantity, destination branch
5. Submit request
6. Switch to Branch B
7. See pending transfer
8. Approve it
9. Switch back to Branch A
10. Mark as completed
11. Verify inventory was updated

### Test Reports

1. Go to Branch Performance Report
2. Verify it shows data for all branches
3. Check that numbers match database
4. Go to Sales Reports
5. Filter by different branches
6. Verify filtered data is correct

---

## 📚 FILES TO CREATE (SUMMARY)

| Priority | File | Purpose |
|---|---|---|
| 🔴 Critical | `src/lib/branchTransferApi.ts` | Transfer API functions |
| 🔴 Critical | `src/features/branch-transfers/pages/BranchTransfersPage.tsx` | Main transfers page |
| 🔴 Critical | Route in `App.tsx` | Add /branch-transfers route |
| 🟠 High | `src/features/reports/pages/BranchPerformanceReport.tsx` | Performance dashboard |
| 🟠 High | Update existing reports | Add branch filter |
| 🟡 Medium | `src/features/admin/components/UserBranchAssignmentManager.tsx` | User assignments |
| 🟢 Low | Various enhancements | Polish features |

---

## ⏱️ TIME ESTIMATES

| Task | Time | Difficulty |
|---|---|---|
| Transfer API | 2 hours | Easy |
| Transfer Page | 4 hours | Medium |
| Branch Reports | 4 hours | Easy |
| User Assignments | 3 hours | Easy |
| Testing | 2 hours | Easy |
| **Total** | **15 hours** | **Weekend project!** |

---

## 🎯 SUCCESS CRITERIA

After completing these improvements, you should be able to:

- ✅ Create stock transfer requests between branches
- ✅ Approve/reject transfer requests
- ✅ Track transfer status
- ✅ View branch performance comparison
- ✅ Filter sales reports by branch
- ✅ See which branch data belongs to
- ✅ Assign users to branches (if you build user management)

---

## 💡 PRO TIPS

1. **Start Small**: Build basic transfer page first, add features incrementally
2. **Test with Real Data**: Create some test transfers to ensure it works
3. **Use Existing Components**: Reuse your modal, button, and card components
4. **Add Logging**: Console.log everything during development
5. **Handle Errors**: Use try-catch and show user-friendly error messages
6. **Mobile Responsive**: Test on mobile - your POS might be used on tablets

---

## 🚀 READY TO BUILD?

Start with the Stock Transfer API:
1. Create `src/lib/branchTransferApi.ts` (copy code above)
2. Test it in console: `await branchTransferApi.getTransfers('branch-id')`
3. Build the page once API works
4. Add route and menu item
5. Test end-to-end workflow

**You got this!** 💪

---

**Need help?** Check the detailed analysis in `BRANCH-FEATURE-GAPS-ANALYSIS.md`


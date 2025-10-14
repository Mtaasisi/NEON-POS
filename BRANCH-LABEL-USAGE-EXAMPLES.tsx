/**
 * Branch Label Usage Examples
 * 
 * This file shows how to use the BranchLabel component
 * in different parts of your application
 */

import BranchLabel from './src/components/BranchLabel';

// ════════════════════════════════════════════════════════════════════════════
// EXAMPLE 1: Customer List/Table
// ════════════════════════════════════════════════════════════════════════════
const CustomerListExample = () => {
  return (
    <div className="customer-list">
      {customers.map(customer => (
        <div key={customer.id} className="customer-row">
          <div className="customer-info">
            <h3>{customer.name}</h3>
            <p>{customer.phone}</p>
            {/* Add branch label badge */}
            <BranchLabel 
              branchName={customer.createdByBranchName} 
              variant="badge" 
              size="sm" 
            />
          </div>
        </div>
      ))}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// EXAMPLE 2: Customer Detail Page
// ════════════════════════════════════════════════════════════════════════════
const CustomerDetailExample = () => {
  return (
    <div className="customer-detail">
      <div className="customer-header">
        <h1>{customer.name}</h1>
        {/* Subtle text variant */}
        <BranchLabel 
          branchName={customer.createdByBranchName}
          variant="text"
          size="sm"
        />
      </div>
      
      <div className="customer-meta">
        <div className="meta-item">
          <label>Created:</label>
          <span>{formatDate(customer.createdAt)}</span>
        </div>
        <div className="meta-item">
          <label>Branch:</label>
          <BranchLabel 
            branchName={customer.createdByBranchName}
            variant="icon"
            size="md"
          />
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// EXAMPLE 3: Customer Card Component
// ════════════════════════════════════════════════════════════════════════════
const CustomerCardExample = ({ customer }) => {
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{customer.name}</h3>
          <p className="text-sm text-gray-600">{customer.phone}</p>
        </div>
        {/* Badge in corner */}
        <BranchLabel 
          branchName={customer.createdByBranchName}
          variant="badge"
          size="sm"
        />
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Loyalty:</span>
          <span className="font-medium">{customer.loyaltyLevel}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Total Spent:</span>
          <span className="font-medium">{formatCurrency(customer.totalSpent)}</span>
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// EXAMPLE 4: Customer Search Results
// ════════════════════════════════════════════════════════════════════════════
const CustomerSearchResultsExample = () => {
  return (
    <div className="search-results">
      {searchResults.map(customer => (
        <div 
          key={customer.id}
          className="search-result-item p-3 hover:bg-gray-50 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">{customer.name}</div>
              <div className="text-sm text-gray-600">{customer.phone}</div>
            </div>
            {/* Small icon variant */}
            <BranchLabel 
              branchName={customer.createdByBranchName}
              variant="icon"
              size="sm"
            />
          </div>
        </div>
      ))}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// EXAMPLE 5: Customer Modal/Popup
// ════════════════════════════════════════════════════════════════════════════
const CustomerModalExample = () => {
  return (
    <div className="modal">
      <div className="modal-header border-b pb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">{customer.name}</h2>
          <BranchLabel 
            branchName={customer.createdByBranchName}
            variant="badge"
            size="md"
          />
        </div>
      </div>
      
      <div className="modal-body py-4">
        {/* Customer details */}
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// EXAMPLE 6: Data Table with Branch Column
// ════════════════════════════════════════════════════════════════════════════
const CustomerTableExample = () => {
  return (
    <table className="min-w-full">
      <thead>
        <tr>
          <th>Name</th>
          <th>Phone</th>
          <th>Email</th>
          <th>Branch</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {customers.map(customer => (
          <tr key={customer.id}>
            <td>{customer.name}</td>
            <td>{customer.phone}</td>
            <td>{customer.email}</td>
            <td>
              <BranchLabel 
                branchName={customer.createdByBranchName}
                variant="text"
                size="sm"
              />
            </td>
            <td>
              <button>Edit</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// EXAMPLE 7: Conditional Rendering (Only Show if Branch Exists)
// ════════════════════════════════════════════════════════════════════════════
const ConditionalExample = ({ customer }) => {
  return (
    <div className="customer-info">
      <h3>{customer.name}</h3>
      
      {/* BranchLabel handles null/undefined automatically */}
      <BranchLabel 
        branchName={customer.createdByBranchName}
        variant="badge"
      />
      
      {/* Or you can check manually */}
      {customer.createdByBranchName && (
        <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
          <span>Customer acquired by:</span>
          <BranchLabel 
            branchName={customer.createdByBranchName}
            variant="text"
          />
        </div>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// EXAMPLE 8: Custom Styling
// ════════════════════════════════════════════════════════════════════════════
const CustomStyledExample = () => {
  return (
    <div>
      {/* Add custom classes */}
      <BranchLabel 
        branchName={customer.createdByBranchName}
        variant="badge"
        className="shadow-md hover:shadow-lg transition-shadow"
      />
      
      {/* Different sizes */}
      <BranchLabel branchName="ARUSHA" variant="badge" size="sm" />
      <BranchLabel branchName="Main Store" variant="badge" size="md" />
      <BranchLabel branchName="Airport Branch" variant="badge" size="lg" />
    </div>
  );
};

export {
  CustomerListExample,
  CustomerDetailExample,
  CustomerCardExample,
  CustomerSearchResultsExample,
  CustomerModalExample,
  CustomerTableExample,
  ConditionalExample,
  CustomStyledExample
};


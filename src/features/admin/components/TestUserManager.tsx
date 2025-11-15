import React, { useState, useEffect } from 'react';
import { User, Plus, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { toast } from 'react-hot-toast';

interface TestUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

const TestUserManager: React.FC = () => {
  const [users, setUsers] = useState<TestUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, role')
        .neq('role', 'admin')
        .order('full_name');

      if (error) throw error;

      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const createTestUsers = async () => {
    setCreating(true);

    const testUsers = [
      { email: 'technician@test.com', full_name: 'John Technician', role: 'technician' },
      { email: 'customer.care@test.com', full_name: 'Sarah Customer Care', role: 'customer-care' },
      { email: 'sales@test.com', full_name: 'Mike Sales', role: 'sales' },
      { email: 'manager@test.com', full_name: 'Lisa Manager', role: 'manager' },
      { email: 'user@test.com', full_name: 'Alex User', role: 'user' }
    ];

    let successCount = 0;
    let skipCount = 0;

    for (const userData of testUsers) {
      try {
        // Check if user already exists
        const { data: existing } = await supabase
          .from('users')
          .select('id')
          .eq('email', userData.email)
          .single();

        if (existing) {
          console.log(`User ${userData.email} already exists`);
          skipCount++;
          continue;
        }

        // Create test user record
        // Note: These are test users for impersonation only
        // In production, you'd need proper Supabase Auth user creation
        const { error: userError } = await supabase
          .from('users')
          .insert({
            full_name: userData.full_name,
            email: userData.email,
            role: userData.role,
            is_active: true
          });

        if (userError) {
          console.error(`Failed to create ${userData.email}:`, userError);
        } else {
          console.log(`Created ${userData.email}`);
          successCount++;
        }

      } catch (error) {
        console.error(`Error creating ${userData.email}:`, error);
      }
    }

    if (successCount > 0) {
      toast.success(`Created ${successCount} test users`);
      loadUsers(); // Refresh the list
    }

    if (skipCount > 0) {
      toast(`Skipped ${skipCount} existing users`, { icon: 'ℹ️' });
    }

    setCreating(false);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'technician': return 'bg-blue-100 text-blue-800';
      case 'customer-care': return 'bg-green-100 text-green-800';
      case 'sales': return 'bg-yellow-100 text-yellow-800';
      case 'manager': return 'bg-purple-100 text-purple-800';
      case 'user': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Test User Management</h2>
              <p className="text-gray-600 mt-1">Create and manage test users for impersonation testing</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={loadUsers}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <button
                onClick={createTestUsers}
                disabled={creating}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {creating ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Create Test Users
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {users.length === 0 ? (
            <div className="text-center py-12">
              <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Test Users Found</h3>
              <p className="text-gray-600 mb-4">Create test users to test the impersonation feature</p>
              <button
                onClick={createTestUsers}
                disabled={creating}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {creating ? (
                  <RefreshCw className="w-4 h-5 animate-spin" />
                ) : (
                  <Plus className="w-5 h-5" />
                )}
                Create Test Users
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Available Test Users ({users.length})</h3>
                <div className="text-sm text-gray-600">
                  Use the user selector in TopBar to test impersonation
                </div>
              </div>

              <div className="grid gap-4">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{user.full_name}</h4>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                        {user.role.replace('-', ' ')}
                      </span>
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">How to Test Impersonation:</h4>
                <ol className="text-sm text-blue-800 space-y-1">
                  <li>1. Click the purple user icon in the TopBar (next to branch selector)</li>
                  <li>2. Select any user from the dropdown</li>
                  <li>3. You'll see the app from their perspective</li>
                  <li>4. Try creating a Daily Report to see role-specific templates</li>
                  <li>5. Click "Stop Testing" to return to admin account</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestUserManager;

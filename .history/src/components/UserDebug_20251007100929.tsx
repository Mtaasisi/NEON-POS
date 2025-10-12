import React from 'react';
import { useAuth } from '../context/AuthContext';

const UserDebug: React.FC = () => {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <div>No user data</div>;
  }

  return (
    <div className="fixed top-4 left-4 bg-black text-white p-4 rounded-lg text-xs max-w-md z-50">
      <h3 className="font-bold mb-2">User Debug Info</h3>
      <div className="space-y-1">
        <div><strong>Email:</strong> {currentUser.email}</div>
        <div><strong>Name:</strong> {currentUser.name}</div>
        <div><strong>Role:</strong> {currentUser.role}</div>
        <div><strong>Active:</strong> {currentUser.isActive ? 'Yes' : 'No'}</div>
        <div><strong>Permissions:</strong> {JSON.stringify(currentUser.permissions)}</div>
        <div><strong>Raw Data:</strong> {JSON.stringify(currentUser, null, 2)}</div>
      </div>
    </div>
  );
};

export default UserDebug;

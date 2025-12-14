import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileLayout from '../components/MobileLayout';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Edit,
  LogOut,
  ChevronRight,
  Bell,
  Lock,
  HelpCircle,
  FileText,
  Shield,
  Award
} from 'lucide-react';
import toast from 'react-hot-toast';
import customerPortalService from '../services/customerPortalService';
import { useLoadingJob } from '../../../hooks/useLoadingJob';

interface CustomerProfile {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  profileImage?: string;
}

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { startLoading, completeLoading, failLoading } = useLoadingJob();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<CustomerProfile | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const jobId = startLoading('Loading profile...');
    
    try {
      setLoading(true);
      const customerId = localStorage.getItem('customer_id');
      
      if (!customerId) {
        navigate('/customer-portal/login');
        return;
      }

      const data = await customerPortalService.getCustomerById(customerId);

      if (!data) throw new Error('Customer not found');

      const profileData: CustomerProfile = {
        name: data.name,
        phone: data.phone,
        email: data.email,
        address: data.address,
        profileImage: data.profile_image
      };

      setProfile(profileData);
      setEditedProfile(profileData);
      completeLoading(jobId);
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load profile');
      failLoading(jobId, 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!editedProfile) return;

    const jobId = startLoading('Saving profile...');

    try {
      const customerId = localStorage.getItem('customer_id');
      if (!customerId) return;

      const result = await customerPortalService.updateCustomerProfile(customerId, {
        name: editedProfile.name,
        email: editedProfile.email,
        address: editedProfile.address
      });

      if (!result.success) throw new Error(result.error);

      setProfile(editedProfile);
      setIsEditing(false);
      toast.success('Profile updated successfully');
      completeLoading(jobId);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
      failLoading(jobId, 'Failed to save profile');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('customer_id');
    toast.success('Logged out successfully');
    navigate('/customer-portal/login');
  };

  const menuItems = [
    {
      icon: Award,
      label: 'Loyalty & Rewards',
      value: 'View points and redeem rewards',
      action: () => navigate('/customer-portal/loyalty')
    },
    {
      icon: Bell,
      label: 'Notifications',
      value: 'Manage your notifications',
      action: () => navigate('/customer-portal/notifications')
    },
    {
      icon: Lock,
      label: 'Privacy & Security',
      value: 'Password and security settings',
      action: () => toast('Feature coming soon')
    },
    {
      icon: HelpCircle,
      label: 'Help & Support',
      value: 'Get help with your account',
      action: () => toast('Contact us at +255 712 345 678')
    },
    {
      icon: FileText,
      label: 'Terms & Conditions',
      value: 'Read our terms',
      action: () => toast('Feature coming soon')
    },
    {
      icon: Shield,
      label: 'Privacy Policy',
      value: 'Read our privacy policy',
      action: () => toast('Feature coming soon')
    }
  ];

  if (loading) {
    return (
      <MobileLayout title="Profile">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </MobileLayout>
    );
  }

  if (!profile) {
    return (
      <MobileLayout title="Profile">
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <p className="text-gray-600 mb-4">Please login to view your profile</p>
          <button
            onClick={() => navigate('/customer-portal/login')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium"
          >
            Login
          </button>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="Profile">
      {/* Profile Header */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 pb-8">
        <div className="flex flex-col items-center">
          {/* Profile Image */}
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-4 shadow-lg">
            {profile.profileImage ? (
              <img
                src={profile.profileImage}
                alt={profile.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <User size={48} className="text-blue-600" />
            )}
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-1">{profile.name}</h2>
          <p className="text-blue-100">{profile.phone}</p>
        </div>
      </div>

      {/* Edit Profile Section */}
      {!isEditing ? (
        <div className="px-4 py-6 space-y-4">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Personal Information</h3>
              <button
                onClick={() => setIsEditing(true)}
                className="text-blue-600 font-medium flex items-center gap-1"
              >
                <Edit size={18} />
                Edit
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <User size={20} className="text-gray-400 mt-1" />
                <div className="flex-1">
                  <div className="text-sm text-gray-600">Full Name</div>
                  <div className="font-medium text-gray-900">{profile.name}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone size={20} className="text-gray-400 mt-1" />
                <div className="flex-1">
                  <div className="text-sm text-gray-600">Phone Number</div>
                  <div className="font-medium text-gray-900">{profile.phone}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail size={20} className="text-gray-400 mt-1" />
                <div className="flex-1">
                  <div className="text-sm text-gray-600">Email</div>
                  <div className="font-medium text-gray-900">{profile.email || 'Not provided'}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin size={20} className="text-gray-400 mt-1" />
                <div className="flex-1">
                  <div className="text-sm text-gray-600">Address</div>
                  <div className="font-medium text-gray-900">{profile.address || 'Not provided'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Edit Form */
        <div className="px-4 py-6">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Edit Profile</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  value={editedProfile?.name || ''}
                  onChange={(e) => setEditedProfile(prev => prev ? { ...prev, name: e.target.value } : null)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={editedProfile?.email || ''}
                  onChange={(e) => setEditedProfile(prev => prev ? { ...prev, email: e.target.value } : null)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                <textarea
                  value={editedProfile?.address || ''}
                  onChange={(e) => setEditedProfile(prev => prev ? { ...prev, address: e.target.value } : null)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setEditedProfile(profile);
                    setIsEditing(false);
                  }}
                  className="flex-1 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Menu Items */}
      <div className="px-4 pb-4">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={index}
                onClick={item.action}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors border-b border-gray-100 last:border-b-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Icon size={20} className="text-gray-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">{item.label}</div>
                    <div className="text-xs text-gray-600">{item.value}</div>
                  </div>
                </div>
                <ChevronRight size={20} className="text-gray-400" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Logout Button */}
      <div className="px-4 pb-8">
        <button
          onClick={handleLogout}
          className="w-full py-4 bg-red-50 text-red-600 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 active:scale-95 transition-all"
        >
          <LogOut size={20} />
          Logout
        </button>
      </div>
    </MobileLayout>
  );
};

export default ProfilePage;


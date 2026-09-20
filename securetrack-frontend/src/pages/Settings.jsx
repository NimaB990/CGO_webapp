import React, { useState, useEffect } from 'react';
import { User, Bell, Shield, Globe, Mail, Phone, CheckCircle, Key, Lock, Upload, Trash2 } from 'lucide-react';
import api from '../api';
import { applyUserPreferences, getStoredLanguage, getStoredTimezone } from '../userPreferences';

const TABS = [
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'security', label: 'Security', icon: Shield },
  { key: 'preferences', label: 'Preferences', icon: Globe },
];

function Settings() {
  const [activeTab, setActiveTab] = useState('profile');

  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [profileImage, setProfileImage] = useState('');

  
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [systemAlerts, setSystemAlerts] = useState(true);

  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);

  
  const [language, setLanguage] = useState(() => getStoredLanguage());
  const [timezone, setTimezone] = useState(() => getStoredTimezone());

  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState('');

  
  useEffect(() => {
    applyUserPreferences(getStoredLanguage(), getStoredTimezone());

    const fetchProfile = async () => {
      try {
        const response = await api.get('/api/users/me');
        const data = response.data;
        
        setFirstName(data.firstName || '');
        setLastName(data.lastName || '');
        setEmail(data.email || '');
        setPhone(data.phone || '');
        setProfileImage(data.profileImage || localStorage.getItem('securetrack-profile-image') || '');
        
        setEmailAlerts(data.emailAlerts ?? true);
        setSmsAlerts(data.smsAlerts ?? false);
        setSystemAlerts(data.systemAlerts ?? true);
        
        setTwoFactorAuth(data.twoFactorAuth ?? false);
        const savedLanguage = localStorage.getItem('securetrack-language') || data.language || 'English';
        const savedTimezone = localStorage.getItem('securetrack-timezone') || data.timezone || 'Asia/Colombo';
        setLanguage(savedLanguage);
        setTimezone(savedTimezone);
        applyUserPreferences(savedLanguage, savedTimezone);
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleLanguageChange = (event) => {
    const nextLanguage = event.target.value;
    setLanguage(nextLanguage);
    applyUserPreferences(nextLanguage, timezone);
  };

  const handleTimezoneChange = (event) => {
    const nextTimezone = event.target.value;
    setTimezone(nextTimezone);
    applyUserPreferences(language, nextTimezone);
  };

  const handleProfileImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('Please select an image smaller than 2 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const imageData = String(reader.result);
      setProfileImage(imageData);
      localStorage.setItem('securetrack-profile-image', imageData);
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleRemoveProfileImage = () => {
    setProfileImage('');
    localStorage.removeItem('securetrack-profile-image');
  };

  
  const handleSave = async (e, section) => {
    e.preventDefault();
    setIsSaving(true);
    if (section === 'preferences') {
      applyUserPreferences(language, timezone);
    }
    
    try {
      
      if (section === 'security' && newPassword) {
        if (newPassword !== confirmPassword) {
          alert("New passwords do not match!");
          setIsSaving(false);
          return;
        }
        await api.post('/api/users/me/password', { currentPassword, newPassword });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }

      
      await api.put('/api/users/me', { 
        firstName, lastName, email, phone,
        emailAlerts, smsAlerts, systemAlerts,
        twoFactorAuth, language, timezone
      });

      setShowSuccess(section);
      setTimeout(() => setShowSuccess(''), 3000);
    } catch (error) {
      console.error("Error updating settings:", error);
      if(section === 'security') alert("Failed to update password. Check your current password.");
    } finally {
      setIsSaving(false);
    }
  };

  const initials = `${firstName.charAt(0) || ''}${lastName.charAt(0) || ''}`.toUpperCase();

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500">Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
        <p className="mt-1 text-sm text-slate-500">Manage your account and system preferences</p>
      </div>

      
      <div className="border-b border-gray-200">
        <nav className="flex flex-wrap gap-6">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 border-b-2 pb-3 text-sm font-medium transition-colors ${
                activeTab === key
                  ? 'border-[#0B3A5A] text-[#0B3A5A]'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>
      </div>

      
      {activeTab === 'profile' && (
        <div className="rounded-xl bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <h3 className="font-semibold text-slate-900">Personal Information</h3>
            {showSuccess === 'profile' && (
              <span className="flex items-center gap-1 text-sm font-medium text-green-600">
                <CheckCircle size={16} /> Saved Successfully!
              </span>
            )}
          </div>
          <form className="px-6 py-8" onSubmit={(e) => handleSave(e, 'profile')}>
            <div className="mb-8 flex flex-col items-center justify-center gap-3">
              {profileImage ? (
                <img src={profileImage} alt="Profile" className="h-20 w-20 rounded-full object-cover ring-4 ring-slate-100" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#0B3A5A] text-xl font-semibold text-white">
                  {initials}
                </div>
              )}
              <div className="flex items-center gap-2">
                <label htmlFor="profile-image" className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50">
                  <Upload size={14} />
                  Change photo
                </label>
                <input id="profile-image" type="file" accept="image/*" onChange={handleProfileImageChange} className="sr-only" />
                {profileImage && (
                  <button type="button" onClick={handleRemoveProfileImage} className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-50">
                    <Trash2 size={14} />
                    Remove
                  </button>
                )}
              </div>
            </div>
            <div className="mx-auto grid max-w-xl grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">First Name</label>
                <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-slate-900 focus:border-[#0B3A5A] focus:outline-none focus:ring-2 focus:ring-[#0B3A5A]/15" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Last Name</label>
                <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-slate-900 focus:border-[#0B3A5A] focus:outline-none focus:ring-2 focus:ring-[#0B3A5A]/15" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Email Address</label>
                <div className="relative">
                  <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm text-slate-900 focus:border-[#0B3A5A] focus:outline-none focus:ring-2 focus:ring-[#0B3A5A]/15" />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Phone Number</label>
                <div className="relative">
                  <Phone size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm text-slate-900 focus:border-[#0B3A5A] focus:outline-none focus:ring-2 focus:ring-[#0B3A5A]/15" />
                </div>
              </div>
            </div>
            <div className="mx-auto mt-8 flex max-w-xl justify-end">
              <button type="submit" disabled={isSaving} className="rounded-lg bg-[#0B3A5A] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0a2f4a] disabled:opacity-70">
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      
      {activeTab === 'notifications' && (
        <div className="rounded-xl bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <h3 className="font-semibold text-slate-900">Alert Preferences</h3>
            {showSuccess === 'notifications' && (
              <span className="flex items-center gap-1 text-sm font-medium text-green-600">
                <CheckCircle size={16} /> Preferences Saved!
              </span>
            )}
          </div>
          <form className="px-6 py-8" onSubmit={(e) => handleSave(e, 'notifications')}>
            <div className="mx-auto max-w-xl space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-slate-900">Email Notifications</h4>
                  <p className="text-xs text-slate-500">Receive high-severity alerts via email.</p>
                </div>
                <input type="checkbox" checked={emailAlerts} onChange={(e) => setEmailAlerts(e.target.checked)} className="h-5 w-5 accent-[#0B3A5A]" />
              </div>
              <hr className="border-gray-100" />
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-slate-900">SMS Notifications</h4>
                  <p className="text-xs text-slate-500">Get text messages for critical security breaches (e.g., Seal Broken).</p>
                </div>
                <input type="checkbox" checked={smsAlerts} onChange={(e) => setSmsAlerts(e.target.checked)} className="h-5 w-5 accent-[#0B3A5A]" />
              </div>
              <hr className="border-gray-100" />
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-slate-900">In-System Alerts</h4>
                  <p className="text-xs text-slate-500">Show notification popups inside the dashboard.</p>
                </div>
                <input type="checkbox" checked={systemAlerts} onChange={(e) => setSystemAlerts(e.target.checked)} className="h-5 w-5 accent-[#0B3A5A]" />
              </div>
            </div>
            <div className="mx-auto mt-8 flex max-w-xl justify-end">
              <button type="submit" disabled={isSaving} className="rounded-lg bg-[#0B3A5A] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0a2f4a] disabled:opacity-70">
                {isSaving ? 'Saving...' : 'Update Notifications'}
              </button>
            </div>
          </form>
        </div>
      )}

      
      {activeTab === 'security' && (
        <div className="rounded-xl bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <h3 className="font-semibold text-slate-900">Password & Security</h3>
            {showSuccess === 'security' && (
              <span className="flex items-center gap-1 text-sm font-medium text-green-600">
                <CheckCircle size={16} /> Security Updated!
              </span>
            )}
          </div>
          <form className="px-6 py-8" onSubmit={(e) => handleSave(e, 'security')}>
            <div className="mx-auto max-w-xl space-y-5">
              
              <div className="mb-6 rounded-lg bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  <Lock className="text-blue-600 mt-0.5" size={20} />
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">Two-Factor Authentication (2FA)</h4>
                    <p className="mt-1 text-xs text-blue-700">Add an extra layer of security to your account.</p>
                  </div>
                  <div className="ml-auto">
                    <input type="checkbox" checked={twoFactorAuth} onChange={(e) => setTwoFactorAuth(e.target.checked)} className="h-5 w-5 accent-blue-600" />
                  </div>
                </div>
              </div>

              <h4 className="text-sm font-semibold text-slate-900 pb-2 border-b border-gray-100">Change Password</h4>
              
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Current Password</label>
                <div className="relative">
                  <Key size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm text-slate-900 focus:border-[#0B3A5A] focus:outline-none focus:ring-2 focus:ring-[#0B3A5A]/15" />
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">New Password</label>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-slate-900 focus:border-[#0B3A5A] focus:outline-none focus:ring-2 focus:ring-[#0B3A5A]/15" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Confirm Password</label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-slate-900 focus:border-[#0B3A5A] focus:outline-none focus:ring-2 focus:ring-[#0B3A5A]/15" />
                </div>
              </div>
            </div>
            <div className="mx-auto mt-8 flex max-w-xl justify-end">
              <button type="submit" disabled={isSaving} className="rounded-lg bg-[#0B3A5A] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0a2f4a] disabled:opacity-70">
                {isSaving ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      )}

      
      {activeTab === 'preferences' && (
        <div className="rounded-xl bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <h3 className="font-semibold text-slate-900">System Preferences</h3>
            {showSuccess === 'preferences' && (
              <span className="flex items-center gap-1 text-sm font-medium text-green-600">
                <CheckCircle size={16} /> Preferences Saved!
              </span>
            )}
          </div>
          <form className="px-6 py-8" onSubmit={(e) => handleSave(e, 'preferences')}>
            <div className="mx-auto grid max-w-xl grid-cols-1 gap-6">
              
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">System Language</label>
                <select value={language} onChange={handleLanguageChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-slate-900 focus:border-[#0B3A5A] focus:outline-none focus:ring-2 focus:ring-[#0B3A5A]/15">
                  <option value="English">English</option>
                  <option value="Sinhala">සිංහල (Sinhala)</option>
                  <option value="Tamil">தமிழ் (Tamil)</option>
                </select>
                <p className="mt-1.5 text-xs text-slate-500">Choose the language for the dashboard interface.</p>
              </div>

              <hr className="border-gray-100" />

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Timezone</label>
                <select value={timezone} onChange={handleTimezoneChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-slate-900 focus:border-[#0B3A5A] focus:outline-none focus:ring-2 focus:ring-[#0B3A5A]/15">
                  <option value="Asia/Colombo">Asia/Colombo (IST)</option>
                  <option value="UTC">UTC (Universal Time)</option>
                  <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                </select>
                <p className="mt-1.5 text-xs text-slate-500">All container tracking times will be displayed in this timezone.</p>
              </div>

            </div>
            <div className="mx-auto mt-8 flex max-w-xl justify-end">
              <button type="submit" disabled={isSaving} className="rounded-lg bg-[#0B3A5A] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0a2f4a] disabled:opacity-70">
                {isSaving ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default Settings;
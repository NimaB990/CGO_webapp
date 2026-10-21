import React, { useState } from 'react';
import { ShieldCheck, AlertCircle, CheckCircle2, LayoutDashboard, Radio } from 'lucide-react';
import api from '../api';
import ActiveModulesTab from '../components/ActiveModulesTab';

function InspectorDashboard() {
  // Navigation Tab State ('overview' | 'active-units')
  const [currentTab, setCurrentTab] = useState('overview');

  // IoT Module Registration States
  const [deviceUid, setDeviceUid] = useState('');
  const [deviceStatus, setDeviceStatus] = useState('ACTIVE');
  const [pairingStatus, setPairingStatus] = useState(null);
  const [isPairingLoading, setIsPairingLoading] = useState(false);

  // RFID Unlock States
  const [rfidContainer, setRfidContainer] = useState('');
  const [rfidTag, setRfidTag] = useState('');
  const [unlockStatus, setUnlockStatus] = useState(null);
  const [isUnlockLoading, setIsUnlockLoading] = useState(false);

  // Handle IoT Device Registration / Pairing
  const handleRegisterDevice = async (e) => {
    e.preventDefault();
    setPairingStatus(null);
    
    if (!deviceUid.trim()) {
      setPairingStatus({ type: 'error', message: 'Please enter a valid Device UID.' });
      return;
    }

    setIsPairingLoading(true);
    try {
      await api.post('/api/iot-modules/register', {
        deviceUid: deviceUid.trim(),
        status: deviceStatus,
      });
      setPairingStatus({ type: 'success', message: 'IoT Module registered successfully!' });
      setDeviceUid('');
    } catch (error) {
      console.error('Registration failed:', error);
      const errMsg = error.response?.data?.message || 'Failed to register IoT module. Device UID may already exist.';
      setPairingStatus({ type: 'error', message: errMsg });
    } finally {
      setIsPairingLoading(false);
    }
  };

  // Handle RFID Unlock
  const handleRfidUnlock = async (e) => {
    e.preventDefault();
    setUnlockStatus(null);

    if (!rfidContainer.trim() || !rfidTag.trim()) {
      setUnlockStatus({ type: 'error', message: 'Please enter both Container Number and RFID Tag.' });
      return;
    }

    setIsUnlockLoading(true);
    try {
      await api.post('/api/rfid/unlock', {
        containerNumber: rfidContainer.trim().toUpperCase(),
        rfidTag: rfidTag.trim(),
      });
      setUnlockStatus({ type: 'success', message: 'Container unlocked successfully via RFID!' });
    } catch (error) {
      console.error('RFID unlock failed:', error);
      setUnlockStatus({ type: 'error', message: 'Unauthorized RFID tag or connection error.' });
    } finally {
      setIsUnlockLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Navigation Tabs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Field Inspector Dashboard</h2>
          <p className="mt-1 text-sm text-slate-500">Manage IoT module registrations, active fleet units, and container access.</p>
        </div>

        {/* Inspector Navigation Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setCurrentTab('overview')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
              currentTab === 'overview'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard size={15} />
            Field Actions
          </button>

          <button
            onClick={() => setCurrentTab('active-units')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
              currentTab === 'active-units'
                ? 'bg-[#0B3A5A] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Radio size={15} />
            Active IoT Units
          </button>
        </div>
      </div>

      {/* --- TAB 1: FIELD ACTIONS (Registration & RFID Unlock) --- */}
      {currentTab === 'overview' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          
          {/* IoT Module Registration Section */}
          <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-100">
            <div className="mb-4">
              <h3 className="font-semibold text-slate-900">IoT Module Registration</h3>
              <p className="text-xs text-slate-500">Register new ESP32 / Tracking modules</p>
            </div>

            <form onSubmit={handleRegisterDevice} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Device UID</label>
                <input
                  type="text"
                  value={deviceUid}
                  onChange={(e) => setDeviceUid(e.target.value)}
                  placeholder="e.g. ESP32-DEV-001"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-slate-900 focus:border-[#0B3A5A] focus:outline-none focus:ring-2 focus:ring-[#0B3A5A]/15"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Module Status</label>
                <select
                  value={deviceStatus}
                  onChange={(e) => setDeviceStatus(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-slate-900 focus:border-[#0B3A5A] focus:outline-none focus:ring-2 focus:ring-[#0B3A5A]/15 bg-white"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>

              {pairingStatus && (
                <div className={`rounded-lg p-3 text-sm flex items-center gap-2 ${pairingStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                  {pairingStatus.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span>{pairingStatus.message}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isPairingLoading}
                className="w-full rounded-lg bg-[#0B3A5A] py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#092f49] disabled:opacity-70"
              >
                {isPairingLoading ? 'Registering Module...' : 'Register IoT Module'}
              </button>
            </form>
          </div>

          {/* RFID / Digital Access Control Section */}
          <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-100">
            <div className="mb-4">
              <h3 className="font-semibold text-slate-900">RFID Access & Unlock</h3>
              <p className="text-xs text-slate-500">Authorize container lock status via RFID tag</p>
            </div>

            <form onSubmit={handleRfidUnlock} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Container Number</label>
                <input
                  type="text"
                  value={rfidContainer}
                  onChange={(e) => setRfidContainer(e.target.value)}
                  placeholder="e.g. CONT-9876"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-slate-900 focus:border-[#0B3A5A] focus:outline-none focus:ring-2 focus:ring-[#0B3A5A]/15"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">RFID Tag Code</label>
                <input
                  type="text"
                  value={rfidTag}
                  onChange={(e) => setRfidTag(e.target.value)}
                  placeholder="e.g. TAG-12345"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-slate-900 focus:border-[#0B3A5A] focus:outline-none focus:ring-2 focus:ring-[#0B3A5A]/15"
                />
              </div>

              {unlockStatus && (
                <div className={`rounded-lg p-3 text-sm flex items-center gap-2 ${unlockStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                  {unlockStatus.type === 'success' ? <ShieldCheck size={16} /> : <AlertCircle size={16} />}
                  <span>{unlockStatus.message}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isUnlockLoading}
                className="w-full rounded-lg bg-[#0B3A5A] py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#092f49] disabled:opacity-70"
              >
                {isUnlockLoading ? 'Processing RFID...' : 'Verify & Unlock Container'}
              </button>
            </form>
          </div>

        </div>
      )}

      {/* --- TAB 2: ACTIVE IOT UNITS TAB --- */}
      {currentTab === 'active-units' && (
        <div className="rounded-xl bg-white p-2 shadow-sm border border-slate-100">
          <ActiveModulesTab />
        </div>
      )}
    </div>
  );
}

export default InspectorDashboard;
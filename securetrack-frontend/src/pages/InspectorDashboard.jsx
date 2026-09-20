import React, { useState } from 'react';
import { Cpu, Key, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../api';

function InspectorDashboard() {
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
      // IoTModuleController හි ඇති /api/iot-modules/register වෙත ඉල්ලීම යැවීම
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
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Field Inspector Dashboard</h2>
        <p className="mt-1 text-sm text-slate-500">Manage IoT module registrations and container RFID access control.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        
        {/* --- 1. IoT Module Registration Section --- */}
        <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-lg bg-sky-50 p-2.5 text-[#0B3A5A]">
              <Cpu size={22} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">IoT Module Registration</h3>
              <p className="text-xs text-slate-500">Register new ESP32 / Tracking modules</p>
            </div>
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

        {/* --- 2. RFID / Digital Access Control Section --- */}
        <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-lg bg-amber-50 p-2.5 text-amber-600">
              <Key size={22} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">RFID Access & Unlock</h3>
              <p className="text-xs text-slate-500">Authorize container lock status via RFID tag</p>
            </div>
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
              className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 disabled:opacity-70"
            >
              {isUnlockLoading ? 'Processing RFID...' : 'Verify & Unlock Container'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}

export default InspectorDashboard;
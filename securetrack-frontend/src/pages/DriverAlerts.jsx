import React from 'react';
import { Link } from 'react-router-dom';
import DriverVehicleAlerts from '../components/DriverVehicleAlerts';
import useTranslation from '../useTranslation';

export default function DriverAlerts() {
  const t = useTranslation();
  const vehicleNumber = localStorage.getItem('vehicleNumber') || '';
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{t('Alerts')}</h2>
          <p className="mt-1 text-sm text-slate-500">Alerts for the vehicle searched in Driver Dashboard.</p>
        </div>
        <Link to="/app/driver" className="rounded-lg bg-[#0B3A5A] px-4 py-2.5 text-sm font-medium text-white">{t('Driver Dashboard')}</Link>
      </div>
      <DriverVehicleAlerts vehicleNumber={vehicleNumber} />
    </div>
  );
}

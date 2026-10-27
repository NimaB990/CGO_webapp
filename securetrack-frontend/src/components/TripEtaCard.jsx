import React, { useEffect, useState } from 'react';
import api from '../api';

const ETA_ROLES = ['CUSTOM_OFFICER', 'INSPECTOR', 'OWNER'];

function formatEtaMinutes(minutes) {
  const totalMinutes = Number(minutes);
  if (!Number.isFinite(totalMinutes)) return 'N/A';
  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  return `${hours > 0 ? `${hours} hr ` : ''}${remainingMinutes} min`;
}

function TripEtaCard({ containerNumber }) {
  const role = localStorage.getItem('role');
  const [requestedNumber, setRequestedNumber] = useState(containerNumber || '');
  const [eta, setEta] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setRequestedNumber(containerNumber || '');
  }, [containerNumber]);

  useEffect(() => {
    if (!ETA_ROLES.includes(role) || !containerNumber) return undefined;

    let cancelled = false;
    api.get(`/api/trips/${encodeURIComponent(containerNumber)}/eta`)
      .then((response) => {
        if (!cancelled) {
          setEta(response.data);
          setError('');
        }
      })
      .catch((error) => {
        if (!cancelled && error.response?.status !== 404) {
          setError('ETA is not available for this trip.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [containerNumber, role]);

  if (!ETA_ROLES.includes(role)) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!requestedNumber.trim()) return;
    try {
      const response = await api.get(`/api/trips/${encodeURIComponent(requestedNumber.trim())}/eta`);
      setEta(response.data);
      setError('');
    } catch (error) {
      setEta(null);
      if (error.response?.status !== 404) {
        setError('ETA is not available for this trip.');
      }
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">Estimated Time of Arrival</h3>
      <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          value={requestedNumber}
          onChange={(event) => setRequestedNumber(event.target.value)}
          placeholder="Container or vehicle number"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white">
          Check ETA
        </button>
      </form>
      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
      {eta && (
        <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
          <span>Destination: <strong>{eta.destination || 'N/A'}</strong></span>
          <span>Remaining: <strong>{Number(eta.remainingDistanceKm).toFixed(1)} km</strong></span>
          <span>Time remaining: <strong>{formatEtaMinutes(eta.estimatedMinutesRemaining)}</strong></span>
          <span>Arrival: <strong>{new Date(eta.estimatedArrival).toLocaleString()}</strong></span>
        </div>
      )}
    </section>
  );
}

export default TripEtaCard;

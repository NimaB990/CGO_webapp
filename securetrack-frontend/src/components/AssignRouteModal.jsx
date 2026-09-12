import React, { useState } from 'react';
import api from '../api';

const INITIAL_FORM = {
  containerId: 0,
  vehicleNumber: '',
  moduleId: 0, // අලුතින් එකතු කළ IoT Module ID එක
  allowedDeviationMeters: 200, // අලුතින් එකතු කළ ආරක්ෂිත සීමාව
  startLat: '6.9497',
  startLon: '79.8433',
  endLat: '7.1706',
  endLon: '79.8837',
  startName: 'Colombo Port',
  endName: 'Katunayake BOI',
};

function AssignRouteModal({ onAssignSuccess }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = ({ target }) => {
    setForm((currentForm) => ({
      ...currentForm,
      // අලුත් allowedDeviationMeters එකත් Number විදිහට හරවලා State එකට දානවා
      [target.name]: ['containerId', 'moduleId', 'allowedDeviationMeters'].includes(target.name) ? Number(target.value) : target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      await api.post('/api/trips/assign', form);
      setForm(INITIAL_FORM);
      onAssignSuccess();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to assign route. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Form එකේ පෙන්වන්න ඕන fields ටික
  const fields = [
    { name: 'containerId', label: 'Container ID', type: 'number' },
    { name: 'vehicleNumber', label: 'Vehicle Number' },
    { name: 'moduleId', label: 'IoT Module ID', type: 'number' },
    { name: 'allowedDeviationMeters', label: 'Security Buffer (Meters)', type: 'number' },
    { name: 'startLat', label: 'Start latitude' },
    { name: 'startLon', label: 'Start longitude' },
    { name: 'endLat', label: 'End latitude' },
    { name: 'endLon', label: 'End longitude' },
    { name: 'startName', label: 'Start location' },
    { name: 'endName', label: 'End location' },
  ];

  return (
    <div className="w-full rounded-xl bg-white p-4 shadow-sm">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Assign Route</h2>
            <p className="mt-1 text-sm text-slate-500">Assign a container and set the security corridor.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {fields.map(({ name, label, type = 'text' }) => (
              <label key={name} className="block text-sm font-medium text-slate-700">
                {label}
                <input
                  name={name}
                  type={type}
                  value={form[name]}
                  onChange={handleChange}
                  required
                  min={type === 'number' ? 1 : undefined}
                  className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#0B3A5A] focus:ring-2 focus:ring-[#0B3A5A]/20"
                />
              </label>
            ))}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-[#0B3A5A] px-4 py-2 text-sm font-medium text-white hover:bg-[#092f49] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Assigning...' : 'Assign Route'}
            </button>
          </div>
        </form>
    </div>
  );
}

export default AssignRouteModal;
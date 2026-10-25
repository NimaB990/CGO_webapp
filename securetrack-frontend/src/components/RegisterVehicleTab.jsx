import React, { useState } from 'react';
import api from '../api';

const INITIAL_FORM = {
  vehicleNo: '',
  vehicleModel: '',
  driverName: '',
  driverPhone: '',
  driverNic: '',
  username: '',
  email: '',
};

function RegisterVehicleTab() {
  const [formData, setFormData] = useState(INITIAL_FORM);

  const handleChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await api.post('/api/vehicles/register', formData);
      alert('Vehicle registered successfully');
      setFormData(INITIAL_FORM);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to register vehicle');
    }
  };

  return (
    <section className="mx-auto max-w-2xl rounded-xl bg-white p-8 shadow-sm">
      <h2 className="mb-6 text-2xl font-bold text-slate-900">Register Vehicle</h2>
      <form onSubmit={handleSubmit} className="space-y-5">
        {[
          ['vehicleNo', 'Vehicle Number', 'text'],
          ['vehicleModel', 'Vehicle Model', 'text'],
          ['driverName', 'Driver Name', 'text'],
          ['driverPhone', 'Phone Number', 'text'],
          ['driverNic', 'NIC', 'text'],
          ['username', 'Username', 'text'],
          ['email', 'Email Address', 'email'],
        ].map(([name, label, type]) => (
          <label key={name} className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
            <input
              type={type}
              name={name}
              value={formData[name]}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-sky-500"
            />
          </label>
        ))}
        <button
          type="submit"
          className="rounded-lg bg-[#0B3A5A] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#092f49]"
        >
          Register Vehicle
        </button>
      </form>
    </section>
  );
}

export default RegisterVehicleTab;

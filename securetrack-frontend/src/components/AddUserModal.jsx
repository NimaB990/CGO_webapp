import React, { useState } from 'react';
import {
  X,
  User,
  Mail,
  Lock,
  Shield,
  Truck,
  Phone,
  CreditCard,
  ChevronDown,
  Eye,
  EyeOff,
  UserPlus,
} from 'lucide-react';

// ─── Constants ───────────────────────────────────────────────────────────────

const ROLES = [
  { value: 'ADMIN',          label: 'Admin',           icon: Shield },
  { value: 'CUSTOM_OFFICER', label: 'Custom Officer',  icon: User   },
  { value: 'DRIVER',         label: 'Driver',          icon: Truck  },
];

const INITIAL_FORM = {
  role:         'CUSTOM_OFFICER',
  name:         '',
  username:     '',
  email:        '',
  password:     '',
  vehicleNo:    '',
  vehicleModel: '',
  phone:        '',
  nic:          '',
};

const INITIAL_ERRORS = {
  name: '', username: '', email: '', password: '',
  vehicleNo: '', vehicleModel: '', phone: '', nic: '',
};

// ─── Helper: single input field ──────────────────────────────────────────────

function Field({ label, icon: Icon, error, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>
      <div className="relative group">
        {Icon && (
          <Icon
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#0B3A5A]"
          />
        )}
        {children}
      </div>
      {error && (
        <p className="text-xs font-medium text-red-500">{error}</p>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

function AddUserModal({ onClose, onSuccess }) {
  const [form, setForm]           = useState(INITIAL_FORM);
  const [errors, setErrors]       = useState(INITIAL_ERRORS);
  const [showPassword, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  const isDriver = form.role === 'DRIVER';

  // ── Input handler ──────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear error on change
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = () => {
    const errs = { ...INITIAL_ERRORS };
    let valid = true;

    if (!form.name.trim())     { errs.name     = 'Full name is required.';       valid = false; }
    if (!form.username.trim()) { errs.username  = 'Username is required.';        valid = false; }
    if (!form.email.trim())    { errs.email     = 'Email is required.';           valid = false; }
    else if (!/\S+@\S+\.\S+/.test(form.email)) {
                                 errs.email     = 'Enter a valid email address.'; valid = false; }
    if (!form.password)        { errs.password  = 'Password is required.';        valid = false; }
    else if (form.password.length < 6) {
                                 errs.password  = 'Password must be at least 6 characters.'; valid = false; }

    if (isDriver) {
      if (!form.vehicleNo.trim())    { errs.vehicleNo    = 'Vehicle number is required.';  valid = false; }
      if (!form.vehicleModel.trim()) { errs.vehicleModel = 'Vehicle model is required.';   valid = false; }
      if (!form.phone.trim())        { errs.phone        = 'Phone number is required.';    valid = false; }
      if (!form.nic.trim())          { errs.nic          = 'NIC is required.';             valid = false; }
    }

    setErrors(errs);
    return valid;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;

    setSubmitting(true);
    try {
      // Import api lazily to keep this component portable
      const { default: api } = await import('../api');

      if (isDriver) {
        await api.post('/api/admin/users/driver', {
          name:         form.name,
          username:     form.username,
          email:        form.email,
          password:     form.password,
          vehicleNo:    form.vehicleNo,
          vehicleModel: form.vehicleModel,
          phone:        form.phone,
          nic:          form.nic,
        });
      } else {
        await api.post('/api/admin/users/staff', {
          name:     form.name,
          username: form.username,
          email:    form.email,
          password: form.password,
          role:     form.role,
        });
      }

      onSuccess?.();
      onClose?.();
    } catch (err) {
      setServerError(
        err.response?.data?.message || 'Failed to create user. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── Input className helper ────────────────────────────────────────────────
  const inputCls = (field) =>
    `w-full rounded-lg border py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition-all
     placeholder:text-slate-400 focus:ring-2 focus:ring-[#0B3A5A]/20
     ${errors[field]
       ? 'border-red-400 bg-red-50 focus:border-red-400'
       : 'border-slate-300 bg-slate-50 focus:border-[#0B3A5A] focus:bg-white'}`;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      {/* Modal Card */}
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">

        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl bg-[#0B3A5A] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
              <UserPlus size={17} className="text-white" />
            </div>
            <h2 className="text-lg font-bold text-white">Add New User</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Form ─────────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} noValidate className="space-y-5 p-6">

          {/* Role Selector */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Role
            </label>
            <div className="relative group">
              <Shield
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#0B3A5A]"
              />
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className="w-full appearance-none rounded-lg border border-slate-300 bg-slate-50 py-2.5 pl-9 pr-9 text-sm text-slate-900 outline-none transition-all focus:border-[#0B3A5A] focus:bg-white focus:ring-2 focus:ring-[#0B3A5A]/20"
              >
                {ROLES.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <ChevronDown
                size={15}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>

            {/* Role badge */}
            <div className="mt-1 flex items-center gap-1.5">
              {(() => {
                const r = ROLES.find((r) => r.value === form.role);
                const Icon = r?.icon;
                return (
                  <>
                    {Icon && <Icon size={13} className="text-[#0B3A5A]" />}
                    <span className="text-xs font-medium text-[#0B3A5A]">
                      {r?.label} permissions will be applied
                    </span>
                  </>
                );
              })()}
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              User Details
            </span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          {/* Standard fields grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

            {/* Full Name */}
            <Field label="Full Name" icon={User} error={errors.name}>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Kamal Perera"
                className={inputCls('name')}
              />
            </Field>

            {/* Username */}
            <Field label="Username" icon={User} error={errors.username}>
              <input
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                placeholder="e.g. kamal123"
                className={inputCls('username')}
              />
            </Field>

            {/* Email — full width */}
            <div className="sm:col-span-2">
              <Field label="Email Address" icon={Mail} error={errors.email}>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="e.g. kamal@customs.gov.lk"
                  className={inputCls('email')}
                />
              </Field>
            </div>

            {/* Password — full width */}
            <div className="sm:col-span-2">
              <Field label="Password" icon={Lock} error={errors.password}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Min. 6 characters"
                  className={`${inputCls('password')} pr-10`}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPw((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </Field>
            </div>
          </div>

          {/* ── Driver-only extra fields ─────────────────────────────── */}
          {isDriver && (
            <>
              {/* Divider */}
              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-slate-200" />
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Vehicle &amp; Driver Info
                </span>
                <span className="h-px flex-1 bg-slate-200" />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                {/* Vehicle Number */}
                <Field label="Vehicle Number" icon={Truck} error={errors.vehicleNo}>
                  <input
                    type="text"
                    name="vehicleNo"
                    value={form.vehicleNo}
                    onChange={handleChange}
                    placeholder="e.g. WP-CAB-1234"
                    className={inputCls('vehicleNo')}
                  />
                </Field>

                {/* Vehicle Model */}
                <Field label="Vehicle Model" icon={Truck} error={errors.vehicleModel}>
                  <input
                    type="text"
                    name="vehicleModel"
                    value={form.vehicleModel}
                    onChange={handleChange}
                    placeholder="e.g. Toyota Dyna"
                    className={inputCls('vehicleModel')}
                  />
                </Field>

                {/* Phone */}
                <Field label="Phone Number" icon={Phone} error={errors.phone}>
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="e.g. 0771234567"
                    className={inputCls('phone')}
                  />
                </Field>

                {/* NIC */}
                <Field label="NIC" icon={CreditCard} error={errors.nic}>
                  <input
                    type="text"
                    name="nic"
                    value={form.nic}
                    onChange={handleChange}
                    placeholder="e.g. 991234567V"
                    className={inputCls('nic')}
                  />
                </Field>

              </div>
            </>
          )}

          {/* Server error */}
          {serverError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {serverError}
            </div>
          )}

          {/* ── Footer Buttons ───────────────────────────────────────── */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-lg bg-[#0B3A5A] px-5 py-2.5 text-sm font-bold text-white shadow transition hover:bg-[#092f49] disabled:opacity-60 disabled:pointer-events-none"
            >
              <UserPlus size={16} />
              {submitting ? 'Creating...' : 'Create User'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

export default AddUserModal;

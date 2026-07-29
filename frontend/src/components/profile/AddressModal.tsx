// src/components/profile/AddressModal.tsx
import { useState } from 'react'
import { X, ChevronDown, Loader2 } from 'lucide-react'
import type { Address, AddressCreatePayload } from '../../types'

interface Props {
  mode:      'add' | 'edit'
  initial?:  Address | null
  onClose:   () => void
  onSave:    (payload: AddressCreatePayload, id?: number) => Promise<Record<string, string> | null>
  isSaving:  boolean
}

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh',
]

export default function AddressModal({
  mode, initial, onClose, onSave, isSaving,
}: Props) {
  const [fullName,     setFullName]     = useState(initial?.full_name      ?? '')
  const [phone,        setPhone]        = useState(initial?.phone          ?? '')
  const [addressLine1, setAddressLine1] = useState(initial?.address_line1  ?? '')
  const [addressLine2, setAddressLine2] = useState(initial?.address_line2  ?? '')
  const [city,         setCity]         = useState(initial?.city           ?? '')
  const [state,        setState]        = useState(initial?.state          ?? '')
  const [postalCode,   setPostalCode]   = useState(initial?.postal_code    ?? '')
  const [country,      setCountry]      = useState(initial?.country        ?? 'India')
  const [addressType,  setAddressType]  = useState<Address['address_type']>(
    initial?.address_type ?? 'both'
  )
  const [isDefault,    setIsDefault]    = useState(initial?.is_default     ?? false)
  const [errors,       setErrors]       = useState<Record<string, string>>({})

  function validate() {
    const e: Record<string, string> = {}
    const phoneValue = phone.trim()
    const normalizedPhone = phoneValue.replace(/\D/g, '')

    if (!fullName.trim())     e.full_name     = 'Full name is required'
    if (!phoneValue)          e.phone         = 'Phone is required'
    else if (!/^[6-9]\d{9}$/.test(normalizedPhone))
      e.phone = 'Enter a valid Indian mobile number'
    if (!addressLine1.trim()) e.address_line1 = 'Address is required'
    if (!city.trim())         e.city          = 'City is required'
    if (!state.trim())        e.state         = 'State is required'
    if (!postalCode.trim())   e.postal_code   = 'Postal code is required'
    else if (!/^\d{6}$/.test(postalCode.trim()))
      e.postal_code = 'Enter a valid 6-digit PIN code'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit() {
    if (!validate()) return
    setErrors({})
    const fieldErrors = await onSave({
      full_name:     fullName.trim(),
      phone:         phone.trim(),
      address_line1: addressLine1.trim(),
      address_line2: addressLine2.trim() || null,
      city:          city.trim(),
      state:         state.trim(),
      postal_code:   postalCode.trim(),
      country:       country.trim(),
      address_type:  addressType,
      is_default:    isDefault,
    }, initial?.id)

    if (fieldErrors) {
      setErrors(fieldErrors)
    }
  }

  const inputCls = (field: string) =>
    `w-full bg-surface-base border rounded-xl px-3 py-2.5 text-sm
     text-text-primary placeholder:text-slate-600 font-body
     focus:outline-none focus:ring-1 focus:ring-violet-500/20 transition-colors
     ${errors[field]
       ? 'border-red-500/60'
       : 'border-border-base focus:border-brand-primary'}`

  const selectCls = `w-full bg-surface-base border border-border-base rounded-xl
                     px-3 py-2.5 text-sm text-text-primary font-body appearance-none
                     focus:outline-none focus:border-brand-primary transition-colors
                     cursor-pointer`

  return (
    <div className="fixed inset-0 bg-surface-overlay backdrop-blur-sm z-50
                    flex items-center justify-center p-4 animate-fade-in">
      <div className="glass-panel-elevated rounded-2xl w-full max-w-lg
                      shadow-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-6
                        border-b border-border-base">
          <h2 className="text-base font-semibold text-white font-display">
            {mode === 'add' ? 'Add New Address' : 'Edit Address'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 font-body">

          {/* Address type */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2
                               font-display uppercase tracking-wider">
              Address Type
            </label>
            <div className="flex gap-2">
              {(['shipping', 'billing', 'both'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setAddressType(type)}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium font-display
                              border transition-colors capitalize
                              ${addressType === type
                                ? 'bg-brand-muted border-violet-500/40 text-violet-300'
                                : 'border-border-base text-slate-400 hover:border-border-strong'
                              }`}
                >
                  {type === 'both' ? 'Both' : type}
                </button>
              ))}
            </div>
          </div>

          {/* Full name + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5
                                 font-display uppercase tracking-wider">
                Full Name *
              </label>
              <input
                className={inputCls('full_name')}
                placeholder="Recipient name"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
              />
              {errors.full_name && (
                <p className="text-red-400 text-xs mt-1">{errors.full_name}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5
                                 font-display uppercase tracking-wider">
                Phone *
              </label>
              <input
                className={inputCls('phone')}
                placeholder="10-digit number"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
              {errors.phone && (
                <p className="text-red-400 text-xs mt-1">{errors.phone}</p>
              )}
            </div>
          </div>

          {/* Address Line 1 */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5
                               font-display uppercase tracking-wider">
              Address Line 1 *
            </label>
            <input
              className={inputCls('address_line1')}
              placeholder="House/Flat no., Building, Street"
              value={addressLine1}
              onChange={e => setAddressLine1(e.target.value)}
            />
            {errors.address_line1 && (
              <p className="text-red-400 text-xs mt-1">{errors.address_line1}</p>
            )}
          </div>

          {/* Address Line 2 */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5
                               font-display uppercase tracking-wider">
              Address Line 2
              <span className="text-slate-600 normal-case ml-1">(optional)</span>
            </label>
            <input
              className={inputCls('address_line2')}
              placeholder="Area, Colony, Landmark"
              value={addressLine2}
              onChange={e => setAddressLine2(e.target.value)}
            />
          </div>

          {/* City + Postal code */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5
                                 font-display uppercase tracking-wider">
                City *
              </label>
              <input
                className={inputCls('city')}
                placeholder="City"
                value={city}
                onChange={e => setCity(e.target.value)}
              />
              {errors.city && (
                <p className="text-red-400 text-xs mt-1">{errors.city}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5
                                 font-display uppercase tracking-wider">
                PIN Code *
              </label>
              <input
                className={inputCls('postal_code')}
                placeholder="6-digit PIN"
                maxLength={6}
                value={postalCode}
                onChange={e => setPostalCode(e.target.value.replace(/\D/g, ''))}
              />
              {errors.postal_code && (
                <p className="text-red-400 text-xs mt-1">{errors.postal_code}</p>
              )}
            </div>
          </div>

          {/* State + Country */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5
                                 font-display uppercase tracking-wider">
                State *
              </label>
              <div className="relative">
                <select
                  className={`${selectCls} pr-8`}
                  value={state}
                  onChange={e => setState(e.target.value)}
                >
                  <option value="">Select state</option>
                  {INDIAN_STATES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <ChevronDown size={13}
                  className="absolute right-3 top-1/2 -translate-y-1/2
                             text-slate-500 pointer-events-none" />
              </div>
              {errors.state && (
                <p className="text-red-400 text-xs mt-1">{errors.state}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5
                                 font-display uppercase tracking-wider">
                Country
              </label>
              <input
                className={inputCls('country')}
                value={country}
                onChange={e => setCountry(e.target.value)}
              />
            </div>
          </div>

          {/* Set as default toggle */}
          {!initial?.is_default && (
            <label className="flex items-center gap-3 cursor-pointer pt-1">
              <div
                onClick={() => setIsDefault(v => !v)}
                className={`w-9 h-5 rounded-full transition-colors relative
                            cursor-pointer
                            ${isDefault ? 'bg-violet-600' : 'bg-slate-700'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full
                                  shadow transition-transform
                                  ${isDefault
                                    ? 'translate-x-4'
                                    : 'translate-x-0.5'}`} />
              </div>
              <span className="text-sm text-slate-300 font-body">
                Set as default address
              </span>
            </label>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-border-base">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white
                       transition-colors font-body"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="btn-primary px-5 py-2 rounded-xl text-sm
                       disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center gap-2"
          >
            {isSaving && <Loader2 size={14} className="animate-spin" />}
            {isSaving
              ? 'Saving…'
              : mode === 'add' ? 'Add Address' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
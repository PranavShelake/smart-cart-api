// src/components/profile/ProfileForm.tsx
import { useState } from 'react'
import { User, Mail, Phone, Loader2 } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../store'
import { selectUser, updateUserLocally } from '../../store/slices/authSlice'
import { useToast } from '../../store/slices/toastSlice'
import { userApi } from '../../api/userApi'

export default function ProfileForm() {
  const dispatch = useAppDispatch()
  const toast    = useToast()
  const user     = useAppSelector(selectUser)

  const [firstName, setFirstName] = useState(user?.first_name ?? '')
  const [lastName,  setLastName]  = useState(user?.last_name  ?? '')
  const [phone,     setPhone]     = useState(user?.phone      ?? '')
  const [isSaving,  setIsSaving]  = useState(false)
  const [errors,    setErrors]    = useState<Record<string, string>>({})

  function validate() {
    const e: Record<string, string> = {}
    if (!firstName.trim()) e.first_name = 'First name is required'
    if (!lastName.trim())  e.last_name  = 'Last name is required'
    if (phone && !/^\+?[\d\s\-]{7,15}$/.test(phone.trim()))
      e.phone = 'Enter a valid phone number'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setIsSaving(true)
    try {
      const { data } = await userApi.updateProfile({
        first_name: firstName.trim(),
        last_name:  lastName.trim(),
        phone:      phone.trim() || null,
      })
      dispatch(updateUserLocally(data.data))
      toast.success('Profile updated successfully')
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  const inputCls = (field: string) =>
    `w-full bg-surface-base border rounded-xl px-3 py-2.5 text-sm
     text-text-primary placeholder:text-slate-600 font-body
     focus:outline-none focus:ring-1 focus:ring-violet-500/20 transition-colors
     ${errors[field]
       ? 'border-red-500/60'
       : 'border-border-base focus:border-brand-primary'}`

  const initials = `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`
    .toUpperCase()

  return (
    <div className="space-y-6">

      {/* Avatar display */}
      <div className="flex items-center gap-5">
        <div className="w-20 h-20 rounded-2xl border-2 border-violet-500/40
                        bg-gradient-to-br from-violet-600/60 to-blue-500/60
                        flex items-center justify-center flex-shrink-0">
          {user?.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={`${user.first_name} ${user.last_name}`}
              className="w-full h-full object-cover rounded-2xl"
            />
          ) : (
            <span className="text-2xl font-bold text-white font-display">
              {initials}
            </span>
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-white font-display">
            {user?.first_name} {user?.last_name}
          </p>
          <p className="text-xs text-slate-500 font-body mt-0.5">
            {user?.email}
          </p>
          <p className="text-[10px] text-slate-600 font-body mt-2">
            Avatar upload coming soon
          </p>
        </div>
      </div>

      {/* Form fields */}
      <div className="grid grid-cols-2 gap-4">

        {/* First name */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5
                             font-display uppercase tracking-wider">
            First Name *
          </label>
          <div className="relative">
            <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2
                                        text-slate-500 pointer-events-none" />
            <input
              className={`${inputCls('first_name')} pl-9`}
              placeholder="First name"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
            />
          </div>
          {errors.first_name && (
            <p className="text-red-400 text-xs mt-1 font-body">
              {errors.first_name}
            </p>
          )}
        </div>

        {/* Last name */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5
                             font-display uppercase tracking-wider">
            Last Name *
          </label>
          <div className="relative">
            <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2
                                        text-slate-500 pointer-events-none" />
            <input
              className={`${inputCls('last_name')} pl-9`}
              placeholder="Last name"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
            />
          </div>
          {errors.last_name && (
            <p className="text-red-400 text-xs mt-1 font-body">
              {errors.last_name}
            </p>
          )}
        </div>
      </div>

      {/* Email — read only */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 mb-1.5
                           font-display uppercase tracking-wider">
          Email Address
        </label>
        <div className="relative">
          <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2
                                      text-slate-500 pointer-events-none" />
          <input
            className="w-full bg-surface-hover border border-border-subtle
                       rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-500
                       font-body cursor-not-allowed"
            value={user?.email ?? ''}
            disabled
            readOnly
          />
        </div>
        <p className="text-[10px] text-slate-600 font-body mt-1">
          Email cannot be changed
        </p>
      </div>

      {/* Phone */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 mb-1.5
                           font-display uppercase tracking-wider">
          Phone Number
        </label>
        <div className="relative">
          <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2
                                       text-slate-500 pointer-events-none" />
          <input
            className={`${inputCls('phone')} pl-9`}
            placeholder="+91 98765 43210"
            value={phone}
            onChange={e => setPhone(e.target.value)}
          />
        </div>
        {errors.phone && (
          <p className="text-red-400 text-xs mt-1 font-body">{errors.phone}</p>
        )}
      </div>

      {/* Role badge */}
      <div className="flex items-center gap-2">
        <p className="text-xs text-slate-500 font-body">Account type:</p>
        {user?.roles.map(role => (
          <span key={role}
                className="px-2.5 py-1 rounded-full text-[10px] font-bold
                           font-display bg-violet-400/10 text-violet-400
                           border border-violet-400/20">
            {role}
          </span>
        ))}
      </div>

      {/* Save button */}
      <div className="flex justify-end pt-2 border-t border-border-base">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="btn-primary px-6 py-2.5 rounded-xl text-sm
                     disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center gap-2"
        >
          {isSaving && <Loader2 size={14} className="animate-spin" />}
          {isSaving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
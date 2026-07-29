// src/components/profile/SecurityForm.tsx
import { useState } from 'react'
import { Eye, EyeOff, Lock, Loader2, ShieldCheck } from 'lucide-react'
import { useToast } from '../../store/slices/toastSlice'
import { userApi } from '../../api/userApi'

export default function SecurityForm() {
  const toast = useToast()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword,     setNewPassword]     = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent,     setShowCurrent]     = useState(false)
  const [showNew,         setShowNew]         = useState(false)
  const [showConfirm,     setShowConfirm]     = useState(false)
  const [isSaving,        setIsSaving]        = useState(false)
  const [errors,          setErrors]          = useState<Record<string, string>>({})

  // Password strength
  function getStrength(pwd: string): {
    score: number; label: string; color: string
  } {
    let score = 0
    if (pwd.length >= 8)               score++
    if (/[A-Z]/.test(pwd))             score++
    if (/[0-9]/.test(pwd))             score++
    if (/[^A-Za-z0-9]/.test(pwd))     score++

    if (score <= 1) return { score, label: 'Weak',   color: 'bg-red-500'    }
    if (score === 2) return { score, label: 'Fair',   color: 'bg-yellow-500' }
    if (score === 3) return { score, label: 'Good',   color: 'bg-blue-500'   }
    return                 { score, label: 'Strong', color: 'bg-green-500'  }
  }

  const strength = newPassword ? getStrength(newPassword) : null

  function validate() {
    const e: Record<string, string> = {}
    if (!currentPassword)        e.current  = 'Current password is required'
    if (!newPassword)            e.new      = 'New password is required'
    else if (newPassword.length < 8) e.new  = 'Password must be at least 8 characters'
    if (newPassword !== confirmPassword) e.confirm = 'Passwords do not match'
    if (newPassword === currentPassword) e.new = 'New password must be different'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setIsSaving(true)
    try {
      await userApi.changePassword({
        current_password: currentPassword,
        new_password:     newPassword,
      })
      toast.success('Password changed successfully')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setErrors({})
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to change password'
      toast.error(msg)
    } finally {
      setIsSaving(false)
    }
  }

  const inputCls = (field: string) =>
    `w-full bg-surface-base border rounded-xl pl-9 pr-10 py-2.5 text-sm
     text-text-primary placeholder:text-slate-600 font-body
     focus:outline-none focus:ring-1 focus:ring-violet-500/20 transition-colors
     ${errors[field]
       ? 'border-red-500/60'
       : 'border-border-base focus:border-brand-primary'}`

  function PasswordField({
    label, value, onChange, show, onToggle, field, placeholder,
  }: {
    label: string; value: string
    onChange: (v: string) => void
    show: boolean; onToggle: () => void
    field: string; placeholder: string
  }) {
    return (
      <div>
        <label className="block text-xs font-semibold text-slate-400 mb-1.5
                           font-display uppercase tracking-wider">
          {label}
        </label>
        <div className="relative">
          <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2
                                      text-slate-500 pointer-events-none" />
          <input
            type={show ? 'text' : 'password'}
            className={inputCls(field)}
            placeholder={placeholder}
            value={value}
            onChange={e => onChange(e.target.value)}
          />
          <button
            type="button"
            onClick={onToggle}
            className="absolute right-3 top-1/2 -translate-y-1/2
                       text-slate-500 hover:text-slate-300 transition-colors"
          >
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        {errors[field] && (
          <p className="text-red-400 text-xs mt-1 font-body">{errors[field]}</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3 pb-2">
        <div className="w-10 h-10 rounded-xl bg-violet-400/10 flex items-center
                        justify-center flex-shrink-0">
          <ShieldCheck size={18} className="text-violet-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white font-display">
            Change Password
          </p>
          <p className="text-xs text-slate-500 font-body mt-0.5">
            Use a strong password with letters, numbers and symbols
          </p>
        </div>
      </div>

      {/* Current password */}
      <PasswordField
        label="Current Password"
        value={currentPassword}
        onChange={setCurrentPassword}
        show={showCurrent}
        onToggle={() => setShowCurrent(v => !v)}
        field="current"
        placeholder="Enter current password"
      />

      {/* New password */}
      <div>
        <PasswordField
          label="New Password"
          value={newPassword}
          onChange={setNewPassword}
          show={showNew}
          onToggle={() => setShowNew(v => !v)}
          field="new"
          placeholder="Enter new password"
        />

        {/* Strength meter */}
        {newPassword && strength && (
          <div className="mt-2 space-y-1">
            <div className="flex gap-1">
              {Array.from({ length: 4 }, (_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-all duration-300
                              ${i < strength.score
                                ? strength.color
                                : 'bg-surface-hover'}`}
                />
              ))}
            </div>
            <p className="text-[10px] text-slate-500 font-body">
              Strength:{' '}
              <span className={`font-medium
                ${strength.score <= 1 ? 'text-red-400'    :
                  strength.score === 2 ? 'text-yellow-400' :
                  strength.score === 3 ? 'text-blue-400'   :
                  'text-green-400'}`}>
                {strength.label}
              </span>
            </p>
          </div>
        )}
      </div>

      {/* Confirm password */}
      <PasswordField
        label="Confirm New Password"
        value={confirmPassword}
        onChange={setConfirmPassword}
        show={showConfirm}
        onToggle={() => setShowConfirm(v => !v)}
        field="confirm"
        placeholder="Repeat new password"
      />

      {/* Password rules */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { rule: 'At least 8 characters', met: newPassword.length >= 8              },
          { rule: 'One uppercase letter',  met: /[A-Z]/.test(newPassword)            },
          { rule: 'One number',            met: /[0-9]/.test(newPassword)            },
          { rule: 'One special character', met: /[^A-Za-z0-9]/.test(newPassword)    },
        ].map(({ rule, met }) => (
          <div key={rule} className="flex items-center gap-2">
            <span className={`w-3.5 h-3.5 rounded-full flex-shrink-0 flex items-center
                              justify-center text-[9px] font-bold
                              ${met
                                ? 'bg-green-400/20 text-green-400'
                                : 'bg-surface-hover text-slate-600'}`}>
              {met ? '✓' : '·'}
            </span>
            <span className={`text-[10px] font-body
                              ${met ? 'text-green-400' : 'text-slate-600'}`}>
              {rule}
            </span>
          </div>
        ))}
      </div>

      {/* Save */}
      <div className="flex justify-end pt-2 border-t border-border-base">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="btn-primary px-6 py-2.5 rounded-xl text-sm
                     disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center gap-2"
        >
          {isSaving && <Loader2 size={14} className="animate-spin" />}
          {isSaving ? 'Updating…' : 'Update Password'}
        </button>
      </div>
    </div>
  )
}
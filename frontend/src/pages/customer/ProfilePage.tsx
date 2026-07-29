// src/pages/customer/ProfilePage.tsx
import { useEffect, useState } from 'react'
import {
  User, MapPin, Shield, Plus, AlertCircle,
  ChevronRight,
} from 'lucide-react'
import { useToast } from '../../store/slices/toastSlice'
import { userApi } from '../../api/userApi'
import ProfileForm   from '../../components/profile/ProfileForm'
import SecurityForm  from '../../components/profile/SecurityForm'
import AddressCard   from '../../components/profile/AddressCard'
import AddressModal  from '../../components/profile/AddressModal'
import type { Address, AddressCreatePayload } from '../../types'

// ── Tab config ────────────────────────────────────────────────
type TabKey = 'profile' | 'addresses' | 'security'

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'profile',   label: 'Profile',   icon: <User    size={15} /> },
  { key: 'addresses', label: 'Addresses', icon: <MapPin  size={15} /> },
  { key: 'security',  label: 'Security',  icon: <Shield  size={15} /> },
]

// ── Address list section ──────────────────────────────────────
function AddressesTab() {
  const toast = useToast()

  const [addresses,        setAddresses]        = useState<Address[]>([])
  const [isLoading,        setIsLoading]        = useState(true)
  const [error,            setError]            = useState<string | null>(null)
  const [showModal,        setShowModal]        = useState(false)
  const [editTarget,       setEditTarget]       = useState<Address | null>(null)
  const [isSaving,         setIsSaving]         = useState(false)
  const [deletingId,       setDeletingId]       = useState<number | null>(null)
  const [settingDefaultId, setSettingDefaultId] = useState<number | null>(null)

  const MAX_ADDRESSES = 5

  async function loadAddresses() {
    setIsLoading(true)
    setError(null)
    try {
      const { data } = await userApi.getAddresses()
      setAddresses(data.data)
    } catch {
      setError('Failed to load addresses')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { loadAddresses() }, [])

  function parseValidationErrors(error: unknown) {
    const response = (error as any)?.response
    const detail = response?.data?.detail
    if (!Array.isArray(detail)) return null

    const fieldErrors: Record<string, string> = {}
    detail.forEach((item: any) => {
      const field = Array.isArray(item.loc)
        ? String(item.loc[item.loc.length - 1])
        : ''
      const message = typeof item.msg === 'string'
        ? item.msg
        : ''
      if (field && message) {
        fieldErrors[field] = message
      }
    })

    return Object.keys(fieldErrors).length > 0 ? fieldErrors : null
  }

  async function handleSave(payload: AddressCreatePayload, id?: number) {
    setIsSaving(true)
    try {
      if (id) {
        await userApi.updateAddress(id, payload)
        toast.success('Address updated')
      } else {
        await userApi.addAddress(payload)
        toast.success('Address added')
      }
      setShowModal(false)
      setEditTarget(null)
      await loadAddresses()
      return null
    } catch (err: unknown) {
      const fieldErrors = parseValidationErrors(err)
      if (fieldErrors) {
        return fieldErrors
      }
      const msg = err instanceof Error ? err.message : 'Failed to save address'
      toast.error(msg)
      return null
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(id: number) {
    setDeletingId(id)
    try {
      await userApi.deleteAddress(id)
      toast.success('Address deleted')
      await loadAddresses()
    } catch {
      toast.error('Failed to delete address')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleSetDefault(id: number) {
    setSettingDefaultId(id)
    try {
      await userApi.setDefaultAddress(id)
      toast.success('Default address updated')
      await loadAddresses()
    } catch {
      toast.error('Failed to update default address')
    } finally {
      setSettingDefaultId(null)
    }
  }

  // ── Loading ───────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i}
               className="h-36 bg-surface-hover rounded-2xl animate-pulse" />
        ))}
      </div>
    )
  }

  // ── Error ─────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-2xl bg-red-400/10 flex items-center
                        justify-center mb-3">
          <AlertCircle size={20} className="text-red-400" />
        </div>
        <p className="text-slate-400 text-sm font-body mb-4">{error}</p>
        <button
          onClick={loadAddresses}
          className="bg-brand-primary hover:bg-brand-hover text-white px-4 py-2
                     rounded-xl text-sm font-medium transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white font-display">
            Saved Addresses
          </p>
          <p className="text-xs text-slate-500 font-body mt-0.5">
            {addresses.length} of {MAX_ADDRESSES} addresses used
          </p>
        </div>

        {addresses.length < MAX_ADDRESSES && (
          <button
            onClick={() => { setEditTarget(null); setShowModal(true) }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm
                       font-medium font-display bg-brand-primary
                       hover:bg-brand-hover text-white transition-colors"
          >
            <Plus size={15} />
            Add Address
          </button>
        )}
      </div>

      {/* Max addresses warning */}
      {addresses.length >= MAX_ADDRESSES && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl
                        bg-yellow-400/10 border border-yellow-400/20">
          <AlertCircle size={14} className="text-yellow-400 flex-shrink-0" />
          <p className="text-xs text-yellow-400 font-body">
            Maximum {MAX_ADDRESSES} addresses allowed.
            Delete one to add a new address.
          </p>
        </div>
      )}

      {/* Empty state */}
      {addresses.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-surface-hover flex items-center
                          justify-center mb-4">
            <MapPin size={24} className="text-slate-600" />
          </div>
          <p className="text-slate-400 text-sm font-body mb-1">
            No addresses saved yet
          </p>
          <p className="text-slate-600 text-xs font-body mb-5">
            Add an address to speed up checkout
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm
                       font-medium font-display bg-brand-primary
                       hover:bg-brand-hover text-white transition-colors"
          >
            <Plus size={15} />
            Add Your First Address
          </button>
        </div>
      )}

      {/* Address cards grid */}
      {addresses.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {addresses.map(addr => (
            <AddressCard
              key={addr.id}
              address={addr}
              onEdit={a => { setEditTarget(a); setShowModal(true) }}
              onDelete={handleDelete}
              onSetDefault={handleSetDefault}
              isDeleting={deletingId === addr.id}
              isSettingDefault={settingDefaultId === addr.id}
            />
          ))}
        </div>
      )}

      {/* Add/Edit modal */}
      {showModal && (
        <AddressModal
          mode={editTarget ? 'edit' : 'add'}
          initial={editTarget}
          onClose={() => { setShowModal(false); setEditTarget(null) }}
          onSave={handleSave}
          isSaving={isSaving}
        />
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<TabKey>('profile')

  return (
    <div className="flex flex-col gap-6 animate-fade-in">

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <span>Account</span>
        <ChevronRight size={12} />
        <span className="text-slate-300">Profile</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white font-display">
          My Account
        </h1>
        <p className="text-slate-400 text-sm mt-1 font-body">
          Manage your profile, addresses and security settings
        </p>
      </div>

      {/* ── Tab layout ──────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-6 items-start">

        {/* Left — tab nav */}
        <div className="col-span-1 glass-panel rounded-2xl p-3 space-y-1
                        sticky top-24">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl
                          text-sm font-medium font-display transition-all
                          border-l-[3px]
                          ${activeTab === tab.key
                            ? 'bg-brand-muted text-violet-300 border-brand-primary'
                            : 'text-slate-400 hover:text-white hover:bg-surface-hover border-transparent'
                          }`}
            >
              <span className={activeTab === tab.key
                ? 'text-violet-400' : 'text-slate-500'}>
                {tab.icon}
              </span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Right — tab content */}
        <div className="col-span-3 glass-panel rounded-2xl p-6">

          {/* Tab header */}
          <div className="pb-5 mb-5 border-b border-border-base">
            <h2 className="text-base font-semibold text-white font-display">
              {TABS.find(t => t.key === activeTab)?.label}
            </h2>
            <p className="text-xs text-slate-500 font-body mt-1">
              {activeTab === 'profile'
                ? 'Update your personal information'
                : activeTab === 'addresses'
                  ? 'Manage your delivery and billing addresses'
                  : 'Keep your account secure'}
            </p>
          </div>

          {/* Tab content */}
          {activeTab === 'profile'   && <ProfileForm />}
          {activeTab === 'addresses' && <AddressesTab />}
          {activeTab === 'security'  && <SecurityForm />}
        </div>
      </div>
    </div>
  )
}
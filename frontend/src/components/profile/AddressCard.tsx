// src/components/profile/AddressCard.tsx
import { MapPin, Pencil, Trash2, Star } from 'lucide-react'
import type { Address } from '../../types'

interface Props {
  address:          Address
  onEdit:           (address: Address) => void
  onDelete:         (id: number) => void
  onSetDefault:     (id: number) => void
  isDeleting:       boolean
  isSettingDefault: boolean
}

const TYPE_LABELS: Record<Address['address_type'], string> = {
  billing:  'Billing',
  shipping: 'Shipping',
  both:     'Billing & Shipping',
}

export default function AddressCard({
  address,
  onEdit,
  onDelete,
  onSetDefault,
  isDeleting,
  isSettingDefault,
}: Props) {
  return (
    <div className={`glass-panel rounded-2xl p-5 space-y-3 transition-all duration-200
                     ${address.is_default
                       ? 'border-violet-500/30 shadow-sm shadow-violet-500/10'
                       : ''}`}>

      {/* Top row — type badge + default badge */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MapPin size={14} className="text-violet-400 flex-shrink-0" />
          <span className="text-xs font-semibold text-violet-400 font-display">
            {TYPE_LABELS[address.address_type]}
          </span>
        </div>

        {address.is_default && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full
                           text-[10px] font-bold font-display
                           bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
            <Star size={9} />
            Default
          </span>
        )}
      </div>

      {/* Address content */}
      <div className="space-y-0.5">
        <p className="text-sm font-semibold text-white font-display">
          {address.full_name}
        </p>
        <p className="text-xs text-slate-400 font-body">{address.phone}</p>
        <p className="text-xs text-slate-400 font-body leading-relaxed">
          {address.address_line1}
          {address.address_line2 && `, ${address.address_line2}`}
        </p>
        <p className="text-xs text-slate-400 font-body">
          {address.city}, {address.state} — {address.postal_code}
        </p>
        <p className="text-xs text-slate-500 font-body">{address.country}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-border-subtle">
        <button
          onClick={() => onEdit(address)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
                     font-medium font-display text-slate-400 hover:text-blue-400
                     hover:bg-surface-hover transition-colors"
        >
          <Pencil size={12} />
          Edit
        </button>

        {!address.is_default && (
          <button
            onClick={() => onSetDefault(address.id)}
            disabled={isSettingDefault}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
                       font-medium font-display text-slate-400 hover:text-yellow-400
                       hover:bg-surface-hover transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Star size={12} />
            Set Default
          </button>
        )}

        <button
          onClick={() => onDelete(address.id)}
          disabled={isDeleting || address.is_default}
          title={address.is_default ? 'Cannot delete default address' : 'Delete'}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
                     font-medium font-display text-slate-400 hover:text-red-400
                     hover:bg-surface-hover transition-colors ml-auto
                     disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Trash2 size={12} />
          Delete
        </button>
      </div>
    </div>
  )
}
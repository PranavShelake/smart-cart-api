import { useState, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import type { Category, CategoryCreatePayload, CategoryUpdatePayload } from '../../types'

interface Props {
  mode:       'add' | 'edit'
  initial?:   Category | null
  categories: Category[]
  isSaving:   boolean
  onSave:     (payload: CategoryCreatePayload | CategoryUpdatePayload, id?: number) => void
  onCancel:   () => void
}

function slugify(str: string) {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

export default function CategoryForm({
  mode, initial, categories, isSaving, onSave, onCancel,
}: Props) {
  const [name,         setName]         = useState(initial?.name          ?? '')
  const [slug,         setSlug]         = useState(initial?.slug          ?? '')
  const [description,  setDescription]  = useState(initial?.description   ?? '')
  const [parentId,     setParentId]     = useState<number | ''>(initial?.parent_category_id ?? '')
  const [displayOrder, setDisplayOrder] = useState(initial?.display_order ?? 0)
  const [isActive,     setIsActive]     = useState(initial?.is_active     ?? true)
  const [slugTouched,  setSlugTouched]  = useState(false)
  const [errors,       setErrors]       = useState<Record<string, string>>({})

  // Auto-generate slug from name unless user has manually edited it
  useEffect(() => {
    if (!slugTouched) setSlug(slugify(name))
  }, [name, slugTouched])

  function validate() {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'Name is required'
    if (!slug.trim()) e.slug = 'Slug is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit() {
    if (!validate()) return
    const payload: CategoryCreatePayload = {
      name:               name.trim(),
      slug:               slug.trim(),
      description:        description.trim() || undefined,
      parent_category_id: parentId || null,
      display_order:      displayOrder,
      is_active:          isActive,
    }
    onSave(payload, initial?.id)
  }

  const inputCls = (field: string) =>
    `w-full bg-surface-base border rounded-xl px-3 py-2.5 text-sm text-text-primary
     placeholder:text-slate-600 font-body focus:outline-none focus:ring-1
     focus:ring-violet-500/20 transition-colors
     ${errors[field] ? 'border-red-500/60' : 'border-border-base focus:border-brand-primary'}`

  // Exclude self from parent options when editing
  const parentOptions = categories.filter(c => c.id !== initial?.id)

  return (
    <div className="space-y-4 font-body">

      {/* Name */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 mb-1.5
                           font-display uppercase tracking-wider">
          Name *
        </label>
        <input
          className={inputCls('name')}
          placeholder="e.g. Electronics"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
      </div>

      {/* Slug */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 mb-1.5
                           font-display uppercase tracking-wider">
          Slug *
        </label>
        <input
          className={inputCls('slug')}
          placeholder="e.g. electronics"
          value={slug}
          onChange={e => { setSlug(e.target.value); setSlugTouched(true) }}
        />
        {!errors.slug && slug && (
          <p className="text-slate-500 text-xs mt-1 font-body">/categories/{slug}</p>
        )}
        {errors.slug && <p className="text-red-400 text-xs mt-1">{errors.slug}</p>}
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 mb-1.5
                           font-display uppercase tracking-wider">
          Description
        </label>
        <textarea
          rows={2}
          className={`${inputCls('description')} resize-none`}
          placeholder="Optional description"
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
      </div>

      {/* Parent + Display Order */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5
                             font-display uppercase tracking-wider">
            Parent Category
          </label>
          <div className="relative">
            <select
              className="w-full bg-surface-base border border-border-base rounded-xl
                         px-3 py-2.5 text-sm text-text-primary focus:outline-none
                         focus:border-brand-primary transition-colors appearance-none
                         cursor-pointer font-body pr-8"
              value={parentId}
              onChange={e => setParentId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">None (Top Level)</option>
              {parentOptions.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2
                                               text-slate-500 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5
                             font-display uppercase tracking-wider">
            Display Order
          </label>
          <input
            type="number" min={0}
            className={inputCls('display_order')}
            placeholder="0"
            value={displayOrder}
            onChange={e => setDisplayOrder(Number(e.target.value))}
          />
        </div>
      </div>

      {/* Active toggle */}
      <div className="pt-1">
        <label className="flex items-center gap-2.5 cursor-pointer w-fit">
          <div
            onClick={() => setIsActive(v => !v)}
            className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer
                        ${isActive ? 'bg-violet-600' : 'bg-slate-700'}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow
                              transition-transform
                              ${isActive ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </div>
          <span className="text-sm text-slate-300 font-body">Active</span>
        </label>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-border-base">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSaving}
          className="btn-primary px-5 py-2 rounded-xl text-sm
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving
            ? 'Saving…'
            : mode === 'add' ? 'Create Category' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
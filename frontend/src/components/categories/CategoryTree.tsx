import { useState } from 'react'
import { ChevronRight, ChevronDown, Pencil, Trash2, Plus } from 'lucide-react'
import type { CategoryTree as CategoryTreeType } from '../../types'

interface Props {
  tree:           CategoryTreeType[]
  selectedId:     number | null
  onSelect:       (cat: CategoryTreeType) => void
  onAddChild:     (parentId: number) => void
  onDelete:       (cat: CategoryTreeType) => void
}

interface RowProps {
  node:       CategoryTreeType
  depth:      number
  selectedId: number | null
  onSelect:   (cat: CategoryTreeType) => void
  onAddChild: (parentId: number) => void
  onDelete:   (cat: CategoryTreeType) => void
}

function CategoryRow({ node, depth, selectedId, onSelect, onAddChild, onDelete }: RowProps) {
  const [expanded,   setExpanded]   = useState(true)
  const [showActions, setShowActions] = useState(false)

  const hasChildren = node.children && node.children.length > 0
  const isSelected  = selectedId === node.id

  return (
    <div>
      <div
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
        onClick={() => onSelect(node)}
        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer
                    transition-colors group
                    ${isSelected
                      ? 'bg-brand-muted border border-violet-500/20'
                      : 'hover:bg-surface-hover'}`}
        style={{ paddingLeft: `${depth * 20 + 12}px` }}
      >
        {/* Expand / collapse toggle */}
        <button
          onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
          className="w-4 h-4 flex items-center justify-center flex-shrink-0
                     text-slate-500 hover:text-slate-300 transition-colors"
        >
          {hasChildren
            ? expanded
              ? <ChevronDown size={13} />
              : <ChevronRight size={13} />
            : <span className="w-1 h-1 rounded-full bg-slate-700 block" />}
        </button>

        {/* Name */}
        <span className={`text-sm flex-1 font-body truncate
                          ${isSelected ? 'text-violet-300 font-medium' : 'text-text-primary'}`}>
          {node.name}
        </span>

        {/* Slug chip */}
        <span className="text-[10px] text-slate-500 font-body bg-surface-hover
                         px-2 py-0.5 rounded-md flex-shrink-0 hidden group-hover:block">
          {node.slug}
        </span>

        {/* Active dot */}
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0
                          ${node.is_active ? 'bg-green-400' : 'bg-slate-600'}`} />

        {/* Action buttons — show on hover */}
        {showActions && (
          <div className="flex items-center gap-0.5 flex-shrink-0"
               onClick={e => e.stopPropagation()}>
            <button
              onClick={() => onAddChild(node.id)}
              className="p-1 hover:bg-surface-base rounded-lg transition-colors
                         text-slate-500 hover:text-violet-400"
              title="Add sub-category"
            >
              <Plus size={12} />
            </button>
            <button
              onClick={() => onSelect(node)}
              className="p-1 hover:bg-surface-base rounded-lg transition-colors
                         text-slate-500 hover:text-blue-400"
              title="Edit"
            >
              <Pencil size={12} />
            </button>
            <button
              onClick={() => onDelete(node)}
              className="p-1 hover:bg-surface-base rounded-lg transition-colors
                         text-slate-500 hover:text-red-400"
              title="Delete"
            >
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div>
          {node.children.map(child => (
            <CategoryRow
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              onAddChild={onAddChild}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function CategoryTree({ tree, selectedId, onSelect, onAddChild, onDelete }: Props) {
  if (tree.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-2xl bg-surface-hover flex items-center
                        justify-center mb-3">
          <span className="text-2xl">🗂</span>
        </div>
        <p className="text-slate-400 text-sm">No categories yet</p>
        <p className="text-slate-600 text-xs mt-1">Click "Add Category" to get started</p>
      </div>
    )
  }

  return (
    <div className="space-y-0.5">
      {tree.map(node => (
        <CategoryRow
          key={node.id}
          node={node}
          depth={0}
          selectedId={selectedId}
          onSelect={onSelect}
          onAddChild={onAddChild}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
import { useEffect, useState } from 'react'
import { Plus, ChevronRight, AlertCircle, FolderOpen } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../../store'
import {
  fetchCategories,
  fetchCategoryTree,
  createCategory,
  updateCategory,
  deleteCategory,
  selectCategories,
  selectCategoryTree,
  selectCategoriesLoading,
  selectCategoriesError,
} from '../../../store/slices/categoriesSlice'
import { useToast } from '../../../store/slices/toastSlice'
import CategoryTree from '../../../components/categories/CategoryTree'
import CategoryForm from '../../../components/categories/CategoryForm'
import type {
  Category,
  CategoryTree as CategoryTreeType,
  CategoryCreatePayload,
  CategoryUpdatePayload,
} from '../../../types'

// ── Skeleton ──────────────────────────────────────────────────

function TreeSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-9 bg-surface-hover rounded-xl animate-pulse"
          style={{ marginLeft: `${(i % 3) * 20}px` }}
        />
      ))}
    </div>
  )
}

// ── Delete protection modal ───────────────────────────────────

function DeleteModal({
  category,
  isBlocked,
  onClose,
  onConfirm,
  isDeleting,
}: {
  category:   CategoryTreeType
  isBlocked:  boolean
  onClose:    () => void
  onConfirm:  () => void
  isDeleting: boolean
}) {
  const hasChildren = category.children && category.children.length > 0

  return (
    <div className="fixed inset-0 bg-surface-overlay backdrop-blur-sm z-50
                    flex items-center justify-center p-4 animate-fade-in">
      <div className="glass-panel-elevated rounded-2xl w-full max-w-sm shadow-2xl p-6">
        <div className="flex flex-col items-center text-center gap-4">

          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center
                          ${isBlocked ? 'bg-yellow-400/10' : 'bg-red-400/10'}`}>
            <AlertCircle size={22} className={isBlocked ? 'text-yellow-400' : 'text-red-400'} />
          </div>

          <div>
            <h3 className="text-base font-semibold text-white font-display mb-2">
              {isBlocked ? 'Cannot Delete Category' : 'Delete Category?'}
            </h3>

            {isBlocked ? (
              <div className="text-sm text-slate-400 font-body space-y-2">
                <p>
                  <span className="text-white font-medium">{category.name}</span>
                  {' '}cannot be deleted because it has:
                </p>
                {hasChildren && (
                  <p className="text-yellow-400/80 text-xs bg-yellow-400/5 rounded-lg px-3 py-2">
                    ⚠ {category.children.length} sub-categor
                    {category.children.length === 1 ? 'y' : 'ies'} attached
                  </p>
                )}
                <p className="text-xs text-slate-500 mt-2">
                  Reassign or delete its children first, then try again.
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-400 font-body">
                Are you sure you want to delete{' '}
                <span className="text-white font-medium">{category.name}</span>?
                This action cannot be undone.
              </p>
            )}
          </div>

          <div className="flex gap-3 w-full pt-1">
            {isBlocked ? (
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 text-sm btn-primary rounded-xl"
              >
                Got it
              </button>
            ) : (
              <>
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 text-sm text-slate-400 border border-border-base
                             rounded-xl hover:text-white hover:border-border-strong transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 text-sm bg-red-500/20 text-red-400 rounded-xl
                             hover:bg-red-500/30 border border-red-500/30 transition-colors
                             disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {isDeleting ? 'Deleting…' : 'Delete'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Right panel — empty state ─────────────────────────────────

function DetailEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-surface-hover flex items-center
                      justify-center mb-4">
        <FolderOpen size={24} className="text-slate-600" />
      </div>
      <p className="text-slate-400 text-sm font-body">Select a category to edit</p>
      <p className="text-slate-600 text-xs mt-1 font-body">
        or click "Add Category" to create one
      </p>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────

type PanelMode = 'idle' | 'add' | 'add-child' | 'edit'

export default function CategoriesPage() {
  const dispatch   = useAppDispatch()
  const toast      = useToast()

  const categories  = useAppSelector(selectCategories)
  const tree        = useAppSelector(selectCategoryTree)
  const isLoading   = useAppSelector(selectCategoriesLoading)
  const error       = useAppSelector(selectCategoriesError)

  // ── Local UI state ─────────────────────────────────────────
  const [panelMode,    setPanelMode]    = useState<PanelMode>('idle')
  const [selectedNode, setSelectedNode] = useState<CategoryTreeType | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CategoryTreeType | null>(null)
  const [parentIdForAdd, setParentIdForAdd] = useState<number | null>(null)
  const [isSaving,     setIsSaving]     = useState(false)
  const [isDeleting,   setIsDeleting]   = useState(false)

  // ── Fetch on mount ─────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchCategoryTree())
    dispatch(fetchCategories())
  }, [dispatch])

  // ── Helpers ────────────────────────────────────────────────

  function handleSelect(cat: CategoryTreeType) {
    setSelectedNode(cat)
    setPanelMode('edit')
    setParentIdForAdd(null)
  }

  function handleAddRoot() {
    setSelectedNode(null)
    setParentIdForAdd(null)
    setPanelMode('add')
  }

  function handleAddChild(parentId: number) {
    setSelectedNode(null)
    setParentIdForAdd(parentId)
    setPanelMode('add-child')
  }

  function handleCancel() {
    setPanelMode('idle')
    setSelectedNode(null)
    setParentIdForAdd(null)
  }

  function handleDeleteRequest(cat: CategoryTreeType) {
    setDeleteTarget(cat)
  }

  // ── Delete protection ──────────────────────────────────────
  const deleteIsBlocked = deleteTarget
    ? (deleteTarget.children && deleteTarget.children.length > 0)
    : false

  // ── CRUD ───────────────────────────────────────────────────

  async function handleSave(
    payload: CategoryCreatePayload | CategoryUpdatePayload,
    id?: number
  ) {
    setIsSaving(true)
    try {
      if (id) {
        await dispatch(updateCategory({ id, payload })).unwrap()
        toast.success('Category updated')
      } else {
        // If adding a child, inject parent_category_id
        const finalPayload: CategoryCreatePayload = {
          ...(payload as CategoryCreatePayload),
          ...(parentIdForAdd ? { parent_category_id: parentIdForAdd } : {}),
        }
        await dispatch(createCategory(finalPayload)).unwrap()
        toast.success('Category created')
      }
      // Refetch both flat list and tree
      await dispatch(fetchCategoryTree())
      await dispatch(fetchCategories())
      setPanelMode('idle')
      setSelectedNode(null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      toast.error(msg)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await dispatch(deleteCategory(deleteTarget.id)).unwrap()
      toast.success(`"${deleteTarget.name}" deleted`)
      await dispatch(fetchCategoryTree())
      await dispatch(fetchCategories())
      setDeleteTarget(null)
      if (selectedNode?.id === deleteTarget.id) {
        setSelectedNode(null)
        setPanelMode('idle')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete'
      toast.error(msg)
    } finally {
      setIsDeleting(false)
    }
  }

  // ── Right panel form seed ──────────────────────────────────
  // Pre-fill parent_category_id when adding a child
  const formInitial: Category | null = panelMode === 'add-child' && parentIdForAdd
    ? {
        id:                 0,
        name:               '',
        slug:               '',
        description:        null,
        parent_category_id: parentIdForAdd,
        image_url:          null,
        display_order:      0,
        is_active:          true,
      }
    : panelMode === 'edit' && selectedNode
      ? selectedNode
      : null

  const panelTitle =
    panelMode === 'edit'      ? `Edit — ${selectedNode?.name}`  :
    panelMode === 'add-child' ? 'Add Sub-category'              :
    panelMode === 'add'       ? 'New Category'                  : ''

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 animate-fade-in">

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <span>Admin</span>
        <ChevronRight size={12} />
        <span className="text-slate-300">Categories</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-display">Categories</h1>
          <p className="text-slate-400 text-sm mt-1">
            Organise your product taxonomy
          </p>
        </div>
        <button
          onClick={handleAddRoot}
          className="bg-brand-primary hover:bg-brand-hover text-white px-4 py-2
                     rounded-xl flex items-center gap-2 text-sm font-medium
                     font-display transition-colors"
        >
          <Plus size={16} />
          Add Category
        </button>
      </div>

      {/* ── Error state ────────────────────────────────────── */}
      {error && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-400/10 flex items-center
                          justify-center mb-4">
            <AlertCircle size={24} className="text-red-400" />
          </div>
          <p className="text-slate-400 text-sm mb-4">{error}</p>
          <button
            onClick={() => dispatch(fetchCategoryTree())}
            className="bg-brand-primary hover:bg-brand-hover text-white px-4 py-2
                       rounded-xl text-sm font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* ── Split layout ───────────────────────────────────── */}
      {!error && (
        <div className="grid grid-cols-5 gap-4 items-start">

          {/* Left — Tree (60%) */}
          <div className="col-span-3 glass-panel rounded-2xl overflow-hidden">

            {/* Tree header */}
            <div className="flex items-center justify-between px-5 py-4
                            border-b border-border-base">
              <h2 className="text-sm font-semibold text-white font-display">
                Category Tree
              </h2>
              <span className="text-xs text-slate-500 font-body">
                {categories.length} total
              </span>
            </div>

            {/* Tree body */}
            <div className="p-3 min-h-[400px]">
              {isLoading ? (
                <TreeSkeleton />
              ) : (
                <CategoryTree
                  tree={tree}
                  selectedId={selectedNode?.id ?? null}
                  onSelect={handleSelect}
                  onAddChild={handleAddChild}
                  onDelete={handleDeleteRequest}
                />
              )}
            </div>
          </div>

          {/* Right — Detail / Form (40%) */}
          <div className="col-span-2 glass-panel rounded-2xl overflow-hidden">

            {/* Right panel header */}
            {panelMode !== 'idle' && (
              <div className="flex items-center justify-between px-5 py-4
                              border-b border-border-base">
                <h2 className="text-sm font-semibold text-white font-display truncate">
                  {panelTitle}
                </h2>
              </div>
            )}

            {/* Right panel body */}
            <div className="p-5 min-h-[400px]">
              {panelMode === 'idle' ? (
                <DetailEmptyState />
              ) : (
                <CategoryForm
                  mode={panelMode === 'edit' ? 'edit' : 'add'}
                  initial={formInitial}
                  categories={categories}
                  isSaving={isSaving}
                  onSave={handleSave}
                  onCancel={handleCancel}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Delete modal ───────────────────────────────────── */}
      {deleteTarget && (
        <DeleteModal
          category={deleteTarget}
          isBlocked={!!deleteIsBlocked}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
          isDeleting={isDeleting}
        />
      )}
    </div>
  )
}
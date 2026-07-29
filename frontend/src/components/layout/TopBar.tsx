import { useState, useRef, useEffect } from 'react'
import { Search, Bell, ShoppingBag, ChevronDown,
         User, Settings, LogOut, ClipboardList } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../store'
import {
  selectDisplayName, selectRoleLabel,
  selectUser, selectPrimaryRole,
} from '../../store/slices/authSlice'
import { logout } from '../../store/slices/authSlice'
import { selectCartCount } from '../../store/slices/cartSlice'
import { useToast } from '../../store/slices/toastSlice'

export default function TopBar() {
  const dispatch  = useAppDispatch()
  const navigate  = useNavigate()
  const toast     = useToast()

  const [searchValue,    setSearchValue]    = useState('')
  const [searchFocused,  setSearchFocused]  = useState(false)
  const [profileOpen,    setProfileOpen]    = useState(false)

  const displayName = useAppSelector(selectDisplayName)
  const roleLabel   = useAppSelector(selectRoleLabel)
  const user        = useAppSelector(selectUser)
  const role        = useAppSelector(selectPrimaryRole)
  const cartCount   = useAppSelector(selectCartCount)

  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const initials = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  async function handleLogout() {
    try {
      await dispatch(logout())
      toast.success('Logged out successfully')
      navigate('/login', { replace: true })
    } catch {
      toast.error('Logout failed')
    }
  }

  return (
    <header
      className="fixed top-0 right-0 z-40 flex items-center justify-between px-8
                 h-topbar glass-nav border-b border-border-base"
      style={{ width: 'calc(100% - 280px)' }}
    >
      {/* Search */}
      <div className="flex-1 max-w-[520px]">
        <div className={[
          'flex items-center gap-3 px-4 py-2.5 rounded-full border transition-all duration-200',
          searchFocused
            ? 'bg-white/[0.08] border-violet-500/60 shadow-[0_0_0_3px_rgba(139,92,246,0.15)]'
            : 'bg-white/5 border-border-base hover:border-border-strong',
        ].join(' ')}>
          <Search size={18} className={`shrink-0 transition-colors duration-200
            ${searchFocused ? 'text-violet-400' : 'text-slate-500'}`} />
          <input
            type="text"
            value={searchValue}
            onChange={e => setSearchValue(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search orders, products, or analytics..."
            className="flex-1 bg-transparent text-sm text-text-primary
                       placeholder:text-slate-600 outline-none font-body"
          />
          {!searchFocused && !searchValue && (
            <kbd className="hidden md:flex items-center gap-1 text-[10px] text-slate-600
                            bg-white/5 border border-border-base rounded px-1.5 py-0.5
                            font-mono shrink-0">
              ⌘K
            </kbd>
          )}
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1 ml-6">

        {/* Cart icon — customers only */}
        {role === 'CUSTOMER' && (
          <button
            onClick={() => navigate('/cart')}
            className="relative p-2.5 text-slate-400 hover:text-violet-300
                       hover:bg-surface-hover rounded-xl transition-all duration-200"
          >
            <ShoppingBag size={20} />
            {cartCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-violet-500
                               rounded-full text-[10px] font-bold text-white
                               flex items-center justify-center border-2
                               border-surface-base">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </button>
        )}

        {/* Notifications */}
        <button className="relative p-2.5 text-slate-400 hover:text-violet-300
                           hover:bg-surface-hover rounded-xl transition-all duration-200">
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-violet-500 rounded-full
                           border-2 border-surface-base animate-pulse" />
        </button>

        <div className="w-px h-7 bg-border-base mx-1" />

        {/* Profile dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setProfileOpen(v => !v)}
            className="flex items-center gap-3 pl-1 pr-3 py-1.5 rounded-xl
                       hover:bg-surface-hover transition-all duration-200 group"
          >
            <div className="relative shrink-0">
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={displayName}
                  className="w-9 h-9 rounded-full border-2 border-violet-500/40 object-cover"
                />
              ) : (
                <div className="w-9 h-9 rounded-full border-2 border-violet-500/40
                                bg-gradient-to-br from-violet-600/60 to-blue-500/60
                                flex items-center justify-center">
                  <span className="text-xs font-bold text-white font-display">
                    {initials}
                  </span>
                </div>
              )}
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-teal-400
                               rounded-full border-2 border-surface-base" />
            </div>

            <div className="text-left hidden sm:block">
              <p className="text-sm font-bold text-white font-display leading-tight">
                {displayName || '—'}
              </p>
              <p className="text-[10px] text-violet-400 font-display uppercase
                            tracking-wider leading-tight">
                {roleLabel}
              </p>
            </div>

            <ChevronDown
              size={14}
              className={`text-slate-600 transition-transform duration-200
                          ${profileOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Dropdown menu */}
          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-56
                            glass-panel-elevated rounded-2xl shadow-2xl
                            border border-border-base overflow-hidden z-50
                            animate-fade-in">

              {/* User info header */}
              <div className="px-4 py-3 border-b border-border-base">
                <p className="text-sm font-semibold text-white font-display truncate">
                  {displayName}
                </p>
                <p className="text-xs text-slate-500 font-body truncate mt-0.5">
                  {user?.email}
                </p>
              </div>

              {/* Menu items */}
              <div className="p-2 space-y-0.5">
                <button
                  onClick={() => { navigate('/profile'); setProfileOpen(false) }}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl
                             text-sm text-slate-300 hover:text-white hover:bg-surface-hover
                             transition-colors font-body text-left"
                >
                  <User size={15} className="text-slate-500" />
                  My Profile
                </button>

                {role === 'CUSTOMER' && (
                  <button
                    onClick={() => { navigate('/orders'); setProfileOpen(false) }}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl
                               text-sm text-slate-300 hover:text-white hover:bg-surface-hover
                               transition-colors font-body text-left"
                  >
                    <ClipboardList size={15} className="text-slate-500" />
                    My Orders
                  </button>
                )}

                <button
                  onClick={() => { navigate('/settings'); setProfileOpen(false) }}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl
                             text-sm text-slate-300 hover:text-white hover:bg-surface-hover
                             transition-colors font-body text-left"
                >
                  <Settings size={15} className="text-slate-500" />
                  Settings
                </button>
              </div>

              {/* Logout */}
              <div className="p-2 border-t border-border-base">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl
                             text-sm text-red-400 hover:bg-red-500/10
                             transition-colors font-body text-left"
                >
                  <LogOut size={15} />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
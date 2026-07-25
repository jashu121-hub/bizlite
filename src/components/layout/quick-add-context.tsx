'use client'

import * as React from 'react'

export type QuickAddType = 'sale' | 'expense' | 'product' | 'customer'

type QuickAddContextValue = {
  activeType: QuickAddType | null
  menuOpen: boolean
  setMenuOpen: (open: boolean) => void
  openQuickAdd: (type: QuickAddType) => void
  closeQuickAdd: () => void
  requestCloseQuickAdd: () => void
  isFormOpen: boolean
  isDirty: boolean
  setIsDirty: (dirty: boolean) => void
  discardOpen: boolean
  setDiscardOpen: (open: boolean) => void
  confirmDiscard: () => void
  continueEditing: () => void
  fabButtonRef: React.RefObject<HTMLButtonElement | null>
  currency: string
}

const QuickAddContext = React.createContext<QuickAddContextValue | null>(null)

export function QuickAddProvider({
  children,
  currency,
}: {
  children: React.ReactNode
  currency: string
}) {
  const [activeType, setActiveType] = React.useState<QuickAddType | null>(null)
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [isDirty, setIsDirty] = React.useState(false)
  const [discardOpen, setDiscardOpen] = React.useState(false)
  const fabButtonRef = React.useRef<HTMLButtonElement | null>(null)

  const closeQuickAdd = React.useCallback(() => {
    setActiveType(null)
    setIsDirty(false)
    setDiscardOpen(false)
    requestAnimationFrame(() => fabButtonRef.current?.focus())
  }, [])

  const requestCloseQuickAdd = React.useCallback(() => {
    if (isDirty) {
      setDiscardOpen(true)
      return
    }
    closeQuickAdd()
  }, [closeQuickAdd, isDirty])

  const openQuickAdd = React.useCallback((type: QuickAddType) => {
    setMenuOpen(false)
    setIsDirty(false)
    setDiscardOpen(false)
    setActiveType(type)
  }, [])

  const confirmDiscard = React.useCallback(() => {
    setDiscardOpen(false)
    closeQuickAdd()
  }, [closeQuickAdd])

  const continueEditing = React.useCallback(() => {
    setDiscardOpen(false)
  }, [])

  const value = React.useMemo(
    () => ({
      activeType,
      menuOpen,
      setMenuOpen,
      openQuickAdd,
      closeQuickAdd,
      requestCloseQuickAdd,
      isFormOpen: activeType !== null,
      isDirty,
      setIsDirty,
      discardOpen,
      setDiscardOpen,
      confirmDiscard,
      continueEditing,
      fabButtonRef,
      currency,
    }),
    [
      activeType,
      menuOpen,
      openQuickAdd,
      closeQuickAdd,
      requestCloseQuickAdd,
      isDirty,
      discardOpen,
      confirmDiscard,
      continueEditing,
      currency,
    ],
  )

  return <QuickAddContext.Provider value={value}>{children}</QuickAddContext.Provider>
}

export function useQuickAdd() {
  const context = React.useContext(QuickAddContext)
  if (!context) {
    throw new Error('useQuickAdd must be used within QuickAddProvider')
  }
  return context
}

'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { useIsMobile } from '@/hooks/use-mobile'

type AdminWorkspaceContextValue = {
  isMobile: boolean
  isSidebarVisible: boolean
  isSidebarExpanded: boolean
  isFocusMode: boolean
  toggleSidebar: () => void
  showSidebar: () => void
  hideSidebar: () => void
  expandSidebarPreview: () => void
  collapseSidebarPreview: () => void
  activateFocusMode: () => void
  handleSidebarNavigation: () => void
}

const AdminWorkspaceContext = createContext<AdminWorkspaceContextValue | null>(null)

export function AdminWorkspaceProvider({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile()
  const previousIsMobileRef = useRef<boolean | null>(null)
  const [isSidebarVisible, setIsSidebarVisible] = useState(true)
  const [isSidebarPreviewVisible, setIsSidebarPreviewVisible] = useState(false)

  useEffect(() => {
    if (previousIsMobileRef.current === null) {
      previousIsMobileRef.current = isMobile
      setIsSidebarVisible(!isMobile)
      setIsSidebarPreviewVisible(false)
      return
    }

    if (previousIsMobileRef.current !== isMobile) {
      previousIsMobileRef.current = isMobile
      setIsSidebarVisible(!isMobile)
      setIsSidebarPreviewVisible(false)
    }
  }, [isMobile])

  const value = useMemo<AdminWorkspaceContextValue>(() => {
    const showSidebar = () => {
      setIsSidebarVisible(true)
      setIsSidebarPreviewVisible(false)
    }
    const hideSidebar = () => {
      setIsSidebarVisible(false)
      setIsSidebarPreviewVisible(false)
    }
    const expandSidebarPreview = () => {
      if (!isMobile && !isSidebarVisible) {
        setIsSidebarPreviewVisible(true)
      }
    }
    const collapseSidebarPreview = () => {
      setIsSidebarPreviewVisible(false)
    }
    const isSidebarExpanded = isSidebarVisible || (!isMobile && isSidebarPreviewVisible)

    return {
      isMobile,
      isSidebarVisible,
      isSidebarExpanded,
      isFocusMode: !isMobile && !isSidebarExpanded,
      toggleSidebar: () => {
        setIsSidebarPreviewVisible(false)
        setIsSidebarVisible((current) => !current)
      },
      showSidebar,
      hideSidebar,
      expandSidebarPreview,
      collapseSidebarPreview,
      activateFocusMode: hideSidebar,
      handleSidebarNavigation: hideSidebar,
    }
  }, [isMobile, isSidebarPreviewVisible, isSidebarVisible])

  return <AdminWorkspaceContext.Provider value={value}>{children}</AdminWorkspaceContext.Provider>
}

export function useAdminWorkspace() {
  const context = useContext(AdminWorkspaceContext)

  if (!context) {
    throw new Error('useAdminWorkspace must be used within an AdminWorkspaceProvider')
  }

  return context
}

export function useOptionalAdminWorkspace() {
  return useContext(AdminWorkspaceContext)
}

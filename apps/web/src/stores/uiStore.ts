import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Enhanced Types for UI State
export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number; // in milliseconds, 0 for persistent
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible?: boolean;
  timestamp: number;
}

export interface Modal {
  id: string;
  type: 'confirm' | 'alert' | 'prompt' | 'custom';
  title: string;
  message?: string;
  content?: React.ComponentType<any>;
  componentProps?: Record<string, any>;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closable?: boolean;
  backdropClosable?: boolean;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: (data?: any) => void | Promise<void>;
  onCancel?: () => void;
  zIndex?: number;
  preventClose?: boolean;
}

export interface SidebarState {
  isOpen: boolean;
  isCollapsed: boolean;
  isMobile: boolean;
  activeItem: string | null;
  hoveredItem: string | null;
  width: number;
  collapsedWidth: number;
  pinned: boolean;
}

export interface ThemeState {
  mode: 'light' | 'dark' | 'auto';
  primaryColor: string;
  accentColor: string;
  fontSize: 'sm' | 'base' | 'lg';
  borderRadius: 'none' | 'sm' | 'md' | 'lg';
  animations: boolean;
  highContrast: boolean;
}

export interface LayoutState {
  headerHeight: number;
  footerHeight: number;
  sidebarWidth: number;
  contentPadding: number;
  isFullscreen: boolean;
  showBreadcrumbs: boolean;
  pageHeader: {
    title: string;
    subtitle?: string;
    breadcrumbs?: Array<{ label: string; path?: string }>;
    actions?: React.ReactNode;
  } | null;
}

export interface LoadingState {
  global: boolean;
  components: Record<string, boolean>;
  operations: Record<string, {
    loading: boolean;
    progress?: number;
    message?: string;
  }>;
}

export interface NotificationState {
  count: number;
  items: Array<{
    id: string;
    type: 'info' | 'warning' | 'error' | 'success';
    title: string;
    message: string;
    timestamp: number;
    read: boolean;
    action?: {
      label: string;
      onClick: () => void;
    };
  }>;
  soundEnabled: boolean;
  desktopEnabled: boolean;
}

export interface UIState {
  // Sidebar state
  sidebar: SidebarState;

  // Theme state
  theme: ThemeState;

  // Layout state
  layout: LayoutState;

  // Toast state
  toasts: Toast[];

  // Modal state
  modals: Modal[];

  // Loading state
  loading: LoadingState;

  // Notification state
  notifications: NotificationState;

  // Page state
  pageTitle: string;
  pageDescription: string | null;

  // Responsive state
  screenSize: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  orientation: 'portrait' | 'landscape';

  // Keyboard navigation
  keyboardNav: boolean;
  focusedElement: string | null;

  // Accessibility
  reducedMotion: boolean;
  screenReader: boolean;

  // Performance
  renderCount: number;
  lastRenderTime: number;
}

export interface UIActions {
  // Sidebar actions
  toggleSidebar: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
  collapseSidebar: () => void;
  expandSidebar: () => void;
  setSidebarActiveItem: (item: string | null) => void;
  setSidebarHoveredItem: (item: string | null) => void;
  setSidebarWidth: (width: number) => void;
  pinSidebar: (pinned: boolean) => void;
  setMobileMode: (isMobile: boolean) => void;

  // Theme actions
  setTheme: (theme: Partial<ThemeState>) => void;
  setThemeMode: (mode: 'light' | 'dark' | 'auto') => void;
  setPrimaryColor: (color: string) => void;
  setAccentColor: (color: string) => void;
  setFontSize: (size: 'sm' | 'base' | 'lg') => void;
  setBorderRadius: (radius: 'none' | 'sm' | 'md' | 'lg') => void;
  toggleAnimations: () => void;
  toggleHighContrast: () => void;

  // Layout actions
  setLayout: (layout: Partial<LayoutState>) => void;
  setHeaderHeight: (height: number) => void;
  setFooterHeight: (height: number) => void;
  setContentPadding: (padding: number) => void;
  toggleFullscreen: () => void;
  toggleBreadcrumbs: () => void;
  setPageHeader: (header: LayoutState['pageHeader']) => void;

  // Toast actions
  addToast: (toast: Omit<Toast, 'id' | 'timestamp'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  clearToastType: (type: Toast['type']) => void;
  updateToast: (id: string, updates: Partial<Toast>) => void;

  // Modal actions
  addModal: (modal: Omit<Modal, 'id'>) => string;
  removeModal: (id: string) => void;
  clearModals: () => void;
  closeModal: (id?: string) => void;
  updateModal: (id: string, updates: Partial<Modal>) => void;

  // Loading actions
  setGlobalLoading: (loading: boolean) => void;
  setComponentLoading: (component: string, loading: boolean) => void;
  setOperationLoading: (operation: string, loading: boolean, progress?: number, message?: string) => void;
  clearComponentLoading: (component: string) => void;
  clearOperationLoading: (operation: string) => void;
  clearAllLoading: () => void;

  // Notification actions
  addNotification: (notification: Omit<NotificationState['items'][0], 'id' | 'timestamp' | 'read'>) => void;
  removeNotification: (id: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;
  setNotificationSettings: (sound: boolean, desktop: boolean) => void;

  // Page actions
  setPageTitle: (title: string) => void;
  setPageDescription: (description: string | null) => void;

  // Responsive actions
  setScreenSize: (size: UIState['screenSize']) => void;
  setOrientation: (orientation: UIState['orientation']) => void;

  // Keyboard navigation
  toggleKeyboardNav: () => void;
  setFocusedElement: (element: string | null) => void;

  // Accessibility
  setReducedMotion: (reduced: boolean) => void;
  setScreenReader: (enabled: boolean) => void;

  // Performance tracking
  incrementRenderCount: () => void;
  updateRenderTime: () => void;

  // Reset
  resetUI: () => void;
}

export interface UIStore extends UIState, UIActions { }

// Utility functions
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const getDefaultTheme = (): ThemeState => ({
  mode: 'auto',
  primaryColor: '#3b82f6',
  accentColor: '#10b981',
  fontSize: 'base',
  borderRadius: 'md',
  animations: true,
  highContrast: false
});

const getDefaultSidebar = (): SidebarState => ({
  isOpen: true,
  isCollapsed: false,
  isMobile: false,
  activeItem: null,
  hoveredItem: null,
  width: 280,
  collapsedWidth: 80,
  pinned: true
});

const getDefaultLayout = (): LayoutState => ({
  headerHeight: 64,
  footerHeight: 48,
  sidebarWidth: 280,
  contentPadding: 24,
  isFullscreen: false,
  showBreadcrumbs: true,
  pageHeader: null
});

const getScreenSize = (width: number): UIState['screenSize'] => {
  if (width < 640) return 'xs';
  if (width < 768) return 'sm';
  if (width < 1024) return 'md';
  if (width < 1280) return 'lg';
  if (width < 1536) return 'xl';
  return '2xl';
};

// Create the UI store
export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      // Initial state
      sidebar: getDefaultSidebar(),
      theme: getDefaultTheme(),
      layout: getDefaultLayout(),
      toasts: [],
      modals: [],
      loading: {
        global: false,
        components: {},
        operations: {}
      },
      notifications: {
        count: 0,
        items: [],
        soundEnabled: true,
        desktopEnabled: true
      },
      pageTitle: '',
      pageDescription: null,
      screenSize: getScreenSize(window.innerWidth),
      orientation: window.innerHeight > window.innerWidth ? 'portrait' : 'landscape',
      keyboardNav: false,
      focusedElement: null,
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      screenReader: false,
      renderCount: 0,
      lastRenderTime: Date.now(),

      // Sidebar actions
      toggleSidebar: () => set((state) => ({
        sidebar: {
          ...state.sidebar,
          isOpen: !state.sidebar.isOpen
        }
      })),

      openSidebar: () => set((state) => ({
        sidebar: {
          ...state.sidebar,
          isOpen: true
        }
      })),

      closeSidebar: () => set((state) => ({
        sidebar: {
          ...state.sidebar,
          isOpen: false
        }
      })),

      collapseSidebar: () => set((state) => ({
        sidebar: {
          ...state.sidebar,
          isCollapsed: true
        }
      })),

      expandSidebar: () => set((state) => ({
        sidebar: {
          ...state.sidebar,
          isCollapsed: false
        }
      })),

      setSidebarActiveItem: (item) => set((state) => ({
        sidebar: {
          ...state.sidebar,
          activeItem: item
        }
      })),

      setSidebarHoveredItem: (item) => set((state) => ({
        sidebar: {
          ...state.sidebar,
          hoveredItem: item
        }
      })),

      setSidebarWidth: (width) => set((state) => ({
        sidebar: {
          ...state.sidebar,
          width
        }
      })),

      pinSidebar: (pinned) => set((state) => ({
        sidebar: {
          ...state.sidebar,
          pinned
        }
      })),

      setMobileMode: (isMobile) => set((state) => ({
        sidebar: {
          ...state.sidebar,
          isMobile,
          isOpen: !isMobile && state.sidebar.pinned
        }
      })),

      // Theme actions
      setTheme: (themeUpdates) => set((state) => ({
        theme: {
          ...state.theme,
          ...themeUpdates
        }
      })),

      setThemeMode: (mode) => set((state) => ({
        theme: {
          ...state.theme,
          mode
        }
      })),

      setPrimaryColor: (color) => set((state) => ({
        theme: {
          ...state.theme,
          primaryColor: color
        }
      })),

      setAccentColor: (color) => set((state) => ({
        theme: {
          ...state.theme,
          accentColor: color
        }
      })),

      setFontSize: (size) => set((state) => ({
        theme: {
          ...state.theme,
          fontSize: size
        }
      })),

      setBorderRadius: (radius) => set((state) => ({
        theme: {
          ...state.theme,
          borderRadius: radius
        }
      })),

      toggleAnimations: () => set((state) => ({
        theme: {
          ...state.theme,
          animations: !state.theme.animations
        }
      })),

      toggleHighContrast: () => set((state) => ({
        theme: {
          ...state.theme,
          highContrast: !state.theme.highContrast
        }
      })),

      // Layout actions
      setLayout: (layoutUpdates) => set((state) => ({
        layout: {
          ...state.layout,
          ...layoutUpdates
        }
      })),

      setHeaderHeight: (height) => set((state) => ({
        layout: {
          ...state.layout,
          headerHeight: height
        }
      })),

      setFooterHeight: (height) => set((state) => ({
        layout: {
          ...state.layout,
          footerHeight: height
        }
      })),

      setContentPadding: (padding) => set((state) => ({
        layout: {
          ...state.layout,
          contentPadding: padding
        }
      })),

      toggleFullscreen: () => set((state) => ({
        layout: {
          ...state.layout,
          isFullscreen: !state.layout.isFullscreen
        }
      })),

      toggleBreadcrumbs: () => set((state) => ({
        layout: {
          ...state.layout,
          showBreadcrumbs: !state.layout.showBreadcrumbs
        }
      })),

      setPageHeader: (header) => set((state) => ({
        layout: {
          ...state.layout,
          pageHeader: header
        }
      })),

      // Toast actions
      addToast: (toastData) => {
        const id = generateId();
        const toast: Toast = {
          id,
          timestamp: Date.now(),
          duration: 5000,
          dismissible: true,
          ...toastData
        };

        set((state) => ({
          toasts: [...state.toasts, toast]
        }));

        // Auto-remove toast after duration
        if (toast.duration && toast.duration > 0) {
          setTimeout(() => {
            get().removeToast(id);
          }, toast.duration);
        }

        return id;
      },

      removeToast: (id) => set((state) => ({
        toasts: state.toasts.filter((toast) => toast.id !== id)
      })),

      clearToasts: () => set({ toasts: [] }),

      clearToastType: (type) => set((state) => ({
        toasts: state.toasts.filter((toast) => toast.type !== type)
      })),

      updateToast: (id, updates) => set((state) => ({
        toasts: state.toasts.map((toast) =>
          toast.id === id ? { ...toast, ...updates } : toast
        )
      })),

      // Modal actions
      addModal: (modalData) => {
        const id = generateId();
        const modal: Modal = {
          id,
          size: 'md',
          closable: true,
          backdropClosable: true,
          ...modalData
        };

        set((state) => ({
          modals: [...state.modals, modal]
        }));

        return id;
      },

      removeModal: (id) => set((state) => ({
        modals: state.modals.filter((modal) => modal.id !== id)
      })),

      clearModals: () => set({ modals: [] }),

      closeModal: (id) => {
        const { modals } = get();
        if (id) {
          get().removeModal(id);
        } else {
          // Close the topmost modal
          const topModal = modals[modals.length - 1];
          if (topModal) {
            get().removeModal(topModal.id);
          }
        }
      },

      updateModal: (id, updates) => set((state) => ({
        modals: state.modals.map((modal) =>
          modal.id === id ? { ...modal, ...updates } : modal
        )
      })),

      // Loading actions
      setGlobalLoading: (loading) => set((state) => ({
        loading: {
          ...state.loading,
          global: loading
        }
      })),

      setComponentLoading: (component, loading) => set((state) => ({
        loading: {
          ...state.loading,
          components: {
            ...state.loading.components,
            [component]: loading
          }
        }
      })),

      setOperationLoading: (operation, loading, progress, message) => set((state) => ({
        loading: {
          ...state.loading,
          operations: {
            ...state.loading.operations,
            [operation]: {
              loading,
              progress,
              message
            }
          }
        }
      })),

      clearComponentLoading: (component) => set((state) => {
        const newComponents = { ...state.loading.components };
        delete newComponents[component];
        return {
          loading: {
            ...state.loading,
            components: newComponents
          }
        };
      }),

      clearOperationLoading: (operation) => set((state) => {
        const newOperations = { ...state.loading.operations };
        delete newOperations[operation];
        return {
          loading: {
            ...state.loading,
            operations: newOperations
          }
        };
      }),

      clearAllLoading: () => set(() => ({
        loading: {
          global: false,
          components: {},
          operations: {}
        }
      })),

      // Notification actions
      addNotification: (notificationData) => {
        const id = generateId();
        const notification = {
          id,
          timestamp: Date.now(),
          read: false,
          ...notificationData
        };

        set((state) => ({
          notifications: {
            ...state.notifications,
            items: [...state.notifications.items, notification],
            count: state.notifications.count + 1
          }
        }));

        return id;
      },

      removeNotification: (id) => set((state) => {
        const filteredItems = state.notifications.items.filter((item) => item.id !== id);
        return {
          notifications: {
            ...state.notifications,
            items: filteredItems,
            count: filteredItems.filter((item) => !item.read).length
          }
        };
      }),

      markNotificationRead: (id) => set((state) => ({
        notifications: {
          ...state.notifications,
          items: state.notifications.items.map((item) =>
            item.id === id ? { ...item, read: true } : item
          ),
          count: Math.max(0, state.notifications.count - 1)
        }
      })),

      markAllNotificationsRead: () => set((state) => ({
        notifications: {
          ...state.notifications,
          items: state.notifications.items.map((item) => ({ ...item, read: true })),
          count: 0
        }
      })),

      clearNotifications: () => set((state) => ({
        notifications: {
          ...state.notifications,
          items: [],
          count: 0
        }
      })),

      setNotificationSettings: (sound, desktop) => set((state) => ({
        notifications: {
          ...state.notifications,
          soundEnabled: sound,
          desktopEnabled: desktop
        }
      })),

      // Page actions
      setPageTitle: (title) => set({ pageTitle: title }),
      setPageDescription: (description) => set({ pageDescription: description }),

      // Responsive actions
      setScreenSize: (size) => set({ screenSize: size }),
      setOrientation: (orientation) => set({ orientation }),

      // Keyboard navigation
      toggleKeyboardNav: () => set((state) => ({
        keyboardNav: !state.keyboardNav
      })),
      setFocusedElement: (element) => set({ focusedElement: element }),

      // Accessibility
      setReducedMotion: (reduced) => set({ reducedMotion: reduced }),
      setScreenReader: (enabled) => set({ screenReader: enabled }),

      // Performance tracking
      incrementRenderCount: () => set((state) => ({
        renderCount: state.renderCount + 1
      })),
      updateRenderTime: () => set({ lastRenderTime: Date.now() }),

      // Reset
      resetUI: () => set({
        sidebar: getDefaultSidebar(),
        theme: getDefaultTheme(),
        layout: getDefaultLayout(),
        toasts: [],
        modals: [],
        loading: {
          global: false,
          components: {},
          operations: {}
        },
        notifications: {
          count: 0,
          items: [],
          soundEnabled: true,
          desktopEnabled: true
        },
        pageTitle: '',
        pageDescription: null,
        keyboardNav: false,
        focusedElement: null
      })
    }),
    {
      name: 'ui-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        theme: state.theme,
        sidebar: {
          isCollapsed: state.sidebar.isCollapsed,
          width: state.sidebar.width,
          pinned: state.sidebar.pinned
        },
        layout: {
          contentPadding: state.layout.contentPadding,
          showBreadcrumbs: state.layout.showBreadcrumbs
        },
        notifications: {
          soundEnabled: state.notifications.soundEnabled,
          desktopEnabled: state.notifications.desktopEnabled
        },
        keyboardNav: state.keyboardNav,
        reducedMotion: state.reducedMotion
      })
    }
  )
);

// Selectors for optimized re-renders
export const useSidebar = () => useUIStore((state) => state.sidebar);
export const useTheme = () => useUIStore((state) => state.theme);
export const useLayout = () => useUIStore((state) => state.layout);
export const useToasts = () => useUIStore((state) => state.toasts);
export const useModals = () => useUIStore((state) => state.modals);
export const useLoading = () => useUIStore((state) => state.loading);
export const useNotifications = () => useUIStore((state) => state.notifications);
export const usePageInfo = () => useUIStore((state) => ({
  title: state.pageTitle,
  description: state.pageDescription
}));
export const useResponsive = () => useUIStore((state) => ({
  screenSize: state.screenSize,
  orientation: state.orientation
}));
export const useAccessibility = () => useUIStore((state) => ({
  keyboardNav: state.keyboardNav,
  reducedMotion: state.reducedMotion,
  screenReader: state.screenReader
}));

// Action hooks for common operations
export const useToastActions = () => {
  const addToast = useUIStore((state) => state.addToast);
  const removeToast = useUIStore((state) => state.removeToast);
  const clearToasts = useUIStore((state) => state.clearToasts);
  const updateToast = useUIStore((state) => state.updateToast);
  return { addToast, removeToast, clearToasts, updateToast };
};

export const useModalActions = () => useUIStore((state) => ({
  addModal: state.addModal,
  removeModal: state.removeModal,
  clearModals: state.clearModals,
  closeModal: state.closeModal,
  updateModal: state.updateModal
}));

export const useSidebarActions = () => useUIStore((state) => ({
  toggleSidebar: state.toggleSidebar,
  openSidebar: state.openSidebar,
  closeSidebar: state.closeSidebar,
  collapseSidebar: state.collapseSidebar,
  expandSidebar: state.expandSidebar,
  setSidebarActiveItem: state.setSidebarActiveItem
}));

export const useLoadingActions = () => useUIStore((state) => ({
  setGlobalLoading: state.setGlobalLoading,
  setComponentLoading: state.setComponentLoading,
  setOperationLoading: state.setOperationLoading,
  clearComponentLoading: state.clearComponentLoading,
  clearOperationLoading: state.clearOperationLoading,
  clearAllLoading: state.clearAllLoading
}));

export default useUIStore;
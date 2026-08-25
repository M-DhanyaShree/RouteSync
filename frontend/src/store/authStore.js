import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../api/axios'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isCheckingAuth: true,

      setAuth: (user, accessToken, refreshToken) => set({
        user,
        accessToken,
        refreshToken,
        isAuthenticated: true,
        isCheckingAuth: false
      }),

      logout: async () => {
        try {
          // Attempt server logout if we have a token
          if (get().accessToken) {
            await api.post('/auth/logout').catch(() => {})
          }
        } finally {
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isCheckingAuth: false
          })
          window.location.href = '/login'
        }
      },

      checkAuth: async () => {
        const { accessToken } = get()
        if (!accessToken) {
          set({ isCheckingAuth: false })
          return
        }

        try {
          const res = await api.get('/auth/me')
          set({ user: res.data.data, isAuthenticated: true, isCheckingAuth: false })
        } catch (error) {
          // The axios interceptor handles refresh logic.
          // If we end up here, refresh failed or user is invalid.
          set({ isCheckingAuth: false })
        }
      }
    }),
    {
      name: 'routesync-auth',
      partialize: (state) => ({ 
        accessToken: state.accessToken, 
        refreshToken: state.refreshToken 
      }), // Only persist tokens to localStorage
    }
  )
)

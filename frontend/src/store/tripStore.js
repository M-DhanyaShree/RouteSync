import { create } from 'zustand'

export const useTripStore = create((set) => ({
  activeTrip: null,
  driverLocation: null, // { lat, lng, heading }
  etas: [], // Array of StopETA objects

  setActiveTrip: (trip) => set({ activeTrip: trip }),
  
  updateDriverLocation: (location) => set((state) => ({
    driverLocation: location
  })),

  updateETAs: (etas) => set({ etas }),

  clearTrip: () => set({ activeTrip: null, driverLocation: null, etas: [] }),
}))

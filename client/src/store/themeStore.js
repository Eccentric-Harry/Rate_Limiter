import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Check if user has a preference for dark mode
const prefersDarkMode = 
  window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

// Create the theme store with persistence
export const useThemeStore = create(
  persist(
    (set) => ({
      // Initialize dark mode based on user preference or false as default
      darkMode: prefersDarkMode || false,
      // Toggle function to switch between dark and light mode
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
    }),
    {
      name: 'theme-storage', // Name for localStorage key
    }
  )
);

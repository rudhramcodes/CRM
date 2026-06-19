import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  sidebarOpen: true,
  theme: 'light',
  currentModule: null,
  pageTitle: 'Dashboard',
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen(state, action) {
      state.sidebarOpen = action.payload;
    },
    setTheme(state, action) {
      state.theme = action.payload;
    },
    setCurrentModule(state, action) {
      state.currentModule = action.payload;
    },
    setPageTitle(state, action) {
      state.pageTitle = action.payload;
    },
  },
});

export const { toggleSidebar, setSidebarOpen, setTheme, setCurrentModule, setPageTitle } =
  uiSlice.actions;
export default uiSlice.reducer;

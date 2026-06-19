import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import uiReducer from './uiSlice';
import { api } from '../../services/api';

const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    [api.reducerPath]: api.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(api.middleware),
  devTools: import.meta.env.DEV,
});

export default store;

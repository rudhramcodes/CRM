import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { API_BASE_URL } from '../../constants';

const initialState = {
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  isAuthenticated: !!JSON.parse(localStorage.getItem('user') || 'null'),
  loading: false,
  error: null,
  fieldErrors: [],
};

export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, credentials, {
        withCredentials: true,
      });
      const { user, accessToken } = response.data.data;
      localStorage.setItem('user', JSON.stringify(user));
      if (accessToken) localStorage.setItem('accessToken', accessToken);
      return { user };
    } catch (error) {
      const data = error.response?.data || {};
      return rejectWithValue({
        message: data.message || 'Login failed',
        errors: data.errors || [],
      });
    }
  },
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/register`, userData, {
        withCredentials: true,
      });
      const { user, accessToken } = response.data.data;
      localStorage.setItem('user', JSON.stringify(user));
      if (accessToken) localStorage.setItem('accessToken', accessToken);
      return { user };
    } catch (error) {
      const data = error.response?.data || {};
      return rejectWithValue({
        message: data.message || 'Registration failed',
        errors: data.errors || [],
      });
    }
  },
);

export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async (email, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/forgot-password`,
        { email },
        { withCredentials: true },
      );
      return response.data;
    } catch (error) {
      const data = error.response?.data || {};
      return rejectWithValue({
        message: data.message || 'Failed to send reset email',
        errors: data.errors || [],
      });
    }
  },
);

export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async ({ token, password }, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/reset-password`,
        { token, password },
        { withCredentials: true },
      );
      return response.data;
    } catch (error) {
      const data = error.response?.data || {};
      return rejectWithValue({
        message: data.message || 'Failed to reset password',
        errors: data.errors || [],
      });
    }
  },
);

export const acceptInvite = createAsyncThunk(
  'auth/acceptInvite',
  async ({ token, password }, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/client/accept-invite`,
        { token, password },
        { withCredentials: true },
      );
      return response.data;
    } catch (error) {
      const data = error.response?.data || {};
      return rejectWithValue({
        message: data.message || 'Failed to set password',
        errors: data.errors || [],
      });
    }
  },
);

export const completeOnboarding = createAsyncThunk(
  'auth/completeOnboarding',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/complete-onboarding`,
        {},
        { withCredentials: true },
      );
      return response.data;
    } catch (error) {
      const data = error.response?.data || {};
      return rejectWithValue({
        message: data.message || 'Failed to complete onboarding',
        errors: data.errors || [],
      });
    }
  },
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
    },
    setUser(state, action) {
      state.user = action.payload;
      localStorage.setItem('user', JSON.stringify(action.payload));
    },
    setCredentials(state, action) {
      state.user = action.payload.user;
      state.isAuthenticated = true;
      localStorage.setItem('user', JSON.stringify(action.payload.user));
    },
    clearError(state) {
      state.error = null;
      state.fieldErrors = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.fieldErrors = [];
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.fieldErrors = [];
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Login failed';
        state.fieldErrors = action.payload?.errors || [];
      })
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.fieldErrors = [];
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.fieldErrors = [];
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Registration failed';
        state.fieldErrors = action.payload?.errors || [];
      })
      .addCase(forgotPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.fieldErrors = [];
      })
      .addCase(forgotPassword.fulfilled, (state) => {
        state.loading = false;
        state.fieldErrors = [];
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to send reset email';
        state.fieldErrors = action.payload?.errors || [];
      })
      .addCase(resetPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.fieldErrors = [];
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.loading = false;
        state.fieldErrors = [];
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to reset password';
        state.fieldErrors = action.payload?.errors || [];
      })
      .addCase(acceptInvite.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.fieldErrors = [];
      })
      .addCase(acceptInvite.fulfilled, (state) => {
        state.loading = false;
        state.fieldErrors = [];
      })
      .addCase(acceptInvite.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to set password';
        state.fieldErrors = action.payload?.errors || [];
      })
      .addCase(completeOnboarding.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.fieldErrors = [];
      })
      .addCase(completeOnboarding.fulfilled, (state) => {
        state.loading = false;
        state.fieldErrors = [];
        if (state.user) {
          state.user = { ...state.user, onboardingCompleted: true };
          localStorage.setItem('user', JSON.stringify(state.user));
        }
      })
      .addCase(completeOnboarding.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to complete onboarding';
        state.fieldErrors = action.payload?.errors || [];
      });
  },
});

export const { logout, setUser, setCredentials, clearError } = authSlice.actions;
export default authSlice.reducer;

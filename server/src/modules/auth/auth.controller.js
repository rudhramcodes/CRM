import ApiResponse from '../../utils/ApiResponse.js';
import * as authService from './auth.service.js';
import * as authRepository from './auth.repository.js';
import ApiError from '../../utils/ApiError.js';
import { uploadBuffer } from '../../services/cloudinaryService.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
};

// /api/auth (not just /refresh-token) so logout also receives the cookie and can sign out this device only.
const REFRESH_COOKIE_PATH = '/api/auth';
// shortcut: cookie from before the path change; drop this once those 7-day cookies have expired.
const LEGACY_REFRESH_COOKIE_PATH = '/api/auth/refresh-token';

const setAuthCookies = (res, { accessToken, refreshToken }) => {
  res.cookie('accessToken', accessToken, { ...COOKIE_OPTIONS, maxAge: 15 * 60 * 1000 });
  res.cookie('refreshToken', refreshToken, {
    ...COOKIE_OPTIONS,
    path: REFRESH_COOKIE_PATH,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.clearCookie('refreshToken', { path: LEGACY_REFRESH_COOKIE_PATH });
};

// Only the mobile app gets the refresh token in the body; the browser keeps it in an HttpOnly cookie
// so page scripts can never read it.
const isMobile = (req) => req.get('x-client') === 'mobile';
const bodyRefreshToken = (req, refreshToken) => (isMobile(req) ? { refreshToken } : {});

export const register = async (req, res, next) => {
  try {
    const result = await authService.registerUser(req.body);

    setAuthCookies(res, result);

    ApiResponse.created(res, {
      user: result.user,
      accessToken: result.accessToken,
    }, 'Registration successful');
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.loginUser(email, password);

    setAuthCookies(res, result);

    ApiResponse.success(res, 200, {
      user: result.user,
      accessToken: result.accessToken,
      ...bodyRefreshToken(req, result.refreshToken),
    }, 'Login successful');
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    await authService.logoutUser(req.user._id, req.body?.refreshToken || req.cookies?.refreshToken);

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken', { path: REFRESH_COOKIE_PATH });
    res.clearCookie('refreshToken', { path: LEGACY_REFRESH_COOKIE_PATH });

    ApiResponse.success(res, 200, null, 'Logout successful');
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const refreshToken = req.body?.refreshToken || req.cookies?.refreshToken;
    const tokens = await authService.refreshAccessToken(refreshToken);

    setAuthCookies(res, tokens);

    ApiResponse.success(
      res,
      200,
      { accessToken: tokens.accessToken, ...bodyRefreshToken(req, tokens.refreshToken) },
      'Token refreshed'
    );
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await authService.getMeWithClient(req.user);
    ApiResponse.success(res, 200, { user });
  } catch (error) {
    next(error);
  }
};

export const acceptClientInvite = async (req, res, next) => {
  try {
    await authService.acceptClientInvite(req.body);
    ApiResponse.success(res, 200, null, 'Password set. You can now log in.');
  } catch (error) {
    next(error);
  }
};

export const completeOnboarding = async (req, res, next) => {
  try {
    await authService.completeOnboarding(req.user._id);
    ApiResponse.success(res, 200, null, 'Onboarding completed');
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    await authService.forgotPassword(email);
    ApiResponse.success(res, 200, null, 'If the email exists, reset instructions have been sent');
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    await authService.resetPassword(token, password);
    ApiResponse.success(res, 200, null, 'Password reset successful');
  } catch (error) {
    next(error);
  }
};

export const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.body;
    await authService.verifyEmail(token);
    ApiResponse.success(res, 200, null, 'Email verified successfully');
  } catch (error) {
    next(error);
  }
};

export const verifyEmailOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    await authService.verifyEmailOtp(email, otp);
    ApiResponse.success(res, 200, null, 'Email verified successfully');
  } catch (error) {
    next(error);
  }
};

export const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;
    await authService.resendVerification(email);
    ApiResponse.success(res, 200, null, 'If the email exists, verification instructions have been sent');
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const user = await authService.updateProfile(req.user._id, req.body);
    ApiResponse.success(res, 200, { user }, 'Profile updated');
  } catch (error) {
    next(error);
  }
};

export const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) throw ApiError.badRequest('Choose an image file');
    const { url } = await uploadBuffer(req.file.buffer, { folder: 'crm/avatars' });
    const user = await authService.updateProfile(req.user._id, { avatar: url });
    ApiResponse.success(res, 200, { user }, 'Photo updated');
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    await authService.changePassword(req.user._id, req.body.currentPassword, req.body.newPassword);
    ApiResponse.success(res, 200, null, 'Password changed');
  } catch (error) {
    next(error);
  }
};

export const addPushToken = async (req, res, next) => {
  try {
    await authRepository.addPushToken(req.user._id, req.body.token);
    ApiResponse.success(res, 200, null, 'Push notifications on');
  } catch (error) {
    next(error);
  }
};

export const removePushToken = async (req, res, next) => {
  try {
    await authRepository.removePushTokens(req.user._id, [req.body.token]);
    ApiResponse.success(res, 200, null, 'Push notifications off');
  } catch (error) {
    next(error);
  }
};

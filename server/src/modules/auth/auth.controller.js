import ApiResponse from '../../utils/ApiResponse.js';
import * as authService from './auth.service.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
};

export const register = async (req, res, next) => {
  try {
    const result = await authService.registerUser(req.body);

    res.cookie('accessToken', result.accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', result.refreshToken, {
      ...COOKIE_OPTIONS,
      path: '/api/auth/refresh-token',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

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

    res.cookie('accessToken', result.accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', result.refreshToken, {
      ...COOKIE_OPTIONS,
      path: '/api/auth/refresh-token',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    ApiResponse.success(res, 200, {
      user: result.user,
      accessToken: result.accessToken,
    }, 'Login successful');
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    await authService.logoutUser(req.user._id);

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken', { path: '/api/auth/refresh-token' });

    ApiResponse.success(res, 200, null, 'Logout successful');
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    const tokens = await authService.refreshAccessToken(refreshToken);

    res.cookie('accessToken', tokens.accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      ...COOKIE_OPTIONS,
      path: '/api/auth/refresh-token',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    ApiResponse.success(res, 200, {
      accessToken: tokens.accessToken,
    }, 'Token refreshed');
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    ApiResponse.success(res, 200, { user: req.user });
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

export const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;
    await authService.resendVerification(email);
    ApiResponse.success(res, 200, null, 'If the email exists, verification instructions have been sent');
  } catch (error) {
    next(error);
  }
};

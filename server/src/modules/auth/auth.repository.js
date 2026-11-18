import User from './auth.model.js';

export const findByEmail = async (email) => {
  return User.findOne({ email }).select('+password');
};

export const findById = async (id) => {
  return User.findById(id);
};

export const createUser = async (userData) => {
  return User.create(userData);
};

const MAX_DEVICES = 5;

// Adds newToken (dropping oldToken) in one atomic update, keeping the newest MAX_DEVICES.
// With oldToken it only matches while oldToken is still stored, so a token can be rotated once.
export const rotateRefreshToken = async (id, newToken, oldToken = null) => {
  const filter = oldToken ? { _id: id, refreshTokens: oldToken } : { _id: id };
  const kept = { $filter: { input: { $ifNull: ['$refreshTokens', []] }, cond: { $ne: ['$$this', oldToken] } } };
  return User.findOneAndUpdate(filter, [
    { $set: { refreshTokens: { $slice: [{ $concatArrays: [kept, [newToken]] }, -MAX_DEVICES] } } },
  ], { new: true });
};

export const removeRefreshToken = async (id, refreshToken) => {
  return User.findByIdAndUpdate(id, { $pull: { refreshTokens: refreshToken } });
};

export const clearRefreshTokens = async (id) => {
  return User.findByIdAndUpdate(id, { refreshTokens: [] });
};

export const findByIdWithPassword = async (id) => {
  return User.findById(id).select('+password');
};

export const findByEmailWithSecrets = async (email) => {
  return User.findOne({ email }).select(
    '+password +emailVerificationToken +emailVerificationExpires +emailVerificationAttempts +passwordResetToken +passwordResetExpires',
  );
};

export const findByIdWithSecrets = async (id) => {
  return User.findById(id).select(
    '+password +emailVerificationToken +emailVerificationExpires +emailVerificationAttempts +passwordResetToken +passwordResetExpires',
  );
};

export const findOneByToken = async (field, token) => {
  return User.findOne({ [field]: token }).select(
    '+password +emailVerificationToken +emailVerificationExpires +emailVerificationAttempts +passwordResetToken +passwordResetExpires',
  );
};

export const updateUser = async (id, data) => {
  return User.findByIdAndUpdate(id, data, { new: true, runValidators: true });
};

export const findAllUsers = async (query = {}, options = {}) => {
  const { page = 1, limit = 10, sort = '-createdAt' } = options;
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    User.find(query).sort(sort).skip(skip).limit(limit),
    User.countDocuments(query),
  ]);

  return { users, total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const deleteUserById = async (id) => {
  return User.findByIdAndDelete(id);
};

export const countByRole = async (role) => {
  return User.countDocuments({ role });
};

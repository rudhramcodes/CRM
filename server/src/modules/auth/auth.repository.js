import User from './auth.model.js';

export const findByEmail = async (email) => {
  return User.findOne({ email }).select('+password +refreshToken');
};

export const findById = async (id) => {
  return User.findById(id);
};

export const createUser = async (userData) => {
  return User.create(userData);
};

export const updateRefreshToken = async (id, refreshToken) => {
  return User.findByIdAndUpdate(id, { refreshToken }, { new: true });
};

export const findByIdWithPassword = async (id) => {
  return User.findById(id).select('+password +refreshToken');
};

export const findByEmailWithSecrets = async (email) => {
  return User.findOne({ email }).select(
    '+password +refreshToken +emailVerificationToken +emailVerificationExpires +passwordResetToken +passwordResetExpires',
  );
};

export const findByIdWithSecrets = async (id) => {
  return User.findById(id).select(
    '+password +refreshToken +emailVerificationToken +emailVerificationExpires +passwordResetToken +passwordResetExpires',
  );
};

export const findOneByToken = async (field, token) => {
  return User.findOne({ [field]: token }).select(
    '+password +refreshToken +emailVerificationToken +emailVerificationExpires +passwordResetToken +passwordResetExpires',
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

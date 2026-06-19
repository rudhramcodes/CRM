import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../../config/index.js';
import { ROLES } from '../../constants/index.js';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.EMPLOYEE,
    },
    permissions: [
      {
        type: String,
      },
    ],
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    refreshToken: {
      type: String,
      select: false,
    },
    emailVerificationToken: {
      type: String,
      select: false,
    },
    emailVerificationExpires: {
      type: Date,
      select: false,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
    avatar: {
      type: String,
      default: null,
    },
    phone: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.password;
        delete ret.refreshToken;
        delete ret.__v;
        return ret;
      },
    },
  },
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateAccessToken = function () {
  return jwt.sign({ userId: this._id, role: this.role }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign({ userId: this._id }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });
};

const User = mongoose.model('User', userSchema);

export default User;

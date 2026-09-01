import { Router } from 'express';
import { verifyToken, authorize } from '../../middleware/auth.js';
import { validate, validateQuery } from '../../middleware/validate.js';
import * as attendanceController from './attendance.controller.js';
import {
  clockInSchema,
  attendanceQuerySchema,
  attendanceUpdateSchema,
  regularizeSchema,
  regularizeActionSchema,
  createShiftSchema,
  updateShiftSchema,
  createLeaveSchema,
  leaveQuerySchema,
  leaveActionSchema,
  createHolidaySchema,
  updateHolidaySchema,
  reportQuerySchema,
} from './attendance.validation.js';

const router = Router();

router.use(verifyToken);

// --- Attendance ---

router.post(
  '/clock-in',
  authorize('super_admin', 'admin', 'manager', 'employee'),
  validate(clockInSchema),
  attendanceController.clockIn
);

router.post(
  '/clock-out',
  authorize('super_admin', 'admin', 'manager', 'employee'),
  attendanceController.clockOut
);

router.post(
  '/break/start',
  authorize('super_admin', 'admin', 'manager', 'employee'),
  attendanceController.startBreak
);

router.post(
  '/break/end',
  authorize('super_admin', 'admin', 'manager', 'employee'),
  attendanceController.endBreak
);

router.get(
  '/today',
  authorize('super_admin', 'admin', 'manager', 'employee'),
  attendanceController.getTodayStatus
);

router.get(
  '/',
  authorize('super_admin', 'admin', 'manager', 'employee'),
  validateQuery(attendanceQuerySchema),
  attendanceController.list
);

router.get(
  '/calendar/:employeeId',
  authorize('super_admin', 'admin', 'manager', 'employee'),
  attendanceController.calendar
);

router.get(
  '/stats',
  authorize('super_admin', 'admin', 'manager'),
  attendanceController.stats
);

router.patch(
  '/:id',
  authorize('super_admin', 'admin'),
  validate(attendanceUpdateSchema),
  attendanceController.manualOverride
);

// --- Regularization ---

router.post(
  '/regularize',
  authorize('super_admin', 'admin', 'manager', 'employee'),
  validate(regularizeSchema),
  attendanceController.requestRegularization
);

router.patch(
  '/:id/regularize',
  authorize('super_admin', 'admin', 'manager'),
  validate(regularizeActionSchema),
  attendanceController.approveRegularization
);

// --- Reports ---

router.get(
  '/report/daily',
  authorize('super_admin', 'admin', 'manager'),
  validateQuery(reportQuerySchema),
  attendanceController.dailyReport
);

router.get(
  '/report/weekly',
  authorize('super_admin', 'admin', 'manager'),
  validateQuery(reportQuerySchema),
  attendanceController.weeklyReport
);

router.get(
  '/report/monthly',
  authorize('super_admin', 'admin', 'manager'),
  validateQuery(reportQuerySchema),
  attendanceController.monthlyReport
);

router.post(
  '/import',
  authorize('super_admin', 'admin'),
  attendanceController.bulkImport
);

// --- Shifts ---

router.get(
  '/shifts',
  authorize('super_admin', 'admin', 'manager', 'employee'),
  attendanceController.listShifts
);

router.post(
  '/shifts',
  authorize('super_admin', 'admin'),
  validate(createShiftSchema),
  attendanceController.createShift
);

router.patch(
  '/shifts/:id',
  authorize('super_admin', 'admin'),
  validate(updateShiftSchema),
  attendanceController.updateShift
);

router.delete(
  '/shifts/:id',
  authorize('super_admin', 'admin'),
  attendanceController.deleteShift
);

// --- Leaves ---

router.get(
  '/leaves',
  authorize('super_admin', 'admin', 'manager', 'employee'),
  validateQuery(leaveQuerySchema),
  attendanceController.listLeaves
);

router.post(
  '/leaves',
  authorize('super_admin', 'admin', 'manager', 'employee'),
  validate(createLeaveSchema),
  attendanceController.applyLeave
);

router.get(
  '/leaves/balance/:employeeId',
  authorize('super_admin', 'admin', 'manager', 'employee'),
  attendanceController.getLeaveBalance
);

router.get(
  '/leaves/:id',
  authorize('super_admin', 'admin', 'manager', 'employee'),
  attendanceController.getLeaveById
);

router.patch(
  '/leaves/:id/approve',
  authorize('super_admin', 'admin', 'manager'),
  validate(leaveActionSchema),
  attendanceController.approveLeave
);

router.patch(
  '/leaves/:id/reject',
  authorize('super_admin', 'admin', 'manager'),
  validate(leaveActionSchema),
  attendanceController.rejectLeave
);

// --- Holidays ---

router.get(
  '/holidays',
  authorize('super_admin', 'admin', 'manager', 'employee'),
  attendanceController.listHolidays
);

router.post(
  '/holidays',
  authorize('super_admin', 'admin'),
  validate(createHolidaySchema),
  attendanceController.createHoliday
);

router.patch(
  '/holidays/:id',
  authorize('super_admin', 'admin'),
  validate(updateHolidaySchema),
  attendanceController.updateHoliday
);

router.delete(
  '/holidays/:id',
  authorize('super_admin', 'admin'),
  attendanceController.deleteHoliday
);

export default router;

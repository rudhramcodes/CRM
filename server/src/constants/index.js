export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
  CLIENT: 'client',
};

export const ROLES_LIST = Object.values(ROLES);

export const LEAD_STATUS = {
  NEW: 'new',
  CONTACTED: 'contacted',
  MEETING_SCHEDULED: 'meeting_scheduled',
  PROPOSAL_SENT: 'proposal_sent',
  WON: 'won',
  LOST: 'lost',
};

export const PROJECT_STATUS = {
  PLANNING: 'planning',
  ACTIVE: 'active',
  REVIEW: 'review',
  COMPLETED: 'completed',
};

export const TASK_STATUS = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  REVIEW: 'review',
  DONE: 'done',
};

export const TASK_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
};

export const INVOICE_STATUS = {
  DRAFT: 'draft',
  SENT: 'sent',
  PAID: 'paid',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled',
};

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
};

export const PAYMENT_METHODS = {
  UPI: 'upi',
  BANK_TRANSFER: 'bank_transfer',
  RAZORPAY: 'razorpay',
  STRIPE: 'stripe',
  PAYPAL: 'paypal',
  CASH: 'cash',
};

export const MEETING_STATUS = {
  SCHEDULED: 'scheduled',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

export const PERMISSIONS = {
  // User management
  USERS_READ: 'users:read',
  USERS_CREATE: 'users:create',
  USERS_UPDATE: 'users:update',
  USERS_DELETE: 'users:delete',
  USERS_MANAGE_ROLES: 'users:manage_roles',

  // Leads
  LEADS_READ: 'leads:read',
  LEADS_CREATE: 'leads:create',
  LEADS_UPDATE: 'leads:update',
  LEADS_DELETE: 'leads:delete',

  // Clients
  CLIENTS_READ: 'clients:read',
  CLIENTS_CREATE: 'clients:create',
  CLIENTS_UPDATE: 'clients:update',
  CLIENTS_DELETE: 'clients:delete',

  // Projects
  PROJECTS_READ: 'projects:read',
  PROJECTS_CREATE: 'projects:create',
  PROJECTS_UPDATE: 'projects:update',
  PROJECTS_DELETE: 'projects:delete',

  // Tasks
  TASKS_READ: 'tasks:read',
  TASKS_CREATE: 'tasks:create',
  TASKS_UPDATE: 'tasks:update',
  TASKS_DELETE: 'tasks:delete',

  // Invoices
  INVOICES_READ: 'invoices:read',
  INVOICES_CREATE: 'invoices:create',
  INVOICES_UPDATE: 'invoices:update',
  INVOICES_DELETE: 'invoices:delete',

  // Payments
  PAYMENTS_READ: 'payments:read',
  PAYMENTS_CREATE: 'payments:create',
  PAYMENTS_UPDATE: 'payments:update',

  // Meetings
  MEETINGS_READ: 'meetings:read',
  MEETINGS_CREATE: 'meetings:create',
  MEETINGS_UPDATE: 'meetings:update',
  MEETINGS_DELETE: 'meetings:delete',

  // Reports
  REPORTS_READ: 'reports:read',
  REPORTS_CREATE: 'reports:create',

  // Settings
  SETTINGS_READ: 'settings:read',
  SETTINGS_UPDATE: 'settings:update',
};

export const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS),
  [ROLES.ADMIN]: [
    PERMISSIONS.USERS_READ,
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_UPDATE,
    PERMISSIONS.LEADS_READ,
    PERMISSIONS.LEADS_CREATE,
    PERMISSIONS.LEADS_UPDATE,
    PERMISSIONS.LEADS_DELETE,
    PERMISSIONS.CLIENTS_READ,
    PERMISSIONS.CLIENTS_CREATE,
    PERMISSIONS.CLIENTS_UPDATE,
    PERMISSIONS.CLIENTS_DELETE,
    PERMISSIONS.PROJECTS_READ,
    PERMISSIONS.PROJECTS_CREATE,
    PERMISSIONS.PROJECTS_UPDATE,
    PERMISSIONS.PROJECTS_DELETE,
    PERMISSIONS.TASKS_READ,
    PERMISSIONS.TASKS_CREATE,
    PERMISSIONS.TASKS_UPDATE,
    PERMISSIONS.TASKS_DELETE,
    PERMISSIONS.INVOICES_READ,
    PERMISSIONS.INVOICES_CREATE,
    PERMISSIONS.INVOICES_UPDATE,
    PERMISSIONS.INVOICES_DELETE,
    PERMISSIONS.PAYMENTS_READ,
    PERMISSIONS.PAYMENTS_CREATE,
    PERMISSIONS.MEETINGS_READ,
    PERMISSIONS.MEETINGS_CREATE,
    PERMISSIONS.MEETINGS_UPDATE,
    PERMISSIONS.REPORTS_READ,
    PERMISSIONS.REPORTS_CREATE,
    PERMISSIONS.SETTINGS_READ,
  ],
  [ROLES.MANAGER]: [
    PERMISSIONS.USERS_READ,
    PERMISSIONS.LEADS_READ,
    PERMISSIONS.LEADS_CREATE,
    PERMISSIONS.LEADS_UPDATE,
    PERMISSIONS.CLIENTS_READ,
    PERMISSIONS.CLIENTS_CREATE,
    PERMISSIONS.CLIENTS_UPDATE,
    PERMISSIONS.PROJECTS_READ,
    PERMISSIONS.PROJECTS_CREATE,
    PERMISSIONS.PROJECTS_UPDATE,
    PERMISSIONS.TASKS_READ,
    PERMISSIONS.TASKS_CREATE,
    PERMISSIONS.TASKS_UPDATE,
    PERMISSIONS.MEETINGS_READ,
    PERMISSIONS.MEETINGS_CREATE,
    PERMISSIONS.REPORTS_READ,
  ],
  [ROLES.EMPLOYEE]: [
    PERMISSIONS.LEADS_READ,
    PERMISSIONS.LEADS_CREATE,
    PERMISSIONS.CLIENTS_READ,
    PERMISSIONS.PROJECTS_READ,
    PERMISSIONS.TASKS_READ,
    PERMISSIONS.TASKS_UPDATE,
    PERMISSIONS.MEETINGS_READ,
  ],
  [ROLES.CLIENT]: [
    PERMISSIONS.PROJECTS_READ,
    PERMISSIONS.TASKS_READ,
    PERMISSIONS.INVOICES_READ,
    PERMISSIONS.PAYMENTS_READ,
    PERMISSIONS.MEETINGS_READ,
  ],
};

export const NOTIFICATION_TYPES = {
  TASK_ASSIGNED: 'task_assigned',
  PAYMENT_RECEIVED: 'payment_received',
  INVOICE_PAID: 'invoice_paid',
  MEETING_REMINDER: 'meeting_reminder',
  LEAD_CREATED: 'lead_created',
  CONTRACT_EXPIRY: 'contract_expiry',
};

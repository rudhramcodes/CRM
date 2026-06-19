/**
 * @typedef {Object} User
 * @property {string} _id
 * @property {string} name
 * @property {string} email
 * @property {string} role
 * @property {string[]} permissions
 * @property {boolean} isEmailVerified
 * @property {string} [avatar]
 * @property {string} [phone]
 * @property {boolean} isActive
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} Lead
 * @property {string} _id
 * @property {string} name
 * @property {string} email
 * @property {string} phone
 * @property {string} company
 * @property {string} source
 * @property {string} status
 * @property {string} assignedTo
 * @property {{ _id: string, content: string, createdBy: string, createdAt: string }[]} notes
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} Client
 * @property {string} _id
 * @property {string} companyName
 * @property {string} gstNumber
 * @property {string} contactPerson
 * @property {string} email
 * @property {string} phone
 * @property {string} address
 * @property {Object[]} documents
 * @property {string} createdAt
 */

/**
 * @typedef {Object} Project
 * @property {string} _id
 * @property {string} client
 * @property {string} title
 * @property {string} status
 * @property {number} budget
 * @property {string} deadline
 * @property {string} description
 * @property {Object[]} milestones
 * @property {string[]} teamMembers
 */

/**
 * @typedef {Object} Task
 * @property {string} _id
 * @property {string} project
 * @property {string} title
 * @property {string} assignedTo
 * @property {string} priority
 * @property {string} status
 * @property {string} dueDate
 * @property {Object[]} comments
 * @property {Object[]} attachments
 */

/**
 * @typedef {Object} Invoice
 * @property {string} _id
 * @property {string} client
 * @property {number} amount
 * @property {string} status
 * @property {string} dueDate
 * @property {number} gstRate
 * @property {Object[]} items
 * @property {string} invoiceNumber
 */

/**
 * @typedef {Object} Payment
 * @property {string} _id
 * @property {string} invoice
 * @property {number} amount
 * @property {string} paymentMethod
 * @property {string} status
 * @property {string} createdAt
 */

/**
 * @typedef {Object} ApiResponse
 * @property {boolean} success
 * @property {string} message
 * @property {*} data
 * @property {Object} [pagination]
 * @property {string[]} [errors]
 */

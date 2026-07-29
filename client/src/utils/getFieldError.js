/**
 * Get error message for a specific field from fieldErrors array.
 * Returns empty string if no error exists.
 */
export const getFieldError = (fieldErrors, fieldName) => {
  if (!fieldErrors?.length) return '';
  const found = fieldErrors.find((e) => e.field === fieldName);
  return found?.message || '';
};

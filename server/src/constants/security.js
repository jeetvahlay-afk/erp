const ADMIN_ROLES = Object.freeze(['admin', 'super admin']);
const SYSTEM_ROLES = Object.freeze(['super admin', 'admin', 'user']);
const PROFILE_EDITABLE_FIELDS = Object.freeze([
  'firstName',
  'lastName',
  'phone',
  'emergencyName',
  'emergencyPhone',
  'currentAddress',
  'permanentAddress',
  'dob',
  'bloodGroup',
]);
const SENSITIVE_SETTING_PATTERN = /(password|passphrase|smtp[-_]?pass|secret|token|api[-_]?key|private[-_]?key)/i;

module.exports = {
  ADMIN_ROLES,
  SYSTEM_ROLES,
  PROFILE_EDITABLE_FIELDS,
  SENSITIVE_SETTING_PATTERN,
};

const pick = (source, allowedFields) => allowedFields.reduce((result, field) => {
  if (source && Object.prototype.hasOwnProperty.call(source, field)) {
    result[field] = source[field];
  }
  return result;
}, {});

module.exports = pick;

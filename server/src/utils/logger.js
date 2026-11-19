const serialize = (meta) => {
  if (!meta || Object.keys(meta).length === 0) return '';
  try {
    return ` ${JSON.stringify(meta)}`;
  } catch {
    return '';
  }
};

const write = (level, message, meta = {}) => {
  const line = `${new Date().toISOString()} ${level.toUpperCase()} ${message}${serialize(meta)}`;
  const stream = level === 'error' || level === 'warn' ? process.stderr : process.stdout;
  stream.write(`${line}\n`);
};

module.exports = {
  info: (message, meta) => write('info', message, meta),
  warn: (message, meta) => write('warn', message, meta),
  error: (message, meta) => write('error', message, meta),
};

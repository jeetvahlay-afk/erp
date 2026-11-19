// ponytail: process-local SSE fanout; use Redis pub/sub when the API runs on multiple instances.
const clients = new Map();

const subscribe = (userId, res) => {
  const key = String(userId);
  if (!clients.has(key)) clients.set(key, new Set());
  clients.get(key).add(res);
  return () => {
    clients.get(key)?.delete(res);
    if (!clients.get(key)?.size) clients.delete(key);
  };
};

const publish = (recipients, event, data) => {
  [...new Set((Array.isArray(recipients) ? recipients : [recipients]).filter(Boolean).map(String))]
    .forEach((recipient) => clients.get(recipient)?.forEach((res) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    }));
};

module.exports = { subscribe, publish };

const { publishEvent, subscribeEvent } = require('../redis/pubsubService');

const clients = new Map();
const SSE_CHANNEL = 'teamhub:sse:events';

// Fan out local SSE frames when a message is received from either local bus or Redis Pub/Sub
const dispatchToLocalClients = ({ recipients, event, data }) => {
  const recipientList = [...new Set((Array.isArray(recipients) ? recipients : [recipients]).filter(Boolean).map(String))];
  recipientList.forEach((recipient) => {
    const connectionSet = clients.get(recipient);
    if (!connectionSet) return;

    connectionSet.forEach((res) => {
      try {
        if (res && !res.destroyed && !res.writableEnded) {
          res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        }
      } catch {
        // Stream closed or broken connection
      }
    });
  });
};

// Initialize Pub/Sub listener
subscribeEvent(SSE_CHANNEL, dispatchToLocalClients).catch(() => {});

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
  publishEvent(SSE_CHANNEL, { recipients, event, data }).catch(() => {
    // If Pub/Sub broadcast fails, deliver locally immediately
    dispatchToLocalClients({ recipients, event, data });
  });
};

module.exports = { subscribe, publish };

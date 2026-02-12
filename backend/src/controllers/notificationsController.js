import webpush from 'web-push';
import { readFile, writeFile, mkdir, rename } from 'fs/promises';

const storageUrl = new URL('../data/subscriptions.json', import.meta.url);
const storageTempUrl = new URL('../data/subscriptions.tmp', import.meta.url);

const subscriptions = new Map();
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidEmail = process.env.VAPID_EMAIL || 'no-reply@design-diario.local';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(`mailto:${vapidEmail}`, vapidPublicKey, vapidPrivateKey);
}

const ensureVapidReady = () => {
  if (!vapidPublicKey || !vapidPrivateKey) {
    return false;
  }
  return true;
};

let storageReady = false;
let storageWriteQueue = Promise.resolve();

const ensureStorageReady = async () => {
  if (storageReady) {
    return;
  }
  try {
    await mkdir(new URL('../data/', import.meta.url), { recursive: true });
    const raw = await readFile(storageUrl, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      parsed.forEach((subscription) => {
        if (subscription?.endpoint) {
          subscriptions.set(subscription.endpoint, subscription);
        }
      });
    }
  } catch {
  } finally {
    storageReady = true;
  }
};

const persistSubscriptions = async () => {
  const payload = JSON.stringify([...subscriptions.values()], null, 2);
  storageWriteQueue = storageWriteQueue
    .then(async () => {
      await writeFile(storageTempUrl, payload, 'utf-8');
      await rename(storageTempUrl, storageUrl);
    })
    .catch(() => {});
  return storageWriteQueue;
};

const sendPayloadToSubscribers = async (payload) => {
  if (!ensureVapidReady()) {
    return { sent: 0, failed: 0, unavailable: true };
  }
  await ensureStorageReady();
  const currentSubscriptions = [...subscriptions.values()];
  const results = await Promise.allSettled(
    currentSubscriptions.map((subscription) => webpush.sendNotification(subscription, payload))
  );
  let sent = 0;
  let failed = 0;
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      sent += 1;
      return;
    }
    failed += 1;
    const subscription = currentSubscriptions[index];
    const statusCode = result.reason?.statusCode;
    if (statusCode === 404 || statusCode === 410) {
      subscriptions.delete(subscription?.endpoint);
    }
  });
  await persistSubscriptions();
  return { sent, failed };
};

export const notifySubscribers = async ({ title, body, url }) => {
  const payload = JSON.stringify({
    title,
    body,
    url,
  });
  return sendPayloadToSubscribers(payload);
};

export const notificationsController = {
  getPublicKey: async (req, res) => {
    if (!ensureVapidReady()) {
      return res.status(503).json({ error: 'VAPID keys not configured' });
    }
    return res.json({ publicKey: vapidPublicKey });
  },

  subscribe: async (req, res) => {
    if (!ensureVapidReady()) {
      return res.status(503).json({ error: 'VAPID keys not configured' });
    }
    await ensureStorageReady();
    const subscription = req.body;
    if (!subscription?.endpoint) {
      return res.status(400).json({ error: 'Invalid subscription' });
    }
    subscriptions.set(subscription.endpoint, subscription);
    await persistSubscriptions();
    return res.json({ ok: true });
  },

  unsubscribe: async (req, res) => {
    await ensureStorageReady();
    const { endpoint } = req.body || {};
    if (endpoint) {
      subscriptions.delete(endpoint);
      await persistSubscriptions();
    }
    return res.json({ ok: true });
  },

  sendTest: async (req, res) => {
    const payload = JSON.stringify({
      title: 'Design Diário',
      body: 'Novos artigos disponíveis',
      url: '/',
    });
    const result = await sendPayloadToSubscribers(payload);
    if (result.unavailable) {
      return res.status(503).json({ error: 'VAPID keys not configured' });
    }
    return res.json(result);
  },
};

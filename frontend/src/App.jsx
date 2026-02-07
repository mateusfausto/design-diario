import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigation } from './components/Navigation';
import { ArticlesPage } from './pages/ArticlesPage';
import { FavoritesPage } from './pages/FavoritesPage';
import { useStore } from './store/useStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const toBase64Uint8 = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
};

const apiBaseUrl = import.meta.env.VITE_API_URL || '/api';
const apiUrl = (path) => {
  const normalizedBase = apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (normalizedBase.startsWith('http://') || normalizedBase.startsWith('https://')) {
    return new URL(`${normalizedBase}${normalizedPath}`).toString();
  }
  return `${normalizedBase}${normalizedPath}`;
};

function App() {
  const selectedView = useStore((state) => state.selectedView);
  const theme = useStore((state) => state.theme);
  const setTheme = useStore((state) => state.setTheme);
  const [notificationPermission, setNotificationPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [showNotificationBanner, setShowNotificationBanner] = useState(true);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState('');
  const [serverSubscriptionOk, setServerSubscriptionOk] = useState(false);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(true);

  useEffect(() => {
    document.body.classList.toggle('theme-dark', theme === 'dark');
    document.body.classList.toggle('theme-light', theme === 'light');
  }, [theme]);

  useEffect(() => {
    const syncTheme = () => {
      try {
        const storedTheme = localStorage.getItem('app_theme');
        if ((storedTheme === 'dark' || storedTheme === 'light') && storedTheme !== theme) {
          setTheme(storedTheme);
        }
      } catch {
        return;
      }
    };
    const handleStorage = (event) => {
      if (event.key === 'app_theme') {
        syncTheme();
      }
    };
    syncTheme();
    window.addEventListener('focus', syncTheme);
    window.addEventListener('online', syncTheme);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('focus', syncTheme);
      window.removeEventListener('online', syncTheme);
      window.removeEventListener('storage', handleStorage);
    };
  }, [setTheme, theme]);

  useEffect(() => {
    const refreshPermission = () => {
      if (typeof Notification === 'undefined') {
        return;
      }
      setNotificationPermission(Notification.permission);
    };
    refreshPermission();
    window.addEventListener('focus', refreshPermission);
    return () => {
      window.removeEventListener('focus', refreshPermission);
    };
  }, []);

  useEffect(() => {
    const setupPeriodicSync = async () => {
      if (!('serviceWorker' in navigator)) {
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      if ('sync' in registration) {
        try {
          await registration.sync.register('refresh-articles');
        } catch {
          return;
        }
      }
      if (!('periodicSync' in registration)) {
        return;
      }
      try {
        await registration.periodicSync.register('refresh-articles', {
          minInterval: 6 * 60 * 60 * 1000,
        });
      } catch {
        return;
      }
    };
    setupPeriodicSync();
  }, []);

  useEffect(() => {
    const resendSubscription = async () => {
      setIsCheckingSubscription(true);
      if (!('serviceWorker' in navigator) || notificationPermission !== 'granted') {
        setServerSubscriptionOk(false);
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        const response = await fetch(apiUrl('/notifications/subscribe'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(existingSubscription),
        });
        if (response.ok) {
          setServerSubscriptionOk(true);
          setSubscriptionError('');
        } else {
          setServerSubscriptionOk(false);
          setSubscriptionError('Falha ao registrar notificação');
        }
        return;
      }
      const response = await fetch(apiUrl('/notifications/public-key'));
      if (!response.ok) {
        setServerSubscriptionOk(false);
        return;
      }
      const { publicKey } = await response.json();
      if (!publicKey) {
        setServerSubscriptionOk(false);
        return;
      }
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: toBase64Uint8(publicKey),
      });
      const subscribeResponse = await fetch(apiUrl('/notifications/subscribe'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      });
      if (subscribeResponse.ok) {
        setServerSubscriptionOk(true);
        setSubscriptionError('');
      } else {
        setServerSubscriptionOk(false);
        setSubscriptionError('Falha ao registrar notificação');
      }
    };
    resendSubscription()
      .catch((error) => {
        setServerSubscriptionOk(false);
        setSubscriptionError(error?.message || 'Falha ao registrar notificação');
      })
      .finally(() => {
        setIsCheckingSubscription(false);
      });
  }, [notificationPermission]);

  const handleEnableNotifications = useCallback(async () => {
    if (isSubscribing) {
      return;
    }
    setSubscriptionError('');
    setIsSubscribing(true);
    try {
      if (!('serviceWorker' in navigator)) {
        throw new Error('Service worker indisponível');
      }
      if (Notification.permission === 'denied') {
        throw new Error('Permissão bloqueada no navegador');
      }
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission !== 'granted') {
        return;
      }
      const response = await fetch(apiUrl('/notifications/public-key'));
      if (!response.ok) {
        throw new Error('Notificações indisponíveis no servidor');
      }
      const { publicKey } = await response.json();
      if (!publicKey) {
        throw new Error('Chave pública inválida');
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: toBase64Uint8(publicKey),
      });
      const subscribeResponse = await fetch(apiUrl('/notifications/subscribe'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      });
      if (!subscribeResponse.ok) {
        throw new Error('Falha ao registrar notificação');
      }
      setServerSubscriptionOk(true);
      setShowNotificationBanner(false);
    } catch (error) {
      setSubscriptionError(error?.message || 'Falha ao ativar notificações');
      setServerSubscriptionOk(false);
    } finally {
      setIsSubscribing(false);
    }
  }, [isSubscribing]);

  const showNotificationPermissionBanner = useMemo(() => {
    if (!showNotificationBanner) {
      return false;
    }
    if (isCheckingSubscription) {
      return false;
    }
    if (notificationPermission === 'granted') {
      return !serverSubscriptionOk;
    }
    return true;
  }, [notificationPermission, showNotificationBanner, serverSubscriptionOk, isCheckingSubscription]);

  const notificationSubtitle =
    notificationPermission === 'denied'
      ? 'Permissão bloqueada no navegador. Reative nas configurações do site.'
      : 'Receba alertas quando novos artigos chegarem';

  return (
    <QueryClientProvider client={queryClient}>
      <div className="d-flex flex-column h-100 app-wrapper">
        {showNotificationPermissionBanner && (
          <div className="pwa-banner-stack">
            {showNotificationPermissionBanner && (
              <div className="pwa-banner">
                <div>
                  <strong>Ative notificações</strong>
                  <span className="pwa-banner-subtitle">{notificationSubtitle}</span>
                  {subscriptionError && (
                    <span className="pwa-banner-error">{subscriptionError}</span>
                  )}
                </div>
                <div className="pwa-banner-actions">
                  <button
                    className="btn btn-light btn-sm"
                    onClick={handleEnableNotifications}
                    disabled={isSubscribing}
                  >
                    {isSubscribing ? 'Ativando...' : 'Ativar'}
                  </button>
                  <button
                    className="btn btn-outline-light btn-sm"
                    onClick={() => setShowNotificationBanner(false)}
                  >
                    Agora não
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        <div className="d-flex h-100 app-shell">
          <Navigation />
          <main className="flex-grow-1 d-flex flex-column overflow-hidden content-area">
            {selectedView === 'articles' && <ArticlesPage />}
            {selectedView === 'favorites' && <FavoritesPage />}
          </main>
        </div>
      </div>
    </QueryClientProvider>
  );
}

export default App;

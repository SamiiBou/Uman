import { useEffect } from 'react';
import { MiniKit, Permission } from '@worldcoin/minikit-js';

export default function AskNotifPermission() {
  useEffect(() => {
    const ask = async () => {
      if (!MiniKit.isInstalled()) return;  // on s’assure d’être dans World App
      try {
        const res = await MiniKit.commandsAsync.requestPermission({
          permission: Permission.Notifications,
        });
        console.log('[notif] payload', res);
        if (res.status === 'success') {
          localStorage.setItem('notification_permission_granted', 'true');
        }
      } catch (err) {
        console.error('[notif] error', err);
      }
    };

    // Si MiniKit est déjà prêt (v1.8+), on lance tout de suite
    if (window?.MiniKitReady) {
      ask();
    } else {
      // sinon on attend l’évènement minikit#ready
      window.addEventListener('minikit#ready', ask, { once: true });
    }
  }, []);

  return null;
}

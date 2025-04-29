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
          
              if (res.status === 'success') {
                console.info('[notif] success 🎉', res);
                localStorage.setItem('notification_permission_granted', 'true');
              } else {
                console.warn('[notif] failed', res); // res.error_code contient la raison
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

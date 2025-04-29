import { useEffect } from 'react';
import { MiniKit, Permission } from '@worldcoin/minikit-js';

/**
 * Affiche dans la console tous les signaux utiles pour déboguer
 * les notifications MiniKit.
 */
export default function useDebugNotifications() {
  useEffect(() => {
    (async () => {
      console.group('%c[Notif-Debug]', 'color:#f87a06;font-weight:bold');

      // 0. Contexte
      console.log('User-Agent:', navigator.userAgent);
      console.log('MiniKit installed:', MiniKit.isInstalled());
      console.log('MiniKit version:', MiniKit?.version);
      console.log(
        'localStorage.notification_permission_granted:',
        localStorage.getItem('notification_permission_granted')
      );

      if (!MiniKit.isInstalled()) {
        console.warn('MiniKit is NOT installed in this context ➜ pas de permission possible.');
        console.groupEnd();
        return;
      }

      // 1. État courant des permissions
      try {
        const permPayload = await MiniKit.commandsAsync.getPermissions();
        console.log('getPermissions() returned:', permPayload);
      } catch (err) {
        console.error('getPermissions() error:', err);
      }

      // 2. Tentative de demande (sera silencieuse si already_granted/already_requested)
      try {
        const res = await MiniKit.commandsAsync.requestPermission({
          permission: Permission.Notifications,
        });
        console.log('requestPermission() response:', res);
      } catch (err) {
        console.error('requestPermission() threw:', err);
      }

      console.groupEnd();
    })();
  }, []);
}

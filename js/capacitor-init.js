/* ============================================
   LifeOS — Capacitor Native Bridge
   Initializes native plugins when running
   inside a Capacitor shell (iOS/Android)
   ============================================ */

(function() {
  'use strict';
  
  // Detect if running in Capacitor
  const isNative = typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform();
  
  window.LifeOSNative = {
    isNative,
    platform: isNative ? window.Capacitor.getPlatform() : 'web',
    
    // Camera helper for food scanning
    async takePhoto() {
      if (!isNative) {
        // Web fallback: use file input
        return new Promise((resolve) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.capture = 'environment';
          input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = () => resolve({ base64: reader.result.split(',')[1], format: 'jpeg' });
              reader.readAsDataURL(file);
            } else {
              resolve(null);
            }
          };
          input.click();
        });
      }
      
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
      try {
        const photo = await Camera.getPhoto({
          quality: 80,
          allowEditing: false,
          resultType: CameraResultType.Base64,
          source: CameraSource.Camera,
          width: 1024,
          height: 1024,
        });
        return { base64: photo.base64String, format: photo.format };
      } catch (err) {
        console.warn('Camera capture cancelled or failed:', err);
        return null;
      }
    },
    
    // Haptic feedback
    async vibrate() {
      if (!isNative) return;
      try {
        const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
        await Haptics.impact({ style: ImpactStyle.Medium });
      } catch (err) {
        // Silently fail
      }
    },
    
    // Status bar configuration
    async configureStatusBar() {
      if (!isNative) return;
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#0f0e17' });
      } catch (err) {
        // Silently fail
      }
    },
    
    // Open URLs in system browser
    async openExternal(url) {
      if (!isNative) {
        window.open(url, '_blank');
        return;
      }
      try {
        const { Browser } = await import('@capacitor/browser');
        await Browser.open({ url });
      } catch (err) {
        window.open(url, '_blank');
      }
    }
  };
  
  // Auto-configure on load
  if (isNative) {
    document.addEventListener('DOMContentLoaded', () => {
      window.LifeOSNative.configureStatusBar();
      console.log(`📱 LifeOS running natively on ${window.LifeOSNative.platform}`);
    });
  }
})();

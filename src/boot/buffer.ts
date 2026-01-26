import { Buffer } from 'buffer';
import { boot } from 'quasar/wrappers';

export default boot(() => {
  if (typeof window !== 'undefined') {
    // Expose Buffer globally for libraries that expect Node.js Buffer
    (window as unknown as { Buffer?: typeof Buffer }).Buffer =
      (window as unknown as { Buffer?: typeof Buffer }).Buffer || Buffer;
  }
});

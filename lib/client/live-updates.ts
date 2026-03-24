const COMPLAINT_FEED_EVENT = 'govcrm:complaints-updated';

export function emitComplaintFeedChanged() {
  if (typeof window === 'undefined') {
    return;
  }

  const timestamp = String(Date.now());
  window.localStorage.setItem(COMPLAINT_FEED_EVENT, timestamp);
  window.dispatchEvent(new CustomEvent(COMPLAINT_FEED_EVENT, { detail: timestamp }));
}

export function subscribeComplaintFeedChanged(callback: () => void) {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === COMPLAINT_FEED_EVENT) {
      callback();
    }
  };

  const handleWindowEvent = () => {
    callback();
  };

  window.addEventListener('storage', handleStorage);
  window.addEventListener(COMPLAINT_FEED_EVENT, handleWindowEvent as EventListener);

  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener(COMPLAINT_FEED_EVENT, handleWindowEvent as EventListener);
  };
}

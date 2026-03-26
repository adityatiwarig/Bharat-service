const COMPLAINT_FEED_EVENT = 'govcrm:complaints-updated';
let complaintFeedWriteTimer: number | null = null;
let lastComplaintFeedTimestamp = '';

export function emitComplaintFeedChanged() {
  if (typeof window === 'undefined') {
    return;
  }

  const timestamp = String(Date.now());
  lastComplaintFeedTimestamp = timestamp;

  if (complaintFeedWriteTimer !== null) {
    return;
  }

  complaintFeedWriteTimer = window.setTimeout(() => {
    complaintFeedWriteTimer = null;

    try {
      window.localStorage.setItem(COMPLAINT_FEED_EVENT, lastComplaintFeedTimestamp);
    } catch {
      // Ignore client storage persistence failures and still notify the current tab.
    }

    window.dispatchEvent(new CustomEvent(COMPLAINT_FEED_EVENT, { detail: lastComplaintFeedTimestamp }));
  }, 120);
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

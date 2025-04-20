class NativeEventEmitter {
  constructor() {
    this.listeners = new Map();
  }

  addListener(eventType, listener) {
    const subscription = {
      remove: () => {
        const listeners = this.listeners.get(eventType) || [];
        const index = listeners.indexOf(listener);

        if (index !== -1) {
          listeners.splice(index, 1);
        }
      },
    };

    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }

    this.listeners.get(eventType).push(listener);

    return subscription;
  }

  emit(eventType, ...args) {
    const listeners = this.listeners.get(eventType) || [];

    listeners.forEach(listener => listener(...args));
  }

  removeAllListeners(eventType) {
    if (eventType) {
      this.listeners.delete(eventType);
    } else {
      this.listeners.clear();
    }
  }
}

module.exports = NativeEventEmitter;

if (typeof chrome === 'undefined' || !chrome.storage) {
  window.chrome = {
    runtime: {
      getURL: (path) => path,
      sendMessage: () => Promise.resolve(),
      onInstalled: { addListener: () => {} }
    },
    storage: {
      local: {
        get: (keys, callback) => {
          const data = {};
          if (keys === null) {
            Object.keys(localStorage).forEach(k => {
              try { data[k] = JSON.parse(localStorage.getItem(k)); } catch(e) { data[k] = localStorage.getItem(k); }
            });
          } else if (Array.isArray(keys)) {
            keys.forEach(k => {
              try { data[k] = JSON.parse(localStorage.getItem(k)); } catch(e) { data[k] = localStorage.getItem(k); }
            });
          } else if (typeof keys === 'string') {
            try { data[keys] = JSON.parse(localStorage.getItem(keys)); } catch(e) { data[keys] = localStorage.getItem(keys); }
          }
          callback(data);
        },
        set: (data, callback) => {
          Object.keys(data).forEach(k => {
            localStorage.setItem(k, JSON.stringify(data[k]));
          });
          if (callback) callback();
        },
        remove: (keys, callback) => {
          if (Array.isArray(keys)) {
            keys.forEach(k => localStorage.removeItem(k));
          } else {
            localStorage.removeItem(keys);
          }
          if (callback) callback();
        }
      }
    },
    tabs: {
      create: (options) => { console.log('Mock Tab Created:', options); },
      query: (queryInfo, callback) => { callback([]); }
    }
  };
}

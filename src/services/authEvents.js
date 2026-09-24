// api.js se logout signal bhejne ke liye simple event bus.
// AuthContext (ya jahan bhi auth/navigation state hai) isko subscribe karega.

let listeners = [];

export const onForceLogout = (callback) => {
  listeners.push(callback);
  return () => { listeners = listeners.filter(l => l !== callback); }; // unsubscribe
};

export const emitForceLogout = () => {
  listeners.forEach(l => l());
};
import { Alert } from 'react-native';

// Har word ka pehla letter capital. Email/URL jaise tokens ko nahi chhedta.
export const titleCase = (s) => {
  if (typeof s !== 'string') return s;
  return s.replace(/(^|\s)(\S+)/g, (m, sp, w) =>
    sp + (w.includes('@') || w.startsWith('http') ? w : w.replace(/^([("]*)([a-z])/, (x, pre, c) => pre + c.toUpperCase()))
  );
};

// Ek baar install karo: poori app ke saare Alert.alert (title, message, buttons) Title Case ho jate hain
let installed = false;
export const installTitleCaseAlerts = () => {
  if (installed) return;
  installed = true;
  const orig = Alert.alert.bind(Alert);
  Alert.alert = (title, message, buttons, options) =>
    orig(
      titleCase(title),
      titleCase(message),
      Array.isArray(buttons) ? buttons.map(b => ({ ...b, text: titleCase(b.text) })) : buttons,
      options
    );
};
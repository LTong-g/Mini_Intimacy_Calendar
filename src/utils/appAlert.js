import { Alert as NativeAlert } from 'react-native';

let showAlertHandler = null;

export const APP_ALERT_THEMES = {
  default: {
    primary: '#007AFF',
    primaryDisabled: '#cfcfcf',
    secondary: '#444',
    secondaryBorder: '#d0d0d0',
    secondaryBackground: '#f2f2f2',
    danger: '#C62828',
    title: '#333',
    message: '#444',
  },
  blacklist: {
    primary: '#F57F17',
    primaryDisabled: '#F6E7C4',
    secondary: '#8A4B00',
    secondaryBorder: '#F4D79A',
    secondaryBackground: '#fff',
    danger: '#C62828',
    title: '#5F4300',
    message: '#5F4300',
  },
};

export const setAppAlertHandler = (handler) => {
  showAlertHandler = handler;
};

export const showAppAlert = (title, message, buttons, options = {}) => {
  if (showAlertHandler) {
    showAlertHandler({ title, message, buttons, options });
    return;
  }

  const { theme, ...nativeOptions } = options;
  NativeAlert.alert(title, message, buttons, nativeOptions);
};

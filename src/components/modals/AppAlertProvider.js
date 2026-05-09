import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
} from 'react-native';
import BaseModal from './BaseModal';
import ModalActionRow from './ModalActionRow';
import {
  APP_ALERT_THEMES,
  setAppAlertHandler,
} from '../../utils/appAlert';

const normalizeButtons = (buttons) => {
  if (Array.isArray(buttons) && buttons.length > 0) return buttons;
  return [{ text: '知道了' }];
};

const AppAlertProvider = ({ children }) => {
  const [alertState, setAlertState] = useState(null);

  const showAlert = useCallback((nextAlert) => {
    setAlertState(nextAlert);
  }, []);

  useEffect(() => {
    setAppAlertHandler(showAlert);
    return () => setAppAlertHandler(null);
  }, [showAlert]);

  const options = alertState?.options || {};
  const themeName = options.theme || 'default';
  const theme = APP_ALERT_THEMES[themeName] || APP_ALERT_THEMES.default;
  const canDismiss = options.cancelable !== false;
  const buttons = useMemo(
    () => normalizeButtons(alertState?.buttons),
    [alertState?.buttons]
  );

  const closeAlert = () => {
    setAlertState(null);
  };

  const dismissAlert = () => {
    const cancelButton = buttons.find((button) => button.style === 'cancel');
    closeAlert();
    if (cancelButton?.onPress) cancelButton.onPress();
  };

  const actions = buttons.map((button, index) => {
    const style = button.style;
    const isCancel = style === 'cancel';
    const isDestructive = style === 'destructive';
    const isPreferred = !isCancel && (buttons.length === 1 || index === buttons.length - 1);

    return {
      label: button.text || (isCancel ? '取消' : '确定'),
      variant: isDestructive ? 'danger' : isPreferred ? 'primary' : 'secondary',
      onPress: () => {
        closeAlert();
        if (button.onPress) button.onPress();
      },
    };
  });

  return (
    <>
      {children}
      <BaseModal
        visible={Boolean(alertState)}
        onRequestClose={canDismiss ? dismissAlert : () => {}}
        closeOnBackdropPress={canDismiss}
        title={alertState?.title}
        titleStyle={[styles.title, { color: theme.title }]}
      >
        {alertState?.message ? (
          <Text style={[styles.message, { color: theme.message }]}>
            {alertState.message}
          </Text>
        ) : null}
        <ModalActionRow theme={theme} actions={actions} />
      </BaseModal>
    </>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 10,
  },
  message: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 8,
  },
});

export default AppAlertProvider;

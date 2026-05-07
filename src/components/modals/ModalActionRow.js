import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const DEFAULT_THEME = {
  primary: '#007AFF',
  primaryDisabled: '#cfcfcf',
  secondary: '#444',
  secondaryBorder: '#d0d0d0',
  secondaryBackground: '#f2f2f2',
  danger: '#C62828',
};

const ModalActionRow = ({
  actions,
  theme = DEFAULT_THEME,
  style,
  buttonStyle,
  textStyle,
}) => {
  const colors = { ...DEFAULT_THEME, ...theme };

  return (
    <View style={[styles.actions, style]}>
      {actions.map((action) => {
        const variant = action.variant || 'primary';
        const disabled = Boolean(action.disabled);
        const isSecondary = variant === 'secondary';
        const isDanger = variant === 'danger';
        const backgroundColor = disabled
          ? colors.primaryDisabled
          : isSecondary
            ? colors.secondaryBackground
            : isDanger
              ? colors.danger
              : colors.primary;
        const borderColor = isSecondary ? colors.secondaryBorder : backgroundColor;
        const color = isSecondary ? colors.secondary : '#fff';

        return (
          <TouchableOpacity
            key={action.label}
            style={[
              styles.button,
              { backgroundColor, borderColor },
              action.flex && styles.flexButton,
              buttonStyle,
              action.style,
            ]}
            onPress={action.onPress}
            disabled={disabled}
          >
            <Text style={[styles.text, { color }, textStyle, action.textStyle]}>
              {action.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  button: {
    minWidth: 72,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
  },
  flexButton: {
    flex: 1,
  },
  text: {
    fontSize: 14,
  },
});

export default ModalActionRow;

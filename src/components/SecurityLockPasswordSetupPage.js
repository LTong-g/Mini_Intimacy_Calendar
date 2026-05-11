import React from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';
import MemoTextEditorLayout from './MemoTextEditorLayout';

const SecurityLockPasswordSetupPage = ({
  password,
  saving,
  onPasswordChange,
  onClose,
  onSave,
}) => (
  <MemoTextEditorLayout
    title="设置密码"
    onClose={onClose}
    onSave={onSave}
    saveDisabled={saving}
    scroll={false}
  >
    <Text style={styles.guide}>
      这里使用笔记新建界面设置密码。以后在极简备忘录中新建笔记，正文完全等于密码并点击保存，就会进入实际应用；不匹配时会按普通笔记保存。
    </Text>
    <TextInput
      value={password}
      onChangeText={onPasswordChange}
      style={styles.bodyInput}
      multiline
      textAlignVertical="top"
      placeholder="输入密码"
    />
  </MemoTextEditorLayout>
);

const styles = StyleSheet.create({
  guide: {
    fontSize: 13,
    lineHeight: 21,
    color: '#666',
    marginBottom: 16,
  },
  bodyInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
});

export default SecurityLockPasswordSetupPage;

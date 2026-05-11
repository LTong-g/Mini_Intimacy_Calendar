import React, { useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import MemoTextEditorLayout from '../components/MemoTextEditorLayout';
import { showAppAlert } from '../../../shared/utils/appAlert';
import { enableSecurityLock } from '../utils/securityLockStorage';

const SecurityLockPasswordSetupScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const setupMode = route.params?.mode || 'enable';
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleClose = () => {
    navigation.goBack();
  };

  const handleSave = async () => {
    if (!password) {
      showAppAlert('无法保存', '密码不能为空');
      return;
    }
    try {
      setSaving(true);
      await enableSecurityLock(password);
      navigation.goBack();
      if (setupMode === 'modify') {
        showAppAlert('密码已更新', '新的密码已生效');
      } else {
        showAppAlert('安全锁已开启', '下次启动应用时会先进入极简备忘录');
      }
    } catch (error) {
      showAppAlert('开启失败', error.message || '无法开启安全锁');
    } finally {
      setSaving(false);
    }
  };

  return (
    <MemoTextEditorLayout
      title="设置密码"
      onClose={handleClose}
      onSave={handleSave}
      saveDisabled={saving}
      scroll={false}
    >
      <Text style={styles.guide}>
        这里使用笔记新建界面设置密码。以后在极简备忘录中新建笔记，正文完全等于密码并点击保存，就会进入实际应用；不匹配时会按普通笔记保存。
      </Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        style={styles.bodyInput}
        multiline
        textAlignVertical="top"
        placeholder="输入密码"
      />
    </MemoTextEditorLayout>
  );
};

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

export default SecurityLockPasswordSetupScreen;

import React, { useCallback, useEffect, useState } from 'react';
import {
  AppState,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import BaseModal from '../components/modals/BaseModal';
import ModalActionRow from '../components/modals/ModalActionRow';
import { showAppAlert } from '../utils/appAlert';
import {
  disableSecurityLock,
  enableSecurityLock,
  getSecurityLockState,
  synchronizeSecurityLockLauncherMode,
} from '../utils/securityLockStorage';

const ENABLE_CONFIRM_TEXT = '我已知晓安全锁风险';

const SWITCH_COLORS = {
  track: { false: '#D1D5DB', true: '#007AFF' },
  thumb: '#F1F5F9',
  iosBackground: '#D1D5DB',
};

const SWITCH_COLOR_PROPS = {
  trackColor: SWITCH_COLORS.track,
  thumbColor: SWITCH_COLORS.thumb,
  ios_backgroundColor: SWITCH_COLORS.iosBackground,
};

const SecurityLockScreen = () => {
  const navigation = useNavigation();
  const [securityState, setSecurityState] = useState({ enabled: false });
  const [pendingEnabled, setPendingEnabled] = useState(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [setupVisible, setSetupVisible] = useState(false);
  const [setupMode, setSetupMode] = useState('enable');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const securitySwitchOn = pendingEnabled ?? securityState.enabled;

  const refresh = useCallback(async () => {
    const nextState = await getSecurityLockState();
    setSecurityState(nextState);
    setPendingEnabled(null);
    synchronizeSecurityLockLauncherMode(nextState).catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refresh();
      }
    });
    return () => subscription.remove();
  }, [refresh]);

  const openEnableConfirm = () => {
    setConfirmText('');
    setConfirmVisible(true);
  };

  const closeEnableConfirm = () => {
    setPendingEnabled(null);
    setConfirmVisible(false);
  };

  const openModifyConfirm = () => {
    showAppAlert(
      '修改密码',
      '修改后，旧的密码将不再生效。请设置不容易误写成普通笔记的内容。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '继续',
          onPress: () => {
            setPassword('');
            setSetupMode('modify');
            setSetupVisible(true);
          },
        },
      ]
    );
  };

  const handleStartSetup = () => {
    if (confirmText !== ENABLE_CONFIRM_TEXT) {
      showAppAlert('确认内容不正确', `请完整输入“${ENABLE_CONFIRM_TEXT}”后继续`);
      return;
    }
    setConfirmVisible(false);
    setPassword('');
    setSetupMode('enable');
    setSetupVisible(true);
  };

  const handleSavePassword = async () => {
    if (!password) {
      showAppAlert('无法保存', '密码不能为空');
      return;
    }
    try {
      setSaving(true);
      await enableSecurityLock(password);
      setSetupVisible(false);
      setPassword('');
      await refresh();
      if (setupMode === 'modify') {
        showAppAlert('密码已更新', '新的密码已生效');
      } else {
        showAppAlert('安全锁已开启', '下次启动应用时会先进入极简备忘录');
      }
    } catch (error) {
      setPendingEnabled(null);
      showAppAlert('开启失败', error.message || '无法开启安全锁');
    } finally {
      setSaving(false);
    }
  };

  const closeSetup = () => {
    if (!securityState.enabled) {
      setPendingEnabled(null);
    }
    setSetupVisible(false);
  };

  const handleDisable = () => {
    showAppAlert(
      '关闭安全锁',
      '关闭后将恢复普通启动入口，并恢复原桌面名称和图标。',
      [
        { text: '取消', style: 'cancel', onPress: () => setPendingEnabled(null) },
        {
          text: '关闭',
          onPress: async () => {
            try {
              await disableSecurityLock();
              await refresh();
              showAppAlert('已关闭', '安全锁已关闭');
            } catch (error) {
              setPendingEnabled(null);
              showAppAlert('关闭失败', error.message || '无法关闭安全锁');
            }
          },
        },
      ]
    );
  };

  const handleToggle = (enabled) => {
    if (enabled) {
      setPendingEnabled(true);
      requestAnimationFrame(openEnableConfirm);
    } else {
      setPendingEnabled(false);
      requestAnimationFrame(handleDisable);
    }
  };

  if (setupVisible) {
    return (
      <View style={styles.editorContainer}>
        <View style={styles.header}>
          <TouchableOpacity onPress={closeSetup} style={styles.backButton}>
            <Ionicons name="close" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>设置密码</Text>
          <TouchableOpacity disabled={saving} onPress={handleSavePassword}>
            <Text style={styles.saveText}>保存</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.editorContent}>
          <Text style={styles.editorGuide}>
            这里使用笔记新建界面设置密码。以后在极简备忘录中新建笔记，正文完全等于密码并点击保存，就会进入实际应用；不匹配时会按普通笔记保存。
          </Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            style={styles.memoBodyInput}
            multiline
            textAlignVertical="top"
            placeholder="输入密码"
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>安全锁</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.settingHeader}>
            <View style={styles.titleRow}>
              <Ionicons name="lock-closed-outline" size={20} color="#333" />
              <Text style={styles.settingTitle}>安全锁</Text>
            </View>
            <Switch
              value={securitySwitchOn}
              onValueChange={handleToggle}
              {...SWITCH_COLOR_PROPS}
            />
          </View>
          <Text style={styles.description}>
            开启后，应用启动会先进入极简备忘录。你在新建笔记时输入自己设置的密码并保存，才会进入实际记录应用。
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>功能说明</Text>
          <Text style={styles.listItem}>- 安全锁默认关闭，必须由你主动开启。</Text>
          <Text style={styles.listItem}>- 极简备忘录是真实本地笔记功能，不是空白封面。</Text>
          <Text style={styles.listItem}>- 密码严格完全匹配，应用只保存校验信息，不保存明文。</Text>
          <Text style={styles.listItem}>- 忘记密码时，只能在极简备忘录中重置应用并清空本地数据。</Text>
        </View>

        {securitySwitchOn && (
          <TouchableOpacity style={styles.secondaryButton} onPress={openModifyConfirm}>
            <Ionicons name="key-outline" size={18} color="#007AFF" />
            <Text style={styles.secondaryButtonText}>修改密码</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <BaseModal
        visible={confirmVisible}
        title="开启安全锁"
        onRequestClose={closeEnableConfirm}
      >
        <Text style={styles.modalText}>
          开启后桌面入口可能显示为“极简备忘录”，启动会先进入极简备忘录。忘记密码时无法免密进入实际应用，只能重置应用并清空本地数据。
        </Text>
        <Text style={styles.modalText}>请输入以下内容确认：</Text>
        <Text style={styles.confirmPhrase}>{ENABLE_CONFIRM_TEXT}</Text>
        <TextInput
          value={confirmText}
          onChangeText={setConfirmText}
          style={styles.input}
          placeholder="输入确认内容"
        />
        <ModalActionRow
          actions={[
            { label: '取消', variant: 'secondary', onPress: closeEnableConfirm },
            { label: '开始设置', onPress: handleStartSetup },
          ]}
        />
      </BaseModal>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 44,
    backgroundColor: '#fff',
  },
  header: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  saveText: {
    color: '#007AFF',
    fontSize: 15,
    fontWeight: '600',
  },
  content: {
    padding: 20,
    paddingBottom: 32,
  },
  card: {
    borderWidth: 1,
    borderColor: '#d8d8d8',
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
  },
  settingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingTitle: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  description: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 20,
    color: '#555',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  listItem: {
    fontSize: 13,
    lineHeight: 22,
    color: '#444',
  },
  secondaryButton: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    marginLeft: 8,
    color: '#007AFF',
    fontSize: 14,
  },
  modalText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#444',
    marginBottom: 8,
  },
  confirmPhrase: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: '#d8d8d8',
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 15,
  },
  editorContainer: {
    flex: 1,
    paddingTop: 44,
    backgroundColor: '#fff',
  },
  editorContent: {
    flex: 1,
    padding: 18,
  },
  editorGuide: {
    fontSize: 13,
    lineHeight: 21,
    color: '#666',
    marginBottom: 16,
  },
  memoBodyInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
});

export default SecurityLockScreen;

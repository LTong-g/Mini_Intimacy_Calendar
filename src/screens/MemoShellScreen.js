import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  BackHandler,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import BaseModal from '../components/modals/BaseModal';
import ModalActionRow from '../components/modals/ModalActionRow';
import MemoCategoryEditorModal from '../components/MemoCategoryEditorModal';
import { showAppAlert } from '../utils/appAlert';
import {
  buildTitleFromBody,
  deleteMemoNote,
  exportMemoData,
  getMemosState,
  mergeMemoData,
  normalizeMemoImportPayload,
  resetApplicationData,
  saveMemoCategory,
  saveMemoNote,
  verifyPassword,
} from '../utils/securityLockStorage';
import {
  getUsageAccessStatus,
  isUsageAccessNativeAvailable,
  openBatteryOptimizationSettings,
  openUsageAccessSettings,
  setUsageAccessFeatureEnabled,
} from '../utils/usageAccessNative';
import { setLauncherMode } from '../utils/securityLockNative';
import { clearDiagnosticLogs } from '../utils/diagnosticLogs';

const RESET_CONFIRM_TEXT = '清空数据并重置';
const MEMO_MIME_TYPE = 'application/json';
const MEMO_EXPORT_FILE_BASENAME = 'MemoData';
const buildMemoExportFileName = () => {
  const ts = new Date().toISOString().replace(/[.:]/g, '-');
  return `${MEMO_EXPORT_FILE_BASENAME}_${ts}.json`;
};

const saveMemoExportToAndroidSharedStorage = async (content) => {
  const { StorageAccessFramework } = FileSystem;
  if (!StorageAccessFramework) return { saved: false, reason: 'unavailable' };

  const downloadRootUri = StorageAccessFramework.getUriForDirectoryInRoot('Download');
  const permission = await StorageAccessFramework.requestDirectoryPermissionsAsync(downloadRootUri);

  if (!permission.granted || !permission.directoryUri) {
    return { saved: false, reason: 'canceled' };
  }

  const targetUri = await StorageAccessFramework.createFileAsync(
    permission.directoryUri,
    buildMemoExportFileName(),
    MEMO_MIME_TYPE
  );

  await FileSystem.writeAsStringAsync(targetUri, content, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  return { saved: true, reason: 'saved' };
};

const createTempMemoExportFileForSharing = async (content) => {
  const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
  if (!baseDir) {
    throw new Error('无法获取导出目录');
  }

  const uri = baseDir + buildMemoExportFileName();
  await FileSystem.writeAsStringAsync(uri, content, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  return uri;
};

const MemoShellScreen = ({ onUnlock, onResetComplete }) => {
  const [memos, setMemos] = useState({ categories: [], notes: [] });
  const [searchText, setSearchText] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [categoryEditorVisible, setCategoryEditorVisible] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [categoryColor, setCategoryColor] = useState('#007AFF');
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [noteCategoryId, setNoteCategoryId] = useState(null);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [resetVisible, setResetVisible] = useState(false);
  const [resetText, setResetText] = useState('');

  const refresh = useCallback(async () => {
    setMemos(await getMemosState());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  useEffect(() => {
    const onHardwareBackPress = () => {
      if (resetVisible) {
        setResetVisible(false);
        return true;
      }
      if (categoryEditorVisible) {
        setCategoryEditorVisible(false);
        return true;
      }
      if (categoryModalVisible) {
        setCategoryModalVisible(false);
        return true;
      }
      if (editorVisible) {
        setEditorVisible(false);
        return true;
      }
      if (settingsVisible) {
        setSettingsVisible(false);
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onHardwareBackPress);
    return () => subscription.remove();
  }, [categoryEditorVisible, categoryModalVisible, editorVisible, resetVisible, settingsVisible]);

  const categoriesById = useMemo(
    () => new Map(memos.categories.map((item) => [item.id, item])),
    [memos.categories]
  );

  const visibleNotes = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return memos.notes.filter((note) => {
      if (selectedCategoryId && note.categoryId !== selectedCategoryId) return false;
      if (!query) return true;
      return `${note.title}\n${note.body}`.toLowerCase().includes(query);
    });
  }, [memos.notes, searchText, selectedCategoryId]);

  const openNewMemo = () => {
    setEditingNote(null);
    setNoteTitle('');
    setNoteBody('');
    setNoteCategoryId(selectedCategoryId || null);
    setEditorVisible(true);
  };

  const openEditMemo = (note) => {
    setEditingNote(note);
    setNoteTitle(note.title);
    setNoteBody(note.body);
    setNoteCategoryId(note.categoryId || null);
    setEditorVisible(true);
  };

  const handleSaveMemo = async () => {
    const title = noteTitle.trim();
    const body = noteBody;
    if (!title && !body.trim()) {
      showAppAlert('无法保存', '笔记标题和正文不能同时为空');
      return;
    }

    if (!editingNote && await verifyPassword(body)) {
      setEditorVisible(false);
      setNoteBody('');
      onUnlock();
      return;
    }

    try {
      await saveMemoNote({
        id: editingNote?.id,
        title: title || buildTitleFromBody(body),
        body,
        categoryId: noteCategoryId,
      });
      setEditorVisible(false);
      await refresh();
    } catch (error) {
      showAppAlert('保存失败', error.message || '无法保存笔记');
    }
  };

  const handleDeleteMemo = () => {
    if (!editingNote) return;
    showAppAlert('删除笔记', '删除后无法从应用内恢复。', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          await deleteMemoNote(editingNote.id);
          setEditorVisible(false);
          await refresh();
        },
      },
    ]);
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) {
      showAppAlert('无法保存', '分类名称不能为空');
      return;
    }
    await saveMemoCategory({
      name: categoryName.trim(),
      color: categoryColor,
    });
    setCategoryEditorVisible(false);
    setCategoryName('');
    await refresh();
  };

  const buildMemoExportContent = async () => {
    const data = await exportMemoData();
    if (data.memos.notes.length === 0 && data.memos.categories.length === 0) {
      return null;
    }
    return JSON.stringify(data, null, 2);
  };

  const handleExportMemos = async () => {
    try {
      const content = await buildMemoExportContent();
      if (!content) {
        showAppAlert('导出失败', '没有可导出的笔记数据');
        return;
      }

      if (Platform.OS === 'android') {
        const saveResult = await saveMemoExportToAndroidSharedStorage(content);
        if (saveResult.saved) {
          showAppAlert('导出成功', '文件已保存到你选择的目录');
          return;
        }
        if (saveResult.reason === 'canceled') {
          return;
        }
      }

      const shareUri = await createTempMemoExportFileForSharing(content);
      if (!await Sharing.isAvailableAsync()) {
        showAppAlert('导出失败', '当前设备不支持系统分享');
        return;
      }
      await Sharing.shareAsync(shareUri, {
        dialogTitle: '导出笔记数据',
        mimeType: MEMO_MIME_TYPE,
      });
    } catch (error) {
      showAppAlert('导出失败', error.message || '无法导出笔记数据');
    }
  };

  const handleShareMemos = async () => {
    try {
      const content = await buildMemoExportContent();
      if (!content) {
        showAppAlert('分享失败', '没有可分享的笔记数据');
        return;
      }

      const shareUri = await createTempMemoExportFileForSharing(content);
      if (!await Sharing.isAvailableAsync()) {
        showAppAlert('分享失败', '当前设备不支持系统分享');
        return;
      }
      await Sharing.shareAsync(shareUri, {
        dialogTitle: '分享笔记数据',
        mimeType: MEMO_MIME_TYPE,
      });
    } catch (error) {
      showAppAlert('分享失败', error.message || '无法分享笔记数据');
    }
  };

  const handleImportMemos = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      const content = await FileSystem.readAsStringAsync(result.assets[0].uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const incoming = normalizeMemoImportPayload(JSON.parse(content));
      const conflictChoices = await buildImportConflictChoices(incoming);
      await mergeMemoData(incoming, conflictChoices);
      await refresh();
      showAppAlert('导入完成', '笔记数据已合并导入');
    } catch (error) {
      showAppAlert('导入失败', error.message || '无法导入笔记数据');
    }
  };

  const chooseImportAction = (title, message, actions) => new Promise((resolve) => {
    showAppAlert(
      title,
      message,
      actions.map((action) => ({
        text: action.text,
        style: action.style,
        onPress: () => resolve(action.value),
      })),
      { cancelable: false }
    );
  });

  const buildImportConflictChoices = async (incoming) => {
    const noteChoices = {};
    const categoryChoices = {};
    const currentNoteIds = new Set(memos.notes.map((note) => note.id));
    const currentCategoryNames = new Set(memos.categories.map((category) => category.name));

    for (const category of incoming.categories) {
      if (!currentCategoryNames.has(category.name)) continue;
      categoryChoices[category.id] = await chooseImportAction(
        '分类名称重复',
        `导入数据中存在同名分类“${category.name}”。`,
        [
          { text: '导入当前分类', value: 'merge' },
          { text: '新建副本', value: 'copy' },
        ]
      );
    }

    for (const note of incoming.notes) {
      if (!currentNoteIds.has(note.id)) continue;
      noteChoices[note.id] = await chooseImportAction(
        '笔记 ID 冲突',
        `导入数据中存在与本机同 ID 的笔记“${note.title || '无标题'}”。`,
        [
          { text: '跳过', value: 'skip', style: 'cancel' },
          { text: '存为副本', value: 'copy' },
          { text: '替换', value: 'replace', style: 'destructive' },
        ]
      );
    }

    return {
      notes: noteChoices,
      categories: categoryChoices,
    };
  };

  const ensureResetPermissionsClosed = async () => {
    if (!isUsageAccessNativeAvailable()) return true;
    const status = await getUsageAccessStatus();
    if (status.featureEnabled) {
      await setUsageAccessFeatureEnabled(false);
    }
    if (status.usageAccessGranted) {
      showAppAlert('先关闭使用记录权限', '请在系统设置中关闭本应用的使用情况访问权限，返回后再次点击重置应用。');
      await openUsageAccessSettings();
      return false;
    }
    if (status.ignoringBatteryOptimizations) {
      showAppAlert('先关闭电池优化例外', '请在系统设置中取消本应用的忽略电池优化状态，返回后再次点击重置应用。');
      await openBatteryOptimizationSettings();
      return false;
    }
    return true;
  };

  const handleResetApplication = async () => {
    if (resetText !== RESET_CONFIRM_TEXT) {
      showAppAlert('确认内容不正确', `请完整输入“${RESET_CONFIRM_TEXT}”后继续`);
      return;
    }
    try {
      const canReset = await ensureResetPermissionsClosed();
      if (!canReset) return;
      await setLauncherMode('normal');
      await clearDiagnosticLogs();
      await resetApplicationData();
      setResetVisible(false);
      onResetComplete();
    } catch (error) {
      showAppAlert('重置失败', error.message || '无法重置应用');
    }
  };

  const selectedCategory = selectedCategoryId ? categoriesById.get(selectedCategoryId) : null;

  const renderCategoryModals = () => (
    <>
      <BaseModal
        visible={categoryModalVisible}
        title="查看分类"
        onRequestClose={() => setCategoryModalVisible(false)}
        panelStyle={styles.largeCategoryPanel}
      >
        <ScrollView style={styles.categoryList}>
          <TouchableOpacity
            style={styles.categoryRow}
            onPress={() => {
              setSelectedCategoryId(null);
              setNoteCategoryId(null);
              setCategoryModalVisible(false);
            }}
          >
            <Text style={styles.categoryName}>全部笔记</Text>
          </TouchableOpacity>
          {memos.categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={styles.categoryRow}
              onPress={() => {
                if (editorVisible) setNoteCategoryId(category.id);
                else setSelectedCategoryId(category.id);
                setCategoryModalVisible(false);
              }}
            >
              <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
              <Text style={styles.categoryName}>{category.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity
          style={styles.secondaryAction}
          onPress={() => {
            setCategoryName('');
            setCategoryColor('#007AFF');
            setCategoryEditorVisible(true);
          }}
        >
          <Ionicons name="add-circle-outline" size={18} color="#007AFF" />
          <Text style={styles.secondaryActionText}>新建分类</Text>
        </TouchableOpacity>
        <ModalActionRow
          actions={[
            { label: '关闭', variant: 'secondary', onPress: () => setCategoryModalVisible(false) },
          ]}
        />
      </BaseModal>

      <MemoCategoryEditorModal
        visible={categoryEditorVisible}
        name={categoryName}
        color={categoryColor}
        onNameChange={setCategoryName}
        onColorChange={setCategoryColor}
        onCancel={() => setCategoryEditorVisible(false)}
        onSave={handleSaveCategory}
      />
    </>
  );

  if (editorVisible) {
    return (
      <View style={styles.editorContainer}>
        <View style={styles.editorHeader}>
          <TouchableOpacity onPress={() => setEditorVisible(false)} style={styles.editorHeaderButton}>
            <Ionicons name="close" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.editorTitle}>{editingNote ? '编辑笔记' : '新建笔记'}</Text>
          <TouchableOpacity onPress={handleSaveMemo} style={styles.editorHeaderButton}>
            <Text style={styles.saveText}>保存</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.editorContent}>
          <TextInput
            value={noteTitle}
            onChangeText={setNoteTitle}
            style={styles.titleInput}
            placeholder="标题"
          />
          <TouchableOpacity style={styles.categorySelector} onPress={() => setCategoryModalVisible(true)}>
            <Text style={styles.categorySelectorText}>
              {noteCategoryId ? categoriesById.get(noteCategoryId)?.name || '选择分类' : '未分类'}
            </Text>
          </TouchableOpacity>
          <TextInput
            value={noteBody}
            onChangeText={setNoteBody}
            style={styles.bodyInput}
            multiline
            textAlignVertical="top"
            placeholder="输入笔记内容"
          />
          {editingNote && (
            <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteMemo}>
              <Ionicons name="trash-outline" size={18} color="#C62828" />
              <Text style={styles.deleteButtonText}>删除笔记</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
        {renderCategoryModals()}
      </View>
    );
  }

  if (settingsVisible) {
    return (
      <View style={styles.settingsContainer}>
        <View style={styles.editorHeader}>
          <TouchableOpacity onPress={() => setSettingsVisible(false)} style={styles.editorHeaderButton}>
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.editorTitle}>设置</Text>
          <View style={styles.editorHeaderSpacer} />
        </View>
        <ScrollView contentContainerStyle={styles.settingsContent}>
          <View style={styles.settingCard}>
            <Text style={styles.sectionTitle}>数据管理</Text>
            <View style={styles.optionRow}>
              <TouchableOpacity style={styles.option} onPress={handleImportMemos}>
                <Ionicons name="cloud-download-outline" size={20} color="#007AFF" />
                <Text style={styles.optionText}>导入</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.option, styles.optionMiddle]} onPress={handleExportMemos}>
                <Ionicons name="cloud-upload-outline" size={20} color="#007AFF" />
                <Text style={styles.optionText}>导出</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.option} onPress={handleShareMemos}>
                <Ionicons name="share-social-outline" size={20} color="#007AFF" />
                <Text style={styles.optionText}>分享</Text>
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity
            style={styles.resetButton}
            onPress={() => {
              setResetText('');
              setResetVisible(true);
            }}
          >
            <Ionicons name="warning-outline" size={18} color="#C62828" />
            <Text style={styles.resetButtonText}>重置应用</Text>
          </TouchableOpacity>
        </ScrollView>
        <BaseModal
          visible={resetVisible}
          title="重置应用"
          onRequestClose={() => setResetVisible(false)}
        >
          <Text style={styles.modalText}>
            重置会清空本应用保存在本机的数据、问题日志和缓存，并恢复初始入口。此操作无法撤销。
          </Text>
          <Text style={styles.modalText}>请输入以下内容确认：</Text>
          <Text style={styles.confirmPhrase}>{RESET_CONFIRM_TEXT}</Text>
          <TextInput value={resetText} onChangeText={setResetText} style={styles.input} placeholder="输入确认内容" />
          <ModalActionRow
            actions={[
              { label: '取消', variant: 'secondary', onPress: () => setResetVisible(false) },
              { label: '确认', variant: 'danger', onPress: handleResetApplication },
            ]}
          />
        </BaseModal>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="document-text-outline" size={22} color="#007AFF" />
        </View>
        <Text style={styles.headerTitle}>极简备忘录</Text>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color="#777" />
        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          style={styles.searchInput}
          placeholder="搜索笔记"
        />
      </View>

      {selectedCategory && (
        <TouchableOpacity style={styles.filterPill} onPress={() => setSelectedCategoryId(null)}>
          <View style={[styles.categoryDot, { backgroundColor: selectedCategory.color }]} />
          <Text style={styles.filterText}>{selectedCategory.name}</Text>
          <Ionicons name="close" size={16} color="#555" />
        </TouchableOpacity>
      )}

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {visibleNotes.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={42} color="#b0b0b0" />
            <Text style={styles.emptyText}>暂无笔记</Text>
          </View>
        ) : (
          visibleNotes.map((note) => {
            const category = note.categoryId ? categoriesById.get(note.categoryId) : null;
            return (
              <TouchableOpacity key={note.id} style={styles.noteCard} onPress={() => openEditMemo(note)}>
                <View style={styles.noteHeader}>
                  <Text style={styles.noteTitle} numberOfLines={1}>{note.title}</Text>
                  {category && <View style={[styles.categoryDot, { backgroundColor: category.color }]} />}
                </View>
                <Text style={styles.noteBody} numberOfLines={3}>{note.body || '无正文'}</Text>
                <Text style={styles.noteTime}>{new Date(note.updatedAt).toLocaleString()}</Text>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={[styles.bottomButton, styles.bottomButtonLeft]} onPress={() => setCategoryModalVisible(true)}>
          <Ionicons name="albums-outline" size={22} color="#007AFF" />
          <Text style={styles.bottomText}>查看分类</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.addButton} onPress={openNewMemo}>
          <Ionicons name="add" size={32} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.bottomButton, styles.bottomButtonRight]} onPress={() => setSettingsVisible(true)}>
          <Ionicons name="settings-outline" size={22} color="#007AFF" />
          <Text style={styles.bottomText}>设置</Text>
        </TouchableOpacity>
      </View>

      {renderCategoryModals()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 44, backgroundColor: '#fff' },
  header: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerIcon: { marginRight: 10 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  searchWrap: {
    minHeight: 42,
    margin: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#d8d8d8',
    borderRadius: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15, color: '#333' },
  filterPill: {
    alignSelf: 'flex-start',
    marginHorizontal: 16,
    marginBottom: 8,
    minHeight: 32,
    borderRadius: 16,
    backgroundColor: '#f2f2f2',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterText: { marginHorizontal: 6, color: '#444', fontSize: 13 },
  list: { flex: 1 },
  listContent: { padding: 16, paddingTop: 6, paddingBottom: 24 },
  emptyState: { alignItems: 'center', paddingTop: 72 },
  emptyText: { marginTop: 10, color: '#777', fontSize: 14 },
  noteCard: { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, padding: 12, marginBottom: 10 },
  noteHeader: { flexDirection: 'row', alignItems: 'center' },
  noteTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: '#333' },
  noteBody: { marginTop: 6, fontSize: 14, lineHeight: 20, color: '#555' },
  noteTime: { marginTop: 8, fontSize: 12, color: '#888' },
  categoryDot: { width: 10, height: 10, borderRadius: 5 },
  bottomBar: {
    height: 60,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 0,
    overflow: 'visible',
  },
  bottomButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    zIndex: 1,
  },
  bottomButtonLeft: {
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
  },
  bottomButtonRight: {
    borderLeftWidth: 1,
    borderLeftColor: '#e0e0e0',
  },
  bottomText: { fontSize: 12, color: '#007AFF', marginTop: 2 },
  addButton: {
    position: 'absolute',
    top: -20,
    left: '50%',
    marginLeft: -30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    borderWidth: 4,
    borderColor: '#fff',
    zIndex: 10,
  },
  editorContainer: { flex: 1, paddingTop: 44, backgroundColor: '#fff' },
  editorHeader: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  editorHeaderButton: { minWidth: 52 },
  editorTitle: { flex: 1, fontSize: 18, fontWeight: '600', color: '#333', textAlign: 'center' },
  editorHeaderSpacer: { width: 52 },
  saveText: { color: '#007AFF', fontSize: 15, fontWeight: '600', textAlign: 'right' },
  editorContent: { padding: 18, paddingBottom: 32 },
  titleInput: { minHeight: 46, fontSize: 20, fontWeight: '600', color: '#333', borderBottomWidth: 1, borderBottomColor: '#eee' },
  categorySelector: { alignSelf: 'flex-start', marginTop: 12, marginBottom: 12, borderWidth: 1, borderColor: '#d8d8d8', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  categorySelectorText: { fontSize: 13, color: '#555' },
  bodyInput: { minHeight: 280, fontSize: 16, lineHeight: 24, color: '#333' },
  deleteButton: { minHeight: 42, borderWidth: 1, borderColor: '#C62828', borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  deleteButtonText: { marginLeft: 6, color: '#C62828', fontSize: 14 },
  largeCategoryPanel: { maxHeight: '78%' },
  modalText: { fontSize: 14, lineHeight: 22, color: '#444', marginBottom: 8 },
  categoryList: { maxHeight: 360 },
  categoryRow: { minHeight: 42, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee' },
  categoryName: { marginLeft: 8, fontSize: 15, color: '#333' },
  secondaryAction: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  secondaryActionText: { marginLeft: 6, color: '#007AFF', fontSize: 14 },
  input: { minHeight: 42, borderWidth: 1, borderColor: '#d8d8d8', borderRadius: 8, paddingHorizontal: 10, fontSize: 15 },
  settingsContainer: { flex: 1, paddingTop: 44, backgroundColor: '#fff' },
  settingsContent: { padding: 20, paddingBottom: 32 },
  settingCard: { borderWidth: 1, borderColor: '#d8d8d8', borderRadius: 8, padding: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 12 },
  optionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  option: { flex: 1, minHeight: 42, borderWidth: 1, borderColor: '#007AFF', borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  optionMiddle: { marginHorizontal: 8 },
  optionText: { marginLeft: 6, color: '#007AFF', fontSize: 14 },
  resetButton: { minHeight: 44, borderWidth: 1, borderColor: '#C62828', borderRadius: 8, marginTop: 18, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  resetButtonText: { marginLeft: 6, color: '#C62828', fontSize: 14 },
  confirmPhrase: { fontSize: 14, color: '#333', fontWeight: '600', marginBottom: 8 },
});

export default MemoShellScreen;

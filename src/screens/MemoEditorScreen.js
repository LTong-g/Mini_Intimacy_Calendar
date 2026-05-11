import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MemoTextEditorLayout from '../components/MemoTextEditorLayout';
import { useMemoShell } from './MemoShellContext';

const MemoEditorScreen = () => {
  const navigation = useNavigation();
  const {
    editingNote,
    noteTitle,
    noteBody,
    noteCategoryId,
    categoriesById,
    setNoteTitle,
    setNoteBody,
    openCategoryPicker,
    handleDeleteMemo,
    handleSaveMemo,
    renderCategoryModals,
  } = useMemoShell();

  const categoryLabel = noteCategoryId
    ? categoriesById.get(noteCategoryId)?.name || '选择分类'
    : '未分类';

  return (
    <MemoTextEditorLayout
      title={editingNote ? '编辑笔记' : '新建笔记'}
      onClose={() => navigation.goBack()}
      onSave={async () => {
        const saved = await handleSaveMemo();
        if (saved) navigation.goBack();
      }}
    >
      <TextInput
        value={noteTitle}
        onChangeText={setNoteTitle}
        style={styles.titleInput}
        placeholder="标题"
      />
      <TouchableOpacity style={styles.categorySelector} onPress={openCategoryPicker}>
        <Text style={styles.categorySelectorText}>{categoryLabel}</Text>
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
        <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteMemo(() => navigation.goBack())}>
          <Ionicons name="trash-outline" size={18} color="#C62828" />
          <Text style={styles.deleteButtonText}>删除笔记</Text>
        </TouchableOpacity>
      )}
      {renderCategoryModals()}
    </MemoTextEditorLayout>
  );
};

const styles = StyleSheet.create({
  titleInput: {
    minHeight: 46,
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  categorySelector: {
    alignSelf: 'flex-start',
    marginTop: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#d8d8d8',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  categorySelectorText: {
    fontSize: 13,
    color: '#555',
  },
  bodyInput: {
    minHeight: 280,
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  deleteButton: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: '#C62828',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  deleteButtonText: {
    marginLeft: 6,
    color: '#C62828',
    fontSize: 14,
  },
});

export default MemoEditorScreen;

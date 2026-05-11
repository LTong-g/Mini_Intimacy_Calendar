import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MemoTextEditorLayout from './MemoTextEditorLayout';

const MemoEditorPage = ({
  editingNote,
  title,
  body,
  categoryLabel,
  onTitleChange,
  onBodyChange,
  onOpenCategoryPicker,
  onDelete,
  onClose,
  onSave,
  categoryModals,
}) => (
  <MemoTextEditorLayout
    title={editingNote ? '编辑笔记' : '新建笔记'}
    onClose={onClose}
    onSave={onSave}
  >
    <TextInput
      value={title}
      onChangeText={onTitleChange}
      style={styles.titleInput}
      placeholder="标题"
    />
    <TouchableOpacity style={styles.categorySelector} onPress={onOpenCategoryPicker}>
      <Text style={styles.categorySelectorText}>{categoryLabel}</Text>
    </TouchableOpacity>
    <TextInput
      value={body}
      onChangeText={onBodyChange}
      style={styles.bodyInput}
      multiline
      textAlignVertical="top"
      placeholder="输入笔记内容"
    />
    {editingNote && (
      <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
        <Ionicons name="trash-outline" size={18} color="#C62828" />
        <Text style={styles.deleteButtonText}>删除笔记</Text>
      </TouchableOpacity>
    )}
    {categoryModals}
  </MemoTextEditorLayout>
);

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

export default MemoEditorPage;

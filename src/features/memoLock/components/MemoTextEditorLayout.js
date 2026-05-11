import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import MemoPageHeader from './MemoPageHeader';

const MemoTextEditorLayout = ({
  title,
  onClose,
  onSave,
  saveDisabled = false,
  children,
  scroll = true,
}) => {
  const Content = scroll ? ScrollView : View;
  const contentProps = scroll
    ? { contentContainerStyle: styles.content }
    : { style: [styles.content, styles.flexContent] };

  return (
    <View style={styles.container}>
      <MemoPageHeader
        title={title}
        onLeftPress={onClose}
        rightText="保存"
        onRightPress={onSave}
        rightDisabled={saveDisabled}
      />
      <Content {...contentProps}>
        {children}
      </Content>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 44,
    backgroundColor: '#fff',
  },
  content: {
    padding: 18,
    paddingBottom: 32,
  },
  flexContent: {
    flex: 1,
  },
});

export default MemoTextEditorLayout;

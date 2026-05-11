import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { recordDiagnosticProblem } from '../utils/diagnosticLogs';

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    const stack = info?.componentStack
      ? `${error?.stack || error?.message || error}\n\nComponent stack:${info.componentStack}`
      : error;
    recordDiagnosticProblem('react-render-exception', stack);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  handleBack = () => {
    this.setState({ error: null }, () => {
      if (this.props.onBack) this.props.onBack();
    });
  };

  render() {
    if (this.state.error) {
      const canGoBack = Boolean(this.props.onBack);
      return (
        <View style={styles.container}>
          <Text style={styles.title}>页面加载失败</Text>
          <Text style={styles.message}>
            当前页面发生异常，问题信息已写入诊断日志。你可以返回上一页或重试加载。
          </Text>
          <View style={styles.actions}>
            {canGoBack && (
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                activeOpacity={0.8}
                onPress={this.handleBack}
              >
                <Text style={[styles.buttonText, styles.secondaryButtonText]}>返回上一页</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.button}
              activeOpacity={0.8}
              onPress={this.handleReset}
            >
              <Text style={styles.buttonText}>重试</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    lineHeight: 24,
    color: '#555',
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    minWidth: 112,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  buttonText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#007AFF',
  },
});

export default AppErrorBoundary;

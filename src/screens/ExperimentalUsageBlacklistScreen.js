/**
 * 黑名单应用设置界面
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  PanResponder,
  TextInput,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  getExperimentalUsageBlacklist,
  setExperimentalUsageBlacklist,
  syncExperimentalUsageBlacklistMetadata,
} from '../utils/experimentalUsageStorage';
import { getCachedLaunchableApplications } from '../utils/launchableAppCache';

const INDEX_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('');
const APP_ROW_HEIGHT = 54;
const APP_FILTERS = {
  ALL: 'all',
  SELECTED: 'selected',
};
const PINYIN_COLLATOR = new Intl.Collator('zh-Hans-u-co-pinyin', {
  sensitivity: 'base',
  numeric: true,
});
const PINYIN_INITIAL_BOUNDARIES = [
  ['A', '阿'],
  ['B', '芭'],
  ['C', '擦'],
  ['D', '搭'],
  ['E', '蛾'],
  ['F', '发'],
  ['G', '噶'],
  ['H', '哈'],
  ['J', '击'],
  ['K', '喀'],
  ['L', '垃'],
  ['M', '妈'],
  ['N', '拿'],
  ['O', '哦'],
  ['P', '啪'],
  ['Q', '期'],
  ['R', '然'],
  ['S', '撒'],
  ['T', '塌'],
  ['W', '挖'],
  ['X', '昔'],
  ['Y', '压'],
  ['Z', '匝'],
];

const getIndexLetter = (label) => {
  const first = (label || '').trim().charAt(0);
  const upperFirst = first.toUpperCase();
  if (/^[A-Z]$/.test(upperFirst)) return upperFirst;
  if (!/[\u3400-\u9FFF]/.test(first)) return '#';

  let matchedLetter = '#';
  for (const [letter, boundary] of PINYIN_INITIAL_BOUNDARIES) {
    if (PINYIN_COLLATOR.compare(first, boundary) >= 0) {
      matchedLetter = letter;
    } else {
      break;
    }
  }
  return matchedLetter;
};

const compareAppsByPinyin = (a, b) => {
  const letterDiff = INDEX_LETTERS.indexOf(getIndexLetter(a.label)) -
    INDEX_LETTERS.indexOf(getIndexLetter(b.label));
  if (letterDiff !== 0) return letterDiff;
  return PINYIN_COLLATOR.compare(a.label, b.label) ||
    a.packageName.localeCompare(b.packageName);
};

const getSearchRank = (app, keyword) => {
  const label = app.label.toLowerCase();
  const packageName = app.packageName.toLowerCase();
  const labelIndex = label.indexOf(keyword);
  const packageIndex = packageName.indexOf(keyword);

  if (labelIndex === 0) return 0;
  if (labelIndex > 0) return 1;
  if (packageIndex === 0) return 2;
  return 3;
};

const ExperimentalUsageBlacklistScreen = () => {
  const navigation = useNavigation();
  const listRef = useRef(null);
  const blacklistRef = useRef([]);
  const saveVersionRef = useRef(0);
  const indexBarHeightRef = useRef(0);
  const indexLettersTopRef = useRef(0);
  const indexHighlightTimerRef = useRef(null);
  const [apps, setApps] = useState([]);
  const [blacklist, setBlacklist] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [appFilter, setAppFilter] = useState(APP_FILTERS.ALL);
  const [activeIndexLetter, setActiveIndexLetter] = useState(null);

  const selectedPackages = useMemo(
    () => new Set(blacklist.map((item) => item.packageName)),
    [blacklist]
  );

  const visibleApps = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    const rows = apps.filter((app) => {
      if (appFilter === APP_FILTERS.SELECTED && !selectedPackages.has(app.packageName)) {
        return false;
      }
      if (!keyword) return true;
      return (
        app.label.toLowerCase().includes(keyword) ||
        app.packageName.toLowerCase().includes(keyword)
      );
    });
    if (!keyword) return rows.sort(compareAppsByPinyin);

    return rows.sort((a, b) => {
      const rankDiff = getSearchRank(a, keyword) - getSearchRank(b, keyword);
      if (rankDiff !== 0) return rankDiff;
      return compareAppsByPinyin(a, b);
    });
  }, [appFilter, apps, searchText, selectedPackages]);

  const indexMap = useMemo(() => {
    const next = new Map();
    visibleApps.forEach((app, index) => {
      const letter = getIndexLetter(app.label);
      if (!next.has(letter)) {
        next.set(letter, index);
      }
    });
    return next;
  }, [visibleApps]);

  const visibleIndexLetters = useMemo(
    () => INDEX_LETTERS.filter((letter) => indexMap.has(letter)),
    [indexMap]
  );

  const loadState = useCallback(async ({ forceRefresh = false } = {}) => {
    setIsLoading(true);
    try {
      const [nextApps, nextBlacklist] = await Promise.all([
        getCachedLaunchableApplications({ forceRefresh }),
        getExperimentalUsageBlacklist(),
      ]);
      const storedBlacklist = await syncExperimentalUsageBlacklistMetadata(nextBlacklist, nextApps);
      setApps(nextApps);
      setBlacklist(storedBlacklist);
      blacklistRef.current = storedBlacklist;
    } catch (error) {
      Alert.alert('读取失败', error.message || '无法读取应用列表');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadState();
    }, [loadState])
  );

  useEffect(() => {
    if (activeIndexLetter && !visibleIndexLetters.includes(activeIndexLetter)) {
      setActiveIndexLetter(null);
    }
  }, [activeIndexLetter, visibleIndexLetters]);

  useEffect(() => () => {
    if (indexHighlightTimerRef.current) {
      clearTimeout(indexHighlightTimerRef.current);
    }
  }, []);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleRefreshApps = () => {
    loadState({ forceRefresh: true });
  };

  const handleJumpToLetter = (letter) => {
    const index = indexMap.get(letter);
    if (index === undefined) return;
    listRef.current?.scrollToOffset({
      offset: index * APP_ROW_HEIGHT,
      animated: true,
    });
  };

  const handleIndexTouch = (event) => {
    if (visibleIndexLetters.length === 0) return;
    const nextLocationY = (event.nativeEvent.locationY || 0) - indexLettersTopRef.current;
    handleIndexTouchAt(nextLocationY);
  };

  const handleIndexTouchAt = (locationY = 0) => {
    if (visibleIndexLetters.length === 0) return;
    if (indexHighlightTimerRef.current) {
      clearTimeout(indexHighlightTimerRef.current);
      indexHighlightTimerRef.current = null;
    }
    const itemHeight = Math.max(
      1,
      (indexBarHeightRef.current || visibleIndexLetters.length * 18) / visibleIndexLetters.length
    );
    const index = Math.max(
      0,
      Math.min(
        visibleIndexLetters.length - 1,
        Math.floor(locationY / itemHeight)
      )
    );
    const letter = visibleIndexLetters[index];
    setActiveIndexLetter(letter);
    handleJumpToLetter(letter);
  };

  const handleIndexTouchEnd = () => {
    if (indexHighlightTimerRef.current) {
      clearTimeout(indexHighlightTimerRef.current);
    }
    indexHighlightTimerRef.current = setTimeout(() => {
      setActiveIndexLetter(null);
      indexHighlightTimerRef.current = null;
    }, 220);
  };

  const indexPanResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onStartShouldSetPanResponderCapture: () => true,
    onMoveShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponderCapture: () => true,
    onPanResponderGrant: handleIndexTouch,
    onPanResponderMove: handleIndexTouch,
    onPanResponderTerminationRequest: () => false,
    onPanResponderRelease: handleIndexTouchEnd,
    onPanResponderTerminate: handleIndexTouchEnd,
  }), [handleIndexTouch, handleIndexTouchEnd]);

  const handleIndexLettersLayout = (event) => {
    const { height, y } = event.nativeEvent.layout;
    indexBarHeightRef.current = height;
    indexLettersTopRef.current = y;
  };

  const handleToggleApp = async (app) => {
    const previous = blacklistRef.current;
    const exists = previous.some((item) => item.packageName === app.packageName);
    const next = exists
      ? previous.filter((item) => item.packageName !== app.packageName)
      : [...previous, app];
    const saveVersion = saveVersionRef.current + 1;
    saveVersionRef.current = saveVersion;

    blacklistRef.current = next;
    setBlacklist(next);

    try {
      const saved = await setExperimentalUsageBlacklist(next);
      if (saveVersionRef.current === saveVersion) {
        blacklistRef.current = saved;
        setBlacklist(saved);
      }
    } catch (error) {
      if (saveVersionRef.current === saveVersion) {
        blacklistRef.current = previous;
        setBlacklist(previous);
        Alert.alert('保存失败', error.message || '无法保存黑名单应用');
      }
    }
  };

  const renderApp = ({ item: app }) => {
    const selected = selectedPackages.has(app.packageName);
    return (
      <TouchableOpacity
        style={[styles.appRow, selected && styles.appRowSelected]}
        onPress={() => handleToggleApp(app)}
      >
        <View style={styles.appIconWrap}>
          {app.icon ? (
            <Image source={{ uri: app.icon }} style={styles.appIcon} />
          ) : (
            <View style={styles.appIconFallback}>
              <Ionicons name="apps-outline" size={18} color="#7A7A7A" />
            </View>
          )}
        </View>
        <View style={styles.appTextBlock}>
          <Text style={styles.appLabel}>{app.label}</Text>
          <Text style={styles.packageName}>{app.packageName}</Text>
        </View>
        <Ionicons
          name={selected ? 'checkbox-outline' : 'square-outline'}
          size={22}
          color={selected ? '#007AFF' : '#777'}
        />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>黑名单应用</Text>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>已选择 {blacklist.length} 个应用</Text>
        <Text style={styles.summaryText}>
          勾选后的应用会参与使用记录读取和统计。
        </Text>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color="#777" />
        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder="搜索应用名称或包名"
          placeholderTextColor="#999"
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchText ? (
          <TouchableOpacity onPress={() => setSearchText('')} style={styles.clearSearchButton}>
            <Ionicons name="close-circle" size={18} color="#999" />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.filterTabs}>
        <TouchableOpacity
          onPress={() => setAppFilter(APP_FILTERS.ALL)}
          style={styles.filterTab}
        >
          <Text
            style={[
              styles.filterTabText,
              appFilter === APP_FILTERS.ALL && styles.filterTabTextActive,
            ]}
          >
            全部
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setAppFilter(APP_FILTERS.SELECTED)}
          style={styles.filterTab}
        >
          <Text
            style={[
              styles.filterTabText,
              appFilter === APP_FILTERS.SELECTED && styles.filterTabTextActive,
            ]}
          >
            已选
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.listArea}>
        <View style={styles.appList}>
          <FlatList
            ref={listRef}
            data={isLoading ? [] : visibleApps}
            keyExtractor={(item) => item.packageName}
            renderItem={renderApp}
            contentContainerStyle={styles.listContent}
            getItemLayout={(data, index) => ({
              length: APP_ROW_HEIGHT,
              offset: APP_ROW_HEIGHT * index,
              index,
            })}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={isLoading ? (
              <View style={styles.loadingBlock}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={styles.loadingText}>正在读取应用列表...</Text>
              </View>
            ) : (
              <View style={styles.emptyBlock}>
                <Text style={styles.emptyText}>未读取到可选择应用</Text>
              </View>
            )}
            onScrollToIndexFailed={(info) => {
              listRef.current?.scrollToOffset({
                offset: info.averageItemLength * info.index,
                animated: true,
              });
            }}
          />
        </View>

        {visibleIndexLetters.length > 0 && !isLoading && (
          <View
            style={styles.indexBar}
            pointerEvents="box-only"
            {...indexPanResponder.panHandlers}
          >
            <View
              style={styles.indexLettersWrap}
              onLayout={handleIndexLettersLayout}
            >
              {visibleIndexLetters.map((letter) => (
                <View
                  key={letter}
                  style={[
                    styles.indexLetterButton,
                    activeIndexLetter === letter && styles.indexLetterButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.indexLetterText,
                      activeIndexLetter === letter && styles.indexLetterTextActive,
                    ]}
                  >
                    {letter}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[styles.refreshButton, isLoading && styles.refreshButtonDisabled]}
        disabled={isLoading}
        onPress={handleRefreshApps}
      >
        <Ionicons name="refresh" size={26} color="#fff" />
      </TouchableOpacity>
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  summaryCard: {
    borderWidth: 1,
    borderColor: '#d8d8d8',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: '#fff',
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#555',
  },
  searchWrap: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d8d8d8',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginHorizontal: 20,
    marginTop: 10,
    backgroundColor: '#fff',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontSize: 14,
    color: '#333',
  },
  clearSearchButton: {
    padding: 2,
  },
  filterTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginHorizontal: 20,
    marginTop: 8,
    gap: 16,
  },
  filterTab: {
    paddingVertical: 2,
  },
  filterTabText: {
    fontSize: 12,
    color: '#777',
  },
  filterTabTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  listArea: {
    flex: 1,
    paddingTop: 12,
    paddingBottom: 16,
  },
  appList: {
    flex: 1,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  listContent: {
    paddingBottom: 96,
  },
  loadingBlock: {
    minHeight: 112,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#555',
  },
  emptyBlock: {
    minHeight: 88,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  emptyText: {
    fontSize: 13,
    color: '#777',
  },
  appRow: {
    height: APP_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  appIconWrap: {
    width: 36,
    height: 36,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  appIconFallback: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#F1F3F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appRowSelected: {
    backgroundColor: '#eef6ff',
  },
  appTextBlock: {
    flex: 1,
    paddingRight: 10,
  },
  appLabel: {
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
  },
  packageName: {
    fontSize: 11,
    color: '#777',
  },
  indexBar: {
    position: 'absolute',
    top: 12,
    right: 0,
    bottom: 16,
    width: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  indexLettersWrap: {
    width: 18,
    alignItems: 'center',
  },
  indexLetterButton: {
    minWidth: 18,
    minHeight: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexLetterButtonActive: {
    backgroundColor: '#007AFF',
  },
  indexLetterText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#007AFF',
  },
  indexLetterTextActive: {
    color: '#fff',
  },
  refreshButton: {
    position: 'absolute',
    right: 24,
    bottom: 30,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  refreshButtonDisabled: {
    backgroundColor: '#8fbff4',
  },
});

export default ExperimentalUsageBlacklistScreen;

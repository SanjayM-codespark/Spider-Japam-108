import React, {useState, useCallback, useRef} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import CustomText from '../../components/CustomText/CustomText';
import {MaterialDesignIcons} from '@react-native-vector-icons/material-design-icons/static';
import {useTheme} from '../../context/ThemeContext';
import {useAuth} from '../../context/AuthContext';
import {getAllNaams, formatDateKey, Naam} from '../../database/database';
import {
  fetchCountsFromServer,
  fetchSessionsFromServer,
  naamServerRef,
  ServerSessionRow,
} from '../../services/api';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const SCREEN_WIDTH = Dimensions.get('window').width;

const formatDuration = (seconds: number) => {
  const s = Math.round(seconds);
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
};

const addDays = (date: Date, n: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + n);
  return next;
};

const addMonths = (date: Date, n: number) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + n);
  return next;
};

const ReportScreen: React.FC = () => {
  const {colors} = useTheme();
  const {token} = useAuth();
  const [activeToggle, setActiveToggle] = useState<'naam' | 'timer'>('naam');
  const [activeTab, setActiveTab] = useState<'daily' | 'monthly' | 'yearly'>('daily');
  const [selectedBar, setSelectedBar] = useState<number | null>(null);
  const [naams, setNaams] = useState<Naam[]>([]);
  const [selectedNaamId, setSelectedNaamId] = useState<number | null>(null);
  const [windowEnd, setWindowEnd] = useState<Date>(() => new Date());
  const [dropdownMenu, setDropdownMenu] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const dropdownButtonRef = useRef<any>(null);
  const [dailyCounts, setDailyCounts] = useState<{[date: string]: number}>({});
  const [sessionTotals, setSessionTotals] = useState<{[date: string]: number}>({});

  const loadData = useCallback(async () => {
    // The mantra list still comes from the phone: it carries the names, bead
    // counts and the local ids the dropdown and bars are keyed by. The counting
    // itself is read from the server.
    const data = await getAllNaams();
    setNaams(data);

    const today = new Date();
    const startDate = formatDateKey(addDays(today, -364));
    const endDate = formatDateKey(today);

    if (!token) {
      setDailyCounts({});
      setSessionTotals({});
      setSelectedBar(null);
      return;
    }

    // Server rows name a mantra by (source, naam_id); the report filters by the
    // local id, so each server id is mapped back through the naam it was synced
    // from.
    const localIdByRef = new Map<string, number>();
    data.forEach(naam => {
      if (naam.remote_id === null) {
        return;
      }
      const source = naam.user_id !== null ? 'user' : 'admin';
      localIdByRef.set(`${source}:${naam.remote_id}`, naam.id);
    });

    const selectedNaam =
      selectedNaamId === null
        ? null
        : data.find(naam => naam.id === selectedNaamId) ?? null;
    const sessionRef = selectedNaam ? naamServerRef(selectedNaam) : null;

    try {
      // Timer sessions are stored per mantra. "All mantras" sums them all; a
      // chosen mantra fetches only its own, and one the server does not know yet
      // has no sessions to show rather than falling back to every mantra's.
      const sessionRequest =
        selectedNaamId === null
          ? fetchSessionsFromServer(token, startDate, endDate)
          : sessionRef
          ? fetchSessionsFromServer(token, startDate, endDate, sessionRef)
          : Promise.resolve([] as ServerSessionRow[]);

      const [countRows, sessionRows] = await Promise.all([
        fetchCountsFromServer(token, startDate, endDate),
        sessionRequest,
      ]);

      const map: {[date: string]: number} = {};
      countRows.forEach(row => {
        if (selectedNaamId !== null) {
          const localId = localIdByRef.get(`${row.source}:${row.naam_id}`);
          if (localId !== selectedNaamId) {
            return;
          }
        }
        map[row.date] = (map[row.date] ?? 0) + row.count;
      });
      setDailyCounts(map);

      const sessionMap: {[date: string]: number} = {};
      sessionRows.forEach(row => {
        sessionMap[row.date] = row.total_seconds;
      });
      setSessionTotals(sessionMap);
    } catch {
      // Server-only screen: when the fetch fails there is nothing to fall back
      // to, so the chart simply shows zeros.
      setDailyCounts({});
      setSessionTotals({});
    }
    setSelectedBar(null);
  }, [selectedNaamId, token]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const dropdownLabel =
    selectedNaamId === null
      ? 'All mantras'
      : naams.find(naam => naam.id === selectedNaamId)?.name ?? 'All mantras';

  const handleDropdownSelect = (naamId: number | null) => {
    setSelectedNaamId(naamId);
    setDropdownMenu(null);
  };

  const toggleDropdown = () => {
    if (dropdownMenu) {
      setDropdownMenu(null);
      return;
    }
    dropdownButtonRef.current?.measureInWindow(
      (x: number, y: number, width: number, height: number) => {
        setDropdownMenu({x, y, width, height});
      },
    );
  };

  const CHART_HEIGHT = 250;

  const windowData = (() => {
    const isTimer = activeToggle === 'timer';
    const valueFor = (key: string) =>
      isTimer ? sessionTotals[key] ?? 0 : dailyCounts[key] ?? 0;
    if (activeTab === 'daily') {
      const days = 7;
      const start = addDays(windowEnd, -(days - 1));
      const items: {date: string; value: number}[] = [];
      for (let i = 0; i < days; i++) {
        const d = addDays(start, i);
        const key = formatDateKey(d);
        items.push({date: key, value: valueFor(key)});
      }
      return {
        items,
        dateText: `${dLabel(start)} - ${dLabel(windowEnd)}`,
        avgLabel: 'Day',
        avgValue:
          items.reduce((sum, item) => sum + item.value, 0) / days,
        total: items.reduce((sum, item) => sum + item.value, 0),
      };
    }
    if (activeTab === 'monthly') {
      const days = 30;
      const start = addDays(windowEnd, -(days - 1));
      const items: {date: string; value: number}[] = [];
      for (let i = 0; i < days; i++) {
        const d = addDays(start, i);
        const key = formatDateKey(d);
        items.push({date: key, value: valueFor(key)});
      }
      return {
        items,
        dateText: `${dLabel(start)} - ${dLabel(windowEnd)}`,
        avgLabel: 'Day',
        avgValue:
          items.reduce((sum, item) => sum + item.value, 0) / days,
        total: items.reduce((sum, item) => sum + item.value, 0),
      };
    }
    const months = 12;
    const monthStart = windowEnd.getMonth();
    const yearStart = windowEnd.getFullYear();
    const items: {date: string; value: number}[] = [];
    for (let i = 0; i < months; i++) {
      const month = (monthStart - (months - 1 - i) + 12) % 12;
      const year = yearStart - (monthStart - month < 0 ? 1 : 0);
      const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
      const monthNames = MONTH_NAMES[month];
      const source = isTimer ? sessionTotals : dailyCounts;
      const sum = Object.entries(source)
        .filter(([date]) => date.startsWith(monthKey))
        .reduce((s, [, count]) => s + count, 0);
      items.push({date: monthNames, value: sum});
    }
    return {
      items,
      dateText: `${MONTH_NAMES[monthStart]} ${yearStart - 11} - ${MONTH_NAMES[monthStart]} ${yearStart}`,
      avgLabel: 'Month',
      avgValue:
        items.reduce((sum, item) => sum + item.value, 0) / months,
      total: items.reduce((sum, item) => sum + item.value, 0),
    };
  })();

  const canGoForward = (() => {
    const today = new Date();
    if (activeTab === 'yearly') {
      const endKey = `${windowEnd.getFullYear()}-${String(windowEnd.getMonth() + 1).padStart(2, '0')}`;
      const nowKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      return endKey < nowKey;
    }
    return activeTab === 'daily'
      ? addDays(windowEnd, 7) <= today
      : addDays(windowEnd, 30) <= today;
  })();

  const shiftBack = () => {
    setWindowEnd(prev =>
      activeTab === 'yearly' ? addMonths(prev, -12) : addDays(prev, activeTab === 'daily' ? -7 : -30),
    );
  };

  const shiftForward = () => {
    setWindowEnd(prev =>
      activeTab === 'yearly' ? addMonths(prev, 12) : addDays(prev, activeTab === 'daily' ? 7 : 30),
    );
  };

  const maxValue = Math.max(...windowData.items.map(item => item.value), 1);
  const gridStep = Math.max(1, Math.ceil(maxValue / 3));
  const gridTop = gridStep * 3;
  const Y_AXIS_STEPS = [gridTop, gridStep * 2, gridStep, 0];

  const handleTab = (tab: 'daily' | 'monthly' | 'yearly') => {
    setActiveTab(tab);
  };

  const handleBarPress = (index: number) => {
    setSelectedBar(index);
  };

  const renderItemLabel = (dateKey: string): {top: string; bottom: string} => {
    if (activeTab === 'yearly') {
      return {top: dateKey, bottom: ''};
    }
    const parts = dateKey.split('-');
    if (parts.length === 3) {
      return {top: parts[2].replace(/^0/, ''), bottom: DAY_NAMES[new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).getDay()]};
    }
    return {top: dateKey, bottom: ''};
  };

  const tooltipText = (() => {
    if (selectedBar === null || !windowData.items[selectedBar]) {
      return null;
    }
    const item = windowData.items[selectedBar];
    const label = renderItemLabel(item.date);
    const value = item.value;
    if (activeToggle === 'timer') {
      return `${label.top}${label.bottom ? ' ' + label.bottom : ''} — ${formatDuration(value)}`;
    }
    const malas = selectedNaamId
      ? Math.floor(value / (naams.find(n => n.id === selectedNaamId)?.bead_count ?? 108))
      : Math.floor(value / 108);
    const malasText = malas > 0 ? ` (${malas} Malas)` : '';
    return `${label.top}${label.bottom ? ' ' + label.bottom : ''} — ${value} beads${malasText}`;
  })();

  const isTimer = activeToggle === 'timer';

  const s = styles(colors);

  return (
    <SafeAreaView style={s.safeArea} edges={['top']}>
      <View style={s.header}>
        <CustomText variant="heading" style={s.title}>
          {activeToggle === 'naam' ? 'Mantra Stats' : 'Meditation Stats'}
        </CustomText>

        <View style={s.toggleContainer}>
          <TouchableOpacity
            style={[s.toggleButton, activeToggle === 'naam' && s.toggleActive]}
            onPress={() => setActiveToggle('naam')}
            activeOpacity={0.8}>
            <View style={s.toggleContent}>
              <MaterialDesignIcons
                name="check"
                size={16}
                color={activeToggle === 'naam' ? '#FFFFFF' : colors.secondaryTextColor}
              />
              <CustomText
                variant="body"
                color={activeToggle === 'naam' ? '#FFFFFF' : colors.secondaryTextColor}
                style={s.toggleText}>
                Naam
              </CustomText>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.toggleButton, activeToggle === 'timer' && s.toggleActive]}
            onPress={() => setActiveToggle('timer')}
            activeOpacity={0.8}>
            <View style={s.toggleContent}>
              <MaterialDesignIcons
                name="timer-outline"
                size={16}
                color={activeToggle === 'timer' ? '#FFFFFF' : colors.secondaryTextColor}
              />
              <CustomText
                variant="body"
                color={activeToggle === 'timer' ? '#FFFFFF' : colors.secondaryTextColor}
                style={s.toggleText}>
                Timer
              </CustomText>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.tabsContainer}>
        {(['daily', 'monthly', 'yearly'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={s.tabButton}
            onPress={() => handleTab(tab)}
            activeOpacity={0.7}>
            <CustomText
              variant="body"
              color={activeTab === tab ? colors.primaryTextColor : colors.secondaryTextColor}
              style={[s.tabText, activeTab === tab && s.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </CustomText>
            {activeTab === tab && <View style={s.activeTabIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={s.scrollContainer}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={s.controlsRow}>
          <View style={s.dateNavigator}>
            <TouchableOpacity
              onPress={shiftBack}
              hitSlop={s.hitSlop}
              activeOpacity={0.7}>
              <MaterialDesignIcons
                name="chevron-left"
                size={26}
                color={colors.primaryTextColor}
                style={s.navIcon}
              />
            </TouchableOpacity>
            <CustomText variant="body" style={s.dateText}>
              {windowData.dateText}
            </CustomText>
            <TouchableOpacity
              onPress={shiftForward}
              hitSlop={s.hitSlop}
              activeOpacity={0.7}
              disabled={!canGoForward}>
              <MaterialDesignIcons
                name="chevron-right"
                size={26}
                color={canGoForward ? colors.primaryTextColor : colors.border}
                style={s.navIcon}
              />
            </TouchableOpacity>
          </View>

          <View style={s.divider} />

          <View style={s.dropdownWrap}>
            <TouchableOpacity
              ref={dropdownButtonRef}
              style={s.dropdown}
              onPress={toggleDropdown}
              activeOpacity={0.7}>
              <MaterialDesignIcons
                name="filter-variant"
                size={16}
                color={colors.primaryTextColor}
              />
              <CustomText variant="body" style={s.dropdownText}>
                {dropdownLabel}
              </CustomText>
              <MaterialDesignIcons
                name="chevron-down"
                size={18}
                color={colors.primaryTextColor}
              />
            </TouchableOpacity>
        </View>
        </View>

        <View style={s.summaryCard}>
          <View style={s.summaryItem}>
            <CustomText variant="caption" color={colors.secondaryTextColor} style={s.summaryLabel}>
              Total {activeToggle === 'naam' ? 'Count' : 'Time'}
            </CustomText>
            <CustomText variant="subheading" style={s.summaryValue}>
              {isTimer ? formatDuration(windowData.total) : windowData.total}
            </CustomText>
          </View>
          <View style={s.summaryItem}>
            <CustomText variant="caption" color={colors.secondaryTextColor} style={s.summaryLabel}>
              Avg/{windowData.avgLabel}
            </CustomText>
            <CustomText variant="subheading" style={s.summaryValue}>
              {isTimer ? formatDuration(windowData.avgValue) : Math.round(windowData.avgValue)}
            </CustomText>
          </View>
        </View>

        <View style={s.chartWrapper}>
          <View style={s.yAxisContainer}>
            {Y_AXIS_STEPS.map((step, index) => (
              <CustomText
                key={index}
                variant="caption"
                color={colors.secondaryTextColor}
                style={[
                  s.yAxisLabel,
                  {top: (index / (Y_AXIS_STEPS.length - 1)) * CHART_HEIGHT - 8},
                ]}>
                {activeToggle === 'naam' ? step : `${step}s`}
              </CustomText>
            ))}
          </View>

          <View style={[s.chartArea, {height: CHART_HEIGHT}]}>
            {Y_AXIS_STEPS.map((_, index) => (
              <View
                key={`grid-${index}`}
                style={[
                  s.gridLine,
                  {top: (index / (Y_AXIS_STEPS.length - 1)) * CHART_HEIGHT},
                ]}
              />
            ))}

            <View style={s.barsContainer}>
              {windowData.items.map((item, index) => {
                const barHeight = (item.value / gridTop) * CHART_HEIGHT;
                const isSelected = selectedBar === index;
                return (
                  <TouchableOpacity
                    key={index}
                    style={s.barColumn}
                    onPress={() => handleBarPress(index)}
                    activeOpacity={0.8}>
                    <View
                      style={[
                        s.bar,
                        {
                          width: windowData.items.length > 14 ? 6 : 14,
                          height: barHeight > 0 ? barHeight : 4,
                          backgroundColor: isSelected ? '#000000' : '#888888',
                        },
                      ]}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        <View style={s.xAxisContainer}>
          {windowData.items.map((item, index) => {
            const label = renderItemLabel(item.date);
            const showLabel =
              activeTab !== 'monthly' ||
              index % 5 === 0 ||
              index === windowData.items.length - 1;
            return (
              <View key={index} style={s.xAxisItem}>
                <CustomText variant="caption" color={colors.secondaryTextColor} style={s.xAxisValue}>
                  {showLabel ? label.top : ''}
                </CustomText>
                <CustomText variant="caption" color={colors.secondaryTextColor} style={s.xAxisDay}>
                  {showLabel ? label.bottom : ''}
                </CustomText>
              </View>
            );
          })}
        </View>

        {selectedBar !== null && tooltipText && (
          <View style={s.tooltipContainer}>
            <View style={s.tooltip}>
              <CustomText variant="body" style={s.tooltipText}>
                {tooltipText}
              </CustomText>
            </View>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={dropdownMenu !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDropdownMenu(null)}>
        <TouchableOpacity
          style={s.modalBackdrop}
          activeOpacity={1}
          onPress={() => setDropdownMenu(null)}>
          <View
            style={[
              s.dropdownMenu,
              {
                top: (dropdownMenu?.y ?? 0) + (dropdownMenu?.height ?? 0) + 8,
                right:
                  SCREEN_WIDTH - ((dropdownMenu?.x ?? 0) + (dropdownMenu?.width ?? 120)),
                minWidth: Math.max(dropdownMenu?.width ?? 160, 200),
              },
            ]}>
            <TouchableOpacity
              style={[
                s.dropdownOption,
                selectedNaamId === null && s.dropdownOptionSelected,
              ]}
              onPress={() => handleDropdownSelect(null)}
              activeOpacity={0.7}>
              <CustomText
                variant="body"
                color={selectedNaamId === null ? colors.primary : colors.primaryTextColor}>
                All mantras
              </CustomText>
            </TouchableOpacity>
            {naams.map(naam => (
              <TouchableOpacity
                key={naam.id}
                style={[
                  s.dropdownOption,
                  selectedNaamId === naam.id && s.dropdownOptionSelected,
                ]}
                onPress={() => handleDropdownSelect(naam.id)}
                activeOpacity={0.7}>
                <CustomText
                  variant="body"
                  color={selectedNaamId === naam.id ? colors.primary : colors.primaryTextColor}>
                  {naam.name}
                </CustomText>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const dLabel = (d: Date) =>
  `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;

const styles = (colors: import('../../theme/colors').ThemeColors) =>
  StyleSheet.create({
    safeArea: {flex: 1, backgroundColor: colors.background},
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 20,
    },
    title: {fontSize: 24, fontWeight: 'bold', color: colors.primaryTextColor},
    toggleContainer: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    toggleButton: {paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20},
    toggleActive: {backgroundColor: colors.primary},
    toggleContent: {flexDirection: 'row', alignItems: 'center', gap: 6},
    toggleText: {fontSize: 14, fontWeight: '500'},
    tabsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingBottom: 0,
    },
    tabButton: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 12,
      position: 'relative',
    },
    tabText: {fontSize: 16},
    tabTextActive: {fontWeight: '600', color: colors.primary},
    activeTabIndicator: {
      position: 'absolute',
      bottom: 0,
      width: '100%',
      height: 3,
      backgroundColor: colors.primary,
      borderTopLeftRadius: 3,
      borderTopRightRadius: 3,
    },
    scrollContainer: {flex: 1},
    scrollContent: {paddingHorizontal: 20, paddingBottom: 40},
    controlsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 20,
      marginBottom: 20,
    },
    dateNavigator: {flexDirection: 'row', alignItems: 'center'},
    dateText: {fontSize: 16, color: colors.primaryTextColor, marginHorizontal: 4},
    divider: {width: 1, height: 20, backgroundColor: colors.border, marginHorizontal: 10},
    dropdownWrap: {
      flex: 1,
      alignItems: 'flex-end',
    },
    dropdown: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingVertical: 6,
      paddingHorizontal: 12,
      backgroundColor: colors.surface,
    },
    dropdownMenu: {
      position: 'absolute',
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      paddingVertical: 4,
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 4},
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 6,
    },
    dropdownOption: {
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    dropdownOptionSelected: {backgroundColor: colors.surfaceLight},
    modalBackdrop: {flex: 1},
    dropdownText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primaryTextColor,
      lineHeight: 22,
    },
    navIcon: {
      paddingHorizontal: 10,
    },
    summaryCard: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 30,
    },
    summaryItem: {flex: 1},
    summaryLabel: {fontSize: 13},
    summaryValue: {fontSize: 22, fontWeight: 'bold', color: colors.primaryTextColor, marginTop: 4},
    chartWrapper: {flexDirection: 'row', marginBottom: 20},
    yAxisContainer: {width: 35, height: 250, position: 'relative'},
    yAxisLabel: {position: 'absolute', right: 10, fontSize: 11, color: colors.secondaryTextColor},
    chartArea: {flex: 1, position: 'relative', justifyContent: 'flex-end'},
    gridLine: {position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: colors.border},
    barsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'flex-end',
      height: '100%',
      paddingHorizontal: 10,
    },
    barColumn: {flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%'},
    bar: {width: 14, borderRadius: 7, backgroundColor: colors.primary},
    xAxisContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingLeft: 35,
      marginTop: 8,
    },
    xAxisItem: {alignItems: 'center', flex: 1},
    xAxisValue: {fontSize: 12, color: colors.secondaryTextColor},
    xAxisDay: {fontSize: 10, color: colors.secondaryTextColor, marginTop: 2},
    tooltipContainer: {alignItems: 'center', marginTop: 30},
    tooltip: {
      backgroundColor: colors.surface,
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 2},
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    tooltipText: {fontSize: 14, fontWeight: '600', color: colors.primaryTextColor},
    hitSlop: {top: 10, bottom: 10, left: 10, right: 10},
  });

export default ReportScreen;
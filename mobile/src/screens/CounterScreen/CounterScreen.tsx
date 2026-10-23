import React, {useState, useCallback, useEffect, useRef} from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Image,
  ImageBackground,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  Dimensions,
  KeyboardAvoidingView,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/native';
import {launchImageLibrary} from 'react-native-image-picker';
import {CustomText, CounterButton} from '../../components';
import {
  getSelectedNaam,
  getAllNaams,
  saveNaamCount,
  recordSession,
  resetDailyCount,
  formatDateKey,
  getStreak,
  addNaamLog,
  selectNaamForContent,
  Naam,
} from '../../database/database';
import {
  syncNaamsOnLaunch,
  recordCountOnServer,
  resetCountsOnServer,
  recordSessionOnServer,
  fetchCountTotalsFromServer,
  fetchStreakFromServer,
  naamServerRef,
  ServerCountTotal,
} from '../../services/api';
import {useAuth} from '../../context/AuthContext';
import {useSettings} from '../../context/SettingsContext';
import {TabParamList} from '../../navigation/types';
import {playCompletionSound} from '../../services/sound';
import InlineIcon, {
  InlineIconName,
} from '../../components/InlineIcon/InlineIcon';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';

const INTERVAL_OPTIONS = [0.5, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const DEFAULT_AUTO_TRACK_INTERVAL = 3;
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEK_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const SCREEN_WIDTH = Dimensions.get('window').width;
const POPUP_WIDTH = 230;

/**
 * MANTRA_LINE_HEIGHT must match the lineHeight in styles.mantraText, since the
 * cap is measured in pixels rather than lines.
 */
const MANTRA_LINE_HEIGHT = 22;

/**
 * How much script is on screen before it starts scrolling.
 *
 * The reading box is capped rather than given flex, so a one line script leaves
 * a one line box and the counter stays directly under it. Letting the box grow
 * to fill the screen instead pushed the counter to the bottom of a mostly empty
 * page.
 *
 * Ten lines is a deliberate jump up from the four this used to allow, which was
 * tight enough that most mantras scrolled.
 */
const MANTRA_MAX_LINES = 10;

/**
 * The counting circle, sized down so the reading above it gets the height.
 *
 * It scales a little with the screen but never past 170, so on a tablet the
 * reading still wins the space, and never below 130, which would leave too
 * little touch target around the number.
 */
const COUNTER_SIZE = Math.max(
  130,
  Math.min(170, Math.round(SCREEN_WIDTH * 0.36)),
);

/**
 * The two numbers inside the ring, sized off the ring itself.
 *
 * They used to be the shared `counter` and `subheading` variants, fixed at 70
 * and 18 for the old 220 circle. Shrinking the circle without shrinking these
 * left the count nearly as wide as the ring, so they are derived from
 * COUNTER_SIZE instead, keeping the proportions the 220 circle was designed
 * with: about a third of the ring for the count and just under a tenth for the
 * target. On a 390pt phone that is 45 and 13, down from 70 and 18.
 */
const COUNTER_COUNT_SIZE = Math.round(COUNTER_SIZE * 0.32);
const COUNTER_TARGET_SIZE = Math.round(COUNTER_SIZE * 0.09);

/**
 * The ring's stroke, kept in proportion to the ring.
 *
 * CounterButton defaults to 8, which was drawn for the old 220 circle. Left
 * alone on a 140 circle it is nearly twice as thick relative to the ring, and
 * the band is what the eye reads as the buttons size, so the smaller circle
 * still looked unchanged. About 4 percent matches what the 220 circle had.
 */
const COUNTER_STROKE = Math.max(4, Math.round(COUNTER_SIZE * 0.04));

type ThemeOption = {name: string; color: string | null};

const THEMES: ThemeOption[] = [
  {name: 'Default', color: null},
  {name: 'Cream', color: '#FDF6E3'},
  {name: 'Sage', color: '#E7ECDE'},
  {name: 'Sky', color: '#DCE8F7'},
  {name: 'Blush', color: '#F8E3E0'},
  {name: 'Lavender', color: '#EAE6F7'},
  {name: 'Sand', color: '#F5EBDD'},
  {name: 'Mint', color: '#E4F3EA'},
  {name: 'Mist', color: '#E9EDF3'},
];

const isLightColor = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
};

const formatElapsed = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatLogDate = (date: Date) => {
  const dd = String(date.getDate()).padStart(2, '0');
  return `${dd} ${MONTH_SHORT[date.getMonth()]} ${date.getFullYear()}`;
};

// const GLYPH_ESCAPES: Record<string, string> = {
//   // mojibake glyphs decoded from the source bytes, expressed as ASCII unicode escapes:
//   '\u00E2\u20AC\u00BA': 'chevronRight',      // â€º  ->  ›
//   '\u00E2\u20AC\u00B9': 'chevronLeft',       // â€¹  ->  ‹
//   '\u00C3\u00A2\u00E2\u20AC\u00BA': 'chevronRight', // alt for repeated byte-group
//   '\u00F0\u0178\u201D\u00A5': 'flame',        // ðŸ”¥  ->  fire emoji bytes
//   '\u00F0\u0178\u201D\u20AC\u2019': 'flame',  // alternate fire encoding
//   '\u00E2\u0153\u2022': 'close',              // âœ•  ->  x
//   '\u00E2\u2039\u00AE': 'dots',               // â‹®  ->  vertical dots
//   '\u00E2\u20AC\u00B9': 'chevronLeft',        // chevron-left alt
//   'â‍€›': 'chevronRight',                     // final safety: raw text (shouldn't reach)
// };

// Map of semantic names you'll use in JSX -> InlineIcon names
const ICON_NAMES: Record<string, string> = {
  chevronRight: 'chevronRight',
  keyboardArrowRight: 'keyboardArrowRight',
  chevronLeft: 'chevronLeft',
  flame: 'flame',
  close: 'close',
  dots: 'dots',
  play: 'play',
  pause: 'pause',
  stop: 'stop',
  eye: 'eye',
  calendar: 'calendar',
  bead: 'bead',
  check: 'check',
  up: 'chevronUp',
  down: 'chevronDown',
};

const IconChar = ({
  name,
  color,
  size = 18,
  style,
}: {
  name: string;
  color?: string;
  size?: number;
  style?: any;
}) => {
  const iconName = (ICON_NAMES[name] ?? name) as InlineIconName;
  return (
    <InlineIcon
      name={iconName}
      color={color ?? Colors.primaryTextColor}
      size={size}
      style={style}
    />
  );
};

const CounterScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const {token} = useAuth();
  const {settings, set: setSetting} = useSettings();
  const [selectedNaam, setSelectedNaam] = useState<Naam | null>(null);
  const [allNaams, setAllNaams] = useState<Naam[]>([]);
  const [streak, setStreak] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{x: number; y: number; width: number; height: number} | null>(null);
  const menuButtonRef = useRef<any>(null);
  const [immersive, setImmersive] = useState(false);
  const [topBarHeight, setTopBarHeight] = useState(0);

  /**
   * True only when the mantra is taller than the four line cap. Scrolling is
   * left off for a short mantra so it does not swallow the vertical drag that
   * belongs to the screen underneath it.
   */
  const [contentOverflows, setContentOverflows] = useState(false);
  const contentHeight = useRef(0);

  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [calendarSelected, setCalendarSelected] = useState<string | null>(null);
  const [calendarResetConfirm, setCalendarResetConfirm] = useState(false);

  const [timerActive, setTimerActive] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerElapsed, setTimerElapsed] = useState(0);

  const [autoTrackInterval, setAutoTrackInterval] = useState(
    DEFAULT_AUTO_TRACK_INTERVAL,
  );
  const [autoTracking, setAutoTracking] = useState(false);
  const [autoTrackSheetOpen, setAutoTrackSheetOpen] = useState(false);
  const [intervalPickerOpen, setIntervalPickerOpen] = useState(false);
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [addLogSheetOpen, setAddLogSheetOpen] = useState(false);
  const [logDate, setLogDate] = useState(() => new Date());

  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoTrackRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const handleTapRef = useRef<() => void>(() => {});

  /**
   * Rebuilds a naam's completed-bead and current-position figures from the
   * lifetime total the server holds.
   *
   * The server stores every bead counted, so it is the number to trust after a
   * reinstall or on a second device. Only moves a naam forward: when the local
   * count is already ahead (beads counted while offline) it is left alone rather
   * than being wound back to the server's older figure.
   *
   * Returns true when anything changed, so the caller knows to re-read.
   */
  const applyServerTotals = useCallback(
    async (naams: Naam[], totals: ServerCountTotal[]) => {
      if (totals.length === 0) {
        return false;
      }
      const totalByRef = new Map<string, number>();
      for (const row of totals) {
        totalByRef.set(`${row.source}:${row.naam_id}`, row.total);
      }

      let changed = false;
      for (const naam of naams) {
        const ref = naamServerRef(naam);
        if (!ref) {
          continue;
        }
        const serverTotal = totalByRef.get(`${ref.source}:${ref.naamId}`);
        if (serverTotal === undefined) {
          continue;
        }
        const localTotal = naam.total_beads + naam.count;
        if (serverTotal <= localTotal) {
          continue;
        }
        const beadCount = naam.bead_count;
        const completed =
          beadCount > 0
            ? Math.floor(serverTotal / beadCount) * beadCount
            : naam.total_beads;
        const position = beadCount > 0 ? serverTotal % beadCount : serverTotal;
        await saveNaamCount(naam.id, position, completed);
        changed = true;
      }
      return changed;
    },
    [],
  );

  /**
   * The selected naam's streak. It is derived from the same daily counts on both
   * sides, so the server's figure (which survives a reinstall) and the phone's
   * are normally identical; the larger is taken because either can hold beads
   * the other has not seen yet (another device, or counting not yet pushed). A
   * failed fetch just leaves the local figure in place.
   */
  const resolveStreak = useCallback(
    async (naam: Naam | null): Promise<number> => {
      const local = await getStreak(naam);
      if (!token || !naam) {
        return local;
      }
      const ref = naamServerRef(naam);
      if (!ref) {
        return local;
      }
      const server = await fetchStreakFromServer(
        token,
        ref,
        formatDateKey(new Date()),
      ).catch(() => null);
      return server === null ? local : Math.max(local, server);
    },
    [token],
  );

  const loadData = useCallback(async () => {
    // On a fresh install the local table is empty until the admin panel's naams
    // arrive, so wait for the startup sync before reading. It never rejects, so
    // the screen still loads when the server is unreachable.
    await syncNaamsOnLaunch();

    let naam = await getSelectedNaam();
    let naams = await getAllNaams();
    // The streak is this naam's own, so it cannot be read alongside the naam: the
    // bead count that decides whether a day counts is only known once the naam
    // itself has been read.
    let streakValue = await resolveStreak(naam);

    // Pull the account's lifetime totals so the count, malas and all-naams
    // figures match the report and survive a reinstall. A failed fetch just
    // leaves the locally stored figures in place.
    if (token) {
      const totals = await fetchCountTotalsFromServer(token).catch(() => null);
      if (totals) {
        const changed = await applyServerTotals(naams, totals);
        if (changed) {
          naam = await getSelectedNaam();
          naams = await getAllNaams();
          streakValue = await resolveStreak(naam);
        }
      }
    }

    setSelectedNaam(naam);
    setAllNaams(naams);
    setStreak(streakValue);
  }, [token, applyServerTotals, resolveStreak]);

  const navigation2 = useNavigation<any>();
  const {prefill} = useRoute<RouteProp<TabParamList, 'Counter'>>().params ?? {};

  useEffect(() => {
    navigation2.setOptions({
      tabBarStyle: immersive
        ? {display: 'none'}
        : {backgroundColor: settings.themeColor ?? Colors.surface},
    });
  }, [navigation2, immersive, settings.themeColor]);

  const enterImmersive = () => {
    setImmersive(true);
    setMenuOpen(false);
  };


  const exitImmersive = () => {
    setImmersive(false);
    setMenuOpen(false);
  };

  /**
   * "Start Naam Jap" on a reading hands this screen the reading. The counter
   * renders whichever naam is selected, so the reading is turned into a naam and
   * selected before anything is read back. Applying it after the read would
   * flash the previous naam first and then swap it.
   *
   * This is also the only place data is loaded. There used to be a mount effect
   * doing it as well, which read the selection before the prefill had been
   * applied and doubled the work on every focus.
   */
  const applyPrefill = useCallback(async () => {
    if (!prefill) {
      return;
    }
    // Consumed here rather than on every focus. Coming back to the counter
    // later should show the naam the user last picked by hand, not re-apply a
    // reading they have since moved on from.
    navigation2.setParams({prefill: undefined});
    await selectNaamForContent({
      contentId: prefill.contentId,
      name: prefill.name,
      mantra: prefill.mantra,
      beadCount: prefill.beadCount,
    });
  }, [prefill, navigation2]);

  useFocusEffect(
    useCallback(() => {
      applyPrefill().then(loadData);
    }, [applyPrefill, loadData]),
  );

  const count = selectedNaam?.count ?? 0;
  const target = selectedNaam?.bead_count ?? 108;
  const totalBeads = selectedNaam?.total_beads ?? 0;
  const selectedMalas =
    selectedNaam && selectedNaam.bead_count > 0
      ? Math.floor(totalBeads / selectedNaam.bead_count)
      : 0;

  const totalAll = allNaams.reduce(
    (sum, naam) => sum + naam.count + naam.total_beads,
    0,
  );

  const openMenu = useCallback(() => {
    menuButtonRef.current?.measureInWindow(
      (x: number, y: number, width: number, height: number) => {
        setMenuPos({x, y, width, height});
        setMenuOpen(true);
      },
    );
  }, []);

  /**
   * Mirrors one bead onto the server for the signed-in account. Fire and forget:
   * the count on screen is already saved locally, so a dropped request must not
   * interrupt counting. Naams the server does not know yet are skipped.
   */
  const pushBeadToServer = useCallback(
    (naam: Naam) => {
      if (!token) {
        return;
      }
      const ref = naamServerRef(naam);
      if (!ref) {
        return;
      }
      recordCountOnServer(token, {
        source: ref.source,
        naamId: ref.naamId,
        date: formatDateKey(new Date()),
        amount: 1,
      }).catch(() => {});
    },
    [token],
  );

  const handleTap = useCallback(() => {
    if (!selectedNaam) {
      return;
    }
    const beadCount = selectedNaam.bead_count;
    let newCount: number;
    let newTotalBeads: number;
    if (beadCount > 0) {
      const current = count + 1;
      if (current >= beadCount) {
        newCount = current % beadCount;
        newTotalBeads =
          totalBeads + Math.floor(current / beadCount) * beadCount;
        // Play completion sound when a full mala is finished
        playCompletionSound();
      } else {
        newCount = current;
        newTotalBeads = totalBeads;
      }
    } else {
      newCount = count + 1;
      newTotalBeads = totalBeads;
    }

    const updatedNaam = {
      ...selectedNaam,
      count: newCount,
      total_beads: newTotalBeads,
    };
    setSelectedNaam(updatedNaam);
    setAllNaams(prev =>
      prev.map(naam => (naam.id === selectedNaam.id ? updatedNaam : naam)),
    );
    // The streak only moves when a whole mala is finished, so the bead has to be
    // on disk before the streak is read back. saveNaamCount queues its write and
    // hands back the queue, so waiting on it is what makes the number appear the
    // moment the goal is met rather than on the next visit.
    saveNaamCount(selectedNaam.id, newCount, newTotalBeads)
      .then(() => getStreak(updatedNaam))
      .then(setStreak);
    pushBeadToServer(selectedNaam);
  }, [selectedNaam, count, totalBeads, pushBeadToServer]);

  handleTapRef.current = handleTap;

  useEffect(() => {
    if (!timerActive || !timerRunning) {
      return;
    }
    const id = setInterval(() => setTimerElapsed(prev => prev + 1), 1000);
    return () => clearInterval(id);
  }, [timerActive, timerRunning]);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
      if (autoTrackRef.current) {
        clearInterval(autoTrackRef.current);
        autoTrackRef.current = null;
      }
    };
  }, []);

  const startAutoTrack = () => {
    if (autoTrackRef.current) {
      clearInterval(autoTrackRef.current);
    }
    autoTrackRef.current = setInterval(
      () => handleTapRef.current(),
      autoTrackInterval * 1000,
    );
    setAutoTracking(true);
    setAutoTrackSheetOpen(false);
    setMenuOpen(false);
  };

  const stopAutoTrack = () => {
    if (autoTrackRef.current) {
      clearInterval(autoTrackRef.current);
      autoTrackRef.current = null;
    }
    setAutoTracking(false);
  };

  const startTimer = () => {
    setTimerActive(true);
    setTimerRunning(true);
    setTimerElapsed(0);
    setMenuOpen(false);
  };

  const togglePause = () => {
    setTimerRunning(prev => !prev);
  };

  const endTimer = () => {
    if (timerElapsed > 0) {
      recordSession(timerElapsed);
      if (token) {
        recordSessionOnServer(
          token,
          timerElapsed,
          formatDateKey(new Date()),
          selectedNaam ? naamServerRef(selectedNaam) ?? undefined : undefined,
        ).catch(() => {});
      }
    }
    setTimerActive(false);
    setTimerRunning(false);
    setTimerElapsed(0);
  };

  const handleResetCount = () => {
    if (!calendarResetConfirm) {
      setCalendarResetConfirm(true);
      resetTimerRef.current = setTimeout(
        () => setCalendarResetConfirm(false),
        3000,
      );
      return;
    }
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
    setCalendarResetConfirm(false);
    setCalendarOpen(false);
    const date = calendarSelected;
    if (date) {
      resetDailyCount(date).then(() => {
        loadData();
      });
      if (token) {
        resetCountsOnServer(token, date).catch(() => {});
      }
    }
  };

  const openCalendar = () => {
    setCalendarSelected(null);
    setCalendarResetConfirm(false);
    setCalendarOpen(true);
    setMenuOpen(false);
  };

  const shiftCalendar = (direction: -1 | 1) => {
    setCalendarMonth(prev => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + direction);
      return next;
    });
    setCalendarResetConfirm(false);
  };

  const selectCalendarDay = (key: string) => {
    setCalendarSelected(key);
    setCalendarResetConfirm(false);
  };

  const handleBackground = async () => {
    if (settings.backgroundImage) {
      setSetting('backgroundImage', null);
      setMenuOpen(false);
      return;
    }
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        quality: 0.8,
      });
      if (result.assets && result.assets[0]?.uri) {
        setSetting('backgroundImage', result.assets[0].uri);
      }
    } catch {}
    setMenuOpen(false);
  };

  const toggleHideNaam = () => {
    setSetting('hideNaam', !settings.hideNaam);
    setMenuOpen(false);
  };

  const toggleMusic = () => {
    setSetting('playMusic', !settings.playMusic);
    setMenuOpen(false);
  };

  const toggleBlockout = () => {
    setSetting('blockout', !settings.blockout);
    setMenuOpen(false);
  };

  const openAddLogSheet = () => {
    setLogDate(new Date());
    setAddLogSheetOpen(true);
    setMenuOpen(false);
  };

  const handleAddLog = (addedCount: number) => {
    if (!selectedNaam) {
      return;
    }
    setAddLogSheetOpen(false);
    const selected = selectedNaam;
    const dateKey = formatDateKey(logDate);
    addNaamLog(selected.id, dateKey, addedCount).then(() => {
      loadData();
    });
    if (token) {
      const ref = naamServerRef(selected);
      if (ref) {
        recordCountOnServer(token, {
          source: ref.source,
          naamId: ref.naamId,
          date: dateKey,
          amount: addedCount,
          mode: 'add',
        }).catch(() => {});
      }
    }
  };

  const renderMenuRows = () => (
    <>
      <Pressable key="hide_naam" style={styles.menuRow} onPress={toggleHideNaam}>
        <CustomText variant="body" style={styles.menuLabel}>
          {settings.hideNaam ? 'Show naam' : 'Hide naam'}
        </CustomText>
        <IconChar name="keyboardArrowRight" color="#9CA3AF" />
      </Pressable>

      {!timerActive && (
        <Pressable key="timer" style={styles.menuRow} onPress={startTimer}>
          <CustomText variant="body" style={styles.menuLabel}>
            Start timer
          </CustomText>
          <IconChar name="keyboardArrowRight" color="#9CA3AF" />
        </Pressable>
      )}

      <Pressable key="background" style={styles.menuRow} onPress={handleBackground}>
        <CustomText variant="body" style={styles.menuLabel}>
          {settings.backgroundImage ? 'Remove background' : 'Add background'}
        </CustomText>
        <IconChar name="keyboardArrowRight" color="#9CA3AF" />
      </Pressable>

      <Pressable key="play_music" style={styles.menuRow} onPress={toggleMusic}>
        <CustomText variant="body" style={styles.menuLabel}>
          {settings.playMusic ? 'Stop music' : 'Play music'}
        </CustomText>
        <IconChar name="keyboardArrowRight" color="#9CA3AF" />
      </Pressable>

      <Pressable key="blockout" style={styles.menuRow} onPress={toggleBlockout}>
        <CustomText variant="body" style={styles.menuLabel}>
          {settings.blockout ? 'Exit blockout' : 'Blockout mode'}
        </CustomText>
        <IconChar name="keyboardArrowRight" color="#9CA3AF" />
      </Pressable>

      <Pressable
        key="change_theme"
        style={styles.menuRow}
        onPress={() => {
          setMenuOpen(false);
          setThemeModalOpen(true);
        }}>
        <CustomText variant="body" style={styles.menuLabel}>
          Change theme
        </CustomText>
        <IconChar name="keyboardArrowRight" color="#9CA3AF" />
      </Pressable>

      <Pressable
        key="auto_track"
        style={styles.menuRow}
        onPress={() => setAutoTrackSheetOpen(true)}>
        <CustomText variant="body" style={styles.menuLabel}>
          Auto track
        </CustomText>
        <IconChar name="keyboardArrowRight" color="#9CA3AF" />
      </Pressable>

      {!immersive && (
        <Pressable
          key="immersive_mode"
          style={styles.menuRow}
          onPress={() => {
            setMenuOpen(false);
            enterImmersive();
          }}>
          <CustomText variant="body" style={styles.menuLabel}>
            Immersive mode
          </CustomText>
          <IconChar name="keyboardArrowRight" color="#9CA3AF" />
        </Pressable>
      )}

      {!immersive && (
        <Pressable
          key="add_naam_logs"
          style={styles.menuRow}
          onPress={openAddLogSheet}>
          <CustomText variant="body" style={styles.menuLabel}>
            Add mantra logs
          </CustomText>
          <IconChar name="keyboardArrowRight" color="#9CA3AF" />
        </Pressable>
      )}

      {!immersive && (
        <Pressable
          key="reset_count"
          style={styles.menuRow}
          onPress={openCalendar}>
          <CustomText variant="body" style={styles.menuLabel}>
            Reset count
          </CustomText>
          <IconChar name="keyboardArrowRight" color="#9CA3AF" />
        </Pressable>
      )}
    </>
  );

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        settings.themeColor && {backgroundColor: settings.themeColor},
      ]}
      edges={['top']}>
      <View
        style={styles.topBar}
        onLayout={e => setTopBarHeight(e.nativeEvent.layout.height)}>
        <View style={{flex: 1, justifyContent: 'center'}}>
          <Image
            source={require('../../assets/japam108_logo.png')}
            style={styles.topBarLogo}
            resizeMode="contain"
            accessibilityLabel="Japam108"
          />
        </View>
        {!immersive && (
          <View style={styles.topBarBoxes}>
            {/* The flame is the streak: consecutive days this naam reached its
                goal. It used to sit beside a "days free" box and show today's
                bead total, which read as a second, contradictory number. */}
            <View style={[styles.topBarBox, styles.topBarBoxLight]}>
              <IconChar name="flame" color={Colors.primaryTextColor} style={{fontSize: 13, lineHeight: 16}} />
              <CustomText variant="body" style={styles.topBarBoxLightText}>
                {streak}
              </CustomText>
            </View>
          </View>
        )}
        {immersive ? (
          <Pressable
            style={styles.menuButton}
            onPress={exitImmersive}
            hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
            <IconChar name="close" color={Colors.primaryTextColor} style={{fontSize: 22, lineHeight: 26}} />
          </Pressable>
        ) : (
          <TouchableOpacity
            ref={menuButtonRef}
            style={styles.menuButton}
            onPress={() => {
              if (menuOpen) {
                setMenuOpen(false);
              } else {
                openMenu();
              }
            }}
            hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
            <IconChar name="dots" color={Colors.primaryTextColor} style={{fontSize: 26, lineHeight: 30}} />
          </TouchableOpacity>
        )}
      </View>

      {autoTracking && (
        <View style={[styles.autoTrackStopOverlay, {top: topBarHeight}]}>
          <View style={styles.autoTrackBanner}>
            <CustomText variant="caption" style={styles.autoTrackBannerText}>
              Auto track active · every {autoTrackInterval}s
            </CustomText>
            <TouchableOpacity
              onPress={stopAutoTrack}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <IconChar
                name="stop"
                color="#FFFFFF"
                size={18}
              />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ImageBackground
        source={
          settings.backgroundImage ? {uri: settings.backgroundImage} : undefined
        }
        style={styles.backgroundImage}
        imageStyle={styles.backgroundImageStyle}
        resizeMode="cover">
        <View
          style={[
            styles.container,
            settings.backgroundImage
              ? styles.containerWithBackground
              : settings.themeColor
              ? {backgroundColor: settings.themeColor}
              : null,
          ]}>
          {timerActive && (
            <View style={styles.timerOverlay}>
              <CustomText variant="caption" style={styles.timerTime}>
                {formatElapsed(timerElapsed)}
              </CustomText>
              <TouchableOpacity
                onPress={togglePause}
                hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                <IconChar
                  name={timerRunning ? 'pause' : 'play'}
                  color={Colors.primary}
                  style={{fontSize: 18, lineHeight: 22}}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={endTimer}
                hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                <IconChar
                  name="stop"
                  color="#EF4444"
                  style={{fontSize: 18, lineHeight: 22}}
                />
              </TouchableOpacity>
            </View>
          )}

          {settings.playMusic && (
            <View style={styles.musicBanner}>
              <CustomText variant="caption" style={styles.musicBannerText}>
                meditation audio playing
              </CustomText>
              <TouchableOpacity
                onPress={() => setSetting('playMusic', false)}
                hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                <IconChar
                  name="close"
                  color="#FFFFFF"
                  style={{fontSize: 18, lineHeight: 22}}
                />
              </TouchableOpacity>
            </View>
          )}

          {!settings.hideNaam && selectedNaam?.name && (
            <CustomText variant="heading" style={styles.title}>
              {selectedNaam.name}
            </CustomText>
          )}

          {/* Only the script scrolls. The name sits outside this box so it stays
              put as the reading moves, which keeps the user oriented through a
              long mantra. The box is capped rather than given flex, so a short
              script leaves a short box and the counter stays directly under it
              instead of being pushed to the bottom of a mostly empty page. */}
          {selectedNaam?.mantra && !settings.hideNaam && (
            <ScrollView
              style={styles.contentScroll}
              showsVerticalScrollIndicator={contentOverflows}
              nestedScrollEnabled
              onLayout={e => {
                contentHeight.current = e.nativeEvent.layout.height;
              }}
              onContentSizeChange={(_w, h) =>
                setContentOverflows(h > contentHeight.current)
              }>
              <CustomText
                variant="body"
                color={Colors.secondaryTextColor}
                style={styles.mantraText}>
                {selectedNaam.mantra}
              </CustomText>
            </ScrollView>
          )}

          <CounterButton
            onPress={handleTap}
            size={COUNTER_SIZE}
            strokeWidth={COUNTER_STROKE}
            progress={target > 0 ? count / target : 0}>
            <CustomText
              variant="counter"
              color={Colors.primaryTextColor}
              style={styles.countValue}>
              {count}
            </CustomText>
            <CustomText
              variant="subheading"
              color={Colors.secondaryTextColor}
              style={styles.targetValue}>
              / {target}
            </CustomText>
          </CounterButton>

          <CustomText variant="caption" color={Colors.secondaryTextColor}>
            Malas : {selectedMalas} | All naams : {totalAll}
          </CustomText>
        </View>
      </ImageBackground>

{settings.blockout && (
        <View style={styles.blockoutOverlay}>
          <TouchableOpacity
            style={styles.blockoutEyeButton}
            onPress={toggleBlockout}
            hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
            <IconChar
              name="eye"
              color="#FFFFFF"
              style={{fontSize: 26, lineHeight: 30}}
            />
          </TouchableOpacity>
        </View>
      )}

      {menuOpen && (
        <Pressable style={styles.popupBackdrop} onPress={() => setMenuOpen(false)}>
          <Pressable
            style={[
              styles.popup,
              menuPos
                ? {
                    left: Math.max(
                      8,
                      Math.min(
                        menuPos.x + menuPos.width - POPUP_WIDTH,
                        SCREEN_WIDTH - POPUP_WIDTH - 8,
                      ),
                    ),
                    top: menuPos.y + menuPos.height + 4,
                  }
                : undefined,
            ]}
            onPress={() => {}}>
            {renderMenuRows()}
          </Pressable>
        </Pressable>
      )}

      <Modal
        visible={autoTrackSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setAutoTrackSheetOpen(false)}>
        <Pressable
          style={styles.sheetBackdrop}
          onPress={() => setAutoTrackSheetOpen(false)}>
          <Pressable
            style={[styles.sheet, {paddingBottom: 36 + insets.bottom}]}
            onPress={e => e.stopPropagation()}>
            <CustomText variant="subheading" style={styles.sheetTitle}>
              Auto track
            </CustomText>

            <CustomText variant="caption" color={Colors.secondaryTextColor}>
              Increment interval
            </CustomText>

            <Pressable
              style={styles.intervalRow}
              onPress={() => setIntervalPickerOpen(prev => !prev)}>
              <CustomText variant="body" style={styles.sheetLabel}>
                {autoTrackInterval} second{autoTrackInterval === 1 ? '' : 's'}
              </CustomText>
              <IconChar
                name={intervalPickerOpen ? 'up' : 'down'}
                color="#9CA3AF"
                style={{fontSize: 10, lineHeight: 14}}
              />
            </Pressable>

            {intervalPickerOpen && (
              <View style={styles.intervalList}>
                {INTERVAL_OPTIONS.map(option => (
                  <Pressable
                    key={option}
                    style={[
                      styles.intervalOption,
                      option === autoTrackInterval && styles.intervalOptionActive,
                    ]}
                    onPress={() => {
                      setAutoTrackInterval(option);
                      setIntervalPickerOpen(false);
                    }}>
                    <CustomText
                      variant="body"
                      color={
                        option === autoTrackInterval
                          ? '#FFFFFF'
                          : Colors.primaryTextColor
                      }>
                      {option} second{option === 1 ? '' : 's'}
                    </CustomText>
                  </Pressable>
                ))}
              </View>
            )}

            <CustomText
              variant="caption"
              color={Colors.secondaryTextColor}
              style={styles.sheetNote}>
              Use the stop button in the top banner to stop auto track.
            </CustomText>

            <TouchableOpacity
              style={styles.sheetButton}
              onPress={startAutoTrack}
              activeOpacity={0.8}>
              <CustomText variant="subheading" color="#FFFFFF" style={styles.sheetButtonText}>
                Start auto track
              </CustomText>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={themeModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setThemeModalOpen(false)}>
        <Pressable
          style={styles.themeBackdrop}
          onPress={() => setThemeModalOpen(false)}>
          <Pressable style={styles.themeCard} onPress={e => e.stopPropagation()}>
            <CustomText variant="subheading" style={styles.themeTitle}>
              Choose theme
            </CustomText>

            <View style={styles.themeGrid}>
              {THEMES.map(theme => {
                const swatchColor = theme.color ?? Colors.background;
                const isSelected =
                  (settings.themeColor ?? null) === theme.color ||
                  (theme.color !== null &&
                    settings.themeColor !== null &&
                    settings.themeColor.toLowerCase() ===
                      theme.color.toLowerCase());
                return (
                  <TouchableOpacity
                    key={theme.name}
                    style={styles.themeItem}
                    onPress={() => setSetting('themeColor', theme.color)}
                    activeOpacity={0.7}>
                    <View
                      style={[
                        styles.themeSwatch,
                        {backgroundColor: swatchColor},
                        isSelected && styles.themeSwatchSelected,
                      ]}>
                      {isSelected && (
                        <IconChar
                          name="check"
                          color={
                            isLightColor(swatchColor) ? '#1A1A2E' : '#FFFFFF'
                          }
                          style={{fontSize: 22, lineHeight: 26}}
                        />
                      )}
                    </View>
                    <CustomText variant="caption" style={styles.themeName}>
                      {theme.name}
                    </CustomText>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.themeCloseButton}
              onPress={() => setThemeModalOpen(false)}
              activeOpacity={0.8}>
              <CustomText variant="subheading" style={styles.themeCloseText}>
                Close
              </CustomText>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <CalendarSheet
        visible={calendarOpen}
        month={calendarMonth}
        selected={calendarSelected}
        resetConfirm={calendarResetConfirm}
        onClose={() => setCalendarOpen(false)}
        onShift={shiftCalendar}
        onSelectDay={selectCalendarDay}
        onReset={handleResetCount}
      />

      <AddLogSheet
        visible={addLogSheetOpen}
        date={logDate}
        onClose={() => setAddLogSheetOpen(false)}
        onSelectDate={setLogDate}
        onAddLog={handleAddLog}
      />
    </SafeAreaView>
  );
};

export const CalendarSheet: React.FC<{
  visible: boolean;
  month: Date;
  selected: string | null;
  resetConfirm: boolean;
  onClose: () => void;
  onShift: (direction: -1 | 1) => void;
  onSelectDay: (key: string) => void;
  onReset: () => void;
}> = ({
  visible,
  month,
  selected,
  resetConfirm,
  onClose,
  onShift,
  onSelectDay,
  onReset,
}) => {
  const insets = useSafeAreaInsets();
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const startOffset = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const todayKey = formatDateKey(new Date());
  const blanks = Array.from({length: startOffset}, () => 0);
  const days = Array.from({length: daysInMonth}, (_, i) => i + 1);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, {paddingBottom: 36 + insets.bottom}]}
          onPress={e => e.stopPropagation()}>
          <CustomText variant="subheading" style={styles.sheetTitle}>
            Reset count by date
          </CustomText>

          <View style={styles.calendarHeader}>
            <TouchableOpacity
              style={styles.calendarNav}
              onPress={() => onShift(-1)}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <IconChar name="chevronLeft" color={Colors.primaryTextColor} style={{fontSize: 24, lineHeight: 28}} />
            </TouchableOpacity>
            <CustomText variant="body" style={styles.calendarMonthLabel}>
              {MONTH_NAMES[monthIndex]} {year}
            </CustomText>
            <TouchableOpacity
              style={styles.calendarNav}
              onPress={() => onShift(1)}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <IconChar name="chevronRight" color={Colors.primaryTextColor} style={{fontSize: 24, lineHeight: 28}} />
            </TouchableOpacity>
          </View>

          <View style={styles.calendarWeekRow}>
            {WEEK_HEADERS.map(h => (
              <View key={h} style={styles.calendarDayCell}>
                <CustomText variant="caption" color={Colors.secondaryTextColor}>
                  {h}
                </CustomText>
              </View>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {blanks.map((_, i) => (
              <View key={`blank-${i}`} style={styles.calendarDayCell} />
            ))}
            {days.map(d => {
              const key = formatDateKey(new Date(year, monthIndex, d));
              const isFuture = key > todayKey;
              const isSelected = key === selected;
              const isToday = key === todayKey;
              return (
                <TouchableOpacity
                  key={key}
                  style={styles.calendarDayCell}
                  disabled={isFuture}
                  onPress={() => onSelectDay(key)}>
                  <View
                    style={[
                      styles.calendarDay,
                      isSelected && styles.calendarDaySelected,
                      isToday && !isSelected && styles.calendarDayToday,
                    ]}>
                    <CustomText
                      variant="body"
                      style={styles.calendarDayText}
                      color={
                        isSelected
                          ? '#FFFFFF'
                          : isFuture
                          ? '#C9C9D2'
                          : Colors.primaryTextColor
                      }>
                      {d}
                    </CustomText>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[
              styles.sheetButton,
              !selected && styles.sheetButtonDisabled,
            ]}
            onPress={onReset}
            disabled={!selected}
            activeOpacity={0.8}>
            <CustomText variant="subheading" color="#FFFFFF" style={styles.sheetButtonText}>
              {resetConfirm ? 'Tap again to confirm' : 'Reset selected date'}
            </CustomText>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export const AddLogSheet: React.FC<{
  visible: boolean;
  date: Date;
  onClose: () => void;
  onSelectDate: (date: Date) => void;
  onAddLog: (count: number) => void;
}> = ({visible, date, onClose, onSelectDate, onAddLog}) => {
  const insets = useSafeAreaInsets();
  const [countText, setCountText] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(
    () => new Date(date.getFullYear(), date.getMonth(), 1),
  );

  const logCount = parseInt(countText, 10);
  const validCount = !isNaN(logCount) && logCount > 0;

  const pickerYear = pickerMonth.getFullYear();
  const pickerMonthIndex = pickerMonth.getMonth();
  const pickerStartOffset = new Date(pickerYear, pickerMonthIndex, 1).getDay();
  const pickerDaysInMonth = new Date(pickerYear, pickerMonthIndex + 1, 0).getDate();
  const todayKey = formatDateKey(new Date());
  const pickerBlanks = Array.from({length: pickerStartOffset}, () => 0);
  const pickerDays = Array.from({length: pickerDaysInMonth}, (_, i) => i + 1);

  const shiftPickerMonth = (direction: -1 | 1) => {
    setPickerMonth(prev => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + direction);
      return next;
    });
  };

  const handleAdd = () => {
    if (!validCount) {
      return;
    }
    onAddLog(logCount);
    setCountText('');
  };

  const handleSelectDay = (key: string) => {
    const parts = key.split('-').map(Number);
    onSelectDate(new Date(parts[0], parts[1] - 1, parts[2]));
    setPickerOpen(false);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.sheetBackdrop} behavior="padding">
        <Pressable style={styles.sheetBackdrop} onPress={onClose}>
          <Pressable
            style={[styles.sheet, {paddingBottom: 36 + insets.bottom}]}
            onPress={e => e.stopPropagation()}>
          <View style={styles.logSheetHeader}>
            <CustomText variant="subheading" style={styles.logSheetHeaderTitle}>
              Add Mantra Logs
            </CustomText>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
              <IconChar name="close" color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <CustomText
            variant="caption"
            color={Colors.secondaryTextColor}
            style={styles.logSheetNote}>
            Adds to existing count if it already exists
          </CustomText>

          <View style={styles.logRow}>
            <TouchableOpacity
              style={styles.logFieldBox}
              onPress={() => setPickerOpen(true)}
              activeOpacity={0.8}>
              <IconChar
                name="calendar"
                color={Colors.primaryTextColor}
                style={{fontSize: 16, lineHeight: 20}}
              />
              <CustomText variant="body" style={styles.logDateText}>
                {formatLogDate(date)}
              </CustomText>
            </TouchableOpacity>

            <View style={styles.logFieldBox}>
              <CustomText style={styles.logCountPrefix}>#</CustomText>
              <TextInput
                style={styles.logCountInput}
                placeholder="enter count"
                placeholderTextColor={Colors.secondaryTextColor}
                keyboardType="number-pad"
                value={countText}
                onChangeText={setCountText}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.sheetButton, !validCount && styles.sheetButtonDisabled]}
            onPress={handleAdd}
            disabled={!validCount}
            activeOpacity={0.8}>
            <CustomText variant="subheading" color="#FFFFFF" style={styles.sheetButtonText}>
              Add Log
            </CustomText>
          </TouchableOpacity>
        </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.themeBackdrop} onPress={() => setPickerOpen(false)}>
          <Pressable style={styles.pickerCard} onPress={e => e.stopPropagation()}>
            <View style={styles.calendarHeader}>
              <TouchableOpacity
                style={styles.calendarNav}
                onPress={() => shiftPickerMonth(-1)}
                hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                <IconChar name="chevronLeft" color={Colors.primaryTextColor} style={{fontSize: 24, lineHeight: 28}} />
              </TouchableOpacity>
              <CustomText variant="body" style={styles.calendarMonthLabel}>
                {MONTH_NAMES[pickerMonthIndex]} {pickerYear}
              </CustomText>
              <TouchableOpacity
                style={styles.calendarNav}
                onPress={() => shiftPickerMonth(1)}
                hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                <IconChar name="chevronRight" color={Colors.primaryTextColor} style={{fontSize: 24, lineHeight: 28}} />
              </TouchableOpacity>
            </View>

            <View style={styles.calendarWeekRow}>
              {WEEK_HEADERS.map(h => (
                <View key={h} style={styles.calendarDayCell}>
                  <CustomText variant="caption" color={Colors.secondaryTextColor}>
                    {h}
                  </CustomText>
                </View>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {pickerBlanks.map((_, i) => (
                <View key={`blank-${i}`} style={styles.calendarDayCell} />
              ))}
              {pickerDays.map(d => {
                const key = formatDateKey(new Date(pickerYear, pickerMonthIndex, d));
                const isFuture = key > todayKey;
                const isSelected = key === formatDateKey(date);
                const isToday = key === todayKey;
                return (
                  <TouchableOpacity
                    key={key}
                    style={styles.calendarDayCell}
                    disabled={isFuture}
                    onPress={() => handleSelectDay(key)}>
                    <View
                      style={[
                        styles.calendarDay,
                        isSelected && styles.calendarDaySelected,
                        isToday && !isSelected && styles.calendarDayToday,
                      ]}>
                      <CustomText
                        variant="body"
                        style={styles.calendarDayText}
                        color={
                          isSelected
                            ? '#FFFFFF'
                            : isFuture
                            ? '#C9C9D2'
                            : Colors.primaryTextColor
                        }>
                        {d}
                      </CustomText>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  topBarLogo: {
    height: 50,
    aspectRatio: 3.4,
    alignSelf: 'flex-start',
  },
  topBarBoxes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 6,
  },
  topBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 40,
    paddingHorizontal: 12,
    paddingVertical: 5,
    gap: 6,
  },
  topBarBoxLight: {
    backgroundColor: Colors.surfaceLight,
  },
  topBarBoxLightText: {
    color: Colors.primaryTextColor,
    fontFamily: Fonts.semiBold,
  },
  menuButton: {
    paddingHorizontal: 4,
  },
  backgroundImage: {
    flex: 1,
  },
  containerWithBackground: {
    backgroundColor: 'transparent',
  },
  backgroundImageStyle: {
    opacity: 1,
  },
      container: {
        flex: 1,
        backgroundColor: Colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        paddingHorizontal: 20,
        paddingBottom: 16,
      },
  timerOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'transparent',
  },
  timerTime: {
    fontFamily: Fonts.medium,
    fontVariant: ['tabular-nums'],
    color: Colors.primaryTextColor,
  },
  blockoutOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    zIndex: 50,
    alignItems: 'flex-end',
    paddingTop: 20,
    paddingRight: 20,
  },
  blockoutEyeButton: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  musicBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  musicBannerText: {
    color: '#FFFFFF',
    fontStyle: 'italic',
  },
  autoTrackStopOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    pointerEvents: 'box-none',
  },
  autoTrackBanner: {
    alignSelf: 'center',
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.primary,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  autoTrackBannerText: {
    color: '#FFFFFF',
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 36,
  },
  sheetTitle: {
    color: Colors.primaryTextColor,
    marginBottom: 20,
  },
  logSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  logSheetHeaderTitle: {
    color: Colors.primaryTextColor,
    marginBottom: 0,
  },
  logSheetNote: {
    marginBottom: 16,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logFieldBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: Colors.background,
  },
  logDateText: {
    color: Colors.primaryTextColor,
    flexShrink: 1,
  },
  logCountInput: {
    flex: 1,
    padding: 0,
    color: Colors.primaryTextColor,
    fontFamily: Fonts.regular,
    fontSize: 14,
  },
  logCountPrefix: {
    color: Colors.secondaryTextColor,
    fontFamily: Fonts.regular,
    fontSize: 14,
    marginLeft: 2,
  },
  pickerCard: {
    backgroundColor: Colors.background,
    borderRadius: 20,
    padding: 20,
    width: Math.round(Dimensions.get('window').width * 0.86),
  },
  sheetLabel: {
    color: Colors.primaryTextColor,
  },
  intervalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
    backgroundColor: Colors.background,
  },
  intervalList: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    marginTop: 8,
    overflow: 'hidden',
    backgroundColor: Colors.background,
  },
  intervalOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  intervalOptionActive: {
    backgroundColor: Colors.primary,
  },
  sheetNote: {
    marginTop: 16,
    fontStyle: 'italic',
  },
  sheetButton: {
    marginTop: 20,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  sheetButtonText: {
    color: '#FFFFFF',
    fontFamily: Fonts.semiBold,
  },
  sheetButtonDisabled: {
    opacity: 0.4,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  calendarNav: {
    paddingHorizontal: 8,
  },
  calendarMonthLabel: {
    color: Colors.primaryTextColor,
    fontFamily: Fonts.semiBold,
  },
  calendarWeekRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
  },
  calendarDay: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceLight,
  },
  calendarDaySelected: {
    backgroundColor: Colors.primary,
  },
  calendarDayToday: {
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  calendarDayText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
  },
  popupBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.1)',
    zIndex: 30,
  },
  popup: {
    position: 'absolute',
    width: POPUP_WIDTH,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 4},
    elevation: 6,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuLabel: {
    color: Colors.primaryTextColor,
  },
  themeBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  themeCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
  },
  themeTitle: {
    color: Colors.primaryTextColor,
    marginBottom: 20,
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 14,
    marginBottom: 24,
  },
  themeItem: {
    alignItems: 'center',
    width: 68,
  },
  themeSwatch: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeSwatchSelected: {
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  themeName: {
    color: Colors.secondaryTextColor,
    textAlign: 'center',
    marginTop: 6,
  },
  themeCloseButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  themeCloseText: {
    color: '#FFFFFF',
  },
      // Override the shared variants, which are used by roughly thirty other
      // places and must keep their size.
      countValue: {
        fontSize: COUNTER_COUNT_SIZE,
      },
      targetValue: {
        fontSize: COUNTER_TARGET_SIZE,
      },
      // Sized down from the shared heading variant's 26. The name is a label
      // over the script, not a page title, and at 26 it ate a line and a half
      // of the reading area. Set here rather than on the variant so the
      // headings in settings and the library keep their size.
      title: {
        fontFamily: Fonts.bold,
        fontSize: 20,
        textAlign: 'center',
        color: Colors.primaryTextColor,
      },
      // Hugs the script and is capped, rather than taking every spare pixel.
      // A short script therefore leaves a short box and the counter sits right
      // under it, while a long one grows to the cap and scrolls. flexShrink lets
      // it give way on a short screen instead of pushing the counter off.
      contentScroll: {
        width: '100%',
        flexShrink: 1,
        maxHeight: MANTRA_MAX_LINES * MANTRA_LINE_HEIGHT,
        // No margin of its own: the container gap separates it from the name
        // above and the counter below. Vertical space is kept off
        // contentContainerStyle for a different reason, onContentSizeChange
        // counts content padding and a short script would then measure as
        // overflowing its own box.
      },
      mantraText: {
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: MANTRA_LINE_HEIGHT,
  },
});

export default CounterScreen;

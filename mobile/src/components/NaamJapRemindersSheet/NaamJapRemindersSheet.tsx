import React, {useEffect, useState} from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import CustomText from '../CustomText/CustomText';
import InlineIcon from '../InlineIcon/InlineIcon';
import {Colors} from '../../theme/colors';
import {Fonts} from '../../theme/fonts';
import {
  NaamJapReminder,
  getNaamJapReminders,
  addNaamJapReminder,
  updateNaamJapReminderEnabled,
  deleteNaamJapReminder,
} from '../../database/database';
import {
  ensureNotificationPermission,
  syncReminderNotifications,
} from '../../services/notifications';

const MAX_REMINDERS = 20;

const formatTimeLabel = (time: string): string => {
  const [hourStr, minuteStr] = time.split(':');
  let hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);
  const period = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  if (hour === 0) {
    hour = 12;
  }
  const mm = String(minute).padStart(2, '0');
  return `${hour}:${mm} ${period}`;
};

const TimePickerModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onConfirm: (time: string) => void;
}> = ({visible, onClose, onConfirm}) => {
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [isPM, setIsPM] = useState(false);

  useEffect(() => {
    if (visible) {
      setHour(9);
      setMinute(0);
      setIsPM(false);
    }
  }, [visible]);

  const hour24 = isPM
    ? hour === 12
      ? 12
      : hour + 12
    : hour === 12
    ? 0
    : hour;
  const mm = String(minute).padStart(2, '0');
  const displayHour = hour === 0 ? 12 : hour;

  const inc = (val: number, max: number) => (val + 1) % max;
  const dec = (val: number, max: number) => (val - 1 + max) % max;

  const confirm = () => {
    onConfirm(`${String(hour24).padStart(2, '0')}:${mm}`);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.pickerBackdrop} onPress={onClose}>
        <Pressable style={styles.pickerCard} onPress={e => e.stopPropagation()}>
          <CustomText
            variant="subheading"
            color={Colors.primaryTextColor}
            style={styles.pickerTitle}>
            Select Time
          </CustomText>

          <View style={styles.timeInputRow}>
            <View style={styles.timeColumn}>
              <TouchableOpacity
                style={styles.stepButton}
                onPress={() => setHour(inc(hour, 13))}
                activeOpacity={0.7}>
                <InlineIcon name="chevronUp" size={20} color={Colors.primary} />
              </TouchableOpacity>
              <CustomText
                variant="counter"
                color={Colors.primaryTextColor}
                style={styles.timeValue}>
                {displayHour}
              </CustomText>
              <TouchableOpacity
                style={styles.stepButton}
                onPress={() => setHour(dec(hour, 13))}
                activeOpacity={0.7}>
                <InlineIcon name="chevronDown" size={20} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            <CustomText
              variant="counter"
              color={Colors.primaryTextColor}
              style={styles.timeColon}>
              :
            </CustomText>

            <View style={styles.timeColumn}>
              <TouchableOpacity
                style={styles.stepButton}
                onPress={() => setMinute(inc(minute, 60))}
                activeOpacity={0.7}>
                <InlineIcon name="chevronUp" size={20} color={Colors.primary} />
              </TouchableOpacity>
              <CustomText
                variant="counter"
                color={Colors.primaryTextColor}
                style={styles.timeValue}>
                {mm}
              </CustomText>
              <TouchableOpacity
                style={styles.stepButton}
                onPress={() => setMinute(dec(minute, 60))}
                activeOpacity={0.7}>
                <InlineIcon name="chevronDown" size={20} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.periodColumn}>
              <TouchableOpacity
                style={[styles.periodButton, isPM && styles.periodButtonActive]}
                onPress={() => setIsPM(false)}
                activeOpacity={0.7}>
                <CustomText
                  variant="caption"
                  color={!isPM ? '#FFFFFF' : Colors.secondaryTextColor}
                  style={styles.periodButtonText}>
                  AM
                </CustomText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.periodButton, !isPM && styles.periodButtonActive]}
                onPress={() => setIsPM(true)}
                activeOpacity={0.7}>
                <CustomText
                  variant="caption"
                  color={isPM ? '#FFFFFF' : Colors.secondaryTextColor}
                  style={styles.periodButtonText}>
                  PM
                </CustomText>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.pickerConfirm} onPress={confirm} activeOpacity={0.8}>
            <CustomText variant="subheading" color="#FFFFFF" style={styles.pickerConfirmText}>
              Set Reminder
            </CustomText>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};
export const NaamJapRemindersSheet: React.FC<{
  visible: boolean;
  onClose: () => void;
}> = ({visible, onClose}) => {
  const insets = useSafeAreaInsets();
  const [reminders, setReminders] = useState<NaamJapReminder[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (visible) {
      getNaamJapReminders().then(rows => {
        setReminders(rows);
        setLoaded(true);
      });
    } else {
      setLoaded(false);
    }
  }, [visible]);

  const atLimit = reminders.length >= MAX_REMINDERS;

  const handleAdd = (time: string) => {
    addNaamJapReminder(time).then(id => {
      const next = [...reminders, {id, time, enabled: 1}];
      next.sort((a, b) => a.time.localeCompare(b.time));
      setReminders(next);
      setPickerOpen(false);
      ensureNotificationPermission()
        .then(granted => {
          if (granted) {
            return syncReminderNotifications();
          }
          Alert.alert(
            'Notifications disabled',
            'Permission was not granted. Enable notifications for Japam108 in your device settings to receive reminder alerts.',
          );
        })
        .catch(() => {});
    });
  };

  const handleToggle = (reminder: NaamJapReminder, enabled: boolean) => {
    updateNaamJapReminderEnabled(reminder.id, enabled).then(() => {
      setReminders(prev =>
        prev.map(r => (r.id === reminder.id ? {...r, enabled: enabled ? 1 : 0} : r)),
      );
      syncReminderNotifications().catch(() => {});
    });
  };

  const handleDelete = (reminder: NaamJapReminder) => {
    deleteNaamJapReminder(reminder.id).then(() => {
      setReminders(prev => prev.filter(r => r.id !== reminder.id));
      syncReminderNotifications().catch(() => {});
    });
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable
            style={[styles.sheet, {paddingBottom: 24 + insets.bottom}]}
            onPress={e => e.stopPropagation()}>
            <View style={styles.headerRow}>
              <CustomText variant="subheading" color={Colors.primaryTextColor} style={styles.title}>
                Mantra Reminders
              </CustomText>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                <InlineIcon name="close" color={Colors.secondaryTextColor} size={20} />
              </TouchableOpacity>
            </View>

            <CustomText variant="caption" color={Colors.secondaryTextColor} style={styles.subtitle}>
              Set daily reminders for your mantra practice
            </CustomText>

            <CustomText variant="caption" color={Colors.secondaryTextColor} style={styles.infoText}>
              Android system permits scheduling multiple local notifications. To keep your schedule optimal, you can set up to {MAX_REMINDERS} custom reminders.
            </CustomText>

            <View style={styles.divider} />

            {loaded && reminders.length > 0 ? (
              <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
                {reminders.map(reminder => (
                  <View key={reminder.id} style={styles.reminderRow}>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDelete(reminder)}
                      hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                      <InlineIcon name="trash" color={Colors.error} size={20} />
                    </TouchableOpacity>

                    <CustomText
                      variant="subheading"
                      color={reminder.enabled ? Colors.primaryTextColor : Colors.secondaryTextColor}
                      style={styles.reminderTime}>
                      {formatTimeLabel(reminder.time)}
                    </CustomText>

                    <Switch
                      value={reminder.enabled === 1}
                      onValueChange={v => handleToggle(reminder, v)}
                      trackColor={{false: Colors.surfaceLight, true: Colors.primary}}
                      thumbColor={Colors.primaryTextColor}
                    />
                  </View>
                ))}
              </ScrollView>
            ) : loaded ? (
              <View style={styles.emptyBox}>
                <CustomText variant="body" color={Colors.secondaryTextColor}>
                  No reminders yet. Tap "Add Reminder" to schedule one.
                </CustomText>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.addButton, atLimit && styles.addButtonDisabled]}
              onPress={() => setPickerOpen(true)}
              disabled={atLimit}
              activeOpacity={0.8}>
              <InlineIcon name="clock" color="#FFFFFF" size={20} />
              <CustomText variant="subheading" color="#FFFFFF" style={styles.addButtonText}>
                Add Reminder
              </CustomText>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <TimePickerModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onConfirm={handleAdd}
      />
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
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
    alignItems: 'center',
  },
  headerRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    color: Colors.primaryTextColor,
  },
  subtitle: {
    width: '100%',
    marginBottom: 12,
  },
  infoText: {
    width: '100%',
    marginBottom: 16,
    lineHeight: 18,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: 16,
  },
  list: {
    width: '100%',
    maxHeight: 280,
  },
  listContent: {
    gap: 10,
    paddingBottom: 4,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  deleteButton: {
    padding: 4,
  },
  reminderTime: {
    flex: 1,
    textAlign: 'center',
    fontFamily: Fonts.semiBold,
  },
  emptyBox: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 28,
  },
  addButton: {
    width: '100%',
    marginTop: 16,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addButtonDisabled: {
    opacity: 0.4,
  },
  addButtonText: {
    fontFamily: Fonts.semiBold,
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerCard: {
    width: 320,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  pickerTitle: {
    marginBottom: 16,
    color: Colors.primaryTextColor,
  },
  timeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
  },
  timeColumn: {
    alignItems: 'center',
    gap: 8,
  },
  stepButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: Colors.surfaceLight,
  },
  timeValue: {
    fontSize: 48,
    lineHeight: 56,
    fontFamily: Fonts.semiBold,
    minWidth: 56,
    textAlign: 'center',
  },
  timeColon: {
    fontSize: 48,
    lineHeight: 56,
    fontFamily: Fonts.semiBold,
    color: Colors.primaryTextColor,
  },
  periodColumn: {
    gap: 8,
    marginLeft: 8,
  },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  periodButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  periodButtonText: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
  },
  pickerConfirm: {
    width: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  pickerConfirmText: {
    fontFamily: Fonts.semiBold,
  },
});

export default NaamJapRemindersSheet;
import notifee, {
  AndroidImportance,
  AndroidNotificationSetting,
  AuthorizationStatus,
  RepeatFrequency,
  TimestampTrigger,
  TriggerType,
} from '@notifee/react-native';
import {getNaamJapReminders} from '../database/database';

const CHANNEL_ID = 'naam-jap-reminders';
const CHANNEL_NAME = 'Naam Jap Reminders';

export const formatReminderTime = (time: string): string => {
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

export const initNotificationChannel = async (): Promise<void> => {
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: CHANNEL_NAME,
    importance: AndroidImportance.HIGH,
  });
};

const canUseAlarmManager = async (): Promise<boolean> => {
  try {
    const settings = await notifee.getNotificationSettings();
    return settings.android.alarm === AndroidNotificationSetting.ENABLED;
  } catch {
    return false;
  }
};

export const syncReminderNotifications = async (): Promise<void> => {
  await initNotificationChannel();
  await notifee.cancelTriggerNotifications();

  const reminders = await getNaamJapReminders();
  const enabled = reminders
    .filter(r => r.enabled === 1)
    .sort((a, b) => a.time.localeCompare(b.time));

  console.log('[Notifications] Syncing', enabled.length, 'enabled reminders:', enabled.map(r => r.time));

  const timestamp = Date.now();
  const alarmManager = await canUseAlarmManager();
  console.log('[Notifications] Alarm manager available:', alarmManager);

  for (const reminder of enabled) {
    const [hourStr, minuteStr] = reminder.time.split(':');
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);

    const triggerDate = new Date(timestamp);
    triggerDate.setHours(hour, minute, 0, 0);
    if (triggerDate.getTime() <= timestamp) {
      triggerDate.setDate(triggerDate.getDate() + 1);
    }

    console.log('[Notifications] Scheduling reminder', reminder.id, 'for', triggerDate.toISOString(), 'alarmManager:', alarmManager);

    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: triggerDate.getTime(),
      repeatFrequency: RepeatFrequency.DAILY,
    };
    if (alarmManager) {
      trigger.alarmManager = {allowWhileIdle: true};
    }

    try {
      await notifee.createTriggerNotification(
        {
          id: `naam-jap-reminder-${reminder.id}`,
          title: 'Mantra Reminder',
          body: `Time to complete your daily chanting at ${formatReminderTime(reminder.time)}.`,
          android: {
            channelId: CHANNEL_ID,
            pressAction: {id: 'default'},
          },
        },
        trigger,
      );
      console.log('[Notifications] Successfully scheduled', reminder.id);
    } catch (e) {
      console.error('[Notifications] Failed to schedule', reminder.id, e);
    }
  }
};

export const ensureNotificationPermission = async (): Promise<boolean> => {
  const settings = await notifee.getNotificationSettings();
  if (settings.authorizationStatus === AuthorizationStatus.AUTHORIZED) {
    return true;
  }
  if (settings.authorizationStatus === AuthorizationStatus.NOT_DETERMINED) {
    const request = await notifee.requestPermission();
    return request.authorizationStatus === AuthorizationStatus.AUTHORIZED;
  }
  return false;
};
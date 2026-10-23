import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import CustomText from '../CustomText/CustomText';
import InlineIcon from '../InlineIcon/InlineIcon';
import {useTheme} from '../../context/ThemeContext';
import {Fonts} from '../../theme/fonts';
import {
  InvitePayload,
  copyInviteLink,
  getInvitePayload,
  shareInvite,
} from '../../services/invite';

/** Reasons a friend ends up downloading the app, shown as a short checklist. */
const PERKS = [
  'Count every bead with a single tap',
  'Keep a daily streak you can actually see',
  'Reminders that pull you back to practice',
];

export const InviteFriendsSheet: React.FC<{
  visible: boolean;
  onClose: () => void;
}> = ({visible, onClose}) => {
  const insets = useSafeAreaInsets();
  const {colors} = useTheme();
  const [payload, setPayload] = useState<InvitePayload | null>(null);
  const [loading, setLoading] = useState(false);

  const s = styles(colors);

  // Load the link and the message every time the sheet opens, so an admin who
  // corrected the store link is reflected without an app update.
  useEffect(() => {
    if (!visible) {
      setPayload(null);
      return;
    }
    let active = true;
    setLoading(true);
    getInvitePayload().then(result => {
      if (!active) {
        return;
      }
      setPayload(result);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [visible]);

  const handleShare = useCallback(async () => {
    if (!payload) {
      return;
    }
    const shared = await shareInvite(payload);
    // A dismissed share sheet is not a failure, so the sheet stays open and the
    // copy button is still one tap away.
    if (shared) {
      onClose();
    }
  }, [payload, onClose]);

  const handleCopy = useCallback(() => {
    if (!payload) {
      return;
    }
    copyInviteLink(payload);
    onClose();
    Alert.alert('Link copied', 'Paste it in any chat to invite a friend.');
  }, [payload, onClose]);

  const disabled = !payload;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable
          style={[s.sheet, {paddingBottom: 24 + insets.bottom}]}
          onPress={e => e.stopPropagation()}>
          <View style={s.headerRow}>
            <CustomText variant="subheading" color={colors.primaryTextColor} style={s.title}>
              Invite Friends
            </CustomText>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
              <InlineIcon name="close" color={colors.secondaryTextColor} size={20} />
            </TouchableOpacity>
          </View>

          <CustomText variant="body" color={colors.secondaryTextColor} style={s.subtitle}>
            Share Japam108 with your family and friends.
          </CustomText>

          <View style={s.perkBox}>
            {PERKS.map(perk => (
              <View key={perk} style={s.perkRow}>
                <InlineIcon name="check" color={colors.primary} size={16} />
                <CustomText variant="body" color={colors.primaryTextColor} style={s.perkText}>
                  {perk}
                </CustomText>
              </View>
            ))}
          </View>

          {loading && (
            <View style={s.loadingBox}>
              <ActivityIndicator color={colors.primary} />
            </View>
          )}

          {payload && (
            <View style={s.linkBox}>
              <CustomText variant="caption" color={colors.secondaryTextColor} style={s.linkLabel}>
                YOUR INVITE LINK
              </CustomText>
              <CustomText
                variant="body"
                color={colors.primaryTextColor}
                style={s.linkText}
                numberOfLines={2}>
                {payload.installLink}
              </CustomText>
              {payload.usedFallback && (
                <CustomText variant="caption" color={colors.warning} style={s.linkWarning}>
                  Using the default link. Set the store link in the admin panel to replace it.
                </CustomText>
              )}
            </View>
          )}

          <TouchableOpacity
            style={[s.primaryButton, disabled && s.buttonDisabled]}
            onPress={handleShare}
            disabled={disabled}
            activeOpacity={0.8}>
            <InlineIcon name="share" color="#FFFFFF" size={18} />
            <CustomText variant="subheading" color="#FFFFFF" style={s.primaryButtonText}>
              Share Invite
            </CustomText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.secondaryButton, disabled && s.buttonDisabled]}
            onPress={handleCopy}
            disabled={disabled}
            activeOpacity={0.8}>
            <InlineIcon name="link" color={colors.primary} size={18} />
            <CustomText variant="subheading" color={colors.primary} style={s.secondaryButtonText}>
              Copy Link
            </CustomText>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = (colors: import('../../theme/colors').ThemeColors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 24,
      paddingTop: 24,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    title: {
      fontFamily: Fonts.semiBold,
    },
    subtitle: {
      marginBottom: 16,
    },
    perkBox: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 10,
      marginBottom: 16,
    },
    perkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    perkText: {
      flex: 1,
      fontFamily: Fonts.medium,
    },
    loadingBox: {
      paddingVertical: 16,
      alignItems: 'center',
    },
    linkBox: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginBottom: 16,
      gap: 4,
    },
    linkLabel: {
      fontFamily: Fonts.semiBold,
      letterSpacing: 1,
    },
    linkText: {
      fontFamily: Fonts.medium,
    },
    linkWarning: {
      fontFamily: Fonts.regular,
      lineHeight: 14,
      marginTop: 4,
    },
    primaryButton: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    primaryButtonText: {
      fontFamily: Fonts.semiBold,
    },
    secondaryButton: {
      marginTop: 10,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    secondaryButtonText: {
      fontFamily: Fonts.semiBold,
    },
    buttonDisabled: {
      opacity: 0.4,
    },
  });

export default InviteFriendsSheet;

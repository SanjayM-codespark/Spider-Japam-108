import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Animated,
  Easing,
  Keyboard,
  Platform,
  useWindowDimensions,
  ViewStyle,
  TextStyle,
} from 'react-native';
import {useTheme} from '../../context/ThemeContext';
import type {ThemeColors} from '../../theme/colors';
import CustomText from '../CustomText/CustomText';
import InlineIcon from '../InlineIcon/InlineIcon';
import FormField from '../FormField/FormField';
import {CountryCodePicker} from '../CountryCodePicker/CountryCodePicker';
import {UpdateProfileInput} from '../../services/auth';

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  loading: boolean;
  errors: Record<string, string>;
  onFieldChange: (form: UpdateProfileInput) => void;
  formData: UpdateProfileInput;
}

const KEYBOARD_GAP = 16; // space kept between the card and the keyboard
const TOP_MARGIN = 24; // the card never goes closer than this to the top

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  visible,
  onClose,
  onSave,
  loading,
  errors,
  onFieldChange,
  formData,
}) => {
  const {colors} = useTheme();
  const s = createStyles(colors);
  const {height: windowHeight} = useWindowDimensions();

  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [cardHeight, setCardHeight] = useState(0);
  const shift = useRef(new Animated.Value(0)).current;
  const duration = useRef(250);

  // Track the keyboard. iOS reports the "will" events with the keyboard's own
  // animation duration, so the card moves in lockstep with it.
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const show = Keyboard.addListener(showEvt, e => {
      duration.current = e.duration || 250;
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hide = Keyboard.addListener(hideEvt, e => {
      duration.current = e?.duration || 220;
      setKeyboardHeight(0);
    });

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // Reset when the modal closes so it never reopens shifted.
  useEffect(() => {
    if (!visible) {
      setKeyboardHeight(0);
      shift.setValue(0);
    }
  }, [visible, shift]);

  // Animate the card up just enough to clear the keyboard.
  useEffect(() => {
    let target = 0;

    if (keyboardHeight > 0 && cardHeight > 0) {
      // The card is centred, so its bottom edge sits at (H + cardH) / 2.
      // The keyboard's top edge sits at H - keyboardHeight.
      const overlap =
        (cardHeight - windowHeight) / 2 + keyboardHeight + KEYBOARD_GAP;
      // Never push the card's top edge off the screen.
      const maxUp = Math.max(0, (windowHeight - cardHeight) / 2 - TOP_MARGIN);
      target = -Math.min(Math.max(overlap, 0), maxUp);
    }

    Animated.timing(shift, {
      toValue: target,
      duration: duration.current,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [keyboardHeight, cardHeight, windowHeight, shift]);

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        {/* Backdrop: tapping outside closes the modal */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <Animated.View
          onLayout={e => setCardHeight(e.nativeEvent.layout.height)}
          style={[s.modalContainer, {transform: [{translateY: shift}]}]}>
          <View style={s.modalHeader}>
            <CustomText variant="subheading" style={s.modalTitle}>
              Edit Profile
            </CustomText>
            <Pressable onPress={onClose} hitSlop={10}>
              <InlineIcon
                name="close"
                size={24}
                color={colors.secondaryTextColor}
              />
            </Pressable>
          </View>

          <ScrollView
            style={s.scroll}
            contentContainerStyle={s.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            <FormField
              label="Full Name"
              value={formData.name}
              onChangeText={val => onFieldChange({...formData, name: val})}
              placeholder="Your name"
              error={errors.name}
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              returnKeyType="next"
            />

            <FormField
              label="Email"
              value={formData.email}
              onChangeText={val => onFieldChange({...formData, email: val})}
              placeholder="you@example.com"
              error={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
            />

            <FormField
              label="Phone Number"
              value={formData.phone}
              onChangeText={val => onFieldChange({...formData, phone: val})}
              placeholder="Your phone number"
              error={errors.phone}
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              returnKeyType="done"
              maxLength={20}
              leading={
                <CountryCodePicker
                  value={formData.country_code}
                  onChange={code =>
                    onFieldChange({...formData, country_code: code})
                  }
                  label="Country Code"
                  bare
                />
              }
            />

            {errors.country_code ? (
              <CustomText
                variant="caption"
                color={colors.error}
                style={s.errorText}>
                {errors.country_code}
              </CustomText>
            ) : null}

            <View style={s.buttonRow}>
              <Pressable
                style={({pressed}) => [
                  s.button,
                  s.cancelButton,
                  pressed && s.pressed,
                ]}
                onPress={onClose}
                disabled={loading}>
                <CustomText variant="body" color={colors.secondaryTextColor}>
                  Cancel
                </CustomText>
              </Pressable>
              <Pressable
                style={({pressed}) => [
                  s.button,
                  s.saveButton,
                  loading && s.buttonDisabled,
                  pressed && s.pressed,
                ]}
                onPress={onSave}
                disabled={loading}>
                <CustomText variant="body" color={colors.background}>
                  {loading ? 'Saving...' : 'Save'}
                </CustomText>
              </Pressable>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create<{
    modalOverlay: ViewStyle;
    modalContainer: ViewStyle;
    modalHeader: ViewStyle;
    modalTitle: TextStyle;
    scroll: ViewStyle;
    scrollContent: ViewStyle;
    buttonRow: ViewStyle;
    button: ViewStyle;
    cancelButton: ViewStyle;
    saveButton: ViewStyle;
    buttonDisabled: ViewStyle;
    pressed: ViewStyle;
    errorText: TextStyle;
  }>({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    modalContainer: {
      width: '100%',
      backgroundColor: colors.background,
      borderRadius: 20,
      padding: 24,
      maxHeight: '90%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24,
    },
    modalTitle: {
      fontFamily: 'Montserrat-Bold',
    },
    scroll: {
      flexGrow: 0,
      flexShrink: 1,
    },
    scrollContent: {
      paddingBottom: 8,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 8,
    },
    button: {
      flex: 1,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    cancelButton: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    saveButton: {
      backgroundColor: colors.primary,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    pressed: {
      opacity: 0.7,
    },
    errorText: {
      marginTop: -8,
      marginBottom: 8,
    },
  });

import React, {useState} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import CustomText from '../../components/CustomText/CustomText';
import InlineIcon from '../../components/InlineIcon/InlineIcon';
import FormField from '../../components/FormField/FormField';
import {useTheme} from '../../context/ThemeContext';
import {Fonts} from '../../theme/fonts';
import {errorMessage, forgotPassword} from '../../services/api';
import {RootStackParamList} from '../../navigation/types';

type Props = NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ForgotPasswordScreen: React.FC = () => {
  const navigation = useNavigation<Props>();
  const {colors} = useTheme();
  const s = styles(colors);

  const [email, setEmail] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);

    const nextErrors: Record<string, string> = {};
    if (!EMAIL_PATTERN.test(email.trim())) {
      nextErrors.email = 'Enter a valid email address.';
    }
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setLoading(true);
    try {
      const result = await forgotPassword(email.trim().toLowerCase());
      setSuccess(result.message);
      setEmail('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safeArea}>
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled">
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={12}
            style={s.back}
            accessibilityRole="button"
            accessibilityLabel="Go back">
            <InlineIcon name="chevronLeft" size={22} color={colors.primaryTextColor} />
          </Pressable>

          <CustomText variant="heading" style={s.title}>
            Forgot Password
          </CustomText>
          <CustomText
            variant="body"
            color={colors.secondaryTextColor}
            style={s.subtitle}>
            Enter your email and we'll send you a link to reset your password.
          </CustomText>

          {error ? (
            <View style={s.banner}>
              <CustomText variant="caption" color={colors.error}>
                {error}
              </CustomText>
            </View>
          ) : null}

          {success ? (
            <View style={[s.banner, s.bannerSuccess]}>
              <CustomText variant="caption" color={colors.success}>
                {success}
              </CustomText>
            </View>
          ) : null}

          <FormField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            error={fieldErrors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />

          <TouchableOpacity
            style={[s.button, loading ? s.buttonDisabled : null]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}>
            {loading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <CustomText variant="subheading" color={colors.background}>
                Send Reset Link
              </CustomText>
            )}
          </TouchableOpacity>

          <View style={s.footer}>
            <CustomText variant="body" color={colors.secondaryTextColor}>
              Remember your password?{' '}
            </CustomText>
            <Pressable
              onPress={() => navigation.navigate('Login')}
              hitSlop={8}
              accessibilityRole="button">
              <CustomText variant="body" color={colors.primary} style={s.footerLink}>
                Back to Login
              </CustomText>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = (colors: import('../../theme/colors').ThemeColors) =>
  StyleSheet.create({
    safeArea: {flex: 1, backgroundColor: colors.background},
    flex: {flex: 1},
    content: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: 8,
      paddingBottom: 32,
    },
    back: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      marginLeft: -8,
      marginBottom: 8,
    },
    title: {marginBottom: 6},
    subtitle: {marginBottom: 24},
    banner: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.error,
      borderRadius: 10,
      padding: 12,
      marginBottom: 16,
    },
    bannerSuccess: {
      borderColor: colors.success,
      backgroundColor: colors.success + '15',
    },
    button: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: 16,
      alignItems: 'center',
      marginTop: 8,
    },
    buttonDisabled: {opacity: 0.7},
    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 24,
    },
    footerLink: {fontFamily: Fonts.semiBold},
  });

export default ForgotPasswordScreen;
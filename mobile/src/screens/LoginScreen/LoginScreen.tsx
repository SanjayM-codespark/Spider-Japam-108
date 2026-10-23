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
import FormField, {PasswordToggle} from '../../components/FormField/FormField';
import {useTheme} from '../../context/ThemeContext';
import {Fonts} from '../../theme/fonts';
import {useAuth} from '../../context/AuthContext';
import {errorMessage} from '../../services/api';
import {authFieldErrors} from '../../services/auth';
import {RootStackParamList} from '../../navigation/types';

type Props = NativeStackNavigationProp<RootStackParamList, 'Login'>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LoginScreen: React.FC = () => {
  const navigation = useNavigation<Props>();
  const {colors} = useTheme();
  const {signIn} = useAuth();
  const s = styles(colors);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError(null);

    // Validated here first so the common mistakes never reach the network.
    const nextErrors: Record<string, string> = {};
    if (!EMAIL_PATTERN.test(email.trim())) {
      nextErrors.email = 'Enter a valid email address.';
    }
    if (!password) {
      nextErrors.password = 'Enter your password.';
    }
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setLoading(true);
    try {
      await signIn(email.trim().toLowerCase(), password);
      navigation.reset({index: 0, routes: [{name: 'Home', params: {screen: 'Counter'}}]});
    } catch (err) {
      const fields = authFieldErrors(err);
      setFieldErrors(fields);
      setError(Object.keys(fields).length > 0 ? null : errorMessage(err));
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
            Welcome back
          </CustomText>
          <CustomText
            variant="body"
            color={colors.secondaryTextColor}
            style={s.subtitle}>
            Sign in to continue your jap
          </CustomText>

          {error ? (
            <View style={s.banner}>
              <CustomText variant="caption" color={colors.error}>
                {error}
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
            returnKeyType="next"
          />

          <FormField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Your password"
            error={fieldErrors.password}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoComplete="password"
            textContentType="password"
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            trailing={
              <PasswordToggle
                visible={showPassword}
                onPress={() => setShowPassword(v => !v)}
              />
            }
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
                Log In
              </CustomText>
            )}
          </TouchableOpacity>

          <Pressable
            onPress={() => navigation.navigate('ForgotPassword')}
            style={s.forgotPassword}
            accessibilityRole="button"
            hitSlop={8}>
            <CustomText variant="body" color={colors.primary} style={s.forgotPasswordText}>
              Forgot password?
            </CustomText>
          </Pressable>

          <View style={s.footer}>
            <CustomText variant="body" color={colors.secondaryTextColor}>
              New to Japam108?{' '}
            </CustomText>
            <Pressable
              onPress={() => navigation.navigate('Register')}
              hitSlop={8}
              accessibilityRole="button">
              <CustomText variant="body" color={colors.primary} style={s.footerLink}>
                Create account
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
    button: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: 16,
      alignItems: 'center',
      marginTop: 8,
    },
    buttonDisabled: {opacity: 0.7},
    forgotPassword: {
      alignSelf: 'flex-end',
      marginTop: 12,
      marginRight: 4,
    },
    forgotPasswordText: {fontFamily: Fonts.semiBold},
    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 24,
    },
    footerLink: {fontFamily: Fonts.semiBold},
  });

export default LoginScreen;

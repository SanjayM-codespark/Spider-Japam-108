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
import {CountryCodePicker} from '../../components/CountryCodePicker/CountryCodePicker';
import {useTheme} from '../../context/ThemeContext';
import {Fonts} from '../../theme/fonts';
import {useAuth} from '../../context/AuthContext';
import {errorMessage} from '../../services/api';
import {authFieldErrors} from '../../services/auth';
import {RootStackParamList} from '../../navigation/types';

type Props = NativeStackNavigationProp<RootStackParamList, 'Register'>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9()\-\s]+$/;

const digitCount = (value: string): number => value.replace(/\D/g, '').length;

const RegisterScreen: React.FC = () => {
  const navigation = useNavigation<Props>();
  const {colors} = useTheme();
  const {signUp} = useAuth();
  const s = styles(colors);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+91'); // Default to India
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validate = (): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (name.trim().length < 2) {
      errors.name = 'Please enter your name.';
    }
    if (!EMAIL_PATTERN.test(email.trim())) {
      errors.email = 'Enter a valid email address.';
    }
    const digits = digitCount(phone);
    if (!PHONE_PATTERN.test(phone.trim()) || digits < 7 || digits > 15) {
      errors.phone = 'Enter a valid phone number.';
    }
    if (password.length < 6) {
      errors.password = 'Use at least 6 characters.';
    }
    return errors;
  };

  const handleSubmit = async () => {
    setError(null);

    const nextErrors = validate();
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setLoading(true);
    try {
      await signUp({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        country_code: countryCode,
        password,
      });
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
            Create your account
          </CustomText>
          <CustomText
            variant="body"
            color={colors.secondaryTextColor}
            style={s.subtitle}>
            A few details and you are ready to begin
          </CustomText>

          {error ? (
            <View style={s.banner}>
              <CustomText variant="caption" color={colors.error}>
                {error}
              </CustomText>
            </View>
          ) : null}

          <FormField
            label="Full name"
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            error={fieldErrors.name}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            returnKeyType="next"
          />

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
            label="Phone number"
            value={phone}
            onChangeText={setPhone}
            placeholder="Your phone number"
            error={fieldErrors.phone}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            returnKeyType="next"
            maxLength={20}
           leading={
  <CountryCodePicker
    value={countryCode}
    onChange={setCountryCode}
    label="Country Code"
    bare
  />
}
          />

          <FormField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="At least 6 characters"
            error={fieldErrors.password}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoComplete="password-new"
            textContentType="newPassword"
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
                Create Account
              </CustomText>
            )}
          </TouchableOpacity>

          <View style={s.footer}>
            <CustomText variant="body" color={colors.secondaryTextColor}>
              Already have an account?{' '}
            </CustomText>
            <Pressable
              onPress={() => navigation.navigate('Login')}
              hitSlop={8}
              accessibilityRole="button">
              <CustomText variant="body" color={colors.primary} style={s.footerLink}>
                Log in
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
    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 24,
    },
    footerLink: {fontFamily: Fonts.semiBold},
  });

export default RegisterScreen;

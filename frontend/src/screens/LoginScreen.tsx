import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LegalDoc, LegalSheet } from '../components/LegalSheet';
import { AppleIcon, EyeIcon, EyeOffIcon, GoogleIcon, LogoMark } from '../components/icons';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../services/api';
import { colors, fonts } from '../theme';


const SHOW_SOCIAL_LOGIN = true;

type Field = 'email' | 'password';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen({ onSignUp }: { onSignUp: () => void }) {
  const { signIn } = useAuth();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const passwordRef = useRef<React.ElementRef<typeof TextInput>>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alertText, setAlertText] = useState('');
  const [errorField, setErrorField] = useState<Field | null>(null);
  const [focused, setFocused] = useState<Field | null>(null);
  const [legal, setLegal] = useState<LegalDoc | null>(null);

  const fail = (message: string, field: Field | null) => {
    setAlertText(message);
    setErrorField(field);
  };

  const clearError = () => {
    if (alertText) setAlertText('');
    if (errorField) setErrorField(null);
  };

  const submit = async () => {
    if (loading) return;
    const emailVal = email.trim();

    if (!emailVal) return fail('Please enter your email address.', 'email');
    if (!EMAIL_RE.test(emailVal)) return fail('Please enter a valid email address.', 'email');
    if (!password) return fail('Please enter your password to sign in.', 'password');

    clearError();
    setLoading(true);
    try {
      const user = await signIn(emailVal, password);

      toast.show(`Welcome back, ${user.nomPrenom.split(' ')[0]}`);
    } catch (e) {
      setLoading(false);
      if (e instanceof ApiError) {
        if (e.status === 401) fail('Invalid email or password.', 'password');
        else if (e.fieldErrors && Object.keys(e.fieldErrors).length > 0) {
          fail(Object.values(e.fieldErrors)[0], null);
        } else fail(e.message, null);
      } else {
        fail('Something went wrong. Please try again.', null);
      }
    }
  };

  const comingSoon = (what: string) => toast.show(`${what} isn't available yet.`);

  const inputStyle = (field: Field) => [
    styles.input,
    focused === field && styles.inputFocused,
    errorField === field && styles.inputError,
  ];

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: 16 + insets.top, paddingBottom: 12 + insets.bottom },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.column}>

          <View>

            <View style={styles.hero}>
              <View style={styles.logo} accessibilityLabel="IsetConnect logo">
                <LogoMark />
              </View>
              <Text style={styles.title}>Welcome back.</Text>
              <Text style={styles.subtitle}>Sign in to continue your journey.</Text>
            </View>


            {SHOW_SOCIAL_LOGIN && (
              <>
                <View style={styles.socialStack}>
                  <Pressable
                    onPress={() => comingSoon('Google sign-in')}
                    style={({ pressed }) => [styles.socialBtn, pressed && styles.socialBtnPressed]}
                  >
                    <GoogleIcon />
                    <Text style={styles.socialText}>Continue with Google</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => comingSoon('Apple sign-in')}
                    style={({ pressed }) => [styles.socialBtn, pressed && styles.socialBtnPressed]}
                  >
                    <AppleIcon />
                    <Text style={styles.socialText}>Continue with Apple</Text>
                  </Pressable>
                </View>


                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>
              </>
            )}


            {alertText ? (
              <View style={styles.alert} accessibilityRole="alert">
                <View style={styles.alertDot} />
                <Text style={styles.alertText}>{alertText}</Text>
              </View>
            ) : null}


            <View style={styles.fields}>
              <TextInput
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  clearError();
                }}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused(null)}
                placeholder="Email"
                placeholderTextColor={colors.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="username"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                style={inputStyle('email')}
                accessibilityLabel="Email"
              />

              <View>
                <TextInput
                  ref={passwordRef}
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    clearError();
                  }}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  placeholder="Password"
                  placeholderTextColor={colors.muted}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="current-password"
                  textContentType="password"
                  returnKeyType="go"
                  onSubmitEditing={submit}
                  style={[...inputStyle('password'), styles.passwordInput]}
                  accessibilityLabel="Password"
                />
                <Pressable
                  onPress={() => setShowPassword((v) => !v)}
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  hitSlop={6}
                  style={({ pressed }) => [styles.eyeBtn, pressed && { backgroundColor: colors.surfaceHover }]}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </Pressable>
              </View>
            </View>


            <View style={styles.forgotRow}>
              <Pressable onPress={() => comingSoon('Password reset')} hitSlop={8}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </Pressable>
            </View>


            <Pressable
              onPress={submit}
              disabled={loading}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.cta,
                pressed && styles.ctaPressed,
                loading && { opacity: 0.6 },
              ]}
            >
              <Text style={styles.ctaText}>{loading ? 'Signing in' : 'Sign in'}</Text>
              {loading && <ActivityIndicator size="small" color={colors.whiteBtnText} />}
            </Pressable>
          </View>


          <View style={styles.footer}>
            <View style={styles.signupRow}>
              <Text style={styles.signupText}>Don't have an account?</Text>
              <Pressable onPress={onSignUp} hitSlop={8}>
                <Text style={styles.signupLink}>Sign up</Text>
              </Pressable>
            </View>

            <Text style={styles.legal}>
              By continuing, you agree to our{' '}
              <Text style={styles.legalLink} onPress={() => setLegal('Terms of Service')}>
                Terms of Service
              </Text>{' '}
              and{' '}
              <Text style={styles.legalLink} onPress={() => setLegal('Privacy Policy')}>
                Privacy Policy
              </Text>
              .
            </Text>
          </View>
        </View>
      </ScrollView>

      <LegalSheet doc={legal} onClose={() => setLegal(null)} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.black },
  scroll: { flexGrow: 1, paddingHorizontal: 28 },
  column: { flexGrow: 1, width: '100%', maxWidth: 420, alignSelf: 'center', justifyContent: 'space-between' },

  hero: { paddingTop: 12, paddingBottom: 24 },
  logo: { marginBottom: 24, alignSelf: 'flex-start' },
  title: { fontSize: 29, lineHeight: 33, fontFamily: fonts.extrabold, letterSpacing: -0.87, color: colors.text },
  subtitle: { marginTop: 8, fontSize: 15, lineHeight: 22, fontFamily: fonts.regular, color: colors.muted },

  socialStack: { gap: 12 },
  socialBtn: {
    height: 46,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  socialBtnPressed: { backgroundColor: colors.surfaceHover, borderColor: colors.borderHover, transform: [{ scale: 0.985 }] },
  socialText: { fontSize: 15, fontFamily: fonts.semibold, color: colors.text },

  divider: { marginVertical: 20, flexDirection: 'row', alignItems: 'center', gap: 14 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontSize: 13, fontFamily: fonts.medium, color: colors.muted },

  alert: {
    marginBottom: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  alertDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.danger },
  alertText: { flex: 1, fontSize: 13, lineHeight: 18, fontFamily: fonts.regular, color: colors.text },

  fields: { gap: 14 },
  input: {
    height: 50,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.text,
  },
  inputFocused: { borderColor: colors.accent, backgroundColor: colors.black },
  inputError: { borderColor: colors.danger },
  passwordInput: { paddingRight: 48 },
  eyeBtn: {
    position: 'absolute',
    right: 6,
    top: 7,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  forgotRow: { marginTop: 10, marginBottom: 20, alignItems: 'flex-end' },
  forgotText: { fontSize: 13, fontFamily: fonts.medium, color: colors.accent },

  cta: {
    height: 48,
    borderRadius: 999,
    backgroundColor: colors.whiteBtn,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaPressed: { backgroundColor: colors.whiteBtnHover, transform: [{ scale: 0.985 }] },
  ctaText: { fontSize: 15, fontFamily: fonts.bold, letterSpacing: -0.15, color: colors.whiteBtnText },

  footer: { paddingTop: 24, paddingBottom: 4, alignItems: 'center', gap: 16 },
  signupRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  signupText: { fontSize: 14, fontFamily: fonts.regular, color: colors.muted },
  signupLink: { fontSize: 14, fontFamily: fonts.semibold, color: colors.accent },
  legal: { maxWidth: 290, textAlign: 'center', fontSize: 11, lineHeight: 16, fontFamily: fonts.regular, color: colors.muted },
  legalLink: { color: colors.legalLink, textDecorationLine: 'underline' },
});

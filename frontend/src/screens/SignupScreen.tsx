import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { AuthInput } from '../components/AuthInput';
import { LegalDoc, LegalSheet } from '../components/LegalSheet';
import { OptionSheet } from '../components/OptionSheet';
import { SelectField } from '../components/SelectField';
import { EyeIcon, EyeOffIcon, LogoMark } from '../components/icons';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { ApiError, DepartmentInfo, getDepartments } from '../services/api';
import { colors, fonts } from '../theme';

type Field = 'name' | 'email' | 'password' | 'confirm' | 'department' | 'classe';


const SERVER_FIELD: Record<string, Field> = {
  nomPrenom: 'name',
  email: 'email',
  password: 'password',
  department: 'department',
  classe: 'classe',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignupScreen({ onSignIn }: { onSignIn: () => void }) {
  const { signUp } = useAuth();
  const toast = useToast();
  const insets = useSafeAreaInsets();

  const emailRef = useRef<React.ElementRef<typeof TextInput>>(null);
  const passwordRef = useRef<React.ElementRef<typeof TextInput>>(null);
  const confirmRef = useRef<React.ElementRef<typeof TextInput>>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [departmentCode, setDepartmentCode] = useState<string | null>(null);
  const [classe, setClasse] = useState<string | null>(null);

  const [departments, setDepartments] = useState<DepartmentInfo[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);

  const [loading, setLoading] = useState(false);
  const [alertText, setAlertText] = useState('');
  const [errorField, setErrorField] = useState<Field | null>(null);
  const [picker, setPicker] = useState<'department' | 'classe' | null>(null);
  const [legal, setLegal] = useState<LegalDoc | null>(null);

  const department = useMemo(
    () => departments.find((d) => d.code === departmentCode) ?? null,
    [departments, departmentCode],
  );

  const loadDepartments = useCallback(async () => {
    setLoadingDepartments(true);
    try {
      setDepartments(await getDepartments());
      setAlertText((t) => (t.startsWith("Couldn't load") ? '' : t));
    } catch (e) {
      setAlertText(
        e instanceof ApiError && e.status === 0
          ? "Couldn't load departments. Can't reach the server."
          : "Couldn't load departments. Tap the department field to retry.",
      );
    } finally {
      setLoadingDepartments(false);
    }
  }, []);

  useEffect(() => {
    void loadDepartments();
  }, [loadDepartments]);

  const fail = (message: string, field: Field | null) => {
    setAlertText(message);
    setErrorField(field);
  };

  const clearError = (field?: Field) => {
    if (alertText) setAlertText('');
    if (errorField && (!field || errorField === field)) setErrorField(null);
  };

  const openDepartmentPicker = () => {
    if (departments.length === 0) {
      void loadDepartments();
      return;
    }
    setPicker('department');
  };

  const pickDepartment = (code: string) => {
    if (code !== departmentCode) {
      setDepartmentCode(code);
      setClasse(null);
    }
    clearError('department');
    setPicker(null);
  };

  const pickClasse = (value: string) => {
    setClasse(value);
    clearError('classe');
    setPicker(null);
  };

  const validate = (): { message: string; field: Field } | null => {
    if (!name.trim()) return { message: 'Please enter your full name.', field: 'name' };
    if (!email.trim()) return { message: 'Please enter your email address.', field: 'email' };
    if (!EMAIL_RE.test(email.trim())) return { message: 'Please enter a valid email address.', field: 'email' };
    if (password.length < 6) return { message: 'Your password must be at least 6 characters.', field: 'password' };
    if (confirm !== password) return { message: "Passwords don't match.", field: 'confirm' };
    if (!departmentCode) return { message: 'Please choose your department.', field: 'department' };
    if (!classe) return { message: 'Please choose your class.', field: 'classe' };
    return null;
  };

  const submit = async () => {
    if (loading) return;
    const problem = validate();
    if (problem) return fail(problem.message, problem.field);

    clearError();
    setLoading(true);
    try {
      const user = await signUp({
        nomPrenom: name.trim(),
        email: email.trim(),
        password,
        department: departmentCode!,
        classe: classe!,
      });

      toast.show(`Welcome, ${user.nomPrenom.split(' ')[0]}`);
    } catch (e) {
      setLoading(false);
      if (e instanceof ApiError) {
        if (e.status === 409) return fail('This email is already registered. Try signing in instead.', 'email');
        const entries = Object.entries(e.fieldErrors ?? {});
        if (entries.length > 0) {
          const [key, msg] = entries[0];
          return fail(`${key === 'nomPrenom' ? 'Name' : key}: ${msg}`, SERVER_FIELD[key] ?? null);
        }
        return fail(e.message, null);
      }
      fail('Something went wrong. Please try again.', null);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: 16 + insets.top, paddingBottom: 12 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.column}>
          <View>

            <View style={styles.hero}>
              <View style={styles.logo} accessibilityLabel="IsetConnect logo">
                <LogoMark />
              </View>
              <Text style={styles.title}>Create your account.</Text>
              <Text style={styles.subtitle}>Join your campus community in a minute.</Text>
            </View>


            {alertText ? (
              <View style={styles.alert} accessibilityRole="alert">
                <View style={styles.alertDot} />
                <Text style={styles.alertText}>{alertText}</Text>
              </View>
            ) : null}


            <View style={styles.fields}>
              <AuthInput
                value={name}
                onChangeText={(t) => {
                  setName(t);
                  clearError('name');
                }}
                error={errorField === 'name'}
                placeholder="Full name"
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
                accessibilityLabel="Full name"
              />

              <AuthInput
                ref={emailRef}
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  clearError('email');
                }}
                error={errorField === 'email'}
                placeholder="Email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                accessibilityLabel="Email"
              />

              <View>
                <AuthInput
                  ref={passwordRef}
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    clearError('password');
                  }}
                  error={errorField === 'password'}
                  placeholder="Password (min. 6 characters)"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  returnKeyType="next"
                  onSubmitEditing={() => confirmRef.current?.focus()}
                  style={{ paddingRight: 48 }}
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

              <AuthInput
                ref={confirmRef}
                value={confirm}
                onChangeText={(t) => {
                  setConfirm(t);
                  clearError('confirm');
                }}
                error={errorField === 'confirm'}
                placeholder="Confirm password"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="done"
                accessibilityLabel="Confirm password"
              />

              <SelectField
                label="Department"
                value={department?.label}
                placeholder={loadingDepartments ? 'Loading departments…' : 'Department'}
                loading={loadingDepartments}
                error={errorField === 'department'}
                active={picker === 'department'}
                onPress={openDepartmentPicker}
              />

              <SelectField
                label="Class"
                value={classe ?? undefined}
                placeholder={department ? 'Class' : 'Choose a department first'}
                disabled={!department}
                error={errorField === 'classe'}
                active={picker === 'classe'}
                onPress={() => setPicker('classe')}
              />
            </View>


            <Pressable
              onPress={submit}
              disabled={loading}
              accessibilityRole="button"
              style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed, loading && { opacity: 0.6 }]}
            >
              <Text style={styles.ctaText}>{loading ? 'Creating account' : 'Create account'}</Text>
              {loading && <ActivityIndicator size="small" color={colors.whiteBtnText} />}
            </Pressable>
          </View>


          <View style={styles.footer}>
            <View style={styles.signinRow}>
              <Text style={styles.signinText}>Already have an account?</Text>
              <Pressable onPress={onSignIn} hitSlop={8}>
                <Text style={styles.signinLink}>Sign in</Text>
              </Pressable>
            </View>

            <Text style={styles.legal}>
              By signing up, you agree to our{' '}
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

      <OptionSheet
        visible={picker === 'department'}
        title="Department"
        subtitle="Choose the department you study in."
        options={departments.map((d) => ({ value: d.code, label: d.label }))}
        selected={departmentCode ?? undefined}
        onSelect={pickDepartment}
        onClose={() => setPicker(null)}
      />
      <OptionSheet
        visible={picker === 'classe'}
        title="Class"
        subtitle={department ? department.label : undefined}
        options={(department?.classes ?? []).map((c) => ({ value: c, label: c }))}
        selected={classe ?? undefined}
        searchable
        onSelect={pickClasse}
        onClose={() => setPicker(null)}
      />
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

  cta: {
    marginTop: 24,
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
  signinRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  signinText: { fontSize: 14, fontFamily: fonts.regular, color: colors.muted },
  signinLink: { fontSize: 14, fontFamily: fonts.semibold, color: colors.accent },
  legal: { maxWidth: 290, textAlign: 'center', fontSize: 11, lineHeight: 16, fontFamily: fonts.regular, color: colors.muted },
  legalLink: { color: colors.legalLink, textDecorationLine: 'underline' },
});

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useIdTokenAuthRequest } from 'expo-auth-session/providers/google';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { storage } from '../utils/storage';
import { useToast } from '../context/ToastContext';
import { getAuthErrorDisplay } from '../utils/authErrors';

WebBrowser.maybeCompleteAuthSession();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const GOOGLE_CLIENT_ID = typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [socialLoading, setSocialLoading] = useState<'google' | null>(null);
  const passwordRef = useRef<TextInput>(null);
  const { login, loginWithGoogle } = useAuth();
  const navigation = useNavigation();
  const { showToast } = useToast();

  const redirectUriOptions = { useProxy: true };
  const [googleRequest, googleResponse, googlePromptAsync] = useIdTokenAuthRequest(
    { clientId: GOOGLE_CLIENT_ID || '' },
    redirectUriOptions
  );

  useEffect(() => {
    const loadSaved = async () => {
      try {
        const saved = await storage.getRememberMe();
        setRememberMe(saved);
        if (saved) {
          const savedEmail = await storage.getRememberEmail();
          if (savedEmail) setEmail(savedEmail);
        }
      } catch (_) {}
    };
    loadSaved();
  }, []);

  useEffect(() => {
    if (!googleResponse || socialLoading !== 'google') return;
    if (googleResponse.type === 'success' && googleResponse.params?.id_token) {
      loginWithGoogle({ idToken: googleResponse.params.id_token })
        .then(() => showToast('Logged in with Google', 'success'))
        .catch((err: any) => showToast(err?.message || 'Google sign-in failed', 'error'))
        .finally(() => setSocialLoading(null));
    } else if (googleResponse.type === 'error' || googleResponse.type === 'cancel' || googleResponse.type === 'dismiss') {
      setSocialLoading(null);
      if (googleResponse.type === 'error') {
        showToast('Google sign-in was cancelled or failed', 'error');
      }
    }
  }, [googleResponse, socialLoading]);

  const validate = (): boolean => {
    let ok = true;
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail) {
      setEmailError('Email is required');
      ok = false;
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      setEmailError('Please enter a valid email');
      ok = false;
    } else {
      setEmailError('');
    }

    if (!trimmedPassword) {
      setPasswordError('Password is required');
      ok = false;
    } else {
      setPasswordError('');
    }

    return ok;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    setLoading(true);
    setEmailError('');
    setPasswordError('');

    try {
      await login(trimmedEmail, trimmedPassword);
      showToast('Logged in successfully', 'success');
      if (rememberMe) {
        await storage.setRememberMe(true);
        await storage.setRememberEmail(trimmedEmail);
      } else {
        await storage.setRememberMe(false);
        await storage.setRememberEmail('');
      }
    } catch (error: any) {
      const unverifiedEmail = (error as { email?: string })?.email;
      if (unverifiedEmail) {
        navigation.navigate('VerifyEmail', { email: unverifiedEmail });
        return;
      }
      const { message } = getAuthErrorDisplay(error, 'login');
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword' as never);
  };

  const handleGoogleSignIn = async () => {
    if (!GOOGLE_CLIENT_ID) {
      showToast('Google sign-in is not configured. Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to .env', 'error');
      return;
    }
    setSocialLoading('google');
    try {
      await googlePromptAsync();
    } catch (e) {
      setSocialLoading(null);
      showToast('Google sign-in failed', 'error');
    }
  };

  const anyLoading = loading || socialLoading !== null;

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <Text style={styles.title}>Run Barbie🎀</Text>
            <Text style={styles.subtitle}>Share your outdoor adventures</Text>

            <TextInput
              style={[styles.input, emailError ? styles.inputError : null]}
              placeholder="Email"
              placeholderTextColor="#999"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                if (emailError) setEmailError('');
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              editable={!anyLoading}
            />
            {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

            <View style={[styles.input, styles.passwordWrap, passwordError ? styles.inputError : null]}>
              <TextInput
                ref={passwordRef}
                style={styles.passwordInput}
                placeholder="Password"
                placeholderTextColor="#999"
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  if (passwordError) setPasswordError('');
                }}
                secureTextEntry={!showPassword}
                returnKeyType="go"
                onSubmitEditing={handleLogin}
                editable={!anyLoading}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword((p) => !p)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color="#666"
                />
              </TouchableOpacity>
            </View>
            {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

            <View style={styles.row}>
              <TouchableOpacity
                style={styles.checkWrap}
                onPress={() => setRememberMe((r) => !r)}
                disabled={anyLoading}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
                </View>
                <Text style={styles.checkLabel}>Remember me</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleForgotPassword} disabled={anyLoading}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.button, anyLoading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={anyLoading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Login</Text>
              )}
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={[styles.socialButton, anyLoading && styles.buttonDisabled]}
              onPress={handleGoogleSignIn}
              disabled={anyLoading}
            >
              {socialLoading === 'google' ? (
                <ActivityIndicator size="small" color="#333" />
              ) : (
                <>
                  <Image
                    source={{ uri: 'https://assets.stickpng.com/images/5847f9cbcef1014c0b5e48c8.png' }}
                    style={styles.googleLogo}
                    resizeMode="contain"
                  />
                  <Text style={styles.socialButtonText}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('Register' as never)}
              style={styles.linkButton}
              disabled={anyLoading}
            >
              <Text style={styles.linkText}>
                Don't have an account? <Text style={styles.linkTextBold}>Register</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    paddingBottom: 40,
  },
  content: {
    width: '100%',
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
    color: '#FF69B4',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    color: '#666',
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 15,
    marginBottom: 12,
    fontSize: 16,
    color: '#111',
    borderWidth: 1,
    borderColor: 'rgba(255, 105, 180, 0.2)',
  },
  inputError: {
    borderColor: '#c00',
    borderWidth: 1.5,
  },
  errorText: {
    fontSize: 12,
    color: '#c00',
    marginBottom: 10,
    marginTop: -2,
  },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    color: '#111',
    paddingVertical: 0,
    paddingRight: 8,
    minHeight: 20,
  },
  eyeButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 4,
  },
  checkWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#FF69B4',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#FF69B4',
  },
  checkLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#C71585',
  },
  button: {
    backgroundColor: '#FF69B4',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 12,
    minHeight: 50,
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 12,
    minHeight: 50,
    borderWidth: 1.5,
    borderColor: '#ddd',
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  googleLogo: {
    width: 24,
    height: 24,
  },
  linkButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    color: '#111',
    fontSize: 14,
    fontWeight: '700',
  },
  linkTextBold: {
    color: '#C71585',
    fontWeight: '800',
  },
});

export default LoginScreen;

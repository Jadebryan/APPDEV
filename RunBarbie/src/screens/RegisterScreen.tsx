import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useIdTokenAuthRequest } from 'expo-auth-session/providers/google';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { useToast } from '../context/ToastContext';
import { getAuthErrorDisplay } from '../utils/authErrors';
import { useTheme } from '../context/ThemeContext';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

const RegisterScreen: React.FC = () => {
  const { palette } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | null>(null);
  const { register, loginWithGoogle } = useAuth();
  const navigation = useNavigation();
  const { showToast } = useToast();

  const redirectUriOptions = { useProxy: true };
  const [googleRequest, googleResponse, googlePromptAsync] = useIdTokenAuthRequest(
    { clientId: GOOGLE_CLIENT_ID || '' },
    redirectUriOptions
  );

  useEffect(() => {
    if (!googleResponse || socialLoading !== 'google') return;
    if (googleResponse.type === 'success' && googleResponse.params?.id_token) {
      loginWithGoogle({ idToken: googleResponse.params.id_token })
        .then(() => showToast('Signed up with Google', 'success'))
        .catch((err: any) => showToast(err?.message || 'Google sign-in failed', 'error'))
        .finally(() => setSocialLoading(null));
    } else if (googleResponse.type === 'error' || googleResponse.type === 'cancel' || googleResponse.type === 'dismiss') {
      setSocialLoading(null);
      if (googleResponse.type === 'error') {
        showToast('Google sign-in was cancelled or failed', 'error');
      }
    }
  }, [googleResponse, socialLoading]);

  const handleRegister = async () => {
    if (!email || !password || !username) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    if (password.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }

    setLoading(true);
    try {
      const result = await register(email, password, username);
      if (result?.needsVerification && result?.email) {
        showToast('Verification code sent to your email', 'success');
        navigation.navigate('VerifyEmail', { email: result.email });
        return;
      }
    } catch (error: any) {
      const { message } = getAuthErrorDisplay(error, 'register');
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
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
            <Text style={[styles.title, { color: palette.primary }]}>Join Run Barbie🎀</Text>
        <Text style={styles.subtitle}>Start sharing your adventures</Text>

        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor="#999"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <View style={[styles.input, styles.passwordWrap]}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Password"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
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

        <TouchableOpacity
          style={[styles.button, { backgroundColor: palette.primary, borderColor: palette.primary }, anyLoading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={anyLoading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Creating account...' : 'Register'}
          </Text>
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
          onPress={() => navigation.goBack()}
          style={styles.linkButton}
          disabled={anyLoading}
        >
          <Text style={styles.linkText}>
            Already have an account? <Text style={styles.linkTextBold}>Login</Text>
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
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
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
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
    paddingRight: 8,
    minHeight: 20,
  },
  eyeButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
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
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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

export default RegisterScreen;

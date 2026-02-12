import React, { useState } from 'react';
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
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../services/api';
import { RootStackParamList } from '../navigation/types';
import { useToast } from '../context/ToastContext';
import { getAuthErrorDisplay } from '../utils/authErrors';
import { useTheme } from '../context/ThemeContext';

type ResetPasswordRouteProp = RouteProp<RootStackParamList, 'ResetPassword'>;

const ResetPasswordScreen: React.FC = () => {
  const { palette } = useTheme();
  const route = useRoute<ResetPasswordRouteProp>();
  const email = route.params?.email ?? '';
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const navigation = useNavigation();
  const { showToast } = useToast();

  const handleReset = async () => {
    const trimmedCode = code.trim();
    const trimmedPassword = newPassword.trim();
    if (!trimmedCode) {
      showToast('Please enter the 6-digit code', 'error');
      return;
    }
    if (trimmedCode.length !== 6) {
      showToast('Code must be 6 digits', 'error');
      return;
    }
    if (!trimmedPassword) {
      showToast('Please enter your new password', 'error');
      return;
    }
    if (trimmedPassword.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }
    setLoading(true);
    try {
      await authService.resetPassword(email, trimmedCode, trimmedPassword);
      showToast('Password reset successfully. You can now log in.', 'success');
      navigation.navigate('Login' as never);
    } catch (error: any) {
      const { message } = getAuthErrorDisplay(error, 'reset');
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    try {
      await authService.resendResetCode(email);
      showToast('A new reset code was sent to your email.', 'success');
      setCode('');
    } catch (error: any) {
      const { message } = getAuthErrorDisplay(error, 'resend-reset');
      showToast(message, 'error');
    } finally {
      setResendLoading(false);
    }
  };

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
            <Text style={styles.title}>Reset your password</Text>
            <Text style={styles.subtitle}>
              We sent a 6-digit code to {email}. Enter the code and your new password below.
            </Text>

            <TextInput
              style={styles.codeInput}
              placeholder="000000"
              placeholderTextColor="#999"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />

            <View style={[styles.input, styles.passwordWrap]}>
              <TextInput
                style={styles.passwordInput}
                placeholder="New password"
                placeholderTextColor="#999"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showPassword}
                editable={!loading && !resendLoading}
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
              style={[styles.button, { backgroundColor: palette.primary }, (loading || resendLoading) && styles.buttonDisabled]}
              onPress={handleReset}
              disabled={loading || resendLoading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Reset password</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleResend}
              disabled={loading || resendLoading}
              style={styles.resendButton}
            >
              {resendLoading ? (
                <ActivityIndicator color={palette.primary} size="small" />
              ) : (
                <Text style={[styles.resendText, { color: palette.primary }]}>Resend code</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('Login' as never)}
              style={styles.linkButton}
            >
              <Text style={[styles.linkText, { color: palette.primary }]}>Back to login</Text>
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
  codeInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 15,
    marginBottom: 12,
    fontSize: 20,
    letterSpacing: 8,
    textAlign: 'center',
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
  resendButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  resendText: {
    color: '#C71585',
    fontSize: 14,
    fontWeight: '700',
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
});

export default ResetPasswordScreen;

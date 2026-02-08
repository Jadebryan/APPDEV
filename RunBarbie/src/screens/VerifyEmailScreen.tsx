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
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { authService } from '../services/api';
import { RootStackParamList } from '../navigation/types';
import { useToast } from '../context/ToastContext';
import { getAuthErrorDisplay } from '../utils/authErrors';

type VerifyEmailRouteProp = RouteProp<RootStackParamList, 'VerifyEmail'>;

const VerifyEmailScreen: React.FC = () => {
  const route = useRoute<VerifyEmailRouteProp>();
  const email = route.params?.email ?? '';
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const { verifyEmail } = useAuth();
  const navigation = useNavigation();
  const { showToast } = useToast();

  const handleVerify = async () => {
    const trimmed = code.trim();
    if (!trimmed) {
      showToast('Please enter the 6-digit code', 'error');
      return;
    }
    if (trimmed.length !== 6) {
      showToast('Code must be 6 digits', 'error');
      return;
    }
    setLoading(true);
    try {
      await verifyEmail(email, trimmed);
      showToast('Email verified! Welcome.', 'success');
    } catch (error: any) {
      const { message } = getAuthErrorDisplay(error, 'verify');
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    try {
      await authService.resendVerificationCode(email);
      showToast('A new verification code was sent to your email.', 'success');
      setCode('');
    } catch (error: any) {
      const { message } = getAuthErrorDisplay(error, 'resend');
      showToast(message, 'error');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Verify your email</Text>
        <Text style={styles.subtitle}>
          We sent a 6-digit code to {email}. Enter it below to continue.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="000000"
          placeholderTextColor="#999"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
        />

        <TouchableOpacity
          style={[styles.button, (loading || resendLoading) && styles.buttonDisabled]}
          onPress={handleVerify}
          disabled={loading || resendLoading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Verify</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleResend}
          disabled={loading || resendLoading}
          style={styles.resendButton}
        >
          {resendLoading ? (
            <ActivityIndicator color="#FF69B4" size="small" />
          ) : (
            <Text style={styles.resendText}>Resend code</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.linkButton}
        >
          <Text style={styles.linkText}>Back to login</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
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
    fontSize: 20,
    letterSpacing: 8,
    textAlign: 'center',
    color: '#111',
    borderWidth: 1,
    borderColor: 'rgba(255, 105, 180, 0.2)',
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

export default VerifyEmailScreen;

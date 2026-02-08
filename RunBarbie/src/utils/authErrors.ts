/**
 * Normalize auth API errors into user-friendly messages.
 * Handles axios errors, timeouts, network errors, and server messages.
 */

export interface AuthErrorDisplay {
  title: string;
  message: string;
  isNetworkOrTimeout: boolean;
}

function getServerMessage(error: any): string | null {
  const msg = error?.response?.data?.error;
  if (typeof msg === 'string' && msg.trim()) return msg.trim();
  return null;
}

function isTimeout(error: any): boolean {
  return error?.code === 'ECONNABORTED' || (error?.message || '').toLowerCase().includes('timeout');
}

function isNetworkError(error: any): boolean {
  const code = error?.code;
  const msg = (error?.message || '').toLowerCase();
  return (
    code === 'ERR_NETWORK' ||
    code === 'ECONNREFUSED' ||
    code === 'ENOTFOUND' ||
    code === 'ERR_INTERNET_DISCONNECTED' ||
    msg.includes('network error')
  );
}

/**
 * Get a user-friendly error display for auth flows (login, register, verify, resend).
 */
export function getAuthErrorDisplay(
  error: any,
  context: 'login' | 'register' | 'verify' | 'resend' | 'reset' | 'resend-reset'
): AuthErrorDisplay {
  const serverMsg = getServerMessage(error);
  const timeout = isTimeout(error);
  const network = isNetworkError(error);

  if (timeout) {
    return {
      title: 'Request timed out',
      message: 'The server took too long to respond. Check your connection and that the server is running, then try again.',
      isNetworkOrTimeout: true,
    };
  }

  if (network) {
    const tips =
      'Make sure: (1) The server is running. (2) Your device and computer are on the same Wi‑Fi. (3) If using a physical device, set EXPO_PUBLIC_API_URL in RunBarbie/.env to your computer\'s IP (run "npm run get-ip" in RunBarbie).';
    return {
      title: "Can't reach server",
      message: tips,
      isNetworkOrTimeout: true,
    };
  }

  if (serverMsg) {
    const titles: Record<string, string> = {
      login: 'Login failed',
      register: 'Registration failed',
      verify: 'Verification failed',
      resend: 'Resend failed',
      reset: 'Reset failed',
      'resend-reset': 'Resend failed',
    };
    return {
      title: titles[context] || 'Error',
      message: serverMsg,
      isNetworkOrTimeout: false,
    };
  }

  const fallback = error?.message || 'Something went wrong. Please try again.';
  const titles: Record<string, string> = {
    login: 'Login failed',
    register: 'Registration failed',
    verify: 'Verification failed',
    resend: 'Resend failed',
    reset: 'Reset failed',
    'resend-reset': 'Resend failed',
  };
  return {
    title: titles[context] || 'Error',
    message: typeof fallback === 'string' ? fallback : 'Something went wrong. Please try again.',
    isNetworkOrTimeout: false,
  };
}

/**
 * Get a short one-line message (e.g. for inline field error).
 */
export function getAuthErrorMessage(error: any): string {
  const display = getAuthErrorDisplay(error, 'login');
  if (display.isNetworkOrTimeout) {
    return display.title + '. ' + display.message.split('.')[0];
  }
  return display.message;
}

import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../context/ChatContext';
import { api } from '../services/api';
import {
  X,
  UserPlus,
  ShieldAlert,
  Mail,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  KeyRound,
  Lock,
  ArrowLeft,
  Camera,
  Upload,
  LogIn,
  ShieldCheck,
  Eye,
  EyeOff,
  User,
  Users
} from 'lucide-react';
import confetti from 'canvas-confetti';

const AVATAR_OPTIONS = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80'
];

export const UserSwitcherModal = ({ isOpen, onClose }) => {
  const { currentUser, selectUser, registerUser, loginUser, showToast } = useChat();

  // Tab: 'login' | 'register'
  const [tab, setTab] = useState('login');

  // Login Mode: 'password' | 'otp'
  const [loginMode, setLoginMode] = useState('password');
  const [loginIdentifier, setLoginIdentifier] = useState(''); // username or email
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // OTP Login state
  const [loginOtpEmail, setLoginOtpEmail] = useState('');
  const [loginOtpStep, setLoginOtpStep] = useState('email'); // 'email' | 'otp'
  const [loginOtpDigits, setLoginOtpDigits] = useState(['', '', '', '', '', '']);
  const [loginDemoOtp, setLoginDemoOtp] = useState(null);
  const [loginResendTimer, setLoginResendTimer] = useState(0);

  // Register flow state
  const [regStep, setRegStep] = useState('form'); // 'form' | 'otp'
  const [formName, setFormName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [formStatus, setFormStatus] = useState('Hey there! I am using WhatsApp.');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_OPTIONS[0]);
  const [customAvatarFile, setCustomAvatarFile] = useState(null);
  const [regOtpDigits, setRegOtpDigits] = useState(['', '', '', '', '', '']);
  const [regDemoOtp, setRegDemoOtp] = useState(null);
  const [regResendTimer, setRegResendTimer] = useState(0);

  // Saved / Recent Accounts on this device
  const [savedAccounts, setSavedAccounts] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loginOtpRefs = useRef([]);
  const regOtpRefs = useRef([]);
  const avatarInputRef = useRef(null);

  // Load saved accounts on open
  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      try {
        const raw = localStorage.getItem('whatsapp_saved_accounts');
        if (raw) {
          const parsed = JSON.parse(raw);
          setSavedAccounts(Array.isArray(parsed) ? parsed : []);
        } else {
          api.getAccounts().then((accounts) => {
            if (accounts && accounts.length > 0) {
              setSavedAccounts(accounts.slice(0, 6));
            }
          }).catch(() => {});
        }
      } catch (e) {}

      if (!currentUser) {
        setTab('login');
      }
    }
  }, [isOpen, currentUser]);

  // Resend Timers
  useEffect(() => {
    let interval = null;
    if (loginResendTimer > 0) {
      interval = setInterval(() => setLoginResendTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [loginResendTimer]);

  useEffect(() => {
    let interval = null;
    if (regResendTimer > 0) {
      interval = setInterval(() => setRegResendTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [regResendTimer]);

  if (!isOpen) return null;

  // Custom avatar selection
  const handleAvatarFileSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCustomAvatarFile(file);
    setSelectedAvatar(URL.createObjectURL(file));
  };

  // -------------------------------------------------------------
  // 1. PASSWORD LOGIN ACTION
  // -------------------------------------------------------------
  const handlePasswordLogin = async (e) => {
    e?.preventDefault();
    const rawTarget = loginIdentifier.trim();
    if (!rawTarget) {
      setErrorMsg('Please enter your username or registered email.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    const cleanTarget = rawTarget.toLowerCase().replace(/^@/, '');
    const matchingSaved = savedAccounts.find(
      (a) =>
        (a.username && a.username.toLowerCase().replace(/^@/, '') === cleanTarget) ||
        (a.email && a.email.toLowerCase() === rawTarget.toLowerCase()) ||
        (a.name && a.name.toLowerCase() === rawTarget.toLowerCase()) ||
        (a.id && a.id === rawTarget)
    );

    try {
      await loginUser({
        identifier: rawTarget,
        password: loginPassword,
        account: matchingSaved || null
      });

      confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } });
      onClose();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Invalid credentials. Please check your username/email and password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick 1-click login from saved accounts list
  const handleQuickAccountSelect = async (account) => {
    setLoginIdentifier(account.username || account.email || account.name);
    setErrorMsg('');

    try {
      setIsSubmitting(true);
      await loginUser({
        identifier: account.username || account.email || account.name,
        password: account.password || 'password123',
        account: account
      });
      showToast(`Welcome back, ${account.name}!`, 'success');
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } });
      onClose();
    } catch (err) {
      setLoginIdentifier(account.username || account.email || account.name);
      setLoginPassword('');
      showToast(`Selected ${account.name} (@${account.username || ''}). Enter password to log in.`, 'info');
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // 2. EMAIL OTP LOGIN ACTIONS
  // -------------------------------------------------------------
  const handleSendLoginOtp = async (e) => {
    e?.preventDefault();
    if (!loginOtpEmail.trim() || !loginOtpEmail.includes('@') || !loginOtpEmail.includes('.')) {
      setErrorMsg('Please enter a valid registered email address.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await api.sendOtp(loginOtpEmail.trim(), 'User', 'login');
      setLoginDemoOtp(res.demoOtp || null);
      if (res.demoOtp) {
        setLoginOtpDigits(res.demoOtp.toString().split(''));
      }
      setLoginResendTimer(30);
      setLoginOtpStep('otp');
      showToast(res.message || 'Login code sent to your email!', 'success');
      setTimeout(() => loginOtpRefs.current[0]?.focus(), 150);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to send login code. Please check your email or register.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoginOtpChange = (index, value) => {
    if (value.length > 1) {
      const pasted = value.replace(/\D/g, '').slice(0, 6).split('');
      const newDigits = [...loginOtpDigits];
      pasted.forEach((char, i) => {
        if (i < 6) newDigits[i] = char;
      });
      setLoginOtpDigits(newDigits);
      const nextIdx = Math.min(pasted.length, 5);
      loginOtpRefs.current[nextIdx]?.focus();
      return;
    }

    const digit = value.replace(/\D/g, '');
    const newDigits = [...loginOtpDigits];
    newDigits[index] = digit;
    setLoginOtpDigits(newDigits);

    if (digit && index < 5) {
      loginOtpRefs.current[index + 1]?.focus();
    }
  };

  const handleVerifyLoginOtp = async (e) => {
    e?.preventDefault();
    const otpCode = loginOtpDigits.join('');
    if (otpCode.length !== 6) {
      setErrorMsg('Please enter the complete 6-digit OTP code.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await loginUser({ email: loginOtpEmail.trim(), otp: otpCode });
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } });
      onClose();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Invalid or expired OTP code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // 3. REGISTRATION ACTIONS
  // -------------------------------------------------------------
  const handleSendRegOtp = async (e) => {
    e?.preventDefault();
    if (!formName.trim() || !formUsername.trim() || !formEmail.trim()) {
      setErrorMsg('Please fill in your name, username, and valid email.');
      return;
    }

    if (formUsername.trim().length < 2) {
      setErrorMsg('Username must be at least 2 characters long.');
      return;
    }

    if (!formEmail.includes('@') || !formEmail.includes('.')) {
      setErrorMsg('Please enter a valid Gmail / Email address.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await api.sendOtp(formEmail.trim(), formName.trim(), 'registration');
      setRegDemoOtp(res.demoOtp || null);
      if (res.demoOtp) {
        setRegOtpDigits(res.demoOtp.toString().split(''));
      }
      setRegResendTimer(30);
      setRegStep('otp');
      showToast(res.message || 'Verification code sent to your email!', 'success');
      setTimeout(() => regOtpRefs.current[0]?.focus(), 150);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to send verification code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegOtpChange = (index, value) => {
    if (value.length > 1) {
      const pasted = value.replace(/\D/g, '').slice(0, 6).split('');
      const newDigits = [...regOtpDigits];
      pasted.forEach((char, i) => {
        if (i < 6) newDigits[i] = char;
      });
      setRegOtpDigits(newDigits);
      const nextIdx = Math.min(pasted.length, 5);
      regOtpRefs.current[nextIdx]?.focus();
      return;
    }

    const digit = value.replace(/\D/g, '');
    const newDigits = [...regOtpDigits];
    newDigits[index] = digit;
    setRegOtpDigits(newDigits);

    if (digit && index < 5) {
      regOtpRefs.current[index + 1]?.focus();
    }
  };

  const handleCompleteRegistration = async (e) => {
    e?.preventDefault();
    const otpCode = regOtpDigits.join('');
    if (otpCode.length !== 6) {
      setErrorMsg('Please enter the complete 6-digit OTP code.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      let finalAvatar = selectedAvatar;
      if (customAvatarFile) {
        try {
          const avatarRes = await api.uploadAvatar('temp_new_user', customAvatarFile);
          if (avatarRes?.avatarUrl) finalAvatar = avatarRes.avatarUrl;
        } catch (e) {}
      }

      await registerUser({
        username: formUsername.trim().toLowerCase(),
        name: formName.trim(),
        email: formEmail.trim().toLowerCase(),
        password: formPassword.trim() || 'password123',
        otp: otpCode,
        avatar: finalAvatar,
        status_message: formStatus.trim()
      });

      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      onClose();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Registration failed. Please check your details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-sm animate-fade-in select-none">
      <div className="bg-[#111b21] border border-[#2a3942] rounded-2xl max-w-md w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-slide-up sm:animate-none">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#202c33] border-b border-[#2a3942]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#00a884]/20 flex items-center justify-center text-[#00a884]">
              {tab === 'login' ? <LogIn size={18} /> : <UserPlus size={18} />}
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#e9edef]">
                {currentUser ? 'Switch / Add Account' : tab === 'login' ? 'Log In to WhatsApp' : 'Create Your Account'}
              </h2>
              <p className="text-[11px] text-[#8696a0]">
                {tab === 'login' ? 'Log in with your registered credentials anytime' : 'Register once & keep your friends forever'}
              </p>
            </div>
          </div>
          {currentUser && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-[#8696a0] hover:text-[#e9edef] hover:bg-[#2a3942] transition"
              title="Close"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 bg-[#202c33] border-b border-[#2a3942] p-1 text-xs font-semibold">
          <button
            onClick={() => {
              setTab('login');
              setErrorMsg('');
            }}
            className={`py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
              tab === 'login'
                ? 'bg-[#111b21] text-[#00a884] shadow'
                : 'text-[#8696a0] hover:text-[#e9edef]'
            }`}
          >
            <LogIn size={14} /> Log In
          </button>
          <button
            onClick={() => {
              setTab('register');
              setErrorMsg('');
              setRegStep('form');
            }}
            className={`py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
              tab === 'register'
                ? 'bg-[#111b21] text-[#00a884] shadow'
                : 'text-[#8696a0] hover:text-[#e9edef]'
            }`}
          >
            <UserPlus size={14} /> Create Account
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-xs text-[#ff5b5b] flex items-start gap-2 animate-fade-in">
              <ShieldAlert size={16} className="flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 1: LOGIN FLOW */}
          {/* ==================================================== */}
          {tab === 'login' && (
            <div className="space-y-4">
              {/* Quick Switch / Saved Accounts Bar */}
              {savedAccounts.length > 0 && (
                <div className="bg-[#182229] border border-[#2a3942] rounded-xl p-3">
                  <span className="text-[10px] text-[#8696a0] uppercase font-semibold tracking-wider block mb-2 flex items-center gap-1.5">
                    <Users size={12} className="text-[#00a884]" /> Accounts on this Device:
                  </span>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                    {savedAccounts.map((acc) => (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => handleQuickAccountSelect(acc)}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition text-left flex-shrink-0 ${
                          loginIdentifier === acc.username || loginIdentifier === acc.email
                            ? 'bg-[#00a884]/20 border-[#00a884] text-white'
                            : 'bg-[#202c33] border-[#2a3942] text-[#e9edef] hover:border-[#00a884]/60'
                        }`}
                        title={`Click to log in as ${acc.name}`}
                      >
                        <img
                          src={acc.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${acc.username}`}
                          alt={acc.name}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold leading-none">{acc.name}</span>
                          <span className="text-[10px] text-[#8696a0]">@{acc.username}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Mode Toggle: Password vs OTP */}
              <div className="flex items-center justify-between text-xs pb-1 border-b border-[#2a3942]/60">
                <span className="text-[#8696a0]">Login Method:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginMode('password');
                      setErrorMsg('');
                    }}
                    className={`px-2 py-0.5 rounded text-xs transition ${
                      loginMode === 'password'
                        ? 'bg-[#00a884] text-white font-semibold'
                        : 'text-[#8696a0] hover:text-[#e9edef]'
                    }`}
                  >
                    Password
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginMode('otp');
                      setErrorMsg('');
                      setLoginOtpStep('email');
                    }}
                    className={`px-2 py-0.5 rounded text-xs transition ${
                      loginMode === 'otp'
                        ? 'bg-[#00a884] text-white font-semibold'
                        : 'text-[#8696a0] hover:text-[#e9edef]'
                    }`}
                  >
                    Email OTP
                  </button>
                </div>
              </div>

              {/* A. Password Login Mode */}
              {loginMode === 'password' && (
                <form onSubmit={handlePasswordLogin} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-medium text-[#8696a0] mb-1">Username or Registered Email</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={loginIdentifier}
                        onChange={(e) => setLoginIdentifier(e.target.value)}
                        placeholder="alex_99 or you@gmail.com"
                        required
                        autoFocus
                        className="w-full bg-[#202c33] text-[#e9edef] placeholder-[#8696a0] text-sm px-3.5 py-2.5 rounded-xl border border-[#2a3942] focus:outline-none focus:border-[#00a884]"
                      />
                      <User size={15} className="absolute right-3.5 top-3 text-[#8696a0]" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-[#8696a0]">Password</label>
                      <button
                        type="button"
                        onClick={() => {
                          setLoginMode('otp');
                          setLoginOtpEmail(loginIdentifier.includes('@') ? loginIdentifier : '');
                        }}
                        className="text-[11px] text-[#00a884] hover:underline"
                      >
                        Forgot / Use OTP?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showLoginPassword ? 'text' : 'password'}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Enter your password"
                        required
                        className="w-full bg-[#202c33] text-[#e9edef] placeholder-[#8696a0] text-sm px-3.5 py-2.5 rounded-xl border border-[#2a3942] focus:outline-none focus:border-[#00a884]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3 top-3 text-[#8696a0] hover:text-white"
                      >
                        {showLoginPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="remember-me"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="accent-[#00a884] w-4 h-4 rounded cursor-pointer"
                    />
                    <label htmlFor="remember-me" className="text-xs text-[#8696a0] cursor-pointer select-none">
                      Keep me logged in on this device
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || !loginIdentifier.trim()}
                    className="w-full py-2.5 bg-[#00a884] hover:bg-[#008f6f] disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition shadow flex items-center justify-center gap-2 mt-2"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" /> Logging in...
                      </>
                    ) : (
                      <>
                        <LogIn size={15} /> Log In with Credentials
                      </>
                    )}
                  </button>

                  <div className="text-center pt-2 border-t border-[#2a3942]/60">
                    <p className="text-xs text-[#8696a0]">
                      Don&apos;t have an account yet?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setTab('register');
                          if (loginIdentifier.includes('@')) setFormEmail(loginIdentifier);
                          else setFormUsername(loginIdentifier);
                        }}
                        className="text-[#00a884] font-semibold hover:underline"
                      >
                        Create Account
                      </button>
                    </p>
                  </div>
                </form>
              )}

              {/* B. Email OTP Login Mode */}
              {loginMode === 'otp' && (
                <>
                  {loginOtpStep === 'email' ? (
                    <form onSubmit={handleSendLoginOtp} className="space-y-4">
                      <div className="text-center py-1">
                        <div className="w-12 h-12 rounded-full bg-[#00a884]/15 text-[#00a884] flex items-center justify-center mx-auto mb-2">
                          <Mail size={22} />
                        </div>
                        <h3 className="text-sm font-semibold text-[#e9edef]">Log In via Email OTP</h3>
                        <p className="text-xs text-[#8696a0] mt-1">
                          We will send a 6-digit verification code to your registered email.
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#8696a0] mb-1.5">Registered Email</label>
                        <div className="relative">
                          <input
                            type="email"
                            value={loginOtpEmail}
                            onChange={(e) => setLoginOtpEmail(e.target.value)}
                            placeholder="you@gmail.com"
                            required
                            autoFocus
                            className="w-full bg-[#202c33] text-[#e9edef] placeholder-[#8696a0] text-sm px-4 py-2.5 rounded-xl border border-[#2a3942] focus:outline-none focus:border-[#00a884]"
                          />
                          <Mail size={16} className="absolute right-3.5 top-3 text-[#8696a0]" />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting || !loginOtpEmail.trim()}
                        className="w-full py-2.5 bg-[#00a884] hover:bg-[#008f6f] disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition shadow flex items-center justify-center gap-2"
                      >
                        {isSubmitting ? (
                          <>
                            <RefreshCw size={14} className="animate-spin" /> Sending Code...
                          </>
                        ) : (
                          <>
                            <KeyRound size={15} /> Send Login Code
                          </>
                        )}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyLoginOtp} className="space-y-4">
                      <button
                        type="button"
                        onClick={() => setLoginOtpStep('email')}
                        className="text-xs text-[#8696a0] hover:text-[#00a884] flex items-center gap-1"
                      >
                        <ArrowLeft size={13} /> Change email ({loginOtpEmail})
                      </button>

                      <div className="text-center py-1">
                        <div className="w-12 h-12 rounded-full bg-[#25D366]/15 text-[#25D366] flex items-center justify-center mx-auto mb-2">
                          <Lock size={22} />
                        </div>
                        <h3 className="text-sm font-semibold text-[#e9edef]">Enter 6-Digit Verification Code</h3>
                        <p className="text-xs text-[#8696a0] mt-1">
                          Code sent to <strong className="text-[#e9edef]">{loginOtpEmail}</strong>
                        </p>
                      </div>

                      {/* Instant Verification Code Card */}
                      {loginDemoOtp && (
                        <div className="bg-[#182229] border border-[#00a884]/40 rounded-xl p-3 flex items-center justify-between text-xs shadow-md">
                          <div className="flex items-center gap-2">
                            <KeyRound size={16} className="text-[#00a884]" />
                            <span className="text-[#8696a0]">Code:</span>
                            <span className="font-mono text-base font-bold text-[#25D366] tracking-widest">{loginDemoOtp}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setLoginOtpDigits(loginDemoOtp.toString().split(''));
                              showToast('OTP auto-filled!', 'success');
                            }}
                            className="px-3 py-1 bg-[#00a884] hover:bg-[#008f6f] text-white font-semibold rounded-lg text-xs transition shadow"
                          >
                            Auto-Fill
                          </button>
                        </div>
                      )}

                      {/* 6 Digit Inputs */}
                      <div className="flex justify-center gap-2 py-2">
                        {loginOtpDigits.map((digit, index) => (
                          <input
                            key={index}
                            ref={(el) => (loginOtpRefs.current[index] = el)}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleLoginOtpChange(index, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Backspace' && !digit && index > 0) {
                                loginOtpRefs.current[index - 1]?.focus();
                              }
                            }}
                            className="w-11 h-12 bg-[#202c33] text-[#25D366] text-xl font-bold text-center rounded-xl border border-[#2a3942] focus:border-[#00a884] focus:outline-none"
                          />
                        ))}
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting || loginOtpDigits.join('').length !== 6}
                        className="w-full py-2.5 bg-[#00a884] hover:bg-[#008f6f] disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition shadow flex items-center justify-center gap-2"
                      >
                        {isSubmitting ? (
                          <>
                            <RefreshCw size={14} className="animate-spin" /> Verifying...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={15} /> Verify & Log In
                          </>
                        )}
                      </button>

                      <div className="text-center pt-1">
                        {loginResendTimer > 0 ? (
                          <span className="text-[11px] text-[#8696a0]">
                            Resend code in <strong>{loginResendTimer}s</strong>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={handleSendLoginOtp}
                            className="text-xs text-[#00a884] font-semibold hover:underline flex items-center justify-center gap-1 mx-auto"
                          >
                            <RefreshCw size={12} /> Resend OTP Code
                          </button>
                        )}
                      </div>
                    </form>
                  )}
                </>
              )}
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 2: REGISTRATION FLOW */}
          {/* ==================================================== */}
          {tab === 'register' && (
            <>
              {regStep === 'form' ? (
                <form onSubmit={handleSendRegOtp} className="space-y-3.5">
                  <input
                    type="file"
                    ref={avatarInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarFileSelected}
                  />

                  {/* Avatar Picker & Device Upload */}
                  <div className="flex flex-col items-center justify-center">
                    <div
                      onClick={() => avatarInputRef.current?.click()}
                      className="relative cursor-pointer group"
                      title="Upload photo from device"
                    >
                      <img
                        src={selectedAvatar}
                        alt="Profile avatar"
                        className="w-20 h-20 rounded-full object-cover ring-4 ring-[#00a884]/40 shadow-lg group-hover:opacity-80 transition"
                      />
                      <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white">
                        <Camera size={18} />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      className="text-[11px] text-[#00a884] font-medium mt-1.5 hover:underline flex items-center gap-1"
                    >
                      <Upload size={12} /> Upload Photo from Device
                    </button>
                  </div>

                  {/* Form Inputs */}
                  <div>
                    <label className="block text-xs font-medium text-[#8696a0] mb-1">Full Name</label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Alex Johnson"
                      required
                      className="w-full bg-[#202c33] text-[#e9edef] placeholder-[#8696a0] text-sm px-3.5 py-2 rounded-xl border border-[#2a3942] focus:outline-none focus:border-[#00a884]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#8696a0] mb-1">Username (Permanent ID for Friends)</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2 text-[#8696a0] text-sm">@</span>
                      <input
                        type="text"
                        value={formUsername}
                        onChange={(e) => setFormUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                        placeholder="alex_99"
                        required
                        className="w-full bg-[#202c33] text-[#e9edef] placeholder-[#8696a0] text-sm pl-8 pr-3.5 py-2 rounded-xl border border-[#2a3942] focus:outline-none focus:border-[#00a884]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#8696a0] mb-1">Gmail / Email</label>
                    <div className="relative">
                      <input
                        type="email"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        placeholder="you@gmail.com"
                        required
                        className="w-full bg-[#202c33] text-[#e9edef] placeholder-[#8696a0] text-sm px-3.5 py-2 rounded-xl border border-[#2a3942] focus:outline-none focus:border-[#00a884]"
                      />
                      <Mail size={15} className="absolute right-3 top-2.5 text-[#8696a0]" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#8696a0] mb-1">Password (for Fast Login)</label>
                    <div className="relative">
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        value={formPassword}
                        onChange={(e) => setFormPassword(e.target.value)}
                        placeholder="Create a secure password"
                        required
                        className="w-full bg-[#202c33] text-[#e9edef] placeholder-[#8696a0] text-sm px-3.5 py-2 rounded-xl border border-[#2a3942] focus:outline-none focus:border-[#00a884]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute right-3 top-2.5 text-[#8696a0] hover:text-white"
                      >
                        {showRegPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || !formName.trim() || !formUsername.trim() || !formEmail.trim()}
                    className="w-full py-2.5 bg-[#00a884] hover:bg-[#008f6f] disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition shadow flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" /> Sending Verification Code...
                      </>
                    ) : (
                      <>
                        <ArrowRight size={15} /> Continue to Verification
                      </>
                    )}
                  </button>

                  <div className="text-center pt-1">
                    <p className="text-xs text-[#8696a0]">
                      Already registered?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setTab('login');
                          setLoginIdentifier(formUsername || formEmail);
                        }}
                        className="text-[#00a884] font-semibold hover:underline"
                      >
                        Log In with Credentials
                      </button>
                    </p>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleCompleteRegistration} className="space-y-4">
                  <button
                    type="button"
                    onClick={() => setRegStep('form')}
                    className="text-xs text-[#8696a0] hover:text-[#00a884] flex items-center gap-1"
                  >
                    <ArrowLeft size={13} /> Back to details ({formEmail})
                  </button>

                  <div className="text-center py-1">
                    <div className="w-12 h-12 rounded-full bg-[#25D366]/15 text-[#25D366] flex items-center justify-center mx-auto mb-2">
                      <ShieldCheck size={24} />
                    </div>
                    <h3 className="text-sm font-semibold text-[#e9edef]">Verify Your Email</h3>
                    <p className="text-xs text-[#8696a0] mt-1">
                      Enter the 6-digit code sent to <strong className="text-[#e9edef]">{formEmail}</strong>
                    </p>
                  </div>

                  {/* Instant Verification Code Card */}
                  {regDemoOtp && (
                    <div className="bg-[#182229] border border-[#00a884]/40 rounded-xl p-3 flex items-center justify-between text-xs shadow-md">
                      <div className="flex items-center gap-2">
                        <KeyRound size={16} className="text-[#00a884]" />
                        <span className="text-[#8696a0]">Code:</span>
                        <span className="font-mono text-base font-bold text-[#25D366] tracking-widest">{regDemoOtp}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setRegOtpDigits(regDemoOtp.toString().split(''));
                          showToast('OTP code auto-filled!', 'success');
                        }}
                        className="px-3 py-1 bg-[#00a884] hover:bg-[#008f6f] text-white font-semibold rounded-lg text-xs transition shadow"
                      >
                        Auto-Fill
                      </button>
                    </div>
                  )}

                  {/* 6 Digit Inputs */}
                  <div className="flex justify-center gap-2 py-2">
                    {regOtpDigits.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => (regOtpRefs.current[index] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleRegOtpChange(index, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Backspace' && !digit && index > 0) {
                            regOtpRefs.current[index - 1]?.focus();
                          }
                        }}
                        className="w-11 h-12 bg-[#202c33] text-[#25D366] text-xl font-bold text-center rounded-xl border border-[#2a3942] focus:border-[#00a884] focus:outline-none"
                      />
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || regOtpDigits.join('').length !== 6}
                    className="w-full py-2.5 bg-[#00a884] hover:bg-[#008f6f] disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition shadow flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" /> Creating Account...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={15} /> Complete Registration & Start Chatting
                      </>
                    )}
                  </button>

                  <div className="text-center pt-1">
                    {regResendTimer > 0 ? (
                      <span className="text-[11px] text-[#8696a0]">
                        Resend code in <strong>{regResendTimer}s</strong>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendRegOtp}
                        className="text-xs text-[#00a884] font-semibold hover:underline flex items-center justify-center gap-1 mx-auto"
                      >
                        <RefreshCw size={12} /> Resend OTP Code
                      </button>
                    )}
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserSwitcherModal;

import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../context/ChatContext';
import { api } from '../services/api';
import {
  X,
  UserPlus,
  UserCheck,
  ShieldAlert,
  Sparkles,
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
  ShieldCheck
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
  const { currentUser, selectUser, registerUser, showToast } = useChat();

  // Tab: 'login' | 'register'
  const [tab, setTab] = useState('login');

  // Login flow state
  const [loginStep, setLoginStep] = useState('email'); // 'email' | 'otp'
  const [loginEmail, setLoginEmail] = useState('');
  const [loginOtpDigits, setLoginOtpDigits] = useState(['', '', '', '', '', '']);
  const [loginDemoOtp, setLoginDemoOtp] = useState(null);
  const [loginResendTimer, setLoginResendTimer] = useState(0);

  // Register flow state
  const [regStep, setRegStep] = useState('form'); // 'form' | 'otp'
  const [formName, setFormName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formStatus, setFormStatus] = useState('Hey there! I am using WhatsApp.');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_OPTIONS[0]);
  const [customAvatarFile, setCustomAvatarFile] = useState(null);
  const [regOtpDigits, setRegOtpDigits] = useState(['', '', '', '', '', '']);
  const [regDemoOtp, setRegDemoOtp] = useState(null);
  const [regResendTimer, setRegResendTimer] = useState(0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loginOtpRefs = useRef([]);
  const regOtpRefs = useRef([]);
  const avatarInputRef = useRef(null);

  // Reset steps when modal opens
  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      if (!currentUser) {
        setTab('login');
      }
    }
  }, [isOpen, currentUser]);

  // Timers
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
  // LOGIN ACTIONS
  // -------------------------------------------------------------
  const handleSendLoginOtp = async (e) => {
    e?.preventDefault();
    if (!loginEmail.trim() || !loginEmail.includes('@') || !loginEmail.includes('.')) {
      setErrorMsg('Please enter a valid registered email address.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await api.sendOtp(loginEmail.trim(), 'User', 'login');
      setLoginDemoOtp(res.demoOtp || null);
      if (res.demoOtp) {
        setLoginOtpDigits(res.demoOtp.toString().split(''));
      }
      setLoginResendTimer(30);
      setLoginStep('otp');
      showToast(res.message || 'Login code sent to your Gmail!', 'success');
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
      const res = await api.login({ email: loginEmail.trim(), otp: otpCode });
      showToast(`Welcome back, ${res.user.name}!`, 'success');
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } });
      await selectUser(res.user);
      onClose();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Invalid or expired OTP code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // REGISTRATION ACTIONS
  // -------------------------------------------------------------
  const handleSendRegOtp = async (e) => {
    e?.preventDefault();
    if (!formName.trim() || !formUsername.trim() || !formEmail.trim()) {
      setErrorMsg('Please fill in your name, username, and valid email.');
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
      showToast(res.message || 'Verification code sent to your Gmail!', 'success');
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
        const formData = new FormData();
        formData.append('userId', 'temp_new_user');
        formData.append('avatar', customAvatarFile);
        try {
          const avatarRes = await api.uploadAvatar('temp_new_user', customAvatarFile);
          if (avatarRes?.avatarUrl) finalAvatar = avatarRes.avatarUrl;
        } catch (e) {}
      }

      await registerUser({
        username: formUsername.trim().toLowerCase(),
        name: formName.trim(),
        email: formEmail.trim().toLowerCase(),
        otp: otpCode,
        avatar: finalAvatar,
        status_message: formStatus.trim()
      });

      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      onClose();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Registration failed. Please check your OTP.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-sm animate-fade-in select-none">
      <div className="bg-[#111b21] border border-[#2a3942] rounded-2xl max-w-md w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-slide-up sm:animate-none">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#202c33] border-b border-[#2a3942]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#00a884]/20 flex items-center justify-center text-[#00a884]">
              {tab === 'login' ? <LogIn size={18} /> : <UserPlus size={18} />}
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#e9edef]">
                {tab === 'login' ? 'Log In to WhatsApp' : 'Create Account'}
              </h2>
              <p className="text-[11px] text-[#8696a0]">
                {tab === 'login' ? 'Access your private chats with Email OTP' : 'Register with verified Gmail OTP'}
              </p>
            </div>
          </div>
          {currentUser && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-[#8696a0] hover:text-[#e9edef] hover:bg-[#2a3942] transition"
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
              setLoginStep('email');
            }}
            className={`py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
              tab === 'login'
                ? 'bg-[#111b21] text-[#00a884] shadow'
                : 'text-[#8696a0] hover:text-[#e9edef]'
            }`}
          >
            <LogIn size={14} /> Log In (Email OTP)
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
            <>
              {loginStep === 'email' ? (
                <form onSubmit={handleSendLoginOtp} className="space-y-4">
                  <div className="text-center py-2">
                    <div className="w-14 h-14 rounded-full bg-[#00a884]/15 text-[#00a884] flex items-center justify-center mx-auto mb-2.5">
                      <Mail size={26} />
                    </div>
                    <h3 className="text-sm font-semibold text-[#e9edef]">Enter Your Registered Email</h3>
                    <p className="text-xs text-[#8696a0] mt-1 max-w-xs mx-auto">
                      We will send a secure 6-digit One-Time Password (OTP) to your Gmail inbox.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#8696a0] mb-1.5">Registered Gmail / Email</label>
                    <div className="relative">
                      <input
                        type="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
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
                    disabled={isSubmitting || !loginEmail.trim()}
                    className="w-full py-2.5 bg-[#00a884] hover:bg-[#008f6f] disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition shadow flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" /> Sending Login Code...
                      </>
                    ) : (
                      <>
                        <KeyRound size={15} /> Send Login Code
                      </>
                    )}
                  </button>

                  <div className="text-center pt-2">
                    <p className="text-xs text-[#8696a0]">
                      Don&apos;t have an account yet?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setTab('register');
                          setFormEmail(loginEmail);
                        }}
                        className="text-[#00a884] font-semibold hover:underline"
                      >
                        Create Account
                      </button>
                    </p>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleVerifyLoginOtp} className="space-y-4">
                  <button
                    type="button"
                    onClick={() => setLoginStep('email')}
                    className="text-xs text-[#8696a0] hover:text-[#00a884] flex items-center gap-1"
                  >
                    <ArrowLeft size={13} /> Change email ({loginEmail})
                  </button>

                  <div className="text-center py-1">
                    <div className="w-12 h-12 rounded-full bg-[#25D366]/15 text-[#25D366] flex items-center justify-center mx-auto mb-2">
                      <Lock size={22} />
                    </div>
                    <h3 className="text-sm font-semibold text-[#e9edef]">Enter 6-Digit Verification Code</h3>
                    <p className="text-xs text-[#8696a0] mt-1">
                      Check your Gmail inbox for code sent to <strong className="text-[#e9edef]">{loginEmail}</strong>
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

                  {/* Resend Code */}
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
                    <label className="block text-xs font-medium text-[#8696a0] mb-1">Username (ID for friends)</label>
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
                    <label className="block text-xs font-medium text-[#8696a0] mb-1">Gmail / Email for OTP</label>
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
                          setLoginEmail(formEmail);
                        }}
                        className="text-[#00a884] font-semibold hover:underline"
                      >
                        Log In with Email OTP
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
                    <h3 className="text-sm font-semibold text-[#e9edef]">Verify Your Account</h3>
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
                        <CheckCircle2 size={15} /> Create Account & Start Chatting
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

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
  Upload
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
  const { allUsers, currentUser, selectUser, registerUser, uploadCustomAvatar, showToast } = useChat();
  const [tab, setTab] = useState('switch'); // 'switch' | 'register'

  // Registration step: 'form' | 'otp'
  const [regStep, setRegStep] = useState('form');

  const [formName, setFormName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formStatus, setFormStatus] = useState('Hey there! I am using WhatsApp.');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_OPTIONS[0]);
  const [customAvatarFile, setCustomAvatarFile] = useState(null);

  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(0);
  const [demoOtp, setDemoOtp] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const otpInputRefs = useRef([]);
  const customAvatarInputRef = useRef(null);
  const profileAvatarInputRef = useRef(null);

  const handleCustomAvatarSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCustomAvatarFile(file);
    const preview = URL.createObjectURL(file);
    setSelectedAvatar(preview);
  };

  const handleDirectAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadCustomAvatar(file);
    } catch (err) {
      console.error('Avatar upload error:', err);
    }
  };

  // Countdown timer for OTP resend
  useEffect(() => {
    let interval = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  if (!isOpen) return null;

  // Step 1: Send OTP to email
  const handleSendOtp = async (e) => {
    e?.preventDefault();
    if (!formName.trim() || !formUsername.trim() || !formEmail.trim()) {
      setErrorMsg('Please enter your full name, username, and valid email.');
      return;
    }

    if (!formEmail.includes('@') || !formEmail.includes('.')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await api.sendOtp(formEmail.trim(), formName.trim(), 'registration');
      setDemoOtp(res.demoOtp || null);
      setResendTimer(60);
      setRegStep('otp');
      showToast(res.message || 'OTP verification code sent!', 'success');
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to send OTP code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Handle 6-digit OTP input keystrokes
  const handleOtpDigitChange = (index, value) => {
    if (value.length > 1) {
      // Handle paste of full 6 digit code
      const pasted = value.replace(/\D/g, '').slice(0, 6).split('');
      const newDigits = [...otpDigits];
      pasted.forEach((char, i) => {
        if (i < 6) newDigits[i] = char;
      });
      setOtpDigits(newDigits);
      const nextIdx = Math.min(pasted.length, 5);
      otpInputRefs.current[nextIdx]?.focus();
      return;
    }

    const digit = value.replace(/\D/g, '');
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);

    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Step 3: Complete verification and registration
  const handleVerifyAndRegister = async (e) => {
    e?.preventDefault();
    const fullOtp = otpDigits.join('');
    if (fullOtp.length < 6) {
      setErrorMsg('Please enter the complete 6-digit OTP code.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      // 1. Verify OTP
      await api.verifyOtp(formEmail.trim(), fullOtp, 'registration');

      // 2. Register User
      const registeredUser = await registerUser({
        name: formName.trim(),
        username: formUsername.trim().toLowerCase(),
        email: formEmail.trim().toLowerCase(),
        otp: fullOtp,
        status_message: formStatus.trim(),
        avatar: customAvatarFile ? '' : selectedAvatar
      });

      // 3. If custom avatar file was chosen, upload it now
      if (customAvatarFile && registeredUser?.id) {
        try {
          await api.uploadAvatar(registeredUser.id, customAvatarFile);
        } catch (e) {
          console.error('Custom avatar upload error:', e);
        }
      }

      confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
      showToast('🎉 Account registered and verified successfully!', 'success');

      // Reset form
      setFormName('');
      setFormUsername('');
      setFormEmail('');
      setCustomAvatarFile(null);
      setOtpDigits(['', '', '', '', '', '']);
      setRegStep('form');
      onClose();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Verification failed. Please check OTP code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFillDemoOtp = () => {
    if (demoOtp && demoOtp.length === 6) {
      setOtpDigits(demoOtp.split(''));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-[#202c33] border border-[#2a3942] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#111b21] border-b border-[#2a3942]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00a884]"></span>
            <h2 className="text-base font-semibold text-[#e9edef]">WhatsApp Account Manager</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-[#8696a0] hover:text-[#e9edef] hover:bg-[#202c33] transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-[#111b21]/60 p-2 gap-2 border-b border-[#2a3942]">
          <button
            onClick={() => {
              setTab('switch');
              setRegStep('form');
              setErrorMsg('');
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
              tab === 'switch'
                ? 'bg-[#00a884] text-white shadow'
                : 'text-[#8696a0] hover:text-[#e9edef] hover:bg-[#202c33]'
            }`}
          >
            <UserCheck size={16} /> Switch User Profile
          </button>
          <button
            onClick={() => {
              setTab('register');
              setErrorMsg('');
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
              tab === 'register'
                ? 'bg-[#00a884] text-white shadow'
                : 'text-[#8696a0] hover:text-[#e9edef] hover:bg-[#202c33]'
            }`}
          >
            <Mail size={16} /> Register with Email OTP
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 flex-1 overflow-y-auto">
          {tab === 'switch' && (
            <div className="space-y-3">
              <input
                type="file"
                ref={profileAvatarInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleDirectAvatarUpload}
              />
              <p className="text-xs text-[#8696a0] mb-3">
                Select an existing registered profile stored in the database:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {allUsers.map((user) => {
                  const isCurrent = currentUser?.id === user.id;

                  return (
                    <div
                      key={user.id}
                      onClick={() => {
                        selectUser(user);
                        onClose();
                      }}
                      className={`p-3 rounded-xl border transition cursor-pointer flex items-center gap-3 ${
                        isCurrent
                          ? 'bg-[#00a884]/20 border-[#00a884] text-white'
                          : 'bg-[#111b21] border-[#2a3942] text-[#e9edef] hover:border-[#00a884]/60 hover:bg-[#182229]'
                      }`}
                    >
                      <div className="relative flex-shrink-0">
                        <img
                          src={user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
                          alt={user.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        {isCurrent && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              profileAvatarInputRef.current?.click();
                            }}
                            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#00a884] text-white flex items-center justify-center hover:bg-[#008f6f] transition shadow border border-[#111b21]"
                            title="Upload new profile picture"
                          >
                            <Camera size={10} />
                          </button>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold truncate">{user.name}</p>
                          {isCurrent && (
                            <span className="text-[10px] bg-[#00a884] text-white font-bold px-1.5 py-0.5 rounded">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#8696a0] truncate">@{user.username}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'register' && (
            <div>
              {/* Step 1: User Profile & Email Input */}
              {regStep === 'form' && (
                <form onSubmit={handleSendOtp} className="space-y-3.5 animate-fade-in">
                  {errorMsg && (
                    <div className="p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-300 text-xs flex items-center gap-2">
                      <ShieldAlert size={16} className="flex-shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[#8696a0] mb-1">Full Name</label>
                      <input
                        type="text"
                        placeholder="e.g. John Doe"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        className="w-full bg-[#111b21] border border-[#2a3942] rounded-lg px-3 py-2 text-sm text-[#e9edef] placeholder-[#8696a0] focus:border-[#00a884] focus:outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#8696a0] mb-1">Username</label>
                      <input
                        type="text"
                        placeholder="e.g. johndoe"
                        value={formUsername}
                        onChange={(e) => setFormUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                        className="w-full bg-[#111b21] border border-[#2a3942] rounded-lg px-3 py-2 text-sm text-[#e9edef] placeholder-[#8696a0] focus:border-[#00a884] focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#8696a0] mb-1 flex items-center gap-1.5">
                      <Mail size={13} className="text-[#00a884]" />
                      <span>Email Address for OTP Verification</span>
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. yourname@gmail.com"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="w-full bg-[#111b21] border border-[#2a3942] rounded-lg px-3 py-2 text-sm text-[#e9edef] placeholder-[#8696a0] focus:border-[#00a884] focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#8696a0] mb-1">About / Status</label>
                    <input
                      type="text"
                      placeholder="Hey there! I am using WhatsApp."
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value)}
                      className="w-full bg-[#111b21] border border-[#2a3942] rounded-lg px-3 py-2 text-sm text-[#e9edef] placeholder-[#8696a0] focus:border-[#00a884] focus:outline-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-[#8696a0]">Profile Picture</label>
                      <button
                        type="button"
                        onClick={() => customAvatarInputRef.current?.click()}
                        className="text-xs text-[#00a884] hover:underline flex items-center gap-1"
                      >
                        <Upload size={12} /> Upload Custom Photo
                      </button>
                    </div>

                    <input
                      type="file"
                      ref={customAvatarInputRef}
                      accept="image/*"
                      className="hidden"
                      onChange={handleCustomAvatarSelected}
                    />

                    <div className="flex items-center gap-2.5 overflow-x-auto py-1">
                      {customAvatarFile && (
                        <div className="relative">
                          <img
                            src={selectedAvatar}
                            alt="Custom uploaded avatar"
                            className="w-10 h-10 rounded-full object-cover ring-2 ring-[#00a884] scale-110 shadow"
                          />
                          <span className="absolute -top-1 -right-1 bg-[#00a884] text-white text-[9px] px-1 rounded-full font-bold">
                            Custom
                          </span>
                        </div>
                      )}

                      {AVATAR_OPTIONS.map((av, idx) => (
                        <img
                          key={idx}
                          src={av}
                          alt="Avatar option"
                          onClick={() => {
                            setSelectedAvatar(av);
                            setCustomAvatarFile(null);
                          }}
                          className={`w-10 h-10 rounded-full object-cover cursor-pointer transition ring-2 ${
                            selectedAvatar === av && !customAvatarFile ? 'ring-[#00a884] scale-110' : 'ring-transparent opacity-60 hover:opacity-100'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full mt-2 py-2.5 bg-[#00a884] hover:bg-[#008f6f] text-white font-semibold text-sm rounded-lg transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <span>Sending OTP code...</span>
                    ) : (
                      <>
                        <KeyRound size={16} />
                        <span>Send 6-Digit Email OTP</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Step 2: 6-Digit OTP Verification Screen */}
              {regStep === 'otp' && (
                <div className="space-y-4 animate-fade-in text-center">
                  <div className="w-12 h-12 rounded-full bg-[#00a884]/20 text-[#00a884] flex items-center justify-center mx-auto mb-1">
                    <KeyRound size={24} />
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-[#e9edef]">Enter Verification Code</h3>
                    <p className="text-xs text-[#8696a0] mt-1">
                      We sent a 6-digit OTP to <strong className="text-[#00a884]">{formEmail}</strong>
                    </p>
                  </div>

                  {errorMsg && (
                    <div className="p-2.5 bg-red-900/30 border border-red-500/50 rounded-lg text-red-300 text-xs flex items-center justify-center gap-2">
                      <ShieldAlert size={15} />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {/* Dev mode / Demo OTP Helper */}
                  {demoOtp && (
                    <div
                      onClick={handleFillDemoOtp}
                      className="p-2.5 bg-[#182229] border border-[#00a884]/40 rounded-lg text-xs text-[#00a884] cursor-pointer hover:bg-[#202c33] transition flex items-center justify-center gap-2"
                    >
                      <Sparkles size={14} />
                      <span>Dev Mode: Click to auto-fill code <strong>{demoOtp}</strong></span>
                    </div>
                  )}

                  {/* 6-Digit Pin Input Boxes */}
                  <div className="flex items-center justify-center gap-2 sm:gap-3 my-4">
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => (otpInputRefs.current[idx] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={digit}
                        onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        className="w-11 h-12 sm:w-12 sm:h-14 bg-[#111b21] border-2 border-[#2a3942] focus:border-[#00a884] text-center text-xl font-bold text-[#25D366] rounded-xl focus:outline-none transition shadow-inner font-mono"
                      />
                    ))}
                  </div>

                  <button
                    onClick={handleVerifyAndRegister}
                    disabled={isSubmitting || otpDigits.join('').length < 6}
                    className={`w-full py-2.5 rounded-lg font-semibold text-sm transition shadow-lg flex items-center justify-center gap-2 ${
                      otpDigits.join('').length === 6
                        ? 'bg-[#00a884] hover:bg-[#008f6f] text-white cursor-pointer'
                        : 'bg-[#2a3942] text-[#8696a0] cursor-not-allowed opacity-60'
                    }`}
                  >
                    {isSubmitting ? (
                      <span>Verifying & Activating...</span>
                    ) : (
                      <>
                        <CheckCircle2 size={16} />
                        <span>Verify & Enter WhatsApp</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between text-xs text-[#8696a0] pt-2">
                    <button
                      onClick={() => setRegStep('form')}
                      className="flex items-center gap-1 hover:text-[#e9edef] transition"
                    >
                      <ArrowLeft size={13} /> Change Email
                    </button>

                    {resendTimer > 0 ? (
                      <span className="text-[#8696a0]">Resend OTP in {resendTimer}s</span>
                    ) : (
                      <button
                        onClick={handleSendOtp}
                        className="text-[#00a884] hover:underline font-medium"
                      >
                        Resend OTP Code
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserSwitcherModal;

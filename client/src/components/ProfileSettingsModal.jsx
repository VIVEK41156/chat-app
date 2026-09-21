import React, { useState, useRef } from 'react';
import { useChat } from '../context/ChatContext';
import {
  X,
  Camera,
  Pencil,
  Check,
  User,
  Info,
  Mail,
  AtSign,
  LogOut,
  Sparkles,
  ShieldCheck,
  Upload
} from 'lucide-react';

const PRESET_STATUSES = [
  'Hey there! I am using WhatsApp.',
  'Available',
  'Busy',
  'At work',
  'In a meeting',
  'At the gym',
  'Sleeping',
  'Urgent calls only',
  'Battery about to die 🔋'
];

export const ProfileSettingsModal = ({ isOpen, onClose, onOpenAuthModal }) => {
  const { currentUser, updateProfile, uploadCustomAvatar, logout, showToast } = useChat();

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');

  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [statusInput, setStatusInput] = useState('');

  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef(null);

  if (!isOpen || !currentUser) return null;

  const handleStartEditName = () => {
    setNameInput(currentUser.name || '');
    setIsEditingName(true);
  };

  const handleSaveName = async () => {
    if (!nameInput.trim()) return;
    setIsSaving(true);
    try {
      await updateProfile({ name: nameInput.trim() });
      setIsEditingName(false);
      showToast('Name updated successfully', 'success');
    } catch (err) {
      showToast('Failed to update name', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartEditStatus = () => {
    setStatusInput(currentUser.status_message || '');
    setIsEditingStatus(true);
  };

  const handleSaveStatus = async (customText = null) => {
    const textToSave = customText !== null ? customText : statusInput.trim();
    if (!textToSave) return;
    setIsSaving(true);
    try {
      await updateProfile({ status_message: textToSave });
      setIsEditingStatus(false);
      showToast('About status updated', 'success');
    } catch (err) {
      showToast('Failed to update status', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      await uploadCustomAvatar(file);
      showToast('Profile picture updated!', 'success');
    } catch (err) {
      showToast('Failed to upload picture', 'error');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleLogout = () => {
    onClose();
    logout();
    if (onOpenAuthModal) onOpenAuthModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-sm animate-fade-in select-none">
      <div className="bg-[#111b21] border border-[#2a3942] rounded-2xl max-w-md w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-slide-up sm:animate-none">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#202c33] border-b border-[#2a3942]">
          <div className="flex items-center gap-2.5">
            <User size={18} className="text-[#00a884]" />
            <h2 className="text-base font-semibold text-[#e9edef]">Profile Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#8696a0] hover:text-[#e9edef] hover:bg-[#2a3942] transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center justify-center">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleAvatarFileChange}
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative cursor-pointer group"
              title="Click to Change Profile Picture"
            >
              <img
                src={currentUser.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=me'}
                alt={currentUser.name}
                className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full object-cover ring-4 ring-[#00a884]/40 shadow-xl transition group-hover:opacity-85 ${
                  isUploading ? 'animate-pulse' : ''
                }`}
              />
              <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition text-xs font-semibold gap-1">
                <Camera size={22} />
                <span>Change Photo</span>
              </div>
            </div>
            <p className="text-[11px] text-[#8696a0] mt-2.5 flex items-center gap-1.5">
              <Upload size={12} className="text-[#00a884]" /> Tap image to upload photo from your device
            </p>
          </div>

          {/* Name Section */}
          <div className="bg-[#202c33] p-4 rounded-xl border border-[#2a3942] space-y-2">
            <span className="text-[11px] font-semibold text-[#00a884] uppercase tracking-wider block">
              Your Name
            </span>

            {isEditingName ? (
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  maxLength={35}
                  autoFocus
                  className="flex-1 bg-[#111b21] text-[#e9edef] text-sm px-3 py-1.5 rounded-lg border border-[#00a884] focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') setIsEditingName(false);
                  }}
                />
                <button
                  disabled={isSaving || !nameInput.trim()}
                  onClick={handleSaveName}
                  className="p-2 bg-[#00a884] hover:bg-[#008f6f] text-white rounded-lg transition disabled:opacity-50"
                  title="Save Name"
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={() => setIsEditingName(false)}
                  className="p-2 bg-[#111b21] text-[#8696a0] hover:text-white rounded-lg transition"
                  title="Cancel"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between group">
                <span className="text-sm font-semibold text-[#e9edef]">{currentUser.name}</span>
                <button
                  onClick={handleStartEditName}
                  className="p-1.5 text-[#8696a0] hover:text-[#00a884] hover:bg-[#111b21] rounded-lg transition"
                  title="Edit Name"
                >
                  <Pencil size={15} />
                </button>
              </div>
            )}
            <p className="text-[11px] text-[#8696a0] leading-relaxed">
              This is not your username or pin. This name will be visible to your WhatsApp contacts.
            </p>
          </div>

          {/* About / Status Section */}
          <div className="bg-[#202c33] p-4 rounded-xl border border-[#2a3942] space-y-2">
            <span className="text-[11px] font-semibold text-[#00a884] uppercase tracking-wider block">
              About / Status
            </span>

            {isEditingStatus ? (
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  value={statusInput}
                  onChange={(e) => setStatusInput(e.target.value)}
                  maxLength={70}
                  autoFocus
                  className="flex-1 bg-[#111b21] text-[#e9edef] text-sm px-3 py-1.5 rounded-lg border border-[#00a884] focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveStatus();
                    if (e.key === 'Escape') setIsEditingStatus(false);
                  }}
                />
                <button
                  disabled={isSaving || !statusInput.trim()}
                  onClick={() => handleSaveStatus()}
                  className="p-2 bg-[#00a884] hover:bg-[#008f6f] text-white rounded-lg transition disabled:opacity-50"
                  title="Save Status"
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={() => setIsEditingStatus(false)}
                  className="p-2 bg-[#111b21] text-[#8696a0] hover:text-white rounded-lg transition"
                  title="Cancel"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between group">
                <span className="text-sm text-[#e9edef]">{currentUser.status_message || 'Hey there! I am using WhatsApp.'}</span>
                <button
                  onClick={handleStartEditStatus}
                  className="p-1.5 text-[#8696a0] hover:text-[#00a884] hover:bg-[#111b21] rounded-lg transition"
                  title="Edit Status"
                >
                  <Pencil size={15} />
                </button>
              </div>
            )}

            {/* Quick Status Presets */}
            <div className="pt-2 border-t border-[#2a3942]/60">
              <span className="text-[10px] text-[#8696a0] block mb-1.5 uppercase font-medium">Select a preset:</span>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_STATUSES.slice(0, 5).map((preset) => (
                  <button
                    key={preset}
                    onClick={() => handleSaveStatus(preset)}
                    className="text-[11px] bg-[#111b21] hover:bg-[#00a884]/20 hover:text-[#00a884] text-[#aebac1] px-2.5 py-1 rounded-full border border-[#2a3942] transition"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Account Details (Email & Username) */}
          <div className="bg-[#202c33] p-4 rounded-xl border border-[#2a3942] space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#8696a0]">
                <Mail size={15} className="text-[#00a884]" />
                <span>Registered Email</span>
              </div>
              <div className="flex items-center gap-1 text-[#e9edef] font-medium">
                <span>{currentUser.email || 'None'}</span>
                <ShieldCheck size={14} className="text-[#25D366]" title="Verified via Gmail OTP" />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#2a3942]/60">
              <div className="flex items-center gap-2 text-[#8696a0]">
                <AtSign size={15} className="text-[#00a884]" />
                <span>Username</span>
              </div>
              <span className="text-[#e9edef] font-mono">@{currentUser.username}</span>
            </div>
          </div>

          {/* Log Out Button */}
          <div className="pt-2">
            <button
              onClick={handleLogout}
              className="w-full py-2.5 px-4 bg-red-500/10 hover:bg-red-500/20 text-[#ff5b5b] border border-red-500/20 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 shadow"
            >
              <LogOut size={16} />
              <span>Log Out of this Account</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettingsModal;

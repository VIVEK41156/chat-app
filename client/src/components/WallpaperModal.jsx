import React, { useState } from 'react';
import { useChat } from '../context/ChatContext';
import { X, Check, Image as ImageIcon, Sparkles } from 'lucide-react';

export const WALLPAPER_PRESETS = [
  {
    id: 'doodle_dark',
    name: 'WhatsApp Doodle (Dark)',
    type: 'preset',
    className: 'whatsapp-chat-bg bg-[#0b141a]',
    previewBg: '#0b141a'
  },
  {
    id: 'doodle_light',
    name: 'WhatsApp Classic (Light)',
    type: 'preset',
    className: 'bg-[#efeae2] text-[#111b21]',
    previewBg: '#efeae2'
  },
  {
    id: 'emerald',
    name: 'Emerald Forest',
    type: 'preset',
    className: 'bg-gradient-to-b from-[#064e3b] to-[#022c22]',
    previewBg: '#064e3b'
  },
  {
    id: 'midnight',
    name: 'Midnight Navy',
    type: 'preset',
    className: 'bg-gradient-to-b from-[#0f172a] to-[#020617]',
    previewBg: '#0f172a'
  },
  {
    id: 'royal_purple',
    name: 'Royal Purple',
    type: 'preset',
    className: 'bg-gradient-to-b from-[#3b0764] to-[#1e1b4b]',
    previewBg: '#3b0764'
  },
  {
    id: 'warm_charcoal',
    name: 'Warm Charcoal',
    type: 'preset',
    className: 'bg-[#18181b]',
    previewBg: '#18181b'
  }
];

export const WallpaperModal = ({ isOpen, onClose }) => {
  const { chatWallpaper, setChatWallpaper, showToast } = useChat();
  const [selectedId, setSelectedId] = useState(chatWallpaper?.id || 'doodle_dark');
  const [customUrl, setCustomUrl] = useState(chatWallpaper?.customUrl || '');

  if (!isOpen) return null;

  const handleApply = (preset) => {
    setSelectedId(preset.id);
    setChatWallpaper(preset);
    showToast(`Chat wallpaper changed to ${preset.name}`, 'success');
    onClose();
  };

  const handleApplyCustom = (e) => {
    e.preventDefault();
    if (!customUrl.trim()) return;

    const customPreset = {
      id: 'custom_url',
      name: 'Custom Wallpaper',
      type: 'custom',
      customUrl: customUrl.trim(),
      style: {
        backgroundImage: `url(${customUrl.trim()})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }
    };
    setSelectedId('custom_url');
    setChatWallpaper(customPreset);
    showToast('Custom wallpaper applied!', 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#202c33] border border-[#2a3942] rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#2a3942] pb-3">
          <div className="flex items-center gap-2 text-[#00a884]">
            <Sparkles size={20} />
            <h3 className="text-base font-semibold text-[#e9edef]">Chat Wallpaper</h3>
          </div>
          <button onClick={onClose} className="text-[#8696a0] hover:text-white">
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-[#8696a0]">
          Choose a theme or custom image wallpaper for your WhatsApp chat background:
        </p>

        {/* Preset grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {WALLPAPER_PRESETS.map((preset) => (
            <div
              key={preset.id}
              onClick={() => handleApply(preset)}
              className={`h-28 rounded-xl border-2 cursor-pointer transition flex flex-col items-center justify-between p-2 shadow relative overflow-hidden group ${
                selectedId === preset.id
                  ? 'border-[#00a884] ring-2 ring-[#00a884]/40 scale-105'
                  : 'border-[#2a3942] hover:border-[#00a884]/50'
              }`}
              style={{ backgroundColor: preset.previewBg }}
            >
              <span className="text-[10px] font-semibold text-white/90 bg-black/50 px-2 py-0.5 rounded-full z-10 truncate max-w-[110px]">
                {preset.name}
              </span>

              {selectedId === preset.id && (
                <div className="w-6 h-6 rounded-full bg-[#00a884] text-white flex items-center justify-center shadow-lg z-10">
                  <Check size={14} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Custom Image URL */}
        <div className="border-t border-[#2a3942] pt-3">
          <label className="block text-xs font-medium text-[#8696a0] mb-1 flex items-center gap-1.5">
            <ImageIcon size={13} className="text-[#00a884]" />
            <span>Or paste Custom Image URL</span>
          </label>
          <form onSubmit={handleApplyCustom} className="flex gap-2">
            <input
              type="url"
              placeholder="https://images.unsplash.com/photo-..."
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              className="flex-1 bg-[#111b21] border border-[#2a3942] rounded-lg px-3 py-1.5 text-xs text-[#e9edef] placeholder-[#8696a0] focus:border-[#00a884] focus:outline-none"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-[#00a884] hover:bg-[#008f6f] text-white text-xs font-semibold rounded-lg transition shadow"
            >
              Apply
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default WallpaperModal;

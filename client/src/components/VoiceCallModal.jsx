import React, { useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import {
  Phone,
  PhoneOff,
  PhoneIncoming,
  PhoneOutgoing,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Lock,
  User
} from 'lucide-react';

export const VoiceCallModal = () => {
  const {
    callState,
    activeCall,
    callDuration,
    isMuted,
    isSpeakerOn,
    acceptVoiceCall,
    rejectVoiceCall,
    endVoiceCall,
    toggleMute,
    toggleSpeaker,
    remoteAudioRef
  } = useChat();

  const isIncoming = callState === 'incoming';
  const isOutgoing = callState === 'outgoing';
  const isConnected = callState === 'connected';
  const isCallActive = callState !== 'idle' && activeCall;

  return (
    <>
      {/* Hidden WebRTC Remote Audio Stream - Permanently mounted so audio stream is never interrupted */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        className="hidden"
      />

      {isCallActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in select-none">
          <div className="relative w-full max-w-sm bg-[#111b21] border border-[#2a3942] rounded-3xl p-6 shadow-2xl flex flex-col items-center justify-between min-h-[480px] overflow-hidden">
            {/* Ambient background glow */}
            <div className="absolute -top-24 -left-24 w-60 h-60 bg-[#00a884]/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-[#25D366]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top Encrypted Call Notice */}
        <div className="flex items-center gap-1.5 text-[11px] text-[#00a884] bg-[#182229] border border-[#00a884]/30 px-3.5 py-1.5 rounded-full shadow z-10">
          <Lock size={12} />
          <span>End-to-end encrypted voice call</span>
        </div>

        {/* Center Contact & Avatar with Ringing Animation */}
        <div className="flex flex-col items-center text-center my-auto z-10 space-y-4">
          <div className="relative flex items-center justify-center">
            {/* Animated Pulsing Wave Rings during ringing */}
            {(isIncoming || isOutgoing) && (
              <>
                <div className="absolute w-32 h-32 rounded-full bg-[#00a884]/30 animate-ping" style={{ animationDuration: '2.5s' }} />
                <div className="absolute w-40 h-40 rounded-full bg-[#00a884]/15 animate-pulse" />
              </>
            )}

            <img
              src={activeCall.contactAvatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=friend'}
              alt={activeCall.contactName}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover ring-4 ring-[#00a884] shadow-2xl relative z-10 bg-[#202c33]"
            />
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-bold text-[#e9edef] tracking-wide">
              {activeCall.contactName}
            </h3>
            
            {/* Dynamic Status / Duration Timer */}
            {isIncoming && (
              <p className="text-sm font-semibold text-[#25D366] flex items-center justify-center gap-1.5 animate-pulse">
                <PhoneIncoming size={15} /> Incoming WhatsApp Call...
              </p>
            )}

            {isOutgoing && (
              <p className="text-sm text-[#8696a0] flex items-center justify-center gap-1.5">
                <PhoneOutgoing size={15} className="text-[#00a884]" /> Calling...
              </p>
            )}

            {isConnected && (
              <div className="flex flex-col items-center gap-1.5">
                <p className="text-base font-bold text-[#25D366] font-mono tracking-wider">
                  {callDuration}
                </p>
                {/* Real-time Audio Waveform Equalizer Animation */}
                <div className="flex items-center gap-1 h-4">
                  <span className="w-1 bg-[#00a884] rounded-full animate-pulse h-3" />
                  <span className="w-1 bg-[#25D366] rounded-full animate-pulse h-4" style={{ animationDelay: '0.2s' }} />
                  <span className="w-1 bg-[#00a884] rounded-full animate-pulse h-2" style={{ animationDelay: '0.4s' }} />
                  <span className="w-1 bg-[#25D366] rounded-full animate-pulse h-4" style={{ animationDelay: '0.1s' }} />
                  <span className="w-1 bg-[#00a884] rounded-full animate-pulse h-3" style={{ animationDelay: '0.3s' }} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Call Control Action Buttons */}
        <div className="w-full z-10 pt-4 border-t border-[#2a3942]/60">
          {/* 1. Incoming Call Controls: Accept or Decline */}
          {isIncoming && (
            <div className="flex items-center justify-around">
              <button
                onClick={rejectVoiceCall}
                className="flex flex-col items-center gap-1.5 group"
                title="Decline Call"
              >
                <div className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-xl transition transform group-hover:scale-110">
                  <PhoneOff size={24} />
                </div>
                <span className="text-xs text-[#8696a0] group-hover:text-red-400 font-medium">Decline</span>
              </button>

              <button
                onClick={acceptVoiceCall}
                className="flex flex-col items-center gap-1.5 group"
                title="Accept Call"
              >
                <div className="w-14 h-14 rounded-full bg-[#25D366] hover:bg-[#20ba59] text-white flex items-center justify-center shadow-xl transition transform group-hover:scale-110 animate-bounce">
                  <Phone size={24} />
                </div>
                <span className="text-xs text-[#8696a0] group-hover:text-[#25D366] font-medium">Accept</span>
              </button>
            </div>
          )}

          {/* 2. Outgoing & Connected Call Controls */}
          {(isOutgoing || isConnected) && (
            <div className="flex items-center justify-around">
              {/* Mute Mic */}
              <button
                onClick={toggleMute}
                className="flex flex-col items-center gap-1.5 group"
                title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition transform group-hover:scale-105 ${
                  isMuted ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-[#202c33] text-[#e9edef] hover:bg-[#2a3942]'
                }`}>
                  {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                </div>
                <span className="text-[11px] text-[#8696a0]">{isMuted ? 'Muted' : 'Mute'}</span>
              </button>

              {/* End Call Button */}
              <button
                onClick={endVoiceCall}
                className="flex flex-col items-center gap-1.5 group"
                title="End Call"
              >
                <div className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-2xl transition transform group-hover:scale-110">
                  <PhoneOff size={24} />
                </div>
                <span className="text-xs text-red-400 font-semibold">End Call</span>
              </button>

              {/* Speaker / Earpiece Toggle */}
              <button
                onClick={toggleSpeaker}
                className="flex flex-col items-center gap-1.5 group"
                title={isSpeakerOn ? 'Switch to Earpiece Handset' : 'Switch to Loudspeaker'}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition transform group-hover:scale-105 ${
                  isSpeakerOn ? 'bg-[#00a884]/20 text-[#00a884] border border-[#00a884]/40' : 'bg-[#202c33] text-[#e9edef] hover:bg-[#2a3942]'
                }`}>
                  {isSpeakerOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
                </div>
                <span className="text-[11px] text-[#8696a0]">{isSpeakerOn ? 'Speaker' : 'Earpiece'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )}
</>
  );
};

export default VoiceCallModal;

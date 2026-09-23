import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../context/ChatContext';
import {
  MonitorOff,
  Maximize2,
  Volume2,
  VolumeX,
  X,
  Tv,
  Music,
  Radio,
  ExternalLink,
  Sparkles,
  Loader2,
  MessageSquare,
  Volume1
} from 'lucide-react';

export const ScreenShareModal = () => {
  const {
    screenShareState,
    activeScreenShare,
    screenRemoteStream,
    screenLocalStream,
    stopScreenShare,
    screenAudioVolume,
    setScreenAudioVolume,
    isScreenAudioMuted,
    toggleScreenAudioMute
  } = useChat();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [audioAutoplayBlocked, setAudioAutoplayBlocked] = useState(false);
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const audioRef = useRef(null);

  const isSharing = screenShareState === 'sharing';
  const isReceiving = screenShareState === 'receiving';
  const isActive = (isSharing || isReceiving) && Boolean(activeScreenShare);

  const currentStream = isSharing ? screenLocalStream : screenRemoteStream;

  // Reactively attach the active MediaStream to the video and audio elements
  useEffect(() => {
    const videoEl = videoRef.current;
    const audioEl = audioRef.current;
    if (!videoEl || !isActive) return;

    if (currentStream) {
      console.log('[ScreenShareModal] Attaching stream:', currentStream.id, 'Tracks:', currentStream.getTracks());
      
      if (videoEl.srcObject !== currentStream) {
        videoEl.srcObject = currentStream;
      }
      videoEl.muted = true; // Video element is always muted so mobile autoplay policies never block video frames
      
      const playVideo = () => {
        videoEl.play().catch((err) => {
          console.warn('[ScreenShareModal] Video play catch:', err);
        });
      };
      playVideo();

      // For receiver: attach audio to dedicated audio element
      if (audioEl && !isSharing) {
        if (audioEl.srcObject !== currentStream) {
          audioEl.srcObject = currentStream;
        }
        audioEl.volume = isScreenAudioMuted ? 0 : screenAudioVolume;
        
        audioEl.play()
          .then(() => {
            setAudioAutoplayBlocked(false);
          })
          .catch((err) => {
            console.warn('[ScreenShareModal] Audio auto-play policy catch (requires user gesture):', err);
            if (activeScreenShare?.hasAudio) {
              setAudioAutoplayBlocked(true);
            }
          });
      }
    } else {
      videoEl.srcObject = null;
      if (audioEl) audioEl.srcObject = null;
    }
  }, [currentStream, isSharing, isReceiving, isScreenAudioMuted, screenAudioVolume, isActive, activeScreenShare?.hasAudio]);

  // Sync audio volume changes
  useEffect(() => {
    if (audioRef.current && !isSharing) {
      audioRef.current.volume = isScreenAudioMuted ? 0 : screenAudioVolume;
    }
  }, [screenAudioVolume, isScreenAudioMuted, isSharing]);

  const handleUnblockAudio = () => {
    if (audioRef.current && !isSharing) {
      audioRef.current.play()
        .then(() => {
          setAudioAutoplayBlocked(false);
        })
        .catch((e) => console.warn('Unblock audio error:', e));
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const togglePiP = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (video.requestPictureInPicture) {
        await video.requestPictureInPicture();
      }
    } catch (e) {
      console.warn('PiP error:', e);
    }
  };

  if (!isActive) return null;

  return (
    <div
      ref={containerRef}
      className={
        isMinimized
          ? 'fixed z-50 bottom-20 right-3 sm:bottom-24 sm:right-6 w-56 sm:w-80 aspect-video rounded-2xl shadow-2xl border-2 border-[#00a884] bg-[#111b21] overflow-hidden flex flex-col animate-fade-in select-none group'
          : isFullscreen
          ? 'fixed inset-0 z-50 w-screen h-screen bg-black flex flex-col justify-between select-none'
          : 'fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-0 sm:p-6 select-none'
      }
    >
      {/* Hidden Audio Receiver Element - Always mounted */}
      <audio ref={audioRef} autoPlay playsInline className="hidden" />

      <div
        className={
          isMinimized
            ? 'relative w-full h-full flex flex-col bg-[#111b21] overflow-hidden'
            : isFullscreen
            ? 'relative w-full h-full flex flex-col bg-[#111b21]'
            : 'relative w-full max-w-5xl h-[100dvh] sm:h-[85vh] max-h-[820px] flex flex-col bg-[#111b21] border-0 sm:border border-[#2a3942] rounded-none sm:rounded-3xl shadow-2xl overflow-hidden'
        }
      >
        {/* Minimized Mini Top Header */}
        {isMinimized && (
          <div className="absolute top-0 inset-x-0 bg-black/80 backdrop-blur-sm px-2.5 py-1.5 flex items-center justify-between z-20 text-xs border-b border-white/10 opacity-90 group-hover:opacity-100 transition">
            <div className="flex items-center gap-1.5 min-w-0">
              <Radio size={12} className="text-[#00a884] animate-pulse flex-shrink-0" />
              <span className="text-[11px] font-semibold text-[#e9edef] truncate max-w-[90px] sm:max-w-[150px]">
                {isSharing ? 'My Screen' : `${activeScreenShare?.peerName}'s Screen`}
              </span>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {!isSharing && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleScreenAudioMute();
                  }}
                  className="p-1 rounded-md hover:bg-white/20 text-[#8696a0] hover:text-[#00a884] transition"
                  title={isScreenAudioMuted ? 'Unmute Audio' : 'Mute Audio'}
                >
                  {isScreenAudioMuted || screenAudioVolume === 0 ? <VolumeX size={13} /> : <Volume2 size={13} />}
                </button>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMinimized(false);
                }}
                className="p-1 rounded-md bg-[#00a884]/30 hover:bg-[#00a884]/60 text-[#00a884] hover:text-white transition"
                title="Expand to Full View"
              >
                <Maximize2 size={13} />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  stopScreenShare();
                }}
                className="p-1 rounded-md bg-red-600/70 hover:bg-red-600 text-white transition"
                title="Stop Sharing"
              >
                <X size={13} />
              </button>
            </div>
          </div>
        )}

        {/* Maximized Top Screen Share Header */}
        {!isMinimized && (
          <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 bg-[#202c33] border-b border-[#2a3942] z-10 flex-shrink-0">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#00a884]/20 text-[#00a884] flex items-center justify-center flex-shrink-0">
                <Tv size={18} />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-xs sm:text-sm font-bold text-[#e9edef] truncate max-w-[120px] xs:max-w-[200px] sm:max-w-[320px]">
                    {isSharing
                      ? `Sharing screen with ${activeScreenShare?.peerName}`
                      : `${activeScreenShare?.peerName}'s Live Screen`}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] bg-[#00a884]/20 text-[#00a884] px-2 py-0.5 rounded-full font-semibold border border-[#00a884]/30 flex-shrink-0">
                    <Radio size={10} className="animate-pulse" /> LIVE
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-[#8696a0]">
                  {activeScreenShare?.hasAudio ? (
                    <span className="flex items-center gap-1 text-[#25D366]">
                      <Music size={12} /> System Audio Active
                    </span>
                  ) : (
                    <span>Real-time Screen Stream</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Pop-up & Chat Mode Button */}
              <button
                onClick={() => setIsMinimized(true)}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#00a884]/20 hover:bg-[#00a884]/30 text-[#00a884] hover:text-[#25D366] border border-[#00a884]/40 text-xs font-semibold transition active:scale-95"
                title="Pop-up view: Continue chatting while viewing stream"
              >
                <MessageSquare size={15} />
                <span className="hidden xs:inline">Chat / Pop-up</span>
                <span className="xs:hidden">Chat</span>
              </button>

              {!isSharing && (
                <div className="hidden sm:flex items-center gap-1.5 bg-[#111b21] px-2.5 py-1 rounded-full border border-[#2a3942]">
                  <button
                    onClick={toggleScreenAudioMute}
                    className="text-[#8696a0] hover:text-[#00a884] transition"
                    title={isScreenAudioMuted ? 'Unmute Video Audio' : 'Mute Video Audio'}
                  >
                    {isScreenAudioMuted || screenAudioVolume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isScreenAudioMuted ? 0 : screenAudioVolume}
                    onChange={(e) => {
                      setScreenAudioVolume(parseFloat(e.target.value));
                      if (isScreenAudioMuted) toggleScreenAudioMute();
                    }}
                    className="w-16 sm:w-20 accent-[#00a884] h-1 bg-[#2a3942] rounded-lg cursor-pointer"
                    title={`Volume: ${Math.round(screenAudioVolume * 100)}%`}
                  />
                </div>
              )}

              <button
                onClick={togglePiP}
                className="p-1.5 rounded-lg text-[#8696a0] hover:text-[#e9edef] hover:bg-[#2a3942] transition hidden md:flex items-center justify-center"
                title="Picture-in-Picture"
              >
                <ExternalLink size={16} />
              </button>

              <button
                onClick={toggleFullscreen}
                className="p-1.5 rounded-lg text-[#8696a0] hover:text-[#e9edef] hover:bg-[#2a3942] transition hidden sm:flex items-center justify-center"
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              >
                <Maximize2 size={16} />
              </button>

              <button
                onClick={stopScreenShare}
                className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold shadow transition transform active:scale-95"
                title="Stop Sharing"
              >
                <MonitorOff size={14} />
                <span>{isSharing ? 'Stop' : 'Leave'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Center Main Screen Video Viewport */}
        <div
          className={`relative flex-1 bg-black flex items-center justify-center overflow-hidden ${
            isMinimized ? 'cursor-pointer' : ''
          }`}
          onClick={() => {
            if (isMinimized) {
              setIsMinimized(false);
            } else {
              handleUnblockAudio();
            }
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            webkit-playsinline="true"
            muted={true}
            onLoadedMetadata={(e) => {
              e.currentTarget.play().catch(() => {});
            }}
            onCanPlay={(e) => {
              e.currentTarget.play().catch(() => {});
            }}
            className="w-full h-full object-contain pointer-events-none"
          />

          {/* Audio Tap to Enable Alert on Mobile */}
          {!isMinimized && isReceiving && audioAutoplayBlocked && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                handleUnblockAudio();
              }}
              className="absolute top-4 inset-x-4 sm:inset-x-auto sm:right-4 z-30 bg-[#00a884] hover:bg-[#008f6f] text-white px-4 py-2.5 rounded-2xl shadow-2xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer border border-white/20 animate-bounce"
            >
              <Volume1 size={18} />
              <span>Tap here to enable live screen sound</span>
            </div>
          )}

          {/* Quick Click-to-Expand Hint for Minimized Mode */}
          {isMinimized && (
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-medium gap-1.5 pointer-events-none">
              <Maximize2 size={14} />
              <span>Tap to expand</span>
            </div>
          )}

          {/* Connection / Stream loading indicator for receiver if stream has not arrived */}
          {!isMinimized && isReceiving && !currentStream && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#111b21]/90 text-[#e9edef] z-20">
              <Loader2 size={36} className="text-[#00a884] animate-spin" />
              <p className="text-sm font-medium">Connecting to {activeScreenShare?.peerName}&apos;s stream...</p>
              <p className="text-xs text-[#8696a0]">Establishing end-to-end WebRTC peer link</p>
            </div>
          )}

          {/* Presenter Status Overlay Badge */}
          {!isMinimized && isSharing && (
            <div className="absolute bottom-4 left-4 bg-black/75 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-xl text-xs text-white flex items-center gap-2 shadow z-10">
              <span className="w-2 h-2 rounded-full bg-[#25D366] animate-ping" />
              <span>You are sharing your screen</span>
            </div>
          )}

          {/* Receiver Audio Playback Badge */}
          {!isMinimized && isReceiving && activeScreenShare?.hasAudio && !audioAutoplayBlocked && (
            <div className="absolute bottom-4 left-4 bg-black/75 backdrop-blur-md border border-[#00a884]/30 px-3 py-1.5 rounded-xl text-xs text-[#00a884] flex items-center gap-2 shadow z-10">
              <Music size={14} className="animate-bounce" />
              <span>Sound is playing through your speakers</span>
              <div className="flex items-center gap-0.5 h-3">
                <span className="w-0.5 bg-[#00a884] rounded-full animate-pulse h-2" />
                <span className="w-0.5 bg-[#25D366] rounded-full animate-pulse h-3" style={{ animationDelay: '0.15s' }} />
                <span className="w-0.5 bg-[#00a884] rounded-full animate-pulse h-2.5" style={{ animationDelay: '0.3s' }} />
              </div>
            </div>
          )}
        </div>

        {/* Bottom Helpful Tip Banner */}
        {!isMinimized && isSharing && (
          <div className="bg-[#182229] px-4 py-2 border-t border-[#2a3942]/60 flex items-center justify-between text-[11px] text-[#8696a0]">
            <div className="flex items-center gap-1.5">
              <Sparkles size={13} className="text-[#00a884]" />
              <span>
                Tip: Tap <strong>Chat / Pop-up</strong> to keep chatting with {activeScreenShare?.peerName} while sharing!
              </span>
            </div>
            <button
              onClick={stopScreenShare}
              className="text-red-400 hover:underline font-semibold"
            >
              End Session
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScreenShareModal;

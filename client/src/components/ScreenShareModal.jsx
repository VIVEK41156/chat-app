import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../context/ChatContext';
import {
  MonitorUp,
  MonitorOff,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  X,
  Tv,
  Music,
  Radio,
  ExternalLink,
  Sparkles,
  Loader2,
  Camera,
  SwitchCamera
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
    toggleScreenAudioMute,
    flipCamera,
    currentFacingMode
  } = useChat();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const audioRef = useRef(null);

  const isSharing = screenShareState === 'sharing';
  const isReceiving = screenShareState === 'receiving';
  const isActive = (isSharing || isReceiving) && activeScreenShare;

  // Reactively attach the active MediaStream to the video and audio elements
  useEffect(() => {
    const videoEl = videoRef.current;
    const audioEl = audioRef.current;
    if (!videoEl) return;

    const stream = isSharing ? screenLocalStream : screenRemoteStream;

    if (stream) {
      console.log('[ScreenShareModal] Attaching stream:', stream.id, 'Tracks:', stream.getTracks());
      
      // Attach to video element
      videoEl.srcObject = stream;
      videoEl.muted = true; // Video element is always muted so mobile autoplay policies never block video frames
      
      const playVideo = () => {
        videoEl.play().catch((err) => {
          console.warn('[ScreenShareModal] Video play error:', err);
        });
      };
      playVideo();

      // For receiver: attach audio to dedicated audio element
      if (audioEl && !isSharing) {
        audioEl.srcObject = stream;
        audioEl.volume = isScreenAudioMuted ? 0 : screenAudioVolume;
        audioEl.play().catch((err) => {
          console.warn('[ScreenShareModal] Audio auto-play catch (will play on tap):', err);
        });
      }
    } else {
      videoEl.srcObject = null;
      if (audioEl) audioEl.srcObject = null;
    }
  }, [screenRemoteStream, screenLocalStream, isSharing, isReceiving, isScreenAudioMuted, screenAudioVolume, isActive]);

  // Sync audio volume changes
  useEffect(() => {
    if (audioRef.current && !isSharing) {
      audioRef.current.volume = isScreenAudioMuted ? 0 : screenAudioVolume;
    }
  }, [screenAudioVolume, isScreenAudioMuted, isSharing]);

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

  const currentStream = isSharing ? screenLocalStream : screenRemoteStream;

  return (
    <div
      ref={containerRef}
      className={'fixed z-50 transition-all duration-300 select-none ' + (
        isMinimized
          ? 'bottom-4 right-4 w-80 sm:w-96 rounded-2xl shadow-2xl border border-[#00a884]/40 bg-[#111b21] overflow-hidden'
          : isFullscreen
          ? 'inset-0 w-screen h-screen bg-black flex flex-col justify-between'
          : 'inset-0 flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-6'
      )}
    >
      <div
        className={'relative flex flex-col bg-[#111b21] border border-[#2a3942] rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden ' + (
          isMinimized
            ? 'w-full h-full'
            : isFullscreen
            ? 'w-full h-full rounded-none border-none'
            : 'w-full max-w-5xl h-[85vh] max-h-[800px]'
        )}
      >
        {/* Top Screen Share Header */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-3 bg-[#202c33] border-b border-[#2a3942] z-10 flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#00a884]/20 text-[#00a884] flex items-center justify-center flex-shrink-0">
              {activeScreenShare.shareType === 'camera' ? <Camera size={18} /> : <Tv size={18} />}
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-xs sm:text-sm font-bold text-[#e9edef] truncate">
                  {isSharing
                    ? (activeScreenShare.shareType === 'camera'
                        ? `Sharing Live Video with ${activeScreenShare.peerName}`
                        : `Sharing screen with ${activeScreenShare.peerName}`)
                    : (activeScreenShare.shareType === 'camera'
                        ? `${activeScreenShare.peerName}'s Live Video`
                        : `${activeScreenShare.peerName}'s Screen`)}
                </span>
                <span className="flex items-center gap-1 text-[10px] bg-[#00a884]/20 text-[#00a884] px-2 py-0.5 rounded-full font-semibold border border-[#00a884]/30 flex-shrink-0">
                  <Radio size={10} className="animate-pulse" /> LIVE
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-[#8696a0]">
                {activeScreenShare.shareType === 'camera' ? (
                  <span className="text-[#00a884]">Real-time camera video stream</span>
                ) : activeScreenShare.hasAudio ? (
                  <span className="flex items-center gap-1 text-[#25D366]">
                    <Music size={12} /> System & Video Audio Active
                  </span>
                ) : (
                  <span>Real-time Screen Stream</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Flip Camera Button (Only for sharing user) */}
            {isSharing && (
              <button
                onClick={flipCamera}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#111b21] hover:bg-[#2a3942] text-[#00a884] hover:text-[#25D366] border border-[#00a884]/40 text-xs font-semibold transition"
                title="Switch between front and rear camera"
              >
                <SwitchCamera size={15} />
                <span className="hidden xs:inline">Flip Cam</span>
              </button>
            )}

            {!isSharing && (
              <div className="hidden xs:flex items-center gap-1.5 bg-[#111b21] px-2.5 py-1 rounded-full border border-[#2a3942]">
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
              className="p-1.5 rounded-lg text-[#8696a0] hover:text-[#e9edef] hover:bg-[#2a3942] transition hidden sm:flex items-center justify-center"
              title="Picture in Picture"
            >
              <ExternalLink size={16} />
            </button>

            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1.5 rounded-lg text-[#8696a0] hover:text-[#e9edef] hover:bg-[#2a3942] transition hidden sm:flex items-center justify-center"
              title={isMinimized ? 'Expand Window' : 'Minimize Window'}
            >
              <Minimize2 size={16} />
            </button>

            {!isMinimized && (
              <button
                onClick={toggleFullscreen}
                className="p-1.5 rounded-lg text-[#8696a0] hover:text-[#e9edef] hover:bg-[#2a3942] transition hidden sm:flex items-center justify-center"
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              >
                <Maximize2 size={16} />
              </button>
            )}

            <button
              onClick={stopScreenShare}
              className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-xl text-xs font-semibold shadow transition transform active:scale-95"
              title="Stop Sharing"
            >
              <MonitorOff size={14} />
              <span className="hidden xs:inline">{isSharing ? 'Stop' : 'Leave'}</span>
            </button>
          </div>
        </div>

        {/* Center Main Screen Video Viewport */}
        <div
          className="relative flex-1 bg-black flex items-center justify-center overflow-hidden cursor-pointer"
          onClick={() => {
            if (audioRef.current && !isSharing) {
              audioRef.current.play().catch(() => {});
            }
          }}
        >
          {/* Receiver Audio Playback Element */}
          <audio
            ref={audioRef}
            autoPlay
            playsInline
            className="hidden"
          />

          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={true}
            onLoadedMetadata={(e) => {
              e.currentTarget.play().catch(() => {});
            }}
            className="w-full h-full object-contain"
          />

          {/* Connection / Stream loading indicator for receiver if stream has not arrived */}
          {isReceiving && !currentStream && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#111b21]/90 text-[#e9edef] z-20">
              <Loader2 size={36} className="text-[#00a884] animate-spin" />
              <p className="text-sm font-medium">Connecting to {activeScreenShare.peerName}&apos;s stream...</p>
              <p className="text-xs text-[#8696a0]">Establishing end-to-end WebRTC peer link</p>
            </div>
          )}

          {/* Presenter Status Overlay Badge */}
          {isSharing && (
            <div className="absolute bottom-4 left-4 bg-black/75 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-xl text-xs text-white flex items-center gap-2 shadow z-10">
              <span className="w-2 h-2 rounded-full bg-[#25D366] animate-ping" />
              <span>
                {activeScreenShare.shareType === 'camera'
                  ? `Live camera video active (${currentFacingMode === 'user' ? 'Front' : 'Rear'})`
                  : 'You are presenting your screen & video sound'}
              </span>
            </div>
          )}

          {/* Receiver Audio Playback Badge */}
          {isReceiving && activeScreenShare.hasAudio && (
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
                When sharing YouTube or movies, selecting <strong>Chrome Tab</strong> or checking <strong>Share Audio</strong> transmits high quality sound.
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

import React, { useState, useEffect, useRef } from 'react';

export const VideoPreloader = ({ onFinished }) => {
  const [isFading, setIsFading] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const videoRef = useRef(null);
  const finishedRef = useRef(false);

  const handleFinish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setIsFading(true);
    setTimeout(() => {
      if (onFinished) onFinished();
    }, 600);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setVideoLoaded(true);
        })
        .catch((err) => {
          console.warn('[VideoPreloader] Autoplay catch:', err);
          setVideoLoaded(true);
        });
    }

    // Safety fallback: if video doesn't end within 15 seconds, automatically transition
    const fallbackTimer = setTimeout(() => {
      handleFinish();
    }, 15000);

    return () => clearTimeout(fallbackTimer);
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[99999] bg-[#111b21] flex items-center justify-center select-none overflow-hidden transition-opacity duration-500 ease-in-out ${
        isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="relative w-full h-full flex items-center justify-center bg-[#111b21]">
        <video
          ref={videoRef}
          src="/assets/pre-loader.mp4"
          autoPlay
          muted
          playsInline
          webkit-playsinline="true"
          preload="auto"
          onEnded={handleFinish}
          onError={handleFinish}
          onLoadedMetadata={() => setVideoLoaded(true)}
          className="w-full h-full max-h-screen object-contain"
        />

        {/* Skip button in bottom-right corner */}
        <button
          onClick={handleFinish}
          className="absolute bottom-5 right-5 sm:bottom-8 sm:right-8 bg-[#202c33]/80 hover:bg-[#2a3942] text-[#8696a0] hover:text-[#e9edef] text-xs font-semibold px-4 py-1.5 rounded-full border border-white/10 backdrop-blur-md transition shadow-lg active:scale-95 z-20"
        >
          Skip &rarr;
        </button>
      </div>
    </div>
  );
};

export default VideoPreloader;

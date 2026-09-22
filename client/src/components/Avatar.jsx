import React, { useState } from 'react';

const COLORS = [
  'bg-emerald-600',
  'bg-teal-600',
  'bg-cyan-600',
  'bg-blue-600',
  'bg-indigo-600',
  'bg-violet-600',
  'bg-purple-600',
  'bg-fuchsia-600',
  'bg-pink-600',
  'bg-rose-600',
  'bg-amber-600'
];

export const getAvatarSrc = (avatar, nameOrUsername = 'user') => {
  if (avatar && (avatar.startsWith('http://') || avatar.startsWith('https://') || avatar.startsWith('data:') || avatar.startsWith('blob:'))) {
    return avatar;
  }
  if (avatar && avatar.startsWith('/uploads')) {
    const base = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '';
    return `${base.replace(/\/$/, '')}${avatar}`;
  }
  return `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(nameOrUsername || 'user')}`;
};

export const Avatar = ({
  src,
  name = 'User',
  username = '',
  size = 'md',
  className = '',
  ringColor = '',
  showOnline = false,
  isOnline = false,
  onClick = null
}) => {
  const [imgError, setImgError] = useState(false);

  const displayName = name || username || 'U';
  const initial = displayName.trim().charAt(0).toUpperCase();

  let hash = 0;
  for (let i = 0; i < displayName.length; i++) {
    hash = displayName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorClass = COLORS[Math.abs(hash) % COLORS.length];

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm font-semibold',
    lg: 'w-12 h-12 text-base font-semibold',
    xl: 'w-16 h-16 text-lg font-bold',
    '2xl': 'w-24 h-24 sm:w-28 sm:h-28 text-2xl font-bold'
  };

  const currentSizeClass = sizeClasses[size] || sizeClasses.md;
  const avatarUrl = getAvatarSrc(src, username || name);

  return (
    <div
      onClick={onClick}
      className={`relative flex-shrink-0 select-none rounded-full ${onClick ? 'cursor-pointer' : ''}`}
    >
      {!imgError && avatarUrl ? (
        <img
          src={avatarUrl}
          alt={displayName}
          onError={() => setImgError(true)}
          className={`${currentSizeClass} rounded-full object-cover bg-[#202c33] ${ringColor} ${className}`}
        />
      ) : (
        <div
          className={`${currentSizeClass} rounded-full flex items-center justify-center text-white shadow-inner ${colorClass} ${ringColor} ${className}`}
        >
          {initial}
        </div>
      )}

      {showOnline && (
        <span
          className={`absolute bottom-0 right-0 rounded-full border-2 border-[#202c33] ${
            size === 'xs' ? 'w-2 h-2' : size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'
          } ${isOnline ? 'bg-[#25D366]' : 'bg-[#8696a0]'}`}
        />
      )}
    </div>
  );
};

export default Avatar;

import React from 'react';

/**
 * WhatsApp-style message ticks:
 * - 'sent': Single gray tick (✓)
 * - 'delivered': Double gray tick (✓✓)
 * - 'read': Double cyan/blue tick (✓✓)
 */
export const MessageTicks = ({ status = 'sent', className = 'inline-flex items-center ml-1' }) => {
  if (status === 'sent') {
    return (
      <span className={`${className} text-[#8696a0]`} title="Sent to server (Single Tick)">
        <svg viewBox="0 0 16 15" width="16" height="15" fill="currentColor">
          <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L6.466 12.074l-3.95-3.95a.363.363 0 0 0-.514 0l-.368.368a.363.363 0 0 0 0 .514l4.28 4.28c.142.142.372.142.514 0l8.645-9.458a.365.365 0 0 0-.063-.512z" />
        </svg>
      </span>
    );
  }

  if (status === 'delivered') {
    return (
      <span className={`${className} text-[#8696a0]`} title="Delivered to recipient (Double Tick)">
        <svg viewBox="0 0 16 15" width="16" height="15" fill="currentColor">
          <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.774l-.478-.372a.365.365 0 0 0-.51.063L4.466 12.074l-3.95-3.95a.363.363 0 0 0-.514 0l-.368.368a.363.363 0 0 0 0 .514l4.28 4.28c.142.142.372.142.514 0l8.645-9.458a.365.365 0 0 0-.063-.512z" />
          <path d="M11.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L4.466 12.074l-1.95-1.95a.363.363 0 0 0-.514 0l-.368.368a.363.363 0 0 0 0 .514l2.28 2.28c.142.142.372.142.514 0l6.645-9.458a.365.365 0 0 0-.063-.512z" />
        </svg>
      </span>
    );
  }

  if (status === 'read') {
    return (
      <span className={`${className} text-[#53bdeb] animate-pulse-once`} title="Read / Seen (Blue Double Tick)">
        <svg viewBox="0 0 16 15" width="16" height="15" fill="currentColor">
          <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.774l-.478-.372a.365.365 0 0 0-.51.063L4.466 12.074l-3.95-3.95a.363.363 0 0 0-.514 0l-.368.368a.363.363 0 0 0 0 .514l4.28 4.28c.142.142.372.142.514 0l8.645-9.458a.365.365 0 0 0-.063-.512z" />
          <path d="M11.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L4.466 12.074l-1.95-1.95a.363.363 0 0 0-.514 0l-.368.368a.363.363 0 0 0 0 .514l2.28 2.28c.142.142.372.142.514 0l6.645-9.458a.365.365 0 0 0-.063-.512z" />
        </svg>
      </span>
    );
  }

  return null;
};

export default MessageTicks;

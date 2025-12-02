// frontend/src/components/UnreadMessageCounter.jsx
import React, { useState, useEffect } from 'react';
import { Mail } from 'lucide-react';
import messagingService from '../api/messagingService';

export default function UnreadMessageCounter() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchUnreadCount();
    
    // Poll every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const data = await messagingService.getUnreadCount();
      setUnreadCount(data.unread_count);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  if (unreadCount === 0) return null;

  return (
    <div className="relative">
      <Mail className="w-6 h-6" />
      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
        {unreadCount > 9 ? '9+' : unreadCount}
      </span>
    </div>
  );
}
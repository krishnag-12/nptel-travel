import { useState, useRef, useEffect } from 'react';
import { Bell, Settings } from 'lucide-react';

export function NotificationCenter({ notifications, unreadCount, markAsRead, markAllAsRead, onOpenPreferences }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-xl transition-all"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#0B0F19]"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-[#1F2937] border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[80vh]">
          <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-[#111827]">
            <h3 className="font-semibold text-white flex items-center gap-2">
              Notifications
              {unreadCount > 0 && (
                <span className="bg-indigo-500/20 text-indigo-300 text-xs px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button 
                  onClick={markAllAsRead}
                  className="text-xs text-slate-400 hover:text-indigo-400 transition-colors"
                >
                  Mark all read
                </button>
              )}
              <button 
                onClick={() => { setIsOpen(false); onOpenPreferences(); }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-colors"
                title="Preferences"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto custom-scrollbar flex-1">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Bell className="w-8 h-8 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/50">
                {notifications.map((notif) => (
                  <div 
                    key={notif.id} 
                    className={`p-4 transition-colors ${!notif.read ? 'bg-indigo-500/5 hover:bg-indigo-500/10' : 'hover:bg-slate-800/50'}`}
                    onClick={() => { if (!notif.read) markAsRead(notif.id); }}
                  >
                    <div className="flex gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className={`text-sm font-medium truncate ${!notif.read ? 'text-indigo-300' : 'text-slate-300'}`}>
                            {notif.title}
                          </p>
                          <span className="text-[10px] text-slate-500 flex-shrink-0 whitespace-nowrap">
                            {notif.createdAt?.toDate ? notif.createdAt.toDate().toLocaleDateString() : 'Just now'}
                          </span>
                        </div>
                        <p className="text-sm text-slate-400 line-clamp-2">
                          {notif.message}
                        </p>
                      </div>
                      {!notif.read && (
                        <div className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0 mt-1.5"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { X, Mail, MessageCircle, Bell, Loader2 } from 'lucide-react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export function NotificationPreferences({ db, user, onClose }) {
  const [preferences, setPreferences] = useState({
    email: true,
    sms: true,
    inApp: true,
    marketing: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || !db) return;

    const fetchPreferences = async () => {
      try {
        const prefRef = doc(db, 'notificationPreferences', user.uid);
        const docSnap = await getDoc(prefRef);
        
        if (docSnap.exists()) {
          setPreferences(docSnap.data());
        }
      } catch (err) {
        console.error("Error fetching preferences:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPreferences();
  }, [user, db]);

  const handleToggle = (key) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (!user || !db) return;
    setSaving(true);
    
    try {
      const prefRef = doc(db, 'notificationPreferences', user.uid);
      await setDoc(prefRef, {
        ...preferences,
        updatedAt: serverTimestamp()
      }, { merge: true });
      onClose();
    } catch (err) {
      console.error("Error saving preferences:", err);
      alert("Failed to save preferences. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-[#111827] rounded-2xl border border-slate-700 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-[#1F2937]/50">
          <h2 className="text-xl font-bold text-white">Notification Settings</h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-sm text-slate-400 mb-2">
            Choose how you want to be notified when we find a travel partner for your exams.
          </p>

          <div className="space-y-4">
            <PreferenceItem 
              icon={<Mail className="w-5 h-5 text-indigo-400" />}
              title="Email Notifications"
              description="Receive an email with partner details."
              checked={preferences.email}
              onChange={() => handleToggle('email')}
            />
            
            <PreferenceItem 
              icon={<MessageCircle className="w-5 h-5 text-emerald-400" />}
              title="SMS Notifications"
              description="Get a quick text message on your registered mobile."
              checked={preferences.sms}
              onChange={() => handleToggle('sms')}
            />
            
            <PreferenceItem 
              icon={<Bell className="w-5 h-5 text-amber-400" />}
              title="In-App Notifications"
              description="Show alerts and unread badges in the app."
              checked={preferences.inApp}
              onChange={() => handleToggle('inApp')}
            />
          </div>

          <div className="pt-6 border-t border-slate-800 flex justify-end gap-3">
            <button 
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-70 flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Preferences
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreferenceItem({ icon, title, description, checked, onChange }) {
  return (
    <label className="flex items-start justify-between gap-4 p-4 rounded-xl border border-slate-800 bg-[#0B0F19] cursor-pointer hover:border-slate-600 transition-colors group">
      <div className="flex gap-3">
        <div className="mt-0.5">{icon}</div>
        <div>
          <h4 className="text-slate-200 font-medium text-sm group-hover:text-white transition-colors">{title}</h4>
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        </div>
      </div>
      <div className="relative inline-flex items-center cursor-pointer mt-1 flex-shrink-0">
        <input 
          type="checkbox" 
          className="sr-only peer" 
          checked={checked}
          onChange={onChange}
        />
        <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
      </div>
    </label>
  );
}

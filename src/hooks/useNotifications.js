import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, writeBatch } from 'firebase/firestore';

export function useNotifications(db, user) {
  const isReady = !!(user && db);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(isReady);

  useEffect(() => {
    if (!user || !db) {
      return;
    }

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNotifications(notifs);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching notifications:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, db]);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  const markAsRead = async (notificationId) => {
    if (!db) return;
    try {
      const notifRef = doc(db, 'notifications', notificationId);
      await updateDoc(notifRef, { read: true, updatedAt: Date.now() });
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const markAllAsRead = async () => {
    if (!db || unreadCount === 0) return;
    try {
      const unreadNotifs = notifications.filter(n => !n.read);
      const batch = writeBatch(db);
      
      unreadNotifs.forEach(notif => {
        const notifRef = doc(db, 'notifications', notif.id);
        batch.update(notifRef, { read: true, updatedAt: Date.now() });
      });
      
      await batch.commit();
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead
  };
}

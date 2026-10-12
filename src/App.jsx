/* global __app_id, __initial_auth_token */
import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  MapPin, 
  Calendar, 
  Clock, 
  Mail, 
  Trash2, 
  PlusCircle,
  Search,
  CheckCircle2,
  AlertCircle,
  Compass,
  Navigation,
  Loader2,
  Phone,
  MessageCircle,
  UploadCloud,
  FileText
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  deleteDoc,
  doc,
  setDoc,
  getDocs,
  where,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';

import { Analytics } from '@vercel/analytics/react';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { useNotifications } from './hooks/useNotifications';
import { NotificationCenter } from './components/NotificationCenter';
import { NotificationPreferences } from './components/NotificationPreferences';
import { sendMatchNotificationsToAutocrat } from './services/autocratNotification';

// ==========================================
// 1. BACKEND & FIREBASE CONFIGURATION
// ==========================================

const firebaseConfig = {
  apiKey: "AIzaSyBEfITwCjgh61z65BKcBd-SEvDQ43ip1ZA",
  authDomain: "nptel-travel.firebaseapp.com",
  projectId: "nptel-travel",
  storageBucket: "nptel-travel.firebasestorage.app",
  messagingSenderId: "948154942167",
  appId: "1:948154942167:web:46e7eb5aef04c81f58a692",
  measurementId: "G-924EQT61K6"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'nptel-travel-app';

// ==========================================
// 2. MAIN APPLICATION COMPONENT
// ==========================================

export default function NPTELTravelApp() {
  const [user, setUser] = useState(null);
  const [allRequests, setAllRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('my-trips'); 
  const [showPreferences, setShowPreferences] = useState(false);

  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(db, user);

  // --- Authentication Setup ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Authentication Error:", error);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          await setDoc(doc(db, 'users', currentUser.uid), {
            lastLogin: Date.now()
          }, { merge: true });
        } catch (e) {
          console.error("Error creating user doc:", e);
        }
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // --- Real-time Data Fetching (Firestore) ---
  useEffect(() => {
    if (!user) return;

    const requestsRef = collection(db, 'artifacts', appId, 'public', 'data', 'travelRequests');
    const q = query(requestsRef);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAllRequests(requests);
      setLoading(false);
    }, (error) => {
      console.error("Firestore error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // --- Derived State ---
  const myRequests = useMemo(() => {
    if (!user) return [];
    return allRequests.filter(req => req.userId === user.uid).sort((a, b) => b.createdAt - a.createdAt);
  }, [allRequests, user]);

  // --- UI Render ---
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] font-sans text-slate-200 selection:bg-indigo-500/30 relative">
      <header className="bg-[#0B0F19]/90 backdrop-blur-md border-b border-slate-800/60 sticky top-0 z-50 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-indigo-500/10 p-2 rounded-xl border border-indigo-500/20">
              <Compass className="w-6 h-6 text-indigo-400" />
            </div>
            <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              NPTEL Travel Buddy
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
              <span className="text-slate-400 text-sm hidden sm:inline">
                {user ? 'Secure connection' : 'Connecting...'}
              </span>
            </div>
            {user && (
              <NotificationCenter 
                notifications={notifications}
                unreadCount={unreadCount}
                markAsRead={markAsRead}
                markAllAsRead={markAllAsRead}
                onOpenPreferences={() => setShowPreferences(true)}
              />
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex space-x-2 mb-8 bg-[#111827] p-1.5 rounded-xl shadow-lg border border-slate-800 w-fit">
          <button
            onClick={() => setActiveTab('my-trips')}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
              activeTab === 'my-trips' 
                ? 'bg-indigo-500/15 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.1)]' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            My Trips & Matches
          </button>
          <button
            onClick={() => setActiveTab('new-request')}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
              activeTab === 'new-request' 
                ? 'bg-indigo-500/15 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.1)]' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Find a Partner
          </button>
        </div>

        {activeTab === 'new-request' && (
          <RequestForm 
            user={user} 
            onSuccess={() => setActiveTab('my-trips')} 
          />
        )}

        {activeTab === 'my-trips' && (
          <Dashboard 
            user={user} 
            myRequests={myRequests} 
            allRequests={allRequests} 
            onNewRequest={() => setActiveTab('new-request')}
          />
        )}

      </main>

      {showPreferences && (
        <NotificationPreferences 
          db={db}
          user={user}
          onClose={() => setShowPreferences(false)}
        />
      )}

      <Analytics />

    </div>
  );
}

// --- Helper: Robust Center Matching (Exact, Place ID, Substrings, Key Venue Overlap) ---
function isCenterMatch(center1, center2, placeId1, placeId2) {
  if (!center1 || !center2) return false;
  const c1 = center1.toLowerCase().trim();
  const c2 = center2.toLowerCase().trim();

  // 1. Exact match
  if (c1 === c2) return true;

  // 2. Stable Map place ID match
  if (placeId1 && placeId2 && placeId1 !== 'custom' && placeId2 !== 'custom' && placeId1 === placeId2) {
    return true;
  }

  // 3. Substring containment (e.g. "bitbytech solutions" in "bitbytech solutions, peenya 1st stage, bengaluru")
  if (c1.includes(c2) || c2.includes(c1)) {
    return true;
  }

  // 4. Overlap of key venue words (e.g. "bitbytech")
  const stopWords = new Set([
    'college', 'institute', 'university', 'technology', 'technologies', 'engineering',
    'centre', 'center', 'digital', 'zone', 'road', 'campus', 'stage', 'bengaluru',
    'bangalore', 'delhi', 'mumbai', 'chennai', 'hyderabad', 'kolkata', 'pune',
    'solutions', 'pvt', 'ltd', 'near', 'opp', 'station', '1st', '2nd', '3rd', 'india'
  ]);
  const words1 = c1.split(/[\s,.-]+/).filter(w => w.length > 3);
  const words2 = c2.split(/[\s,.-]+/).filter(w => w.length > 3);
  const distinctiveOverlap = words1.filter(w => words2.includes(w) && !stopWords.has(w));
  if (distinctiveOverlap.length > 0) {
    return true;
  }

  return false;
}

// ==========================================
// 3. COMPONENTS
// ==========================================

function RequestForm({ user, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '', 
    examCenter: '',
    examDate: '',
    examSlot: 'Forenoon'
  });
  
  const [placeId, setPlaceId] = useState(null); 
  const [suggestions, setSuggestions] = useState([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const [isParsingPDF, setIsParsingPDF] = useState(false);
  const [pdfSuccess, setPdfSuccess] = useState('');
  const fileInputRef = useRef(null);
  
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchLocations = async () => {
      const queryText = formData.examCenter.trim();
      if (queryText.length > 2 && placeId !== 'custom') {
        setIsSearchingLocation(true);
        try {
          let response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryText)}&countrycodes=in&limit=5`
          );
          let data = await response.json();

          // Fallback: If 0 results and query contains commas, try searching the locality/city part
          if ((!data || data.length === 0) && queryText.includes(',')) {
            const parts = queryText.split(',').map(p => p.trim()).filter(Boolean);
            if (parts.length > 1) {
              const localityQuery = parts.slice(1).join(', ');
              const fallbackRes = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(localityQuery)}&countrycodes=in&limit=4`
              );
              const fallbackData = await fallbackRes.json();
              if (fallbackData && fallbackData.length > 0) {
                data = fallbackData;
              }
            }
          }

          setSuggestions(data || []);
          setShowDropdown(true);
        } catch (err) {
          console.error("Error fetching locations:", err);
        } finally {
          setIsSearchingLocation(false);
        }
      } else {
        setSuggestions([]);
        setShowDropdown(false);
      }
    };

    const timeoutId = setTimeout(() => {
      fetchLocations();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.examCenter, placeId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'examCenter') {
      setPlaceId(null);
      if (value.trim().length > 2) setShowDropdown(true);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setFormData(prev => ({ ...prev, examCenter: suggestion.display_name }));
    setPlaceId(suggestion.place_id ? suggestion.place_id.toString() : 'custom');
    setShowDropdown(false);
  };

  // --- PDF Parsing Logic (ULTRA ROBUST ALGORITHM) ---
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      setError("Please upload a valid PDF file.");
      return;
    }

    setIsParsingPDF(true);
    setError('');
    setPdfSuccess('');

    try {
      // Safely inject PDF.js to avoid bundler resolution errors
      if (!window.pdfjsLib) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
          script.onload = () => {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            resolve();
          };
          script.onerror = () => reject(new Error("Failed to load PDF.js library"));
          document.head.appendChild(script);
        });
      }

      const pdfjsLib = window.pdfjsLib;
      const arrayBuffer = await file.arrayBuffer();
      
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      
      const strings = [];
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageStrings = textContent.items.map(item => item.str.trim()).filter(str => str.length > 0);
        strings.push(...pageStrings);
        fullText += pageStrings.join(' ') + ' ';
      }

      // Helper to identify standard NPTEL form labels
      const knownLabels = [
        "candidate name", "roll no", "seating number", "date of birth", "pwd status",
        "compensatory time", "scribe required", "exam date", "reporting time",
        "exam timing", "gate closure", "shift", "test centre name", "test center name",
        "test centre address", "test center address", "nptel coordinator", "nptel exam",
        "signature", "programme", "technology enhanced", "hall ticket", "instructions",
        "candidate)", "session"
      ];
      const isLabel = (s) => knownLabels.some(l => s.toLowerCase().includes(l));

      // 1. Extract Name
      let foundName = '';
      const rollNoIndex = strings.findIndex(s => s.startsWith('NOC') && s.length > 10);
      if (rollNoIndex > 0) {
        for(let i = rollNoIndex - 1; i >= 0; i--) {
          const str = strings[i];
          if(!isLabel(str)) {
            foundName = str;
            break;
          } else if (str.toLowerCase().includes("candidate name") && str.length > 15) {
            foundName = str.substring(str.toLowerCase().indexOf("candidate name") + 14).trim();
            if (foundName) break;
          }
        }
      }

      // 2. Extract Exam Date (Fixed timezone drift issue)
      let foundDate = '';
      const dateRegexMatch = fullText.match(/\d{1,2}\s+[A-Za-z]+,?\s*\d{4}/);
      if (dateRegexMatch) {
        try {
          const parsedDate = new Date(dateRegexMatch[0]);
          if (!isNaN(parsedDate)) {
            // Formatting manually prevents .toISOString() from returning yesterday's date
            const yyyy = parsedDate.getFullYear();
            const mm = String(parsedDate.getMonth() + 1).padStart(2, '0');
            const dd = String(parsedDate.getDate()).padStart(2, '0');
            foundDate = `${yyyy}-${mm}-${dd}`;
          }
        } catch {
          console.warn("Could not parse date format", dateRegexMatch[0]);
        }
      }

      // 3. Extract Exam Slot (Multi-Strategy with Instruction Separation)
      let foundSlot = formData.examSlot;
      
      // Separate timetable from bottom generic instructions to avoid false positives
      const instructionsIndex = fullText.toLowerCase().indexOf("instructions");
      const scheduleText = instructionsIndex !== -1 ? fullText.substring(0, instructionsIndex) : fullText;
      const upperSchedule = scheduleText.toUpperCase();

      // Clear indicators for Afternoon (Shift 2)
      const isAfternoonTime = /0?2:00\s*(?:PM|HRS)|14:00|0?1:00\s*PM|12:45\s*PM|2\.00\s*PM|0?5:00\s*PM|17:00/i.test(scheduleText);
      const isShift2 = /shift\s*[:-]?\s*2\b|session\s*[:-]?\s*2\b|\bshift\s*2\b/i.test(scheduleText);
      const isAfternoonWord = /\bAFTERNOON\b|\bAN\b/.test(upperSchedule);

      // Clear indicators for Forenoon (Shift 1)
      const isForenoonTime = /0?9:00\s*(?:AM|HRS)|0?8:00\s*AM|0?7:30\s*AM|9\.00\s*AM|12:00\s*PM/i.test(scheduleText);
      const isShift1 = /shift\s*[:-]?\s*1\b|session\s*[:-]?\s*1\b|\bshift\s*1\b/i.test(scheduleText);
      const isForenoonWord = /\bFORENOON\b|\bFN\b/.test(upperSchedule);

      if (isAfternoonTime || isShift2 || (isAfternoonWord && !isForenoonWord)) {
        foundSlot = "Afternoon";
      } else if (isForenoonTime || isShift1 || (isForenoonWord && !isAfternoonWord)) {
        foundSlot = "Forenoon";
      } else if (isAfternoonWord) {
        foundSlot = "Afternoon";
      } else if (isForenoonWord) {
        foundSlot = "Forenoon";
      }

      // 4. Extract Center Name and Center Address
      let foundCenter = '';
      let foundAddress = '';

      // Pattern 1: Regex extraction on full text
      const nameMatch = fullText.match(/(?:test\s*cent(?:re|er)\s*(?:code\s*&?\s*)?name|cent(?:re|er)\s*name|exam\s*cent(?:re|er)|test\s*venue|venue\s*name)\s*[:-]?\s*([-a-zA-Z0-9\s&.',()]+?)(?=(?:test\s*cent(?:re|er)\s*address|cent(?:re|er)\s*address|address|exam\s*date|roll\s*no|reporting|shift|gate|instructions|\n\n|$))/i);
      if (nameMatch && nameMatch[1]) {
        const candidate = nameMatch[1].trim();
        if (candidate.length > 3 && !isLabel(candidate)) {
          foundCenter = candidate;
        }
      }

      const addrMatch = fullText.match(/(?:test\s*cent(?:re|er)\s*address|cent(?:re|er)\s*address|venue\s*address)\s*[:-]?\s*([-a-zA-Z0-9\s&.',()]+?)(?=(?:nptel\s*coordinator|instructions|candidate\s*signature|signature|reporting|shift|\n\n|$))/i);
      if (addrMatch && addrMatch[1]) {
        const candidateAddr = addrMatch[1].trim();
        if (candidateAddr.length > 5 && !isLabel(candidateAddr)) {
          foundAddress = candidateAddr;
        }
      }

      // Pattern 2: Scan individual string items if regex missed it
      if (!foundCenter) {
        const tcNameIdx = strings.findIndex(s => {
          const lower = s.toLowerCase();
          return lower.includes('test centre name') || lower.includes('test center name') || lower.includes('centre name') || lower.includes('center name') || lower.includes('test venue');
        });
        const tcAddrIdx = strings.findIndex(s => {
          const lower = s.toLowerCase();
          return lower.includes('test centre address') || lower.includes('test center address') || lower.includes('centre address') || lower.includes('center address');
        });

        if (tcNameIdx !== -1) {
          const labelStr = strings[tcNameIdx];
          const colonIdx = labelStr.indexOf(':');
          if (colonIdx !== -1 && labelStr.length > colonIdx + 4) {
            const afterColon = labelStr.substring(colonIdx + 1).trim();
            if (afterColon.length > 3 && !isLabel(afterColon)) {
              foundCenter = afterColon;
            }
          }

          if (!foundCenter && tcAddrIdx > tcNameIdx) {
            const inBetween = strings.slice(tcNameIdx + 1, tcAddrIdx)
              .map(s => s.trim())
              .filter(s => s.length > 3 && !isLabel(s) && !s.startsWith(':'));
            if (inBetween.length > 0) {
              foundCenter = inBetween.join(', ');
            }
          }

          if (!foundCenter) {
            for (let i = tcNameIdx + 1; i < Math.min(tcNameIdx + 6, strings.length); i++) {
              const str = strings[i].trim();
              if (str.length > 3 && !isLabel(str) && !str.startsWith(':') && !str.startsWith('NOC') && !/^\d{1,2}[:.]\d{2}/.test(str)) {
                foundCenter = str;
                break;
              }
            }
          }
        }

        if (!foundAddress && tcAddrIdx !== -1) {
          const inBetween = strings.slice(tcAddrIdx + 1, Math.min(tcAddrIdx + 8, strings.length))
            .map(s => s.trim())
            .filter(s => s.length > 3 && !isLabel(s) && !s.startsWith(':'));
          if (inBetween.length > 0) {
            foundAddress = inBetween.join(', ');
          }
        }
      }

      // Pattern 3: Fallback keyword search for private centers, institutes, engineering, solutions, etc.
      if (!foundCenter) {
        const centerKeywords = [
          'solutions', 'technologies', 'infotech', 'digital zone', 'tcs',
          'college', 'institute', 'university', 'academy', 'engineering',
          'polytechnic', 'campus', 'systems', 'complex'
        ];
        const keywordMatch = strings.find(s => {
          const lower = s.toLowerCase();
          return centerKeywords.some(kw => lower.includes(kw)) && !isLabel(s) && s.length > 5 && s.length < 80;
        });
        if (keywordMatch) foundCenter = keywordMatch;
      }

      // Clean up center name (remove leading code like "TC123 - BitByteTech")
      if (foundCenter) {
        foundCenter = foundCenter.replace(/^[-A-Z0-9_]+\s*[-:]\s*/i, '').trim();
      }

      // Combine center and address if both exist
      let finalExamCenter = '';
      if (foundCenter && foundAddress) {
        finalExamCenter = `${foundCenter}, ${foundAddress}`;
      } else if (foundCenter) {
        finalExamCenter = foundCenter;
      } else if (foundAddress) {
        finalExamCenter = foundAddress;
      }

      setFormData(prev => ({
        ...prev,
        name: foundName || prev.name,
        examDate: foundDate || prev.examDate,
        examSlot: foundSlot,
        examCenter: finalExamCenter || prev.examCenter
      }));
      setPlaceId(finalExamCenter ? 'custom' : null); 

      if (foundName || foundCenter || foundDate) {
        setPdfSuccess("Hall ticket successfully scanned! Please verify the details below.");
      } else {
        setError("Could not read details from this PDF. Please enter manually.");
      }

    } catch (err) {
      console.error("PDF Parsing Error: ", err);
      setError("Error reading the PDF. Please try checking your internet connection, or enter details manually.");
    } finally {
      setIsParsingPDF(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    
    setIsSubmitting(true);
    setError('');

    let normalizedPhone = formData.mobile;
    if (formData.mobile) {
      try {
        const phoneNumber = parsePhoneNumberFromString(formData.mobile, 'IN');
        if (!phoneNumber || !phoneNumber.isValid()) {
          setError("Please enter a valid mobile number.");
          setIsSubmitting(false);
          return;
        }
        normalizedPhone = phoneNumber.format('E.164');
      } catch {
        setError("Invalid phone number format.");
        setIsSubmitting(false);
        return;
      }
    }

    try {
      const requestsRef = collection(db, 'artifacts', appId, 'public', 'data', 'travelRequests');
      const newRequestData = {
        ...formData,
        mobile: normalizedPhone,
        userId: user.uid,
        placeId: placeId,
        createdAt: Date.now(),
        searchCenter: formData.examCenter.toLowerCase().trim()
      };
      const newDocRef = await addDoc(requestsRef, newRequestData);

      // --- Frontend Matching Logic ---
      // Query for other requests with the same examDate + examSlot + center
      // Always match by searchCenter (text-based, reliable)
      // placeId from Nominatim is NOT stable across different API calls
      const matchQuery = query(
        requestsRef,
        where('examDate', '==', formData.examDate),
        where('examSlot', '==', formData.examSlot)
      );

      const matchSnapshot = await getDocs(matchQuery);
      let matchCount = 0;

      const batch = writeBatch(db);
      const autocratEvents = [];

      matchSnapshot.forEach((matchDoc) => {
        const matchData = matchDoc.data();
        // Skip our own request
        if (matchDoc.id === newDocRef.id || matchData.userId === user.uid) return;

        // Verify exam center match using robust matching
        if (!isCenterMatch(formData.examCenter, matchData.examCenter, placeId, matchData.placeId)) {
          return;
        }

        // Create a deterministic match ID to prevent duplicates
        const sortedIds = [user.uid, matchData.userId].sort();
        const matchId = `${sortedIds[0]}_${sortedIds[1]}_${formData.examDate}`;

        const matchRef = doc(db, 'matches', matchId);
        batch.set(matchRef, {
          userIds: [user.uid, matchData.userId],
          requestIds: [newDocRef.id, matchDoc.id],
          examDate: formData.examDate,
          examSlot: formData.examSlot,
          examCenter: formData.examCenter,
          createdAt: serverTimestamp(),
        }, { merge: true });

        // Create notification for the OTHER user
        const notifRef = doc(collection(db, 'notifications'));
        batch.set(notifRef, {
          userId: matchData.userId,
          matchId: matchId,
          type: 'NEW_MATCH',
          title: 'New Travel Partner Found!',
          message: `${formData.name} is also heading to ${formData.examCenter} on ${formData.examDate} (${formData.examSlot}). Reach out and coordinate!`,
          createdAt: serverTimestamp(),
          read: false,
          createdBy: user.uid,
        });

        // Event 1: Notify the other user about the new user
        autocratEvents.push({
          recipientName: matchData.name,
          recipientEmail: matchData.email,
          recipientMobile: matchData.mobile,
          partnerName: formData.name,
          partnerEmail: formData.email,
          partnerMobile: normalizedPhone,
          examCenter: formData.examCenter,
          examDate: formData.examDate,
          examSlot: formData.examSlot,
        });

        // Event 2: Notify the new user about the other user
        autocratEvents.push({
          recipientName: formData.name,
          recipientEmail: formData.email,
          recipientMobile: normalizedPhone,
          partnerName: matchData.name,
          partnerEmail: matchData.email,
          partnerMobile: matchData.mobile,
          examCenter: formData.examCenter,
          examDate: formData.examDate,
          examSlot: formData.examSlot,
        });

        matchCount++;
      });

      if (matchCount > 0) {
        await batch.commit();
        // Send email notifications via Autocrat / Google Sheets webhook (from expertszone4@gmail.com)
        sendMatchNotificationsToAutocrat(autocratEvents).catch((err) => {
          console.warn("[Autocrat] Non-blocking dispatch warning:", err);
        });
      }
      
      setFormData({
        name: '', email: '', mobile: '', examCenter: '', examDate: '', examSlot: 'Forenoon'
      });
      setPlaceId(null);
      setPdfSuccess('');

      if (matchCount > 0) {
        alert(`🎉 ${matchCount} travel partner${matchCount > 1 ? 's' : ''} found! Check 'My Trips & Matches' to see them.`);
      } else {
        alert('✅ Request saved! We\'ll show matches as soon as someone else registers for the same center and slot.');
      }

      onSuccess();
    } catch (err) {
      console.error("Error adding document: ", err);
      setError("Failed to submit request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#111827] rounded-2xl shadow-xl border border-slate-800 p-6 md:p-8 max-w-2xl mx-auto relative overflow-hidden">
      <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="mb-8 relative z-10">
        <h2 className="text-2xl font-bold text-white">Register Exam Details</h2>
        <p className="text-slate-400 mt-2 text-sm">We'll match you with others heading to the same center at the exact same time.</p>
      </div>

      <div className="mb-8 relative z-10">
        <label 
          className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
            isParsingPDF ? 'border-indigo-500 bg-indigo-500/5' : 'border-slate-700 hover:border-indigo-500/50 hover:bg-[#1F2937]/50 bg-[#0B0F19]'
          }`}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            {isParsingPDF ? (
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-3" />
            ) : (
              <UploadCloud className="w-8 h-8 text-slate-400 mb-3" />
            )}
            <p className="mb-1 text-sm text-slate-300">
              <span className="font-semibold text-indigo-400">Click to upload</span> your Hall Ticket PDF
            </p>
            <p className="text-xs text-slate-500">Auto-fill Name, Center, and Date to save time</p>
          </div>
          <input 
            type="file" 
            className="hidden" 
            accept="application/pdf"
            onChange={handleFileUpload}
            ref={fileInputRef}
            disabled={isParsingPDF}
          />
        </label>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-center gap-3 relative z-10">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {pdfSuccess && (
        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center gap-3 relative z-10">
          <FileText className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{pdfSuccess}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300 block">Full Name</label>
          <input 
            required
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Alex Johnson"
            className="w-full px-4 py-2.5 bg-[#0B0F19] border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600 shadow-inner"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 block">Email Address</label>
            <input 
              required
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="alex@example.com"
              className="w-full px-4 py-2.5 bg-[#0B0F19] border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600 shadow-inner"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 block">Mobile Number (WhatsApp)</label>
            <div className="relative">
              <Phone className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                required
                type="tel"
                name="mobile"
                value={formData.mobile}
                onChange={handleInputChange}
                placeholder="10-digit number"
                title="Please enter a valid mobile number"
                className="w-full pl-10 pr-4 py-2.5 bg-[#0B0F19] border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600 shadow-inner"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2" ref={wrapperRef}>
          <label className="text-sm font-medium text-slate-300 flex items-center justify-between">
            <span>NPTEL Exam Center Name / City</span>
            {placeId && (
              <span className="text-xs text-emerald-400 flex items-center gap-1 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">
                <CheckCircle2 className="w-3 h-3" />
                {placeId === 'custom' ? 'Venue Verified' : 'Map Linked'}
              </span>
            )}
          </label>
          <div className="relative">
            <MapPin className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              required
              type="text"
              name="examCenter"
              value={formData.examCenter}
              onChange={handleInputChange}
              onFocus={() => { if(formData.examCenter.trim().length > 2) setShowDropdown(true); }}
              placeholder="e.g., BitByteTech Solutions or BMS College, Bengaluru"
              className="w-full pl-10 pr-10 py-2.5 bg-[#0B0F19] border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600 shadow-inner"
              autoComplete="off"
            />
            {isSearchingLocation && (
              <Loader2 className="w-4 h-4 text-indigo-400 absolute right-3 top-1/2 -translate-y-1/2 animate-spin" />
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">Select from suggestions or enter your venue / center name directly.</p>
          
          {showDropdown && formData.examCenter.trim().length > 2 && (
            <ul className="absolute z-50 w-full mt-1 bg-[#1F2937] border border-slate-700 rounded-xl shadow-2xl max-h-64 overflow-y-auto custom-scrollbar divide-y divide-slate-800">
              {/* Option to use custom typed text directly */}
              <li 
                onClick={() => {
                  setPlaceId('custom');
                  setShowDropdown(false);
                }}
                className="px-4 py-3 hover:bg-indigo-500/20 cursor-pointer transition-colors flex items-center justify-between gap-3 bg-indigo-950/30"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-sm text-slate-100 font-medium truncate">
                    Use "{formData.examCenter}"
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full whitespace-nowrap">
                  Custom Venue
                </span>
              </li>

              {/* Map suggestions if found */}
              {suggestions.map((suggestion) => (
                <li 
                  key={suggestion.place_id}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="px-4 py-3 hover:bg-indigo-500/20 cursor-pointer transition-colors flex items-start gap-3"
                >
                  <MapPin className="w-4 h-4 text-indigo-400 mt-1 flex-shrink-0" />
                  <span className="text-sm text-slate-200">{suggestion.display_name}</span>
                </li>
              ))}

              {suggestions.length === 0 && !isSearchingLocation && (
                <li className="px-4 py-3 text-xs text-slate-400 bg-slate-900/60 flex items-center gap-2">
                  <span>💡 Venue not found on map? No problem! Click <strong>"Use..."</strong> above to register with this center name.</span>
                </li>
              )}
            </ul>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 block">Exam Date</label>
            <div className="relative">
              <Calendar className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                required
                type="date"
                name="examDate"
                value={formData.examDate}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-2.5 bg-[#0B0F19] border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all shadow-inner [color-scheme:dark]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 block">Exam Slot</label>
            <div className="relative">
              <Clock className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                name="examSlot"
                value={formData.examSlot}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-2.5 bg-[#0B0F19] border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all appearance-none shadow-inner"
              >
                <option value="Forenoon">Forenoon (9:00 AM - 12:00 PM)</option>
                <option value="Afternoon">Afternoon (2:00 PM - 5:00 PM)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-800">
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.25)] hover:shadow-[0_0_25px_rgba(79,70,229,0.4)] flex items-center justify-center gap-2 border border-indigo-500/30 disabled:opacity-70"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            ) : (
              <>
                <Search className="w-5 h-5" />
                Find Travel Partners
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

// --- Dashboard Component showing User's Trips and Matches ---
function Dashboard({ user, myRequests, allRequests, onNewRequest }) {
  if (myRequests.length === 0) {
    return (
      <div className="text-center py-20 bg-[#111827] rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#111827] to-[#111827] pointer-events-none"></div>
        <Navigation className="w-16 h-16 text-slate-700 mx-auto mb-5 relative z-10" />
        <h3 className="text-xl font-bold text-white mb-2 relative z-10">No journeys mapped out</h3>
        <p className="text-slate-400 mb-8 max-w-md mx-auto text-sm relative z-10">
          Add your NPTEL exam details to start finding travel partners heading to the same center. Share rides, save money.
        </p>
        <button 
          onClick={onNewRequest}
          className="relative z-10 inline-flex items-center gap-2 bg-[#1F2937] hover:bg-slate-700 border border-slate-600 hover:border-slate-500 text-white font-medium py-2.5 px-6 rounded-xl transition-all shadow-lg"
        >
          <PlusCircle className="w-5 h-5 text-indigo-400" />
          Add Exam Details
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {myRequests.map(request => (
        <TripGroup 
          key={request.id} 
          request={request} 
          allRequests={allRequests} 
          user={user} 
        />
      ))}
    </div>
  );
}

// --- Individual Trip Group (Shows 1 Trip + Its Matches) ---
function TripGroup({ request, allRequests, user }) {
  const [isDeleting, setIsDeleting] = useState(false);

  const matches = useMemo(() => {
    return allRequests.filter(req => {
      if (req.userId === user.uid) return false;
      if (req.examDate !== request.examDate) return false;
      if (req.examSlot !== request.examSlot) return false;

      return isCenterMatch(request.examCenter, req.examCenter, request.placeId, req.placeId);
    });
  }, [allRequests, request, user.uid]);

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this trip request?")) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'travelRequests', request.id));
    } catch (err) {
      console.error("Error deleting document:", err);
      alert("Failed to delete. Please try again.");
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-[#111827] rounded-2xl shadow-xl border border-slate-800 overflow-hidden">
      <div className="bg-[#1F2937]/50 border-b border-slate-800 p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-white font-semibold mb-1.5 text-lg">
            <MapPin className="w-5 h-5 text-indigo-400 flex-shrink-0" />
            <span className="truncate max-w-md md:max-w-xl">{request.examCenter}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-400">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-500" />
              {new Date(request.examDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-500" />
              {request.examSlot}
            </span>
          </div>
        </div>
        <button 
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-slate-500 hover:text-red-400 transition-colors p-2 rounded-xl hover:bg-slate-800 flex-shrink-0 border border-transparent hover:border-red-500/20"
          title="Delete Trip"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6">
        <div className="flex items-center gap-3 mb-5">
          <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider">
            Potential Partners
          </h3>
          <span className="bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold px-2.5 py-0.5 rounded-full">
            {matches.length}
          </span>
        </div>

        {matches.length === 0 ? (
          <div className="text-center py-10 bg-[#0B0F19] rounded-xl border border-dashed border-slate-800">
            <p className="text-slate-500 text-sm">
              No exact matches found for this center and time yet.<br/>We'll keep looking as more students register!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {matches.map(match => (
              <MatchCard key={match.id} match={match} myRequest={request} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MatchCard({ match, myRequest }) {
  const subject = encodeURIComponent(`NPTEL Travel Buddy: ${match.examCenter} on ${myRequest.examDate}`);
  const body = encodeURIComponent(
    `Hi ${match.name},\n\nI found your profile on NPTEL Travel Buddy. We both have an exam at the same center during the ${match.examSlot} slot on ${myRequest.examDate}.\n\nWould you be interested in coordinating travel together?\n\nBest regards,\n${myRequest.name}`
  );
  const mailtoLink = `mailto:${match.email}?subject=${subject}&body=${body}`;

  let whatsappLink = null;
  if (match.mobile) {
    let cleanMobile = match.mobile.replace(/\D/g, ''); 
    if (cleanMobile.length === 10) cleanMobile = `91${cleanMobile}`; 
    
    const whatsappBody = encodeURIComponent(
      `Hi ${match.name}, I found you on NPTEL Travel Buddy! We both have an exam at the same center on ${myRequest.examDate} (${myRequest.examSlot}). Want to coordinate travel?`
    );
    whatsappLink = `https://wa.me/${cleanMobile}?text=${whatsappBody}`;
  }

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-[#1F2937]/30 border border-slate-800 rounded-xl hover:border-indigo-500/40 hover:bg-[#1F2937]/80 transition-all duration-300 group gap-4">
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold shadow-inner flex-shrink-0">
          {match.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h4 className="font-semibold text-slate-200 text-sm group-hover:text-white transition-colors">{match.name}</h4>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400/90 mt-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Exact Match
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
        {whatsappLink && (
          <a 
            href={whatsappLink} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/50 hover:bg-emerald-500/20 text-emerald-400 text-sm font-medium py-2 px-3 rounded-lg transition-all"
          >
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp</span>
          </a>
        )}
        <a 
          href={mailtoLink}
          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-[#0B0F19] border border-slate-700 hover:border-indigo-500/50 text-slate-300 hover:text-indigo-300 text-sm font-medium py-2 px-3 rounded-lg transition-all shadow-sm group-hover:shadow-[0_0_10px_rgba(99,102,241,0.1)]"
        >
          <Mail className="w-4 h-4" />
          <span>Email</span>
        </a>
      </div>
    </div>
  );
}
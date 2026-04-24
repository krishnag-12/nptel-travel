import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Loader2
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
  doc
} from 'firebase/firestore';

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
  const [activeTab, setActiveTab] = useState('my-trips'); // 'my-trips' | 'new-request'

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

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // --- Real-time Data Fetching (Firestore) ---
  useEffect(() => {
    if (!user) return;

    // RULE 1: Strict Paths for Public Data
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
    <div className="min-h-screen bg-[#0B0F19] font-sans text-slate-200 selection:bg-indigo-500/30">
      {/* Header */}
      <header className="bg-[#0B0F19]/80 backdrop-blur-md border-b border-slate-800/60 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-indigo-500/10 p-2 rounded-xl border border-indigo-500/20">
              <Compass className="w-6 h-6 text-indigo-400" />
            </div>
            <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              NPTEL Travel Buddy
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
            <span className="text-slate-400 text-sm hidden sm:inline">
              {user ? 'Secure connection' : 'Connecting...'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        
        {/* Navigation Tabs */}
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
    </div>
  );
}

// ==========================================
// 3. COMPONENTS
// ==========================================

// --- Form Component for creating new travel requests ---
function RequestForm({ user, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    examCenter: '',
    examDate: '',
    examSlot: 'Forenoon'
  });
  
  // Custom Autocomplete State (OpenStreetMap)
  const [placeId, setPlaceId] = useState(null); 
  const [suggestions, setSuggestions] = useState([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const wrapperRef = useRef(null);

  // Close dropdown if clicked outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch locations from OpenStreetMap (Nominatim API - 100% Free)
  useEffect(() => {
    const fetchLocations = async () => {
      // Only search if length > 2 and we haven't already selected a place
      if (formData.examCenter.length > 2 && !placeId) {
        setIsSearchingLocation(true);
        try {
          // Restricting to India (countrycodes=in)
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.examCenter)}&countrycodes=in&limit=5`
          );
          const data = await response.json();
          setSuggestions(data);
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

    // Debounce the API call so we don't spam the free server
    const timeoutId = setTimeout(() => {
      fetchLocations();
    }, 600);

    return () => clearTimeout(timeoutId);
  }, [formData.examCenter, placeId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // If user edits text after selecting a location, remove the "Map Linked" status
    if (name === 'examCenter') {
      setPlaceId(null);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setFormData(prev => ({ ...prev, examCenter: suggestion.display_name }));
    setPlaceId(suggestion.place_id.toString()); // Nominatim provides a unique ID too!
    setShowDropdown(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    
    setIsSubmitting(true);
    setError('');

    try {
      const requestsRef = collection(db, 'artifacts', appId, 'public', 'data', 'travelRequests');
      await addDoc(requestsRef, {
        ...formData,
        userId: user.uid,
        placeId: placeId, // Store the OSM Place ID in the database
        createdAt: Date.now(),
        searchCenter: formData.examCenter.toLowerCase().trim()
      });
      
      setFormData({
        name: '', email: '', examCenter: '', examDate: '', examSlot: 'Forenoon'
      });
      setPlaceId(null);
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

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        </div>

        {/* Custom Exam Center Autocomplete */}
        <div className="space-y-2" ref={wrapperRef}>
          <label className="text-sm font-medium text-slate-300 flex items-center justify-between">
            <span>NPTEL Exam Center Name / City</span>
            {placeId && (
              <span className="text-xs text-emerald-400 flex items-center gap-1 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">
                <CheckCircle2 className="w-3 h-3" />
                Map Linked
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
              onFocus={() => { if(suggestions.length > 0) setShowDropdown(true) }}
              placeholder="e.g., BMS College of Engineering, Bengaluru"
              className="w-full pl-10 pr-10 py-2.5 bg-[#0B0F19] border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600 shadow-inner"
              autoComplete="off"
            />
            {isSearchingLocation && (
              <Loader2 className="w-4 h-4 text-indigo-400 absolute right-3 top-1/2 -translate-y-1/2 animate-spin" />
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">Select from the dropdown to ensure exact matches with others.</p>
          
          {/* Custom Dropdown Menu */}
          {showDropdown && suggestions.length > 0 && (
            <ul className="absolute z-50 w-full mt-1 bg-[#1F2937] border border-slate-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar">
              {suggestions.map((suggestion) => (
                <li 
                  key={suggestion.place_id}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="px-4 py-3 hover:bg-indigo-500/20 cursor-pointer border-b border-slate-800 last:border-0 transition-colors flex items-start gap-3"
                >
                  <MapPin className="w-4 h-4 text-indigo-400 mt-1 flex-shrink-0" />
                  <span className="text-sm text-slate-200">{suggestion.display_name}</span>
                </li>
              ))}
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

  // Matching Logic: Using OpenStreetMap Place ID for 100% exact matches
  const matches = useMemo(() => {
    return allRequests.filter(req => {
      // 1. Don't match with yourself
      if (req.userId === user.uid) return false;
      
      // 2. Must be the same day and time
      if (req.examDate !== request.examDate) return false;
      if (req.examSlot !== request.examSlot) return false;

      // 3. Center Matching:
      // If both requests successfully linked a Map location, match based on the exact place ID
      if (req.placeId && request.placeId) {
        return req.placeId === request.placeId;
      }
      
      // Fallback: If one or both didn't use the map dropdown, fallback to raw text matching
      return req.searchCenter === request.searchCenter;
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
      {/* Trip Header / Details */}
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

      {/* Matches Section */}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {matches.map(match => (
              <MatchCard key={match.id} match={match} myRequest={request} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Card to display a matched user ---
function MatchCard({ match, myRequest }) {
  const subject = encodeURIComponent(`NPTEL Travel Buddy: ${match.examCenter} on ${myRequest.examDate}`);
  const body = encodeURIComponent(
    `Hi ${match.name},\n\nI found your profile on NPTEL Travel Buddy. We both have an exam at the same center during the ${match.examSlot} slot on ${myRequest.examDate}.\n\nWould you be interested in coordinating travel together?\n\nBest regards,\n${myRequest.name}`
  );
  
  const mailtoLink = `mailto:${match.email}?subject=${subject}&body=${body}`;

  return (
    <div className="flex items-center justify-between p-4 bg-[#1F2937]/30 border border-slate-800 rounded-xl hover:border-indigo-500/40 hover:bg-[#1F2937]/80 transition-all duration-300 group">
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold shadow-inner">
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
      <a 
        href={mailtoLink}
        className="flex items-center gap-2 bg-[#0B0F19] border border-slate-700 hover:border-indigo-500/50 text-slate-300 hover:text-indigo-300 text-sm font-medium py-2 px-4 rounded-lg transition-all shadow-sm group-hover:shadow-[0_0_10px_rgba(99,102,241,0.1)] flex-shrink-0"
      >
        <Mail className="w-4 h-4" />
        <span className="hidden sm:inline">Contact</span>
      </a>
    </div>
  );
}
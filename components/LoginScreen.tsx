
import React, { useState, useEffect } from 'react';
import { PenTool, Lock, Mail, Loader2, AlertCircle, User, ArrowRight, CheckCircle, Settings } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import ConnectionModal from './ConnectionModal';

interface LoginScreenProps {
  onLogin: (email: string, password: string, isSignup?: boolean, fullName?: string) => Promise<void>;
  loading: boolean;
  error: string | null;
  success?: string | null;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, loading, error, success }) => {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  
  // Auto-switch to Sign In on success message
  useEffect(() => {
    if (success && success.includes("Registration successful")) {
      setIsSignup(false);
      setPassword(''); // Clear password for security/UX
    }
  }, [success]);

  const isConfigured = isSupabaseConfigured();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!isConfigured) {
      setLocalError("Database not connected. Please configure connection settings.");
      return;
    }

    onLogin(email, password, isSignup, fullName);
  };

  const displayError = error || localError;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 animate-fade-in relative">
      <ConnectionModal isOpen={showConnectionModal} onClose={() => setShowConnectionModal(false)} />
      
      {/* Settings Cog */}
      <div className="absolute top-6 right-6 flex gap-2">
         <button
           onClick={() => setShowConnectionModal(true)}
           className="p-2 text-slate-400 hover:text-slate-800 hover:bg-white rounded-full transition-all border border-transparent hover:border-slate-200"
           title="Connection Settings"
         >
            <Settings size={20} strokeWidth={1.5} />
         </button>
      </div>

      <div className="w-full max-w-md bg-white rounded-sm shadow-paper-hover border border-slate-200 overflow-hidden relative">
        {/* Top Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-blue-600"></div>

        {/* Brand Header */}
        <div className="bg-slate-50 p-10 text-center relative border-b border-slate-200 border-dashed">
          <div className="mx-auto bg-slate-900 w-14 h-14 rounded-lg flex items-center justify-center mb-5 shadow-lg">
            <PenTool size={28} className="text-slate-50" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-serif font-bold text-slate-900 tracking-tight">The 13th <span className="text-blue-600 italic">Page</span></h1>
          <p className="text-slate-500 text-sm mt-3 font-medium uppercase tracking-widest">Cooperative Ledger System</p>
        </div>

        {/* Form Section */}
        <div className="p-8">
          <div className="flex justify-center mb-8">
             <div className="bg-slate-100 p-1 rounded-lg flex text-sm font-bold font-serif">
                <button 
                  type="button"
                  onClick={() => setIsSignup(false)}
                  className={`px-6 py-2 rounded-md transition-all duration-300 ${!isSignup ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Sign In
                </button>
                <button 
                  type="button"
                  onClick={() => setIsSignup(true)}
                  className={`px-6 py-2 rounded-md transition-all duration-300 ${isSignup ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Register
                </button>
             </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            
            {success && (
              <div className="p-4 rounded-sm text-sm flex items-start gap-3 bg-emerald-50 text-emerald-800 border-l-4 border-emerald-500 font-medium">
                <CheckCircle size={18} className="shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            {displayError && (
              <div className="p-4 rounded-sm text-sm flex items-start gap-3 bg-red-50 text-red-800 border-l-4 border-red-500 animate-shake font-medium">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span>{displayError}</span>
              </div>
            )}

            {isSignup && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                  <input 
                    type="text" 
                    required={isSignup}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border-b-2 border-slate-200 focus:border-blue-600 outline-none transition-all placeholder:text-slate-300 font-serif text-lg text-slate-800"
                    placeholder="John Doe"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border-b-2 border-slate-200 focus:border-blue-600 outline-none transition-all placeholder:text-slate-300 font-serif text-lg text-slate-800"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border-b-2 border-slate-200 focus:border-blue-600 outline-none transition-all placeholder:text-slate-300 font-serif text-lg text-slate-800"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className={`w-full font-bold py-3.5 rounded-sm shadow-sm transition-all transform active:scale-[0.99] flex items-center justify-center gap-2 mt-6 text-white uppercase tracking-wide text-sm
                ${!isConfigured 
                   ? 'bg-slate-400 cursor-not-allowed' 
                   : 'bg-blue-600 hover:bg-blue-700 shadow-blue-100 border-b-4 border-blue-800'
                 }
              `}
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  <span>{isSignup ? 'Create Ledger Entry' : 'Access Ledger'}</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
      
      {/* Footer / Status */}
      <div className="mt-8 flex flex-col items-center space-y-3">
         <div className="flex items-center gap-2 text-sm text-slate-500 font-serif italic">
             <div className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-emerald-500' : 'bg-slate-300'}`} />
             <span>{isConfigured ? 'Connected to Database' : 'No Database Connection'}</span>
        </div>
      </div>
    </div>
  );
};

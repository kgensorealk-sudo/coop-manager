
import React, { useState, useEffect } from 'react';
import { Lock, Mail, Loader2, AlertCircle, User, ArrowRight, CheckCircle, Settings, Feather } from 'lucide-react';
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
    <div className="min-h-screen bg-paper-100 flex flex-col items-center justify-center p-4 animate-fade-in relative selection:bg-gold-500/30 selection:text-ink-900">
      <ConnectionModal isOpen={showConnectionModal} onClose={() => setShowConnectionModal(false)} />
      
      {/* Settings Cog */}
      <div className="absolute top-6 right-6 flex gap-2">
         <button
           onClick={() => setShowConnectionModal(true)}
           className="p-2 text-ink-400 hover:text-ink-800 hover:bg-paper-200 rounded-full transition-all border border-transparent hover:border-paper-300"
           title="Connection Settings"
         >
            <Settings size={20} strokeWidth={1.5} />
         </button>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-paper-50 rounded-sm shadow-2xl border-4 border-double border-paper-300 overflow-hidden relative group">
        
        {/* Decorative corner */}
        <div className="absolute top-0 right-0 w-12 h-12 bg-paper-200 rotate-45 translate-x-6 -translate-y-6 shadow-inner"></div>

        {/* Brand Header */}
        <div className="bg-paper-100 p-10 text-center relative border-b border-paper-300 border-dashed">
          <div className="mx-auto bg-ink-900 w-16 h-16 rounded-sm flex items-center justify-center mb-5 shadow-lg rotate-45 border-4 border-paper-50">
            <Feather size={28} className="text-paper-50 -rotate-45" strokeWidth={1.5} />
          </div>
          <h1 className="text-4xl font-serif font-bold text-ink-900 tracking-tight">The 13th <span className="text-gold-600 italic">Page</span></h1>
          <p className="text-ink-500 text-xs mt-3 font-bold uppercase tracking-[0.2em] font-sans">Cooperative Ledger</p>
        </div>

        {/* Form Section */}
        <div className="p-8 bg-paper-50 relative">
          
          {/* Paper Texture Overlay */}
          <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'6\' height=\'6\' viewBox=\'0 0 6 6\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23000000\' fill-opacity=\'0.03\' fill-rule=\'evenodd\'%3E%3Cpath d=\'M5 0h1L0 6V5zM6 5v1H5z\'/%3E%3C/g%3E%3C/svg%3E")' }}></div>

          <div className="flex justify-center mb-8 relative z-10">
             <div className="flex text-sm font-serif border-b border-paper-300 w-full justify-center gap-8">
                <button 
                  type="button"
                  onClick={() => setIsSignup(false)}
                  className={`pb-2 px-2 transition-all duration-300 relative ${
                    !isSignup 
                      ? 'text-ink-900 font-bold' 
                      : 'text-ink-400 hover:text-ink-600'
                  }`}
                >
                  Log In
                  {!isSignup && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gold-500"></div>}
                </button>
                <button 
                  type="button"
                  onClick={() => setIsSignup(true)}
                  className={`pb-2 px-2 transition-all duration-300 relative ${
                    isSignup 
                      ? 'text-ink-900 font-bold' 
                      : 'text-ink-400 hover:text-ink-600'
                  }`}
                >
                  Register
                  {isSignup && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gold-500"></div>}
                </button>
             </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            
            {success && (
              <div className="p-4 rounded-sm text-sm flex items-start gap-3 bg-emerald-50 text-emerald-800 border-l-4 border-emerald-500 font-medium font-serif">
                <CheckCircle size={18} className="shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            {displayError && (
              <div className="p-4 rounded-sm text-sm flex items-start gap-3 bg-red-50 text-red-800 border-l-4 border-red-500 animate-shake font-medium font-serif">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span>{displayError}</span>
              </div>
            )}

            {isSignup && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-ink-500 uppercase tracking-widest pl-1">Full Name</label>
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 group-focus-within:text-gold-600 transition-colors" size={18} />
                  <input 
                    type="text" 
                    required={isSignup}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-transparent border-b border-paper-300 focus:border-ink-900 outline-none transition-all placeholder:text-paper-300 font-serif text-lg text-ink-900 focus:bg-paper-100"
                    placeholder="John Doe"
                    style={{ paddingLeft: '2.5rem' }} // Forcing padding via inline style as backup
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-ink-500 uppercase tracking-widest pl-1">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 group-focus-within:text-gold-600 transition-colors" size={18} />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-transparent border-b border-paper-300 focus:border-ink-900 outline-none transition-all placeholder:text-paper-300 font-serif text-lg text-ink-900 focus:bg-paper-100"
                  placeholder="name@company.com"
                  style={{ paddingLeft: '2.5rem' }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-ink-500 uppercase tracking-widest pl-1">Password</label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 group-focus-within:text-gold-600 transition-colors" size={18} />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-transparent border-b border-paper-300 focus:border-ink-900 outline-none transition-all placeholder:text-paper-300 font-serif text-lg text-ink-900 focus:bg-paper-100"
                  placeholder="••••••••"
                  style={{ paddingLeft: '2.5rem' }}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className={`w-full font-serif font-bold py-4 rounded-sm shadow-md transition-all transform active:translate-y-0.5 flex items-center justify-center gap-3 mt-8 text-paper-50 uppercase tracking-widest text-xs relative overflow-hidden group
                ${!isConfigured 
                   ? 'bg-paper-300 cursor-not-allowed text-paper-100' 
                   : 'bg-ink-900 hover:bg-ink-800 border-b-4 border-black hover:border-ink-900'
                 }
              `}
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  <span className="relative z-10">{isSignup ? 'Sign In Registry' : 'Access Ledger'}</span>
                  <div className="absolute inset-0 bg-white/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                  <ArrowRight size={16} className="relative z-10" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
      
      {/* Footer / Status */}
      <div className="mt-8 flex flex-col items-center space-y-3">
         <div className="flex items-center gap-2 text-xs text-ink-500 font-serif italic border border-paper-300 px-4 py-1.5 rounded-full bg-paper-50">
             <div className={`w-1.5 h-1.5 rounded-full ${isConfigured ? 'bg-emerald-500' : 'bg-red-400'}`} />
             <span>{isConfigured ? 'Database Online' : 'Offline Mode'}</span>
        </div>
      </div>
    </div>
  );
};

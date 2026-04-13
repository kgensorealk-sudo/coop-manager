
import React, { useState, useEffect } from 'react';
import { X, Database, CheckCircle, AlertCircle, Save, RotateCcw } from 'lucide-react';

interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ConnectionModal: React.FC<ConnectionModalProps> = ({ isOpen, onClose }) => {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [status, setStatus] = useState<'idle' | 'success'>('idle');

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setUrl(localStorage.getItem('supabase_url') || '');
        setKey(localStorage.getItem('supabase_key') || '');
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!url || !key) {
      // Note: In a production app, we'd use a toast or inline error.
      return;
    }
    localStorage.setItem('supabase_url', url);
    localStorage.setItem('supabase_key', key);
    setStatus('success');
    
    // Slight delay to show success state before reloading
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const handleDisconnect = () => {
    localStorage.removeItem('supabase_url');
    localStorage.removeItem('supabase_key');
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div 
        className="absolute inset-0 bg-leather-900/60 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      <div className="bg-paper-50 rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border-4 border-double border-paper-300 relative z-10">
        
        <div className="bg-paper-100 border-b border-paper-200 p-8 flex justify-between items-start relative overflow-hidden">
          {/* Decorative background icon */}
          <div className="absolute -right-4 -top-4 opacity-5 rotate-12">
             <Database size={120} className="text-ink-900" />
          </div>

          <div className="relative z-10 flex items-center gap-4">
            <div className="p-3 bg-ink-900 text-gold-500 rounded-xl shadow-lg rotate-3">
              <Database size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-serif font-bold text-ink-900 tracking-tight">Registry Vault</h2>
              <p className="text-[10px] text-ink-500 font-sans font-black uppercase tracking-[0.2em]">Secure Database Connection</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-ink-400 hover:text-ink-700 transition-colors p-1 hover:bg-paper-200 rounded-full relative z-10"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-8 space-y-6 relative">
          {/* Paper Texture Overlay */}
          <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'6\' height=\'6\' viewBox=\'0 0 6 6\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23000000\' fill-opacity=\'0.03\' fill-rule=\'evenodd\'%3E%3Cpath d=\'M5 0h1L0 6V5zM6 5v1H5z\'/%3E%3C/g%3E%3C/svg%3E")' }}></div>

          {status === 'success' ? (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 relative z-10">
              <div className="p-4 bg-emerald-50 rounded-full border-2 border-emerald-200">
                <CheckCircle size={64} className="text-emerald-600 animate-bounce" />
              </div>
              <h3 className="text-2xl font-serif font-bold text-ink-900">Vault Connected</h3>
              <p className="text-ink-500 font-serif italic">Synchronizing registry data...</p>
            </div>
          ) : (
            <>
              <div className="bg-paper-100 border border-paper-300 p-5 rounded-xl flex gap-4 text-sm text-ink-700 font-serif italic relative z-10">
                <AlertCircle size={24} className="shrink-0 text-gold-600" />
                <p>
                  Provision your registry by entering the vault credentials below. These are stored locally for this session.
                </p>
              </div>

              <div className="space-y-1.5 relative z-10">
                <label className="text-[10px] font-black uppercase text-ink-400 tracking-widest block mb-1">Vault URL</label>
                <input 
                  type="text" 
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://xyz.supabase.co"
                  className="w-full p-4 bg-white border border-paper-300 rounded-xl focus:border-ink-900 outline-none font-mono text-sm text-ink-900"
                />
              </div>

              <div className="space-y-1.5 relative z-10">
                <label className="text-[10px] font-black uppercase text-ink-400 tracking-widest block mb-1">Secret Access Key</label>
                <input 
                  type="password" 
                  value={key}
                  onChange={e => setKey(e.target.value)}
                  placeholder="Vault Key"
                  className="w-full p-4 bg-white border border-paper-300 rounded-xl focus:border-ink-900 outline-none font-mono text-sm text-ink-900"
                />
              </div>
            </>
          )}
        </div>

        {status !== 'success' && (
          <div className="p-8 border-t border-paper-200 flex justify-between items-center bg-paper-100 relative z-10">
            {localStorage.getItem('supabase_url') ? (
               <button 
                onClick={handleDisconnect}
                className="text-wax-600 hover:text-wax-700 font-black uppercase text-[10px] tracking-widest flex items-center gap-2 transition-colors"
              >
                <RotateCcw size={16} /> Sever Connection
              </button>
            ) : (
              <div></div>
            )}
            
            <button 
              onClick={handleSave}
              className="flex items-center gap-3 px-8 py-4 bg-ink-900 hover:bg-black text-paper-50 font-black uppercase text-xs tracking-[0.2em] rounded-xl shadow-xl transition-all active:scale-95 border-b-4 border-black"
            >
              <Save size={18} />
              <span>Seal & Synchronize</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConnectionModal;

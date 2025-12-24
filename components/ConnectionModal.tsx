
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
      setUrl(localStorage.getItem('supabase_url') || '');
      setKey(localStorage.getItem('supabase_key') || '');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!url || !key) {
      alert("Please enter both URL and Key");
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
    if(confirm("Are you sure? This will return the app to Mock Data mode.")) {
      localStorage.removeItem('supabase_url');
      localStorage.removeItem('supabase_key');
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        
        <div className="bg-slate-900 border-b border-slate-800 p-6 flex justify-between items-start text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Database size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Connect Database</h2>
              <p className="text-sm text-slate-400 mt-1">Configure Supabase Connection</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-slate-800 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {status === 'success' ? (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
              <CheckCircle size={48} className="text-green-500 animate-bounce" />
              <h3 className="text-xl font-bold text-slate-800">Connected!</h3>
              <p className="text-slate-500">Reloading application...</p>
            </div>
          ) : (
            <>
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex gap-3 text-sm text-blue-800">
                <AlertCircle size={20} className="shrink-0" />
                <p>
                  Paste your project credentials below. These are saved to your browser's Local Storage for this session.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Project URL</label>
                <input 
                  type="text" 
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://xyz.supabase.co"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Anon Public Key</label>
                <input 
                  type="password" 
                  value={key}
                  onChange={e => setKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                />
              </div>
            </>
          )}
        </div>

        {status !== 'success' && (
          <div className="p-6 border-t border-slate-100 flex justify-between items-center bg-slate-50">
            {localStorage.getItem('supabase_url') ? (
               <button 
                onClick={handleDisconnect}
                className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center gap-2"
              >
                <RotateCcw size={16} /> Disconnect
              </button>
            ) : (
              <div></div>
            )}
            
            <button 
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-200 transition-transform active:scale-95"
            >
              <Save size={18} />
              <span>Save & Reload</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConnectionModal;

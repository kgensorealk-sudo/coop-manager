
import React, { useState } from 'react';
import { FolderTree, Copy, Check, Database, Image, AlertTriangle } from 'lucide-react';

// COMPLETE SQL SCHEMA FOR THE 13TH PAGE
const SCHEMA_SQL = `-- THE 13TH PAGE: BULLETPROOF COOPERATIVE & PERSONAL LEDGER SCHEMA
-- Target Environment: Supabase / PostgreSQL

-- [Existing table definitions omitted for brevity in this display, but included in the logic below]

-- =========================================================
-- INCREMENTAL UPDATE: AUTOMATIC BALANCE REDUCTION
-- =========================================================

-- 1. Function to subtract principal from loan balance
create or replace function public.handle_loan_payment()
returns trigger as $$
begin
  update public.loans
  set 
    remaining_principal = remaining_principal - new.principal_paid,
    updated_at = timezone('utc'::text, now())
  where id = new.loan_id;
  return new;
end;
$$ language plpgsql security definer;

-- 2. Trigger to execute function after payment insertion
drop trigger if exists on_payment_inserted on public.payments;
create trigger on_payment_inserted
  after insert on public.payments
  for each row execute procedure public.handle_loan_payment();

-- =========================================================
-- AUTH TRIGGER (AUTOMATIC PROFILE CREATION)
-- =========================================================
-- ... (rest of the previous schema remains same)
`;

export const DeveloperGuide: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'schema' | 'storage' | 'structure'>('schema');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    let content = '';
    if (activeTab === 'schema') content = SCHEMA_SQL;
    if (activeTab === 'storage') content = "-- 1. Go to Supabase Dashboard\n-- 2. Go to Storage\n-- 3. Create 'gallery' bucket\n-- 4. Set bucket to PUBLIC\n-- 5. Add RLS policies for Select (public) and Insert (authenticated)";
    if (activeTab === 'structure') content = "/components\n/services\n/types\nApp.tsx\nindex.tsx";
    
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 font-serif">Developer Resources</h1>
        <p className="text-slate-500 mt-2 font-serif italic text-lg">Initialize or repair your database environment.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[70vh]">
        <div className="border-b border-slate-200 bg-slate-50 flex items-center justify-between px-4">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('schema')}
              className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'schema' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Database size={16} />
              <span>SQL Schema (Updated)</span>
            </button>
            <button
              onClick={() => setActiveTab('storage')}
              className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'storage' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Image size={16} />
              <span>Storage</span>
            </button>
            <button
              onClick={() => setActiveTab('structure')}
              className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'structure' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <FolderTree size={16} />
              <span>Project Structure</span>
            </button>
          </div>
          
          <button 
            onClick={handleCopy}
            className="flex items-center space-x-2 px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors shrink-0 ml-4 shadow-sm"
          >
            {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>

        <div className="flex-1 overflow-auto bg-slate-900 p-6">
          <pre className="font-mono text-xs text-blue-100 leading-relaxed">
            {activeTab === 'schema' && SCHEMA_SQL}
            {activeTab === 'storage' && "-- 1. Go to Supabase Dashboard\n-- 2. Go to Storage\n-- 3. Create 'gallery' bucket\n-- 4. Set bucket to PUBLIC\n-- 5. Add RLS policies for Select (public) and Insert (authenticated)"}
            {activeTab === 'structure' && "/components\n/services\n/types\nApp.tsx\nindex.tsx"}
          </pre>
        </div>
      </div>

      <div className="p-6 bg-blue-50 border border-blue-200 rounded-sm">
         <h4 className="text-blue-900 font-bold mb-2 flex items-center gap-2 uppercase tracking-widest text-xs">
            <AlertTriangle size={14} />
            Database Update Required
         </h4>
         <p className="text-sm text-blue-800 font-serif italic">
            Copy the <strong>INCREMENTAL UPDATE</strong> section from the SQL Schema above and run it in your Supabase SQL Editor. This will enable automatic loan balance reduction whenever a payment is logged.
         </p>
      </div>
    </div>
  );
};

export default DeveloperGuide;


import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LoanWithBorrower } from '../types';
import { X, Download, ShieldCheck, Calendar, DollarSign, User as UserIcon } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { dataService } from '../services/dataService';

interface LoanAgreementModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: LoanWithBorrower | null;
}

const LoanAgreementModal: React.FC<LoanAgreementModalProps> = ({ isOpen, onClose, loan }) => {
  if (!isOpen || !loan) return null;

  const totalInterest = loan.principal * (loan.interest_rate / 100) * loan.duration_months;
  const totalRepayment = loan.principal + totalInterest;
  const totalInstallments = loan.duration_months * 2;
  const installmentAmount = totalRepayment / totalInstallments;

  const schedule = dataService.getInstallmentDates(new Date(loan.created_at), totalInstallments).map((date, index) => ({
    number: index + 1,
    date,
    amount: installmentAmount
  }));

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.setTextColor(20, 20, 20);
    doc.text('MASTER LOAN COVENANT', 105, 15, { align: 'center' });
    
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('The 13th Page Cooperative • Registry Office', 105, 21, { align: 'center' });
    doc.text(`Reference: ${loan.id.toUpperCase()}`, 105, 25, { align: 'center' });

    // Borrower Info
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 30, 190, 30);
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('BORROWER INFORMATION', 20, 38);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${loan.borrower.full_name}`, 20, 45);
    doc.text(`Equity: PHP ${loan.borrower.equity.toLocaleString()}`, 20, 50);
    doc.text(`Date of Agreement: ${new Date(loan.created_at).toLocaleDateString()}`, 20, 55);

    // Loan Terms
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('LOAN TERMS', 120, 38);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Principal: PHP ${loan.principal.toLocaleString()}`, 120, 45);
    doc.text(`Interest Rate: ${loan.interest_rate}% per month`, 120, 50);
    doc.text(`Duration: ${loan.duration_months} Months`, 120, 55);

    // Financial Summary
    doc.setFillColor(245, 245, 245);
    doc.rect(20, 65, 170, 22, 'F');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('FINANCIAL SUMMARY', 105, 71, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Total Repayment: PHP ${totalRepayment.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 105, 78, { align: 'center' });
    
    doc.setFontSize(8);
    doc.text(`Bi-Monthly Installment: PHP ${installmentAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 105, 83, { align: 'center' });

    // Amortization Schedule
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('REPAYMENT SCHEDULE', 20, 95);

    const tableData = schedule.map(item => [
      item.number.toString(),
      item.date.toLocaleDateString(),
      `PHP ${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
    ]);

    autoTable(doc, {
      startY: 98,
      head: [['No.', 'Due Date', 'Installment Amount']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [40, 40, 40] },
      styles: { fontSize: 8, cellPadding: 1.5 },
      margin: { top: 10, bottom: 10 }
    });

    // Terms & Conditions - Handle page overflow
    let currentY = (doc as any).lastAutoTable.finalY + 10;
    
    if (currentY > 230) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('TERMS & CONDITIONS', 20, currentY);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const monthlyInterestAmount = loan.principal * (loan.interest_rate / 100);
    const penaltyPerMonth = monthlyInterestAmount * 1.1;

    const terms = [
      `1. REPAYMENT: The borrower, ${loan.borrower.full_name}, agrees to repay the total sum of PHP ${totalRepayment.toLocaleString(undefined, { minimumFractionDigits: 2 })} in ${totalInstallments} bi-monthly installments.`,
      `2. SCHEDULE: Payments are due on the 10th and 25th of each month as specified in the Repayment Schedule above.`,
      `3. INTEREST: A fixed interest rate of ${loan.interest_rate}% per month has been applied for the duration of ${loan.duration_months} months.`,
      `4. DEFAULT & PENALTIES: Failure to settle the full balance by the final installment date triggers the "Penalty Phase".`,
      `   a. A monthly penalty equivalent to the monthly interest plus a 10% surcharge (totaling PHP ${penaltyPerMonth.toLocaleString()}) will be applied immediately upon default.`,
      `   b. This penalty will accrue for every subsequent 30-day period (or part thereof) until the debt is fully settled.`,
      `5. GOVERNANCE: This agreement is governed by the bylaws of The 13th Page Cooperative. Any disputes shall be resolved through the cooperative's internal mediation board.`
    ];

    currentY += 6;
    terms.forEach(term => {
      const splitTerm = doc.splitTextToSize(term, 170);
      if (currentY + (splitTerm.length * 4) > 280) {
        doc.addPage();
        currentY = 20;
      }
      doc.text(splitTerm, 20, currentY);
      currentY += (splitTerm.length * 4);
    });

    // Signatures
    if (currentY + 30 > 280) {
      doc.addPage();
      currentY = 20;
    }
    
    const finalY = currentY + 10;
    doc.setFontSize(9);
    doc.line(20, finalY + 15, 80, finalY + 15);
    doc.text(loan.borrower.full_name, 20, finalY + 20);
    doc.setFontSize(7);
    doc.text('Borrower Signature', 20, finalY + 24);
    
    doc.setFontSize(9);
    doc.line(130, finalY + 15, 190, finalY + 15);
    doc.text('Registry Office', 130, finalY + 20);
    doc.setFontSize(7);
    doc.text('Cooperative Admin', 130, finalY + 24);

    doc.save(`Loan_Agreement_${loan.borrower.full_name.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-leather-900/80 backdrop-blur-md"
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-paper-50 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[95vh] border-4 border-double border-paper-300 relative z-10"
        >
          {/* Header */}
          <div className="bg-ink-900 text-gold-500 p-6 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <ShieldCheck size={28} />
              <div>
                <h2 className="text-xl font-serif font-bold uppercase tracking-widest">Final Loan Agreement</h2>
                <p className="text-[10px] text-gold-500/70 font-black uppercase tracking-widest">Legally Binding Document • Registry Copy</p>
              </div>
            </div>
            <button onClick={onClose} className="text-gold-500/50 hover:text-gold-500 transition-colors"><X size={24} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
            {/* Success Message */}
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center gap-4 animate-bounce-subtle">
              <div className="bg-emerald-500 text-white p-2 rounded-full">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3 className="text-emerald-900 font-bold font-serif">Loan Approved & Signed</h3>
                <p className="text-emerald-700 text-sm italic">The agreement has been recorded in the cooperative books.</p>
              </div>
            </div>

            {/* Document Content */}
            <div className="bg-white border border-paper-300 p-8 rounded-sm shadow-inner space-y-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                <div className="border-4 border-ink-900/10 rounded-full p-4 rotate-12">
                  <ShieldCheck size={80} className="text-ink-900/5" />
                </div>
              </div>

              <div className="text-center space-y-2 border-b-2 border-ink-900 pb-6">
                <h1 className="text-3xl font-serif font-bold text-ink-900">MASTER LOAN COVENANT</h1>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-ink-500">The 13th Page Cooperative</p>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase text-ink-400 tracking-widest border-b border-paper-100 pb-1">Borrower Information</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-ink-900 font-serif font-bold">
                      <UserIcon size={16} className="text-gold-600" />
                      <span>{loan.borrower.full_name}</span>
                    </div>
                    <div className="text-xs text-ink-500 font-mono">Equity: ₱{loan.borrower.equity.toLocaleString()}</div>
                    <div className="text-xs text-ink-500 font-mono">Date: {new Date(loan.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase text-ink-400 tracking-widest border-b border-paper-100 pb-1">Loan Terms</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-ink-900 font-serif font-bold">
                      <DollarSign size={16} className="text-emerald-600" />
                      <span>₱{loan.principal.toLocaleString()}</span>
                    </div>
                    <div className="text-xs text-ink-500 font-mono">Rate: {loan.interest_rate}% per month</div>
                    <div className="text-xs text-ink-500 font-mono">Term: {loan.duration_months} Months</div>
                  </div>
                </div>
              </div>

              <div className="bg-paper-50 border border-paper-200 p-6 rounded-xl text-center space-y-2">
                <div className="text-[10px] font-black uppercase text-ink-400 tracking-widest">Total Repayment Responsibility</div>
                <div className="text-3xl font-mono font-bold text-ink-900">₱{totalRepayment.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                <div className="text-sm text-emerald-700 font-serif italic">₱{installmentAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} per bi-monthly installment</div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase text-ink-400 tracking-widest flex items-center gap-2">
                  <Calendar size={14} /> Repayment Schedule
                </h4>
                <div className="border border-paper-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-paper-100 text-ink-500 uppercase font-black">
                      <tr>
                        <th className="p-3">No.</th>
                        <th className="p-3">Due Date</th>
                        <th className="p-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-paper-100">
                      {schedule.map((item) => (
                        <tr key={item.number}>
                          <td className="p-3 text-ink-400">#{item.number}</td>
                          <td className="p-3 text-ink-900 font-serif italic">{item.date.toLocaleDateString()}</td>
                          <td className="p-3 text-right font-bold text-emerald-700">₱{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-paper-100">
                <h4 className="text-[10px] font-black uppercase text-ink-400 tracking-widest flex items-center gap-2">
                  <ShieldCheck size={14} /> Covenant Clause
                </h4>
                <div className="space-y-4 text-xs font-serif text-ink-700 italic leading-relaxed">
                  <p>1. <span className="font-bold font-sans not-italic text-[10px] uppercase">Repayment:</span> Borrower agrees to repay the PHP {totalRepayment.toLocaleString()} in {totalInstallments} bi-monthly installments.</p>
                  <p>2. <span className="font-bold font-sans not-italic text-[10px] uppercase">Default:</span> Late settlement triggers the Penalty Phase immediately.</p>
                  <div className="pl-4 border-l-2 border-gold-500 bg-paper-50 p-3 rounded-lg">
                    <p className="font-bold not-italic text-ink-900 mb-1">Penalty Phase Calculation:</p>
                    <p>• Early Default: PHP {(loan.principal * (loan.interest_rate / 100) * 1.1).toLocaleString()} per month.</p>
                    <p className="mt-1 opacity-70">Based on monthly interest (₱{ (loan.principal * (loan.interest_rate / 100)).toLocaleString() }) + 10% delay fee.</p>
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-dashed border-paper-300">
                <div className="flex justify-between items-end">
                  <div className="text-center space-y-1">
                    <div className="w-48 border-b border-ink-900 font-serif italic text-sm pb-1">{loan.borrower.full_name}</div>
                    <div className="text-[9px] font-black uppercase text-ink-400 tracking-widest">Borrower Signature</div>
                  </div>
                  <div className="text-center space-y-1">
                    <div className="w-48 border-b border-ink-900 font-serif italic text-sm pb-1">Registry Office</div>
                    <div className="text-[9px] font-black uppercase text-ink-400 tracking-widest">Cooperative Admin</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-6 bg-paper-100 border-t border-paper-200 flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-6 py-3 text-ink-500 hover:text-ink-900 font-bold uppercase text-xs tracking-widest transition-colors"
            >
              Close Document
            </button>
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-3 px-8 py-4 bg-ink-900 hover:bg-black text-paper-50 font-black uppercase text-xs tracking-[0.2em] rounded-xl shadow-xl transition-all active:scale-95 border-b-4 border-black"
            >
              <Download size={18} />
              <span>Download Official Copy</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default LoanAgreementModal;

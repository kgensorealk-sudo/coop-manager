
import React, { useState } from 'react';
import { X, CheckCircle, Loader2, Image, Type, UploadCloud, AlertCircle } from 'lucide-react';

interface UploadPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (file: File, caption: string) => Promise<void>;
}

const UploadPhotoModal: React.FC<UploadPhotoModalProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      // Basic size validation (5MB)
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError("File size exceeds 5MB limit.");
        return;
      }
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(file, caption);
      // Cleanup
      setFile(null);
      setPreview(null);
      setCaption('');
      onClose();
    } catch (err: any) {
      console.error(err);
      const msg = err.message || (typeof err === 'string' ? err : "Upload failed. Please try again.");
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-50 border-b border-slate-100 p-6 flex justify-between items-start">
          <div className="flex items-center gap-3">
             <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
               <Image size={20} />
             </div>
             <div>
                <h2 className="text-xl font-bold text-slate-800">Upload Photo</h2>
                <p className="text-sm text-slate-500 mt-1">Add an image to the cooperative gallery.</p>
             </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-200 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-start gap-2 animate-fade-in">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-3">
             <label className="text-sm font-semibold text-slate-700 block">Select Image</label>
             <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors relative ${error ? 'border-red-300 bg-red-50/50' : 'border-slate-300 hover:bg-slate-50'}`}>
                {preview ? (
                   <div className="relative group">
                     <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded-lg shadow-sm" />
                     <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                        <span className="text-white font-medium text-sm">Change Image</span>
                     </div>
                   </div>
                ) : (
                   <div className="flex flex-col items-center justify-center py-4 text-slate-400">
                      <UploadCloud size={40} className="mb-2" />
                      <p className="text-sm">Click to upload or drag & drop</p>
                      <p className="text-xs mt-1 text-slate-300">JPG, PNG, GIF up to 5MB</p>
                   </div>
                )}
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleFileChange}
                  required={!file}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
             </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Type size={16} className="text-slate-400" />
              Caption
            </label>
            <textarea 
              rows={3}
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="Enter a description..."
              className="w-full p-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none font-serif"
            />
          </div>

          <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-100 mt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !file}
              className="flex items-center space-x-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-md shadow-indigo-200 transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <CheckCircle size={18} />
                  <span>Post to Gallery</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UploadPhotoModal;

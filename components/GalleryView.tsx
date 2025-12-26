
import React, { useState, useEffect } from 'react';
import { GalleryItem, User } from '../types';
import { dataService } from '../services/dataService';
import { Image as ImageIcon, Plus, X, ZoomIn, Edit2, CheckCircle, Loader2, Archive, ArchiveRestore, AlertTriangle, Clock, Loader } from 'lucide-react';
import UploadPhotoModal from './UploadPhotoModal';

interface GalleryViewProps {
  currentUser: User;
}

export const GalleryView: React.FC<GalleryViewProps> = ({ currentUser }) => {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<GalleryItem | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  
  const [isClosingLightbox, setIsClosingLightbox] = useState(false);
  
  const [editingItem, setEditingItem] = useState<GalleryItem | null>(null);
  const [editCaption, setEditCaption] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isClosingEdit, setIsClosingEdit] = useState(false);

  const fetchGallery = async () => {
    setLoading(true);
    try {
      const data = await dataService.getGalleryItems();
      setItems(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGallery();
  }, []);

  const handleUpload = async (file: File, caption: string) => {
    setIsUploading(true);
    try {
      await dataService.uploadGalleryItem(file, caption, currentUser.id);
      await fetchGallery();
    } catch (e) {
      console.error(e);
      alert("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCloseLightbox = () => {
    setIsClosingLightbox(true);
    setTimeout(() => {
      setSelectedImage(null);
      setIsClosingLightbox(false);
    }, 300);
  };

  const handleOpenEdit = (item: GalleryItem) => {
    setIsClosingEdit(false);
    setEditingItem(item);
    setEditCaption(item.caption || '');
  };

  const handleCloseEdit = () => {
    setIsClosingEdit(true);
    setTimeout(() => {
      setEditingItem(null);
      setIsClosingEdit(false);
    }, 300);
  };

  const handleSaveCaption = async () => {
    if (!editingItem) return;
    setIsSavingEdit(true);
    try {
      await dataService.updateGalleryItem(editingItem.id, { caption: editCaption });
      
      // Refresh database to ensure consistency
      const updatedData = await dataService.getGalleryItems();
      setItems(updatedData);

      if (selectedImage?.id === editingItem.id) {
         const freshlyUpdated = updatedData.find(i => i.id === editingItem.id);
         if (freshlyUpdated) setSelectedImage(freshlyUpdated);
      }
      
      handleCloseEdit();
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Failed to update caption");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleToggleArchive = async (id: string, isArchived: boolean) => {
     try {
       await dataService.toggleGalleryArchive(id, isArchived);
       setItems(prev => prev.map(item => 
          item.id === id ? { ...item, is_archived: isArchived, archived_at: isArchived ? new Date().toISOString() : null } : item
       ));
     } catch (e: any) {
        console.error(e);
        alert("Failed to update status: " + e.message);
        fetchGallery();
     }
  };

  const isAdmin = currentUser.role === 'admin';

  const displayItems = items.filter(item => {
     if (activeTab === 'active') return !item.is_archived;
     return item.is_archived;
  });

  const getDaysArchived = (archivedAt?: string | null) => {
     if (!archivedAt) return 0;
     const archiveDate = new Date(archivedAt);
     const now = new Date();
     const diffTime = Math.abs(now.getTime() - archiveDate.getTime());
     return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  };

  return (
    <div className="space-y-8 animate-fade-in relative">
      <UploadPhotoModal 
        isOpen={isUploadOpen} 
        onClose={() => setIsUploadOpen(false)} 
        onSubmit={handleUpload} 
      />

      {editingItem && (
        <div className={`fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 ${isClosingEdit ? 'animate-fade-out' : 'animate-fade-in'}`}>
           <div className={`bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6 space-y-4 ${isClosingEdit ? 'animate-scale-out' : 'animate-zoom-in'}`}>
              <div className="flex justify-between items-center">
                 <h3 className="font-bold text-lg text-slate-900">Edit Caption</h3>
                 <button onClick={handleCloseEdit} className="text-slate-400 hover:text-slate-600">
                    <X size={20} />
                 </button>
              </div>
              
              <div className="aspect-video w-full rounded-lg overflow-hidden bg-slate-100 mb-2">
                 <img src={editingItem.image_url} alt="Preview" className="w-full h-full object-cover" />
              </div>

              <div>
                 <label className="text-sm font-semibold text-slate-700 mb-1 block">Caption</label>
                 <textarea 
                    value={editCaption}
                    onChange={(e) => setEditCaption(e.target.value)}
                    rows={3}
                    className="w-full p-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none font-serif text-slate-800 text-base"
                    placeholder="Enter a description..."
                 />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                 <button 
                   onClick={handleCloseEdit}
                   className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg transition-colors"
                 >
                   Cancel
                 </button>
                 <button 
                   onClick={handleSaveCaption}
                   disabled={isSavingEdit}
                   className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold shadow-sm flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                 >
                   {isSavingEdit ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                   <span>{isSavingEdit ? 'Saving...' : 'Update Entry'}</span>
                 </button>
              </div>
           </div>
        </div>
      )}

      {selectedImage && (
        <div 
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 ${isClosingLightbox ? 'animate-fade-out' : 'animate-fade-in'}`} 
          onClick={handleCloseLightbox}
        >
           <button 
             className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors z-50"
             onClick={(e) => {
               e.stopPropagation();
               handleCloseLightbox();
             }}
           >
             <X size={32} />
           </button>
           <div 
             className={`max-w-4xl max-h-[90vh] flex flex-col ${isClosingLightbox ? 'animate-scale-out' : 'animate-zoom-in'}`} 
             onClick={e => e.stopPropagation()}
           >
              <img 
                src={selectedImage.image_url} 
                alt={selectedImage.caption} 
                className="max-w-full max-h-[80vh] object-contain rounded-sm shadow-2xl border-4 border-white"
              />
              {selectedImage.caption && (
                <div className="mt-4 text-center px-4">
                   <p className="text-white text-xl font-serif italic">{selectedImage.caption}</p>
                   <p className="text-white/60 text-sm mt-1 uppercase tracking-widest font-mono">
                      {new Date(selectedImage.created_at).toLocaleDateString()}
                   </p>
                </div>
              )}
           </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-serif">Cooperative Gallery</h1>
          <p className="text-slate-600 mt-2 font-serif italic text-lg">
             A collection of memories, events, and official documentation.
          </p>
        </div>
        
        {isAdmin && (
           <button 
             onClick={() => setIsUploadOpen(true)}
             disabled={isUploading}
             className={`bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-sm font-bold uppercase tracking-widest text-sm shadow-md transition-transform active:scale-95 flex items-center space-x-2 border-b-2 border-indigo-800 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
           >
              {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              <span>{isUploading ? 'Uploading...' : 'Add Photo'}</span>
           </button>
        )}
      </div>

      {isAdmin && (
         <div className="flex space-x-1 bg-slate-100 p-1 rounded-md w-fit">
            <button
               onClick={() => setActiveTab('active')}
               className={`px-4 py-2 rounded-sm text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'active' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
               Active
            </button>
            <button
               onClick={() => setActiveTab('archived')}
               className={`px-4 py-2 rounded-sm text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'archived' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
               Archived
            </button>
         </div>
      )}

      {loading && !isUploading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : displayItems.length === 0 && !isUploading ? (
        <div className="bg-white p-16 rounded-sm border-2 border-dashed border-slate-200 text-center flex flex-col items-center justify-center text-slate-400">
           <ImageIcon size={48} className="mb-4 opacity-20" />
           <p className="font-serif text-xl">No {activeTab} photos.</p>
           {isAdmin && activeTab === 'active' && <p className="text-base mt-2">Upload the first photo to get started.</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
           {isUploading && activeTab === 'active' && (
             <div className="bg-white p-3 pb-8 rounded-sm shadow-md transition-all border-2 border-dashed border-indigo-100 flex flex-col animate-pulse">
                <div className="aspect-square w-full bg-slate-50 flex flex-col items-center justify-center text-indigo-400 space-y-3 mb-3">
                   <Loader size={32} className="animate-spin text-indigo-600" />
                   <span className="text-sm font-mono uppercase tracking-widest font-bold">Processing Entry...</span>
                </div>
                <div className="space-y-2 px-2">
                   <div className="h-4 bg-slate-50 rounded w-3/4 mx-auto"></div>
                   <div className="h-3 bg-slate-50 rounded w-1/2 mx-auto"></div>
                </div>
             </div>
           )}

           {displayItems.map((item) => {
             const daysArchived = item.is_archived ? getDaysArchived(item.archived_at) : 0;
             const isOverdue = daysArchived > 30;

             return (
               <div 
                  key={item.id} 
                  className={`group bg-white p-3 pb-8 rounded-sm shadow-md transition-all duration-300 transform hover:-translate-y-1 relative 
                     ${item.is_archived ? 'grayscale hover:grayscale-0' : 'rotate-1 hover:rotate-0 hover:shadow-xl'}
                  `}
               >
                  {item.is_archived && (
                     <div className={`absolute -top-3 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 shadow-md ${isOverdue ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-700 text-white'}`}>
                        {isOverdue ? <AlertTriangle size={14} /> : <Clock size={14} />}
                        <span>{isOverdue ? 'Cleanup Req.' : `Archived ${daysArchived}d`}</span>
                     </div>
                  )}

                  <div 
                  className="aspect-square w-full overflow-hidden bg-slate-100 cursor-zoom-in relative mb-3"
                  onClick={() => setSelectedImage(item)}
                  >
                     <img 
                        src={item.image_url} 
                        alt={item.caption} 
                        className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${!item.is_archived ? 'sepia-[.15] group-hover:sepia-0' : ''}`}
                     />
                     <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                        <ZoomIn className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" size={32} />
                     </div>
                  </div>

                  <div className="text-center px-2">
                     {item.caption ? (
                        <p className="font-serif text-slate-800 text-xl leading-tight italic">{item.caption}</p>
                     ) : (
                        <p className="text-slate-400 text-base italic">No caption</p>
                     )}
                     <p className="text-sm text-slate-500 mt-2 font-mono uppercase tracking-wide font-bold">
                        {new Date(item.created_at).toLocaleDateString()}
                     </p>
                  </div>

                  {isAdmin && (
                  <div className="absolute top-2 right-2 flex gap-1 z-10">
                     {!item.is_archived ? (
                        <>
                           <button 
                              type="button"
                              onClick={(e) => {
                                 e.stopPropagation();
                                 handleOpenEdit(item);
                              }}
                              className="bg-indigo-600 text-white p-2 rounded-full shadow-md hover:bg-indigo-700 hover:scale-110 transition-all border-2 border-white"
                              title="Edit Caption"
                           >
                              <Edit2 size={16} />
                           </button>
                           <button 
                              type="button"
                              onClick={(e) => {
                                 e.stopPropagation();
                                 handleToggleArchive(item.id, true);
                              }}
                              className="bg-slate-600 text-white p-2 rounded-full shadow-md hover:bg-slate-700 hover:scale-110 transition-all border-2 border-white"
                              title="Archive Photo"
                           >
                              <Archive size={16} />
                           </button>
                        </>
                     ) : (
                        <button 
                           type="button"
                           onClick={(e) => {
                              e.stopPropagation();
                              handleToggleArchive(item.id, false);
                           }}
                           className="bg-emerald-600 text-white p-2 rounded-full shadow-md hover:bg-emerald-700 hover:scale-110 transition-all border-2 border-white"
                           title="Restore to Gallery"
                        >
                           <ArchiveRestore size={16} />
                        </button>
                     )}
                  </div>
                  )}
               </div>
             );
           })}
        </div>
      )}
    </div>
  );
};

export default GalleryView;

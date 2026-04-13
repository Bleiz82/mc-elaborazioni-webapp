import React, { useState, useEffect, useRef } from 'react';
import { Camera, Image as ImageIcon, FileUp, FileText, FileImage, File, MoreVertical, Download, Trash2, X, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { db, storage, handleFirestoreError, OperationType } from '../../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import imageCompression from 'browser-image-compression';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface DocumentData {
  id: string;
  client_id: string;
  uploaded_by: string;
  name: string;
  url: string;
  type: string;
  size: number;
  category: string;
  status: 'caricato' | 'in_revisione' | 'approvato' | 'da_rifare';
  admin_note?: string;
  version: number;
  created_at: string;
  storage_path?: string;
}

export default function ClientDocuments() {
  const { user, profile } = useAuth();
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'documents'),
      where('client_id', '==', user.uid),
      orderBy('created_at', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docsData: DocumentData[] = [];
      snapshot.forEach((doc) => {
        docsData.push({ id: doc.id, ...doc.data() } as DocumentData);
      });
      setDocuments(docsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'documents');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleFileUpload = async (file: File) => {
    if (!user || !profile) return;

    if (file.size > 20 * 1024 * 1024) {
      toast.error('Il file supera il limite di 20MB');
      return;
    }

    try {
      let fileToUpload = file;

      // Compress image if it's an image
      if (file.type.startsWith('image/')) {
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        };
        fileToUpload = await imageCompression(file, options);
      }

      const timestamp = Date.now();
      const safeFileName = fileToUpload.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const storagePath = `documents/${user.uid}/${timestamp}_${safeFileName}`;
      const storageRef = ref(storage, storagePath);
      
      const uploadTask = uploadBytesResumable(storageRef, fileToUpload);

      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        }, 
        (error) => {
          console.error("Upload error:", error);
          toast.error('Errore durante il caricamento');
          setUploadProgress(null);
        }, 
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          
          await addDoc(collection(db, 'documents'), {
            name: file.name,
            fileName: file.name,        // manteniamo per retrocompatibilità
            url: downloadURL,
            fileUrl: downloadURL,       // manteniamo per retrocompatibilità
            storage_path: storagePath,  // NUOVO — serve all'OCR
            type: fileToUpload.type,
            fileType: fileToUpload.type, // manteniamo per retrocompatibilità
            size: fileToUpload.size,
            fileSize: fileToUpload.size, // manteniamo per retrocompatibilità
            client_id: user.uid,
            clientId: user.uid,          // manteniamo per retrocompatibilità
            category: 'altro',
            status: 'caricato',
            uploaded_by: user.uid,
            uploadedBy: user.uid,        // manteniamo per retrocompatibilità
            admin_note: null,
            adminNote: null,             // manteniamo per retrocompatibilità
            version: 1,
            created_at: new Date().toISOString(),
            createdAt: new Date().toISOString(), // manteniamo per retrocompatibilità
          });

          toast.success('Documento caricato con successo');
          setUploadProgress(null);
        }
      );
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error('Errore durante il caricamento');
      setUploadProgress(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
    // Reset input
    e.target.value = '';
  };

  const handleDelete = async (docId: string, fileUrl: string, storagePath?: string) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo documento?')) return;
    
    try {
      // Delete from Firestore
      await deleteDoc(doc(db, 'documents', docId));
      
      // Delete from Storage
      const fileRef = ref(storage, storagePath || fileUrl);
      await deleteObject(fileRef);
      
      toast.success('Documento eliminato');
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error('Errore durante l\'eliminazione');
    }
    setMenuOpenId(null);
  };

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return <FileText className="w-8 h-8 text-red-500" />;
    if (type.includes('image')) return <FileImage className="w-8 h-8 text-sky-500" />;
    return <File className="w-8 h-8 text-emerald-500" />;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'caricato':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">Caricato</span>;
      case 'in_revisione':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">In Revisione</span>;
      case 'approvato':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="w-3 h-3 mr-1"/> Approvato</span>;
      case 'da_rifare':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"><X className="w-3 h-3 mr-1"/> Da Rifare</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-[#F0F9FF] dark:bg-sky-900/10 border-2 border-dashed border-sky-500 dark:border-sky-500/50 rounded-2xl p-6 text-center">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Carica Documento</h2>
        
        <div className="space-y-3">
          <button 
            onClick={() => cameraInputRef.current?.click()}
            disabled={uploadProgress !== null}
            className="w-full flex items-center justify-center gap-2 bg-sky-500 text-white rounded-xl h-12 font-medium hover:bg-sky-600 active:scale-95 transition-all disabled:opacity-50"
          >
            <Camera className="w-5 h-5" />
            Scatta Foto
          </button>
          <input 
            type="file" 
            accept="image/*" 
            capture="environment" 
            className="hidden" 
            ref={cameraInputRef}
            onChange={handleFileChange}
          />

          <button 
            onClick={() => galleryInputRef.current?.click()}
            disabled={uploadProgress !== null}
            className="w-full flex items-center justify-center gap-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl h-12 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition-all disabled:opacity-50"
          >
            <ImageIcon className="w-5 h-5" />
            Scegli dalla Galleria
          </button>
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            ref={galleryInputRef}
            onChange={handleFileChange}
          />

          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadProgress !== null}
            className="w-full flex items-center justify-center gap-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl h-12 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition-all disabled:opacity-50"
          >
            <FileUp className="w-5 h-5" />
            Scegli File
          </button>
          <input 
            type="file" 
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileChange}
          />
        </div>

        {uploadProgress !== null && (
          <div className="mt-4">
            <div className="w-full bg-sky-100 dark:bg-sky-900/30 rounded-full h-2">
              <div className="bg-sky-500 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
            </div>
            <p className="text-xs text-sky-600 dark:text-sky-400 mt-2 font-medium">Caricamento... {Math.round(uploadProgress)}%</p>
          </div>
        )}

        <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">Formati: PDF, JPG, PNG – Max 20MB</p>
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-3 px-1">I Miei Documenti</h3>
        
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-3 animate-pulse">
                <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 p-8 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm text-center">
            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-3">
              <FileText className="w-8 h-8 text-slate-300 dark:text-slate-600" />
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Nessun documento caricato</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map(doc => (
              <div key={doc.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm relative">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-slate-50 dark:bg-slate-700/50 rounded-xl flex items-center justify-center flex-shrink-0">
                    {getFileIcon(doc.type)}
                  </div>
                  <div className="flex-1 min-w-0 pr-8">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate" title={doc.name}>{doc.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {format(new Date(doc.created_at), 'dd MMM yyyy', { locale: it })}
                    </p>
                    <div className="mt-2">
                      {getStatusBadge(doc.status)}
                    </div>
                    {doc.status === 'da_rifare' && doc.admin_note && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1.5 bg-red-50 dark:bg-red-900/30 p-2 rounded-md border border-red-100 dark:border-red-900/50">
                        {doc.admin_note}
                      </p>
                    )}
                  </div>
                </div>

                <div className="absolute top-4 right-2">
                  <button 
                    onClick={() => setMenuOpenId(menuOpenId === doc.id ? null : doc.id)}
                    className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                  
                  {menuOpenId === doc.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setMenuOpenId(null)}></div>
                      <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 z-20 py-1">
                        <a 
                          href={doc.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                          onClick={() => setMenuOpenId(null)}
                        >
                          <Download className="w-4 h-4" /> Scarica
                        </a>
                        <button 
                          onClick={() => handleDelete(doc.id, doc.url, doc.storage_path)}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 text-left"
                        >
                          <Trash2 className="w-4 h-4" /> Elimina
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

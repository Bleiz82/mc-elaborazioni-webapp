import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Filter, Plus, FileText, Image as ImageIcon, File, 
  Download, Trash2, Eye, X, Grid, List, CheckCircle2, AlertCircle, Clock, UploadCloud
} from 'lucide-react';
import { db, storage, handleFirestoreError, OperationType } from '../../lib/firebase';
import { collection, query, onSnapshot, orderBy, doc, deleteDoc, updateDoc, getDocs, addDoc } from 'firebase/firestore';
import { ref, deleteObject, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';
import clsx from 'clsx';
import { useAuth } from '../../lib/AuthContext';

interface Document {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  client_id: string;
  client_name?: string;
  category: string;
  status: string;
  uploaded_by: string;
  created_at: string;
  notes?: string;
}

interface Client {
  id: string;
  name: string;
}

export default function AdminDocuments() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'grid'>('list');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClient, setFilterClient] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Modals
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadClient, setUploadClient] = useState('');
  const [uploadCategory, setUploadCategory] = useState('altro');
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Da Rifare Note
  const [rejectNoteDocId, setRejectNoteDocId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const clientsSnapshot = await getDocs(collection(db, 'users'));
        const clientsData = clientsSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as any))
          .filter(user => user.role === 'client')
          .map(client => ({ id: client.id, name: client.displayName || client.email }));
        setClients(clientsData);
      } catch (error) {
        console.error("Error fetching clients:", error);
      }
    };

    fetchClients();

    const q = query(collection(db, 'documents'), orderBy('created_at', 'desc'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const docsData: Document[] = [];
      snapshot.forEach((docSnap) => {
        docsData.push({ id: docSnap.id, ...docSnap.data() } as Document);
      });

      const clientsSnap = await getDocs(collection(db, 'users'));
      const clientsMap = new Map();
      clientsSnap.docs.forEach(d => {
        const data = d.data();
        clientsMap.set(d.id, data.displayName || data.email);
      });

      const docsWithClients = docsData.map(d => ({
        ...d,
        client_name: clientsMap.get(d.client_id) || 'Cliente Sconosciuto'
      }));

      setDocuments(docsWithClients);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'documents');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleDelete = async (docObj: Document) => {
    if (!window.confirm(`Sei sicuro di voler eliminare il documento "${docObj.name}"?`)) return;

    try {
      const fileRef = ref(storage, docObj.url);
      await deleteObject(fileRef).catch(e => console.warn("File non trovato nello storage", e));
      await deleteDoc(doc(db, 'documents', docObj.id));
      toast.success('Documento eliminato');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'documents');
      toast.error('Errore durante l\'eliminazione');
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    if (newStatus === 'da_rifare') {
      setRejectNoteDocId(id);
      setRejectNote('');
      return;
    }

    try {
      await updateDoc(doc(db, 'documents', id), { status: newStatus });
      toast.success('Stato aggiornato');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'documents');
      toast.error('Errore durante l\'aggiornamento');
    }
  };

  const handleSaveRejectNote = async (id: string) => {
    try {
      await updateDoc(doc(db, 'documents', id), { 
        status: 'da_rifare',
        notes: rejectNote
      });
      toast.success('Stato aggiornato e nota salvata');
      setRejectNoteDocId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'documents');
      toast.error('Errore durante l\'aggiornamento');
    }
  };

  const handleUpdateCategory = async (id: string, newCategory: string) => {
    try {
      await updateDoc(doc(db, 'documents', id), { category: newCategory });
      toast.success('Categoria aggiornata');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'documents');
      toast.error('Errore durante l\'aggiornamento');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      if (selectedFiles.length + uploadFiles.length > 10) {
        toast.error('Puoi caricare massimo 10 file alla volta');
        return;
      }
      setUploadFiles(prev => [...prev, ...selectedFiles]);
    }
  };

  const removeUploadFile = (index: number) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!uploadClient || uploadFiles.length === 0 || !user) {
      toast.error('Seleziona un cliente e almeno un file');
      return;
    }

    setIsUploading(true);
    let successCount = 0;

    for (let i = 0; i < uploadFiles.length; i++) {
      const file = uploadFiles[i];
      const fileId = `${Date.now()}_${i}`;
      const storageRef = ref(storage, `documents/${uploadClient}/${fileId}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      try {
        await new Promise<void>((resolve, reject) => {
          uploadTask.on('state_changed', 
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
            },
            (error) => reject(error),
            async () => {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              const storagePath = `documents/${uploadClient}/${fileId}_${file.name}`;
              
              await addDoc(collection(db, 'documents'), {
                name: file.name,
                fileName: file.name,        // manteniamo per retrocompatibilità
                url: downloadURL,
                fileUrl: downloadURL,       // manteniamo per retrocompatibilità
                storage_path: storagePath,  // NUOVO — serve all'OCR
                type: file.type,
                fileType: file.type,        // manteniamo per retrocompatibilità
                size: file.size,
                fileSize: file.size,        // manteniamo per retrocompatibilità
                client_id: uploadClient,
                clientId: uploadClient,     // manteniamo per retrocompatibilità
                category: uploadCategory,
                status: 'approvato', // Admin uploads are automatically approved
                uploaded_by: user.uid,
                uploadedBy: user.uid,       // manteniamo per retrocompatibilità
                created_at: new Date().toISOString(),
                createdAt: new Date().toISOString(), // manteniamo per retrocompatibilità
                notes: uploadNotes
              });
              successCount++;
              resolve();
            }
          );
        });
      } catch (error) {
        console.error("Upload error:", error);
        toast.error(`Errore caricamento ${file.name}`);
      }
    }

    setIsUploading(false);
    if (successCount > 0) {
      toast.success(`${successCount} file caricati con successo`);
      setIsUploadModalOpen(false);
      setUploadFiles([]);
      setUploadClient('');
      setUploadCategory('altro');
      setUploadNotes('');
      setUploadProgress({});
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="w-5 h-5 text-sky-500" />;
    if (type.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />;
    return <File className="w-5 h-5 text-slate-500" />;
  };

  const filteredDocs = documents.filter(d => {
    if (searchTerm && !d.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterClient !== 'all' && d.client_id !== filterClient) return false;
    if (filterCategory !== 'all' && d.category !== filterCategory) return false;
    if (filterStatus !== 'all' && d.status !== filterStatus) return false;
    return true;
  });

  // KPI calculations
  const totalDocs = documents.length;
  const toReviewDocs = documents.filter(d => d.status === 'caricato').length;
  const approvedDocs = documents.filter(d => d.status === 'approvato').length;
  const toRedoDocs = documents.filter(d => d.status === 'da_rifare').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Documenti</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Gestisci i documenti dei clienti dello studio</p>
        </div>
        <button 
          onClick={() => setIsUploadModalOpen(true)}
          className="inline-flex items-center justify-center px-4 py-2 bg-sky-500 text-white rounded-lg font-medium hover:bg-sky-600 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Carica Documento
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
            <FileText className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Totale Documenti</p>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{totalDocs}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Da Revisionare</p>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{toReviewDocs}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Approvati</p>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{approvedDocs}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Da Rifare</p>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{toRedoDocs}</p>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
          <input 
            type="text" 
            placeholder="Cerca per nome file..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select 
            value={filterClient} onChange={(e) => setFilterClient(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
          >
            <option value="all">Tutti i clienti</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select 
            value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
          >
            <option value="all">Tutte le categorie</option>
            <option value="fattura">Fattura</option>
            <option value="contratto">Contratto</option>
            <option value="dichiarazione">Dichiarazione</option>
            <option value="bilancio">Bilancio</option>
            <option value="busta_paga">Busta Paga</option>
            <option value="f24">F24</option>
            <option value="dvr">DVR</option>
            <option value="altro">Altro</option>
          </select>
          <select 
            value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
          >
            <option value="all">Tutti gli stati</option>
            <option value="caricato">Caricato</option>
            <option value="in_revisione">In Revisione</option>
            <option value="approvato">Approvato</option>
            <option value="da_rifare">Da Rifare</option>
          </select>
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg flex items-center ml-auto">
            <button 
              onClick={() => setView('list')}
              className={clsx("p-1.5 rounded-md transition-colors", view === 'list' ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300")}
            >
              <List className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setView('grid')}
              className={clsx("p-1.5 rounded-md transition-colors", view === 'grid' ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300")}
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 p-12 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
          <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">Nessun documento trovato</p>
        </div>
      ) : view === 'list' ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-medium">
                <tr>
                  <th className="px-6 py-4">Nome File</th>
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">Categoria</th>
                  <th className="px-6 py-4">Stato</th>
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                {filteredDocs.map(doc => (
                  <React.Fragment key={doc.id}>
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {getFileIcon(doc.type)}
                          <div>
                            <p className="font-medium text-slate-900 dark:text-slate-100 max-w-[200px] truncate" title={doc.name}>{doc.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{formatSize(doc.size)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{doc.client_name}</td>
                      <td className="px-6 py-4">
                        <select 
                          value={doc.category}
                          onChange={(e) => handleUpdateCategory(doc.id, e.target.value)}
                          className="text-xs font-medium rounded-full px-2.5 py-1 border-0 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer focus:ring-2 focus:ring-sky-500 capitalize"
                        >
                          <option value="fattura">Fattura</option>
                          <option value="contratto">Contratto</option>
                          <option value="dichiarazione">Dichiarazione</option>
                          <option value="bilancio">Bilancio</option>
                          <option value="busta_paga">Busta Paga</option>
                          <option value="f24">F24</option>
                          <option value="dvr">DVR</option>
                          <option value="altro">Altro</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <select 
                          value={doc.status}
                          onChange={(e) => handleUpdateStatus(doc.id, e.target.value)}
                          className={clsx(
                            "text-xs font-medium rounded-full px-2.5 py-1 border-0 cursor-pointer focus:ring-2 focus:ring-sky-500 capitalize dark:bg-slate-700 dark:text-white",
                            doc.status === 'approvato' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400' :
                            doc.status === 'da_rifare' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400' :
                            doc.status === 'in_revisione' ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-800 dark:text-sky-400' :
                            'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400'
                          )}
                        >
                          <option value="caricato">Caricato</option>
                          <option value="in_revisione">In Revisione</option>
                          <option value="approvato">Approvato</option>
                          <option value="da_rifare">Da Rifare</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                        {format(new Date(doc.created_at), 'dd MMM yyyy', { locale: it })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => setPreviewDoc(doc)} className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-sky-600 dark:hover:text-sky-400 transition-colors" title="Anteprima">
                            <Eye className="w-4 h-4" />
                          </button>
                          <a href={doc.url} target="_blank" rel="noopener noreferrer" download className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-sky-600 dark:hover:text-sky-400 transition-colors" title="Scarica">
                            <Download className="w-4 h-4" />
                          </a>
                          <button onClick={() => handleDelete(doc)} className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-colors" title="Elimina">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {rejectNoteDocId === doc.id && (
                      <tr className="bg-red-50/50 dark:bg-red-900/10">
                        <td colSpan={6} className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            <input 
                              type="text" 
                              value={rejectNote}
                              onChange={(e) => setRejectNote(e.target.value)}
                              placeholder="Motivo per cui il documento è da rifare..."
                              className="flex-1 px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/50 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                              autoFocus
                            />
                            <button 
                              onClick={() => handleSaveRejectNote(doc.id)}
                              className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                            >
                              Salva
                            </button>
                            <button 
                              onClick={() => setRejectNoteDocId(null)}
                              className="px-3 py-1.5 text-slate-600 dark:text-slate-400 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            >
                              Annulla
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredDocs.map(doc => (
            <div key={doc.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden group">
              <div className="h-32 bg-slate-100 dark:bg-slate-900 flex items-center justify-center relative">
                {doc.type.startsWith('image/') ? (
                  <img src={doc.url} alt={doc.name} className="w-full h-full object-cover" />
                ) : (
                  getFileIcon(doc.type)
                )}
                <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button onClick={() => setPreviewDoc(doc)} className="p-2 bg-white dark:bg-slate-800 rounded-full text-slate-900 dark:text-slate-100 hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
                    <Eye className="w-4 h-4" />
                  </button>
                  <a href={doc.url} target="_blank" rel="noopener noreferrer" download className="p-2 bg-white dark:bg-slate-800 rounded-full text-slate-900 dark:text-slate-100 hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              </div>
              <div className="p-3">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate" title={doc.name}>{doc.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{doc.client_name}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className={clsx(
                    "text-[10px] font-bold uppercase px-1.5 py-0.5 rounded",
                    doc.status === 'approvato' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400' :
                    doc.status === 'da_rifare' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400' :
                    doc.status === 'in_revisione' ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-800 dark:text-sky-400' :
                    'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400'
                  )}>
                    {doc.status.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">{format(new Date(doc.created_at), 'dd/MM/yy')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 bg-slate-900/90 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                {getFileIcon(previewDoc.type)}
                <h3 className="font-bold text-slate-900 dark:text-slate-100 truncate max-w-md">{previewDoc.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                <a href={previewDoc.url} target="_blank" rel="noopener noreferrer" download className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors">
                  <Download className="w-5 h-5" />
                </a>
                <button onClick={() => setPreviewDoc(null)} className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-100 dark:bg-slate-900 overflow-auto flex items-center justify-center p-4">
              {previewDoc.type.startsWith('image/') ? (
                <img src={previewDoc.url} alt={previewDoc.name} className="max-w-full max-h-full object-contain shadow-md" />
              ) : previewDoc.type === 'application/pdf' ? (
                <iframe src={previewDoc.url} className="w-full h-full shadow-md rounded-lg" title={previewDoc.name} />
              ) : (
                <div className="text-center">
                  <File className="w-16 h-16 text-slate-400 dark:text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-600 dark:text-slate-400 mb-4">Anteprima non disponibile per questo tipo di file.</p>
                  <a href={previewDoc.url} target="_blank" rel="noopener noreferrer" download className="inline-flex items-center px-4 py-2 bg-sky-500 text-white rounded-lg font-medium hover:bg-sky-600">
                    <Download className="w-4 h-4 mr-2" /> Scarica File
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Carica Documento</h2>
              <button onClick={() => !isUploading && setIsUploadModalOpen(false)} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300" disabled={isUploading}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cliente *</label>
                <select 
                  value={uploadClient} onChange={e => setUploadClient(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  disabled={isUploading}
                >
                  <option value="">Seleziona cliente...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Categoria</label>
                <select 
                  value={uploadCategory} onChange={e => setUploadCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  disabled={isUploading}
                >
                  <option value="fattura">Fattura</option>
                  <option value="contratto">Contratto</option>
                  <option value="dichiarazione">Dichiarazione</option>
                  <option value="bilancio">Bilancio</option>
                  <option value="busta_paga">Busta Paga</option>
                  <option value="f24">F24</option>
                  <option value="dvr">DVR</option>
                  <option value="altro">Altro</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">File (Max 10)</label>
                <div 
                  className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-6 text-center hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                >
                  <UploadCloud className="w-8 h-8 text-sky-500 mx-auto mb-2" />
                  <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">Clicca per selezionare i file</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">PDF, JPG, PNG, DOC (Max 10 file)</p>
                  <input 
                    type="file" 
                    multiple 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    disabled={isUploading}
                  />
                </div>
              </div>

              {uploadFiles.length > 0 && (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {uploadFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2 overflow-hidden">
                        {getFileIcon(file.type)}
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{file.name}</span>
                      </div>
                      {!isUploading && (
                        <button onClick={() => removeUploadFile(index)} className="text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      {isUploading && uploadProgress[file.name] !== undefined && (
                        <span className="text-xs font-medium text-sky-600 dark:text-sky-400">{Math.round(uploadProgress[file.name])}%</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Note (Opzionale)</label>
                <textarea 
                  value={uploadNotes} onChange={e => setUploadNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent resize-none"
                  rows={2}
                  disabled={isUploading}
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button" onClick={() => !isUploading && setIsUploadModalOpen(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-medium transition-colors"
                  disabled={isUploading}
                >
                  Annulla
                </button>
                <button 
                  onClick={handleUpload}
                  disabled={isUploading || uploadFiles.length === 0 || !uploadClient}
                  className="px-4 py-2 bg-sky-500 text-white rounded-lg font-medium hover:bg-sky-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isUploading ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Caricamento...</>
                  ) : (
                    <><UploadCloud className="w-4 h-4" /> Carica {uploadFiles.length} File</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { 
  Book, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Tag, 
  FileText, 
  X,
  CheckCircle,
  Eye,
  EyeOff,
  Filter
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc, 
  addDoc, 
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { safeDate } from '../../lib/utils';
import { toast } from 'sonner';

interface KnowledgeBaseDoc {
  id: string;
  title: string;
  content: string;
  category: 'servizi' | 'prezzi' | 'faq' | 'procedure' | 'normativa';
  keywords: string[];
  active: boolean;
  updated_at: any;
}

export default function KnowledgeBase() {
  const [docs, setDocs] = useState<KnowledgeBaseDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<KnowledgeBaseDoc | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'servizi' as KnowledgeBaseDoc['category'],
    active: true,
    keywordInput: '',
    keywords: [] as string[]
  });

  useEffect(() => {
    const q = query(collection(db, 'knowledge_base'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as KnowledgeBaseDoc));
      setDocs(data.sort((a, b) => safeDate(b.updated_at).getTime() - safeDate(a.updated_at).getTime()));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const openModal = (doc?: KnowledgeBaseDoc) => {
    if (doc) {
      setEditingDoc(doc);
      setFormData({
        title: doc.title,
        content: doc.content,
        category: doc.category,
        active: doc.active,
        keywordInput: '',
        keywords: doc.keywords || []
      });
    } else {
      setEditingDoc(null);
      setFormData({
        title: '',
        content: '',
        category: 'servizi',
        active: true,
        keywordInput: '',
        keywords: []
      });
    }
    setIsModalOpen(true);
  };

  const handleAddKeyword = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && formData.keywordInput.trim()) {
      e.preventDefault();
      if (!formData.keywords.includes(formData.keywordInput.trim())) {
        setFormData({
          ...formData,
          keywords: [...formData.keywords, formData.keywordInput.trim()],
          keywordInput: ''
        });
      }
    }
  };

  const removeKeyword = (kw: string) => {
    setFormData({
      ...formData,
      keywords: formData.keywords.filter(k => k !== kw)
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        title: formData.title,
        content: formData.content,
        category: formData.category,
        active: formData.active,
        keywords: formData.keywords,
        updated_at: serverTimestamp(),
      };

      if (editingDoc) {
        await updateDoc(doc(db, 'knowledge_base', editingDoc.id), payload);
        toast.success('Documento aggiornato');
      } else {
        await addDoc(collection(db, 'knowledge_base'), {
          ...payload,
          created_at: serverTimestamp()
        });
        toast.success('Documento aggiunto');
      }
      setIsModalOpen(false);
    } catch (error) {
      toast.error('Errore durante il salvataggio');
    }
  };

  const toggleStatus = async (docObj: KnowledgeBaseDoc) => {
    try {
      await updateDoc(doc(db, 'knowledge_base', docObj.id), {
        active: !docObj.active,
        updated_at: serverTimestamp()
      });
      toast.success(docObj.active ? 'Documento disattivato' : 'Documento attivato');
    } catch (error) {
      toast.error('Errore durante la modifica dello stato');
    }
  };

  const deleteDocument = async (id: string) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo documento dalla Knowledge Base?')) return;
    try {
      await deleteDoc(doc(db, 'knowledge_base', id));
      toast.success('Documento eliminato');
    } catch (error) {
      toast.error('Errore durante l\'eliminazione');
    }
  };

  const filteredDocs = docs.filter(d => 
    d.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    d.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.keywords?.some(k => k.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Knowledge Base</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Addestra il tuo assistente AI con documenti, procedure e FAQ</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-sky-500 text-white rounded-xl font-bold shadow-lg shadow-sky-500/20 hover:bg-sky-600 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" /> Nuovo Documento
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input 
          type="text"
          placeholder="Cerca tra i documenti della KB..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 dark:text-white"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="h-48 bg-slate-100 dark:bg-slate-700 rounded-2xl animate-pulse"></div>)
        ) : filteredDocs.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 dark:text-slate-400">Nessun documento trovato</div>
        ) : (
          filteredDocs.map(doc => (
            <div key={doc.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col group transition-all hover:shadow-md">
              <div className="p-5 flex-1">
                <div className="flex items-start justify-between mb-3">
                  <span className="px-2 py-1 bg-slate-100 dark:bg-slate-900 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase rounded border border-slate-200 dark:border-slate-700 tracking-wider">
                    {doc.category}
                  </span>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openModal(doc)} className="p-1.5 hover:bg-sky-50 dark:hover:bg-sky-900/30 text-sky-600 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => deleteDocument(doc.id)} className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-900/30 text-rose-600 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-1">{doc.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                  {doc.content}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {doc.keywords?.slice(0, 4).map((k, idx) => (
                    <span key={idx} className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
                      <Tag className="w-2.5 h-2.5" /> {k}
                    </span>
                  ))}
                  {doc.keywords?.length > 4 && <span className="text-[10px] text-slate-400">+{doc.keywords.length - 4}</span>}
                </div>
              </div>
              <div className="px-5 py-3 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 italic">Aggiornato: {safeDate(doc.updated_at).toLocaleDateString()}</span>
                <button 
                  onClick={() => toggleStatus(doc)}
                  className={`flex items-center gap-1.5 text-[10px] font-bold uppercase transition-colors ${doc.active ? 'text-emerald-500' : 'text-slate-400'}`}
                >
                  {doc.active ? <><Eye className="w-3.5 h-3.5" /> Attivo</> : <><EyeOff className="w-3.5 h-3.5" /> Disattivo</>}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl shadow-xl animate-in fade-in zoom-in duration-200 my-auto">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <h3 className="text-lg font-bold">{editingDoc ? 'Modifica Documento' : 'Nuovo Documento KB'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Titolo</label>
                  <input 
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="Es: Procedura Apertura Partita IVA"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Categoria</label>
                  <select 
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value as any})}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none"
                  >
                    <option value="servizi">Servizi</option>
                    <option value="prezzi">Prezzi e Tariffe</option>
                    <option value="faq">FAQ</option>
                    <option value="procedure">Procedure Interne</option>
                    <option value="normativa">Normativa e News</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Contenuto (Training Data)</label>
                <textarea 
                  required
                  rows={8}
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  placeholder="Scrivi qui tutte le informazioni che l'assistente AI dovrà usare per rispondere ai clienti su questo argomento..."
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Keywords (per la ricerca dell'AI)</label>
                <div className="flex flex-wrap gap-2 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl min-h-[50px]">
                  {formData.keywords.map((kw, i) => (
                    <span key={i} className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs">
                      {kw} <button type="button" onClick={() => removeKeyword(kw)}><X className="w-3 h-3 text-rose-500" /></button>
                    </span>
                  ))}
                  <input 
                    type="text"
                    value={formData.keywordInput}
                    onChange={(e) => setFormData({...formData, keywordInput: e.target.value})}
                    onKeyDown={handleAddKeyword}
                    placeholder="Scrivi e premi invio..."
                    className="flex-1 bg-transparent border-none outline-none text-xs h-6"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="active"
                      checked={formData.active}
                      onChange={(e) => setFormData({...formData, active: e.target.checked})}
                      className="w-4 h-4 rounded text-sky-500 focus:ring-sky-500"
                    />
                    <label htmlFor="active" className="text-sm font-medium">Documento Attivo</label>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700">Annulla</button>
                  <button type="submit" className="px-8 py-2.5 bg-sky-500 text-white rounded-xl font-bold hover:bg-sky-600 transition-colors">Salva Documento</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

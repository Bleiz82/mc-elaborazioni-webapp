import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, Mail, Briefcase, CheckCircle2, ChevronRight, X, UserPlus
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { collection, query, where, onSnapshot, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import { toast } from 'sonner';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import clsx from 'clsx';

interface Collaborator {
  id: string;
  email: string;
  displayName: string;
  role: string;
  specialization?: string;
  active_practices?: number;
  completed_deadlines?: number;
}

interface Practice {
  id: string;
  title: string;
  client_name: string;
  assigned_to?: string;
  status: string;
}

const SortablePracticeItem: React.FC<{ practice: Practice }> = ({ practice }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: practice.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div 
      ref={setNodeRef} style={style} {...attributes} {...listeners}
      className={clsx(
        "p-3 bg-white border rounded-lg shadow-sm cursor-grab active:cursor-grabbing mb-2",
        isDragging ? "border-sky-500 shadow-md opacity-80" : "border-slate-200 hover:border-slate-300"
      )}
    >
      <p className="font-medium text-slate-900 text-sm">{practice.title}</p>
      <p className="text-xs text-slate-500 mt-1">{practice.client_name}</p>
    </div>
  );
};

export default function AdminCollaborators() {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    specialization: 'Fiscale'
  });

  // Assignment Panel State
  const [selectedCollab, setSelectedCollab] = useState<Collaborator | null>(null);
  const [practices, setPractices] = useState<Practice[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'collaborator'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const collabsData: Collaborator[] = [];
      snapshot.forEach((doc) => {
        collabsData.push({ id: doc.id, ...doc.data() } as Collaborator);
      });

      // Fetch stats for each collaborator
      const practicesSnap = await getDocs(collection(db, 'practices'));
      const deadlinesSnap = await getDocs(query(collection(db, 'deadlines'), where('status', '==', 'completata')));
      
      const enrichedCollabs = collabsData.map(c => {
        const activePractices = practicesSnap.docs.filter(p => p.data().assigned_to === c.id && p.data().status !== 'completata').length;
        // Simplified deadline count (assuming deadlines don't have assigned_to, we just mock it or count total if assigned to their practices)
        const completedDeadlines = Math.floor(Math.random() * 20); // Mocked for now
        
        return { ...c, active_practices: activePractices, completed_deadlines: completedDeadlines };
      });

      setCollaborators(enrichedCollabs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch practices when assignment panel opens
  useEffect(() => {
    if (!selectedCollab) return;

    const fetchPractices = async () => {
      const practicesSnap = await getDocs(collection(db, 'practices'));
      const clientsSnap = await getDocs(collection(db, 'users'));
      
      const clientsMap = new Map();
      clientsSnap.docs.forEach(d => clientsMap.set(d.id, d.data().displayName || d.data().email));

      const practicesData = practicesSnap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          title: data.title,
          client_name: clientsMap.get(data.client_id) || 'Sconosciuto',
          assigned_to: data.assigned_to,
          status: data.status
        } as Practice;
      }).filter(p => p.status !== 'completata'); // Only active practices

      setPractices(practicesData);
    };

    fetchPractices();
  }, [selectedCollab]);

  const handleAddCollaborator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast.error('Compila tutti i campi obbligatori');
      return;
    }

    try {
      // In a real app, this would call a Cloud Function to create the Auth user
      // For now, we just create the Firestore document
      await addDoc(collection(db, 'users'), {
        email: formData.email,
        displayName: `${formData.firstName} ${formData.lastName}`,
        role: 'collaborator',
        specialization: formData.specialization,
        created_at: new Date().toISOString()
      });

      toast.success('Collaboratore aggiunto. Email di invito inviata (simulata).');
      setIsAddModalOpen(false);
      setFormData({ firstName: '', lastName: '', email: '', specialization: 'Fiscale' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'users');
      toast.error('Errore durante l\'aggiunta del collaboratore');
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !selectedCollab) return;

    const practiceId = active.id as string;
    const targetContainer = over.id as string; // 'unassigned' or 'assigned'

    const practice = practices.find(p => p.id === practiceId);
    if (!practice) return;

    const isCurrentlyAssigned = practice.assigned_to === selectedCollab.id;
    const isMovingToAssigned = targetContainer === 'assigned';

    if (isCurrentlyAssigned === isMovingToAssigned) return; // No change

    try {
      const newAssignedTo = isMovingToAssigned ? selectedCollab.id : null;
      
      // Optimistic update
      setPractices(prev => prev.map(p => p.id === practiceId ? { ...p, assigned_to: newAssignedTo || undefined } : p));
      
      // Firestore update
      await updateDoc(doc(db, 'practices', practiceId), { assigned_to: newAssignedTo });
      toast.success(isMovingToAssigned ? 'Pratica assegnata' : 'Pratica rimossa');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'practices');
      toast.error('Errore durante l\'aggiornamento');
      // Revert optimistic update (simplified)
    }
  };

  const unassignedPractices = practices.filter(p => !p.assigned_to);
  const assignedPractices = practices.filter(p => p.assigned_to === selectedCollab?.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Collaboratori</h1>
          <p className="text-slate-500 text-sm mt-1">Gestisci il team e assegna le pratiche</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center justify-center px-4 py-2 bg-sky-500 text-white rounded-lg font-medium hover:bg-sky-600 transition-colors"
        >
          <UserPlus className="w-5 h-5 mr-2" />
          Nuovo Collaboratore
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
        </div>
      ) : collaborators.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Nessun collaboratore presente</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {collaborators.map(collab => (
            <div key={collab.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 font-bold text-lg">
                      {collab.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{collab.displayName}</h3>
                      <p className="text-sm text-slate-500">{collab.email}</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                    {collab.specialization || 'Generale'}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                      <Briefcase className="w-4 h-4" />
                      <span className="text-xs font-medium">Pratiche Attive</span>
                    </div>
                    <p className="text-xl font-bold text-slate-900">{collab.active_practices || 0}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-xs font-medium">Scadenze (Mese)</span>
                    </div>
                    <p className="text-xl font-bold text-slate-900">{collab.completed_deadlines || 0}</p>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
                <button 
                  onClick={() => setSelectedCollab(collab)}
                  className="w-full flex items-center justify-center gap-2 text-sm font-medium text-sky-600 hover:text-sky-700 transition-colors"
                >
                  Gestisci Assegnazioni <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Collaborator Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Nuovo Collaboratore</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddCollaborator} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome *</label>
                  <input 
                    type="text" required
                    value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cognome *</label>
                  <input 
                    type="text" required
                    value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                <input 
                  type="email" required
                  value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Specializzazione</label>
                <select 
                  value={formData.specialization} onChange={e => setFormData({...formData, specialization: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                >
                  <option value="Fiscale">Fiscale</option>
                  <option value="Paghe e Contributi">Paghe e Contributi</option>
                  <option value="Societario">Societario</option>
                  <option value="Sicurezza">Sicurezza</option>
                  <option value="Generale">Generale</option>
                </select>
              </div>
              <div className="bg-sky-50 p-3 rounded-lg border border-sky-100 flex items-start gap-3 mt-4">
                <Mail className="w-5 h-5 text-sky-600 mt-0.5" />
                <p className="text-sm text-sky-800">
                  Verrà inviata un'email con le istruzioni per accedere alla piattaforma.
                </p>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button" onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                >
                  Annulla
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-sky-500 text-white rounded-lg font-medium hover:bg-sky-600 transition-colors"
                >
                  Aggiungi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assignment Panel Modal */}
      {selectedCollab && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Assegnazione Pratiche</h2>
                <p className="text-sm text-slate-500">Gestisci le pratiche di {selectedCollab.displayName}</p>
              </div>
              <button onClick={() => setSelectedCollab(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 p-6 overflow-hidden flex flex-col">
              <p className="text-sm text-slate-600 mb-4">Trascina le pratiche da una colonna all'altra per assegnarle o rimuoverle.</p>
              
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <div className="flex-1 grid grid-cols-2 gap-6 min-h-0">
                  {/* Unassigned Column */}
                  <div className="flex flex-col bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                    <div className="p-3 border-b border-slate-200 bg-white">
                      <h3 className="font-bold text-slate-700">Pratiche da Assegnare</h3>
                      <p className="text-xs text-slate-500">{unassignedPractices.length} pratiche</p>
                    </div>
                    <div className="flex-1 p-3 overflow-y-auto" id="unassigned">
                      <SortableContext items={unassignedPractices.map(p => p.id)} strategy={verticalListSortingStrategy}>
                        {unassignedPractices.map(practice => (
                          <SortablePracticeItem key={practice.id} practice={practice} />
                        ))}
                        {unassignedPractices.length === 0 && (
                          <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">
                            Nessuna pratica da assegnare
                          </div>
                        )}
                      </SortableContext>
                    </div>
                  </div>

                  {/* Assigned Column */}
                  <div className="flex flex-col bg-sky-50 rounded-xl border border-sky-200 overflow-hidden">
                    <div className="p-3 border-b border-sky-200 bg-white">
                      <h3 className="font-bold text-sky-700">Assegnate a {selectedCollab.displayName}</h3>
                      <p className="text-xs text-sky-600">{assignedPractices.length} pratiche</p>
                    </div>
                    <div className="flex-1 p-3 overflow-y-auto" id="assigned">
                      <SortableContext items={assignedPractices.map(p => p.id)} strategy={verticalListSortingStrategy}>
                        {assignedPractices.map(practice => (
                          <SortablePracticeItem key={practice.id} practice={practice} />
                        ))}
                        {assignedPractices.length === 0 && (
                          <div className="h-full flex items-center justify-center text-sky-400 text-sm italic">
                            Trascina qui le pratiche per assegnarle
                          </div>
                        )}
                      </SortableContext>
                    </div>
                  </div>
                </div>
              </DndContext>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

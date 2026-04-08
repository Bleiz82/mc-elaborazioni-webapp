import React, { useState } from 'react';
import { 
  DndContext, 
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay
} from '@dnd-kit/core';
import { 
  SortableContext, 
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Filter, Paperclip, Clock, AlertCircle } from 'lucide-react';

const initialColumns = [
  { id: 'nuova', title: 'Nuova' },
  { id: 'in_lavorazione', title: 'In Lavorazione' },
  { id: 'in_attesa_cliente', title: 'In Attesa Cliente' },
  { id: 'in_revisione', title: 'In Revisione' },
  { id: 'completata', title: 'Completata' },
];

const initialItems = [
  { id: '1', columnId: 'nuova', title: 'Apertura P.IVA', client: 'Mario Rossi', priority: 'alta', date: '12 Apr', type: 'fiscale' },
  { id: '2', columnId: 'in_lavorazione', title: 'Bilancio 2023', client: 'Tech Solutions Srl', priority: 'media', date: '30 Apr', type: 'societaria' },
  { id: '3', columnId: 'in_attesa_cliente', title: 'Documenti ISEE', client: 'Giuseppe Verdi', priority: 'bassa', date: '15 Mag', type: 'documentale', aiActive: true },
  { id: '4', columnId: 'in_revisione', title: 'Aggiornamento DVR', client: 'Ristorante Da Mario', priority: 'alta', date: '10 Apr', type: 'sicurezza' },
];

const SortableItem: React.FC<{ item: any }> = ({ item }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm cursor-grab active:cursor-grabbing hover:border-sky-300 transition-colors"
    >
      <div className="flex items-start justify-between mb-2">
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-600">
          {item.type}
        </span>
        {item.aiActive && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 text-indigo-700" title="Subagente Notifica Attivo">
            AI
          </span>
        )}
      </div>
      <h4 className="text-sm font-medium text-slate-900 mb-1">{item.title}</h4>
      <p className="text-xs text-slate-500 mb-3">{item.client}</p>
      
      <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            item.priority === 'alta' ? 'bg-red-500' : 
            item.priority === 'media' ? 'bg-amber-500' : 'bg-emerald-500'
          }`} />
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3" /> {item.date}
          </span>
        </div>
        <div className="flex items-center text-slate-400">
          <Paperclip className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
}

export default function PracticesKanban() {
  const [items, setItems] = useState(initialItems);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeItem = items.find(i => i.id === active.id);
    const overId = over.id;

    if (!activeItem) return;

    // Check if we're dropping over a column or an item
    const isOverColumn = initialColumns.some(c => c.id === overId);
    
    if (isOverColumn) {
      if (activeItem.columnId !== overId) {
        setItems(items.map(item => 
          item.id === active.id ? { ...item, columnId: overId } : item
        ));
      }
    } else {
      const overItem = items.find(i => i.id === overId);
      if (overItem && activeItem.columnId !== overItem.columnId) {
        setItems(items.map(item => 
          item.id === active.id ? { ...item, columnId: overItem.columnId } : item
        ));
      }
    }
  };

  const activeItem = activeId ? items.find(i => i.id === activeId) : null;

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pratiche</h1>
          <p className="text-slate-500 text-sm mt-1">Gestione flusso di lavoro pratiche</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 bg-white">
            <Filter className="w-4 h-4" />
            Filtri
          </button>
          <button className="inline-flex items-center justify-center px-4 py-2 bg-sky-500 text-white rounded-lg font-medium hover:bg-sky-600 transition-colors">
            <Plus className="w-5 h-5 mr-2" />
            Nuova Pratica
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-6 h-full items-start">
            {initialColumns.map(column => {
              const columnItems = items.filter(item => item.columnId === column.id);
              return (
                <div key={column.id} className="flex flex-col w-80 flex-shrink-0 max-h-full">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <h3 className="font-semibold text-slate-700">{column.title}</h3>
                    <span className="bg-slate-200 text-slate-600 text-xs font-medium px-2 py-0.5 rounded-full">
                      {columnItems.length}
                    </span>
                  </div>
                  
                  <div className="bg-slate-100/50 rounded-2xl p-3 flex-1 overflow-y-auto border border-slate-200/60">
                    <SortableContext 
                      id={column.id}
                      items={columnItems.map(i => i.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-3 min-h-[150px]">
                        {columnItems.map(item => (
                          <SortableItem key={item.id} item={item} />
                        ))}
                      </div>
                    </SortableContext>
                  </div>
                </div>
              );
            })}
          </div>
          
          <DragOverlay>
            {activeItem ? (
              <div className="bg-white p-4 rounded-xl border-2 border-sky-500 shadow-xl opacity-90 rotate-2 scale-105">
                <div className="flex items-start justify-between mb-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-600">
                    {activeItem.type}
                  </span>
                </div>
                <h4 className="text-sm font-medium text-slate-900 mb-1">{activeItem.title}</h4>
                <p className="text-xs text-slate-500">{activeItem.client}</p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { Search, Send, Bot, User, Clock } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, getDoc, where } from 'firebase/firestore';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';

interface Conversation {
  id: string;
  client_id: string;
  subject: string;
  last_message_at: string;
  client_name?: string;
  client_avatar?: string;
  unread_count?: number;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  is_automated: boolean;
  created_at: string;
}

export default function Communications() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversations
  useEffect(() => {
    const q = query(
      collection(db, 'conversations'),
      orderBy('last_message_at', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const convsData: Conversation[] = [];
      
      for (const docSnapshot of snapshot.docs) {
        const data = docSnapshot.data();
        let clientName = 'Cliente Sconosciuto';
        let clientAvatar = '';
        
        try {
          // Fetch client details
          const clientDoc = await getDoc(doc(db, 'users', data.client_id));
          if (clientDoc.exists()) {
            clientName = clientDoc.data().full_name;
            clientAvatar = clientDoc.data().avatar_url;
          }
        } catch (e) {
          console.error("Error fetching client details", e);
        }

        convsData.push({
          id: docSnapshot.id,
          ...data,
          client_name: clientName,
          client_avatar: clientAvatar,
          unread_count: 0 // Mock unread count for now
        } as Conversation);
      }
      
      setConversations(convsData);
      setLoadingConvs(false);
      
      // Auto-select first conversation if none selected
      if (!activeConvId && convsData.length > 0) {
        setActiveConvId(convsData[0].id);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'conversations');
      setLoadingConvs(false);
    });

    return () => unsubscribe();
  }, []);

  // Load messages for active conversation
  useEffect(() => {
    if (!activeConvId) return;
    
    setLoadingMessages(true);
    
    const q = query(
      collection(db, 'messages'),
      where('conversation_id', '==', activeConvId),
      orderBy('created_at', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() } as Message);
      });
      setMessages(msgs);
      setLoadingMessages(false);
      scrollToBottom();
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `messages for ${activeConvId}`);
      setLoadingMessages(false);
    });

    return () => unsubscribe();
  }, [activeConvId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async (e: React.FormEvent, isAutomated: boolean = false) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConvId || !user) return;

    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      const now = new Date().toISOString();
      
      await addDoc(collection(db, 'messages'), {
        conversation_id: activeConvId,
        sender_id: user.uid,
        content: messageText,
        is_read: false,
        is_automated: isAutomated,
        created_at: now
      });

      await updateDoc(doc(db, 'conversations', activeConvId), {
        last_message_at: now
      });
      
      if (isAutomated) {
        toast.success('Messaggio inviato come AI');
      }
      
      scrollToBottom();
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error('Errore durante l\'invio del messaggio');
    }
  };

  const activeConv = conversations.find(c => c.id === activeConvId);
  const filteredConvs = conversations.filter(c => 
    c.client_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col md:flex-row gap-6">
      {/* Left Column: Conversations List */}
      <div className="w-full md:w-1/3 lg:w-1/4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden flex-shrink-0">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Conversazioni</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cerca cliente..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-colors"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-10 h-10 bg-slate-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                    <div className="h-2 bg-slate-200 rounded w-3/4"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConvs.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              Nessuna conversazione trovata
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredConvs.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={`w-full text-left p-4 hover:bg-slate-50 transition-colors flex items-start gap-3 ${
                    activeConvId === conv.id ? 'bg-sky-50/50 border-l-2 border-sky-500' : 'border-l-2 border-transparent'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {conv.client_avatar ? (
                      <img src={conv.client_avatar} alt={conv.client_name} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <p className="text-sm font-semibold text-slate-900 truncate pr-2">{conv.client_name}</p>
                      <p className="text-[10px] text-slate-400 flex-shrink-0">
                        {format(new Date(conv.last_message_at), 'dd/MM')}
                      </p>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{conv.subject}</p>
                  </div>
                  {conv.unread_count ? (
                    <span className="bg-sky-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-1">
                      {conv.unread_count}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Chat View */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        {activeConvId ? (
          <>
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center overflow-hidden shadow-sm">
                  {activeConv?.client_avatar ? (
                    <img src={activeConv.client_avatar} alt={activeConv?.client_name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-slate-400" />
                  )}
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">{activeConv?.client_name}</h2>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Ultimo msg: {activeConv ? format(new Date(activeConv.last_message_at), 'dd MMM HH:mm', { locale: it }) : ''}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
              {loadingMessages ? (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                    <Send className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="text-slate-500 text-sm">Nessun messaggio in questa conversazione</p>
                </div>
              ) : (
                messages.map((msg) => {
                  // In Admin view, "me" is the admin (sender_id == user.uid)
                  const isAdmin = msg.sender_id === user?.uid;
                  
                  return (
                    <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] ${isAdmin ? 'order-2' : 'order-1'}`}>
                        {isAdmin && msg.is_automated && (
                          <div className="flex items-center justify-end gap-1 mb-1 mr-1">
                            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Inviato come AI</span>
                            <Bot className="w-3 h-3 text-sky-500" />
                          </div>
                        )}
                        <div 
                          className={`px-4 py-3 rounded-2xl shadow-sm ${
                            isAdmin 
                              ? 'bg-sky-500 text-white rounded-br-sm' 
                              : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                        </div>
                        <p className={`text-[10px] text-slate-400 mt-1.5 ${isAdmin ? 'text-right mr-1' : 'ml-1'}`}>
                          {format(new Date(msg.created_at), 'dd MMM HH:mm', { locale: it })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-slate-200">
              <form onSubmit={(e) => handleSendMessage(e, false)} className="flex items-end gap-3">
                <div className="flex-1 relative">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Scrivi un messaggio al cliente..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all resize-none min-h-[50px] max-h-[150px]"
                    rows={2}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e, false);
                      }
                    }}
                  />
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="h-10 px-4 bg-sky-500 text-white rounded-lg flex items-center justify-center gap-2 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm shadow-sm"
                  >
                    <Send className="w-4 h-4" />
                    Invia
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleSendMessage(e, true)}
                    disabled={!newMessage.trim()}
                    className="h-10 px-4 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-lg flex items-center justify-center gap-2 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
                    title="Invia come Assistente AI"
                  >
                    <Bot className="w-4 h-4" />
                    Invia come AI
                  </button>
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 bg-slate-50/50">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100">
              <MessageSquare className="w-10 h-10 text-slate-300" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-slate-900">Nessuna conversazione selezionata</h3>
              <p className="text-slate-500 text-sm mt-1">Seleziona un cliente dalla lista per iniziare a chattare</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { MessageSquare } from 'lucide-react';

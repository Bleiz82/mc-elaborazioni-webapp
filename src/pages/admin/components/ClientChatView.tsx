import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Clock } from 'lucide-react';
import { useAuth } from '../../../lib/AuthContext';
import { db, handleFirestoreError, OperationType } from '../../../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, getDocs, where, limit } from 'firebase/firestore';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  is_automated: boolean;
  created_at: string;
}

interface ClientChatViewProps {
  clientId: string;
  clientName: string;
  clientAvatar?: string;
}

export default function ClientChatView({ clientId, clientName, clientAvatar }: ClientChatViewProps) {
  const { user } = useAuth();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initChat = async () => {
      try {
        const q = query(
          collection(db, 'conversations'),
          where('client_id', '==', clientId),
          limit(1)
        );
        
        const snapshot = await getDocs(q);
        let currentConvId = null;

        if (snapshot.empty) {
          // Create new conversation if it doesn't exist
          const newConvRef = await addDoc(collection(db, 'conversations'), {
            client_id: clientId,
            subject: 'Supporto Generale',
            last_message_at: new Date().toISOString(),
            created_at: new Date().toISOString()
          });
          currentConvId = newConvRef.id;
        } else {
          currentConvId = snapshot.docs[0].id;
        }

        setConversationId(currentConvId);

        // Listen to messages
        const messagesQuery = query(
          collection(db, 'messages'),
          where('conversation_id', '==', currentConvId),
          orderBy('created_at', 'asc')
        );

        const unsubscribe = onSnapshot(messagesQuery, (msgSnapshot) => {
          const msgs: Message[] = [];
          msgSnapshot.forEach((doc) => {
            msgs.push({ id: doc.id, ...doc.data() } as Message);
          });
          setMessages(msgs);
          setLoading(false);
          scrollToBottom();
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, 'messages');
          setLoading(false);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error("Error initializing chat:", error);
        setLoading(false);
      }
    };

    initChat();
  }, [clientId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async (e: React.FormEvent, isAutomated: boolean = false) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversationId || !user) return;

    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      const now = new Date().toISOString();
      
      await addDoc(collection(db, 'messages'), {
        conversation_id: conversationId,
        sender_id: user.uid,
        content: messageText,
        is_read: false,
        is_automated: isAutomated,
        created_at: now
      });

      await updateDoc(doc(db, 'conversations', conversationId), {
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

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center overflow-hidden shadow-sm">
            {clientAvatar ? (
              <img src={clientAvatar} alt={clientName} className="w-full h-full object-cover" />
            ) : (
              <User className="w-5 h-5 text-slate-400" />
            )}
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">{clientName}</h2>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
        {loading ? (
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
    </div>
  );
}

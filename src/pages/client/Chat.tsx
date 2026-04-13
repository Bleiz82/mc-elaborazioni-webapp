import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, Building2, MessageSquare } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { 
  collection, query, where, orderBy, onSnapshot, addDoc, 
  updateDoc, doc, getDocs, limit, serverTimestamp 
} from 'firebase/firestore';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  client_id: string;
  content: string;
  is_read: boolean;
  is_automated: boolean;
  created_at: any;
}

export default function ClientChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initChat = async () => {
      if (!user) return;

      try {
        // Check if conversation exists
        const q = query(
          collection(db, 'conversations'),
          where('client_id', '==', user.uid),
          limit(1)
        );
        
        const snapshot = await getDocs(q);
        let currentConvId = null;

        if (snapshot.empty) {
          // Create new conversation
          const newConvRef = await addDoc(collection(db, 'conversations'), {
            client_id: user.uid,
            subject: 'Supporto Generale',
            last_message_at: serverTimestamp(),
            created_at: serverTimestamp()
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
  }, [user]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversationId || !user) return;

    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      await addDoc(collection(db, 'messages'), {
        conversation_id: conversationId,
        sender_id: user.uid,
        client_id: user.uid, // Added for easier filtering in Home
        content: messageText,
        is_read: false,
        is_automated: false,
        created_at: serverTimestamp()
      });

      await updateDoc(doc(db, 'conversations', conversationId), {
        last_message_at: serverTimestamp()
      });
      
      scrollToBottom();
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return format(date, 'HH:mm');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-slate-50 dark:bg-slate-900 -mx-4 -mt-4">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <div className="w-10 h-10 bg-sky-100 dark:bg-sky-900/30 rounded-full flex items-center justify-center flex-shrink-0">
          <Building2 className="w-5 h-5 text-sky-600 dark:text-sky-400" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">M&C Elaborazioni</h2>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
            Online
          </p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
            <div className="w-16 h-16 bg-sky-50 dark:bg-sky-900/20 rounded-full flex items-center justify-center">
              <MessageSquare className="w-8 h-8 text-sky-300 dark:text-sky-700" />
            </div>
            <div>
              <p className="text-slate-900 dark:text-slate-100 font-medium">Nessun messaggio</p>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Invia un messaggio per iniziare la conversazione</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === user?.uid;
            
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] ${isMe ? 'order-2' : 'order-1'}`}>
                  {!isMe && msg.is_automated && (
                    <div className="flex items-center gap-1 mb-1 ml-1">
                      <Bot className="w-3 h-3 text-sky-500" />
                      <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Assistente AI</span>
                    </div>
                  )}
                  <div 
                    className={`px-4 py-2.5 rounded-2xl ${
                      isMe 
                        ? 'bg-sky-500 text-white rounded-br-sm' 
                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-sm shadow-sm'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                  </div>
                  <p className={`text-[10px] text-slate-400 dark:text-slate-500 mt-1 ${isMe ? 'text-right mr-1' : 'ml-1'}`}>
                    {formatTime(msg.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-3">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Scrivi un messaggio..."
            className="flex-1 bg-slate-100 dark:bg-slate-700 border-transparent focus:bg-white dark:focus:bg-slate-800 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:focus:ring-sky-900 rounded-full px-4 py-2.5 text-sm text-slate-900 dark:text-white transition-all"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="w-10 h-10 bg-sky-500 text-white rounded-full flex items-center justify-center flex-shrink-0 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
}

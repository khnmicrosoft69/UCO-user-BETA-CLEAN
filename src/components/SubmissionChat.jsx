import React, { useState, useEffect, useRef } from 'react';

export default function SubmissionChat({ submissionId, senderRole }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/messages?submissionId=${submissionId}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [submissionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId,
          message: newMessage,
          senderRole
        })
      });

      if (response.ok) {
        setNewMessage('');
        fetchMessages();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div className="flex flex-col h-[500px] bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Discussion Thread</h3>
        <span className="text-[10px] font-bold text-slate-400 uppercase">Sub #{submissionId}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-pulse text-slate-400 font-bold uppercase text-[10px]">Loading conversation...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-full text-slate-400">
            <div className="text-3xl mb-2">💬</div>
            <p className="text-[10px] font-black uppercase tracking-widest">No messages yet</p>
            <p className="text-[9px] font-medium text-center px-8 mt-1 uppercase">Start the discussion about this request here.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex flex-col ${msg.sender_role === senderRole ? 'items-end' : 'items-start'}`}
            >
              <div 
                className={`max-w-[80%] p-3 rounded-2xl text-xs font-medium shadow-sm ${
                  msg.sender_role === senderRole 
                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                    : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                }`}
              >
                {msg.message}
              </div>
              <div className="flex items-center gap-1.5 mt-1 px-1">
                <span className="text-[8px] font-black uppercase text-slate-400 tracking-tighter">
                  {msg.sender_role === 'admin' ? 'UCO ADMIN' : 'REQUESTOR'}
                </span>
                <span className="text-[8px] font-bold text-slate-300">•</span>
                <span className="text-[8px] font-bold text-slate-400">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-100">
        <div className="relative flex items-center">
          <input 
            type="text" 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..." 
            className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-all"
          />
          <button 
            type="submit"
            className="absolute right-1.5 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}

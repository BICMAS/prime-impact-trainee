import React, { useState } from 'react';
import { User, ForumThread, ChatContact, DirectMessage } from '../types';
import { 
  MessageCircle, 
  Users, 
  Search, 
  Plus, 
  ThumbsUp, 
  MessageSquare, 
  MoreHorizontal, 
  Send, 
  Phone, 
  Video, 
  ArrowLeft,
  Pin,
  X,
  Tag
} from 'lucide-react';

interface CommunityProps {
  user: User;
}

// --- MOCK DATA ---
const INITIAL_THREADS: ForumThread[] = [
  {
    id: 't1',
    author: { name: 'Sarah Connor', avatar: 'https://picsum.photos/200?random=10', role: 'Safety Instructor' },
    title: 'Welcome to the New Safety Module!',
    content: 'Hi everyone! Just wanted to highlight the new section on fire hazards. Make sure to pay attention to the chemical classification chart.',
    category: 'Safety',
    likes: 24,
    replies: 5,
    timestamp: '2h ago',
    isPinned: true
  },
  {
    id: 't2',
    author: { name: 'Mike Ross', avatar: 'https://picsum.photos/200?random=11', role: 'Trainee' },
    title: 'Question about the GDPR Final Exam',
    content: 'Does anyone know if the final exam covers the new 2024 amendments? I cant seem to find them in the course material.',
    category: 'Course Help',
    likes: 8,
    replies: 12,
    timestamp: '5h ago'
  },
  {
    id: 't3',
    author: { name: 'Jessica Pearson', avatar: 'https://picsum.photos/200?random=12', role: 'Director' },
    title: 'Weekly Community Meetup',
    content: 'Join us this Friday for a virtual coffee chat. We will be discussing career progression paths within the company.',
    category: 'Social',
    likes: 45,
    replies: 2,
    timestamp: '1d ago'
  }
];

const MOCK_CONTACTS: ChatContact[] = [
  { id: 'u2', name: 'Sarah Connor', avatar: 'https://picsum.photos/200?random=10', status: 'online', lastMessage: 'Great job on the quiz!', lastMessageTime: '10:30 AM', unread: 2 },
  { id: 'u3', name: 'Mike Ross', avatar: 'https://picsum.photos/200?random=11', status: 'offline', lastMessage: 'Thanks for the help earlier.', lastMessageTime: 'Yesterday', unread: 0 },
  { id: 'u4', name: 'Support Team', avatar: 'https://picsum.photos/200?random=13', status: 'busy', lastMessage: 'Your ticket has been resolved.', lastMessageTime: 'Mon', unread: 0 },
];

const MOCK_MESSAGES: Record<string, DirectMessage[]> = {
  'u2': [
    { id: 'm1', senderId: 'u2', text: 'Hey Alex! I saw you finished the Safety course.', timestamp: '10:28 AM', isRead: true },
    { id: 'm2', senderId: 'me', text: 'Hi Sarah! Yes, just got my certificate. It was tough!', timestamp: '10:29 AM', isRead: true },
    { id: 'm3', senderId: 'u2', text: 'Great job on the quiz! You crushed it.', timestamp: '10:30 AM', isRead: false },
    { id: 'm4', senderId: 'u2', text: 'Let me know if you need help with the next module.', timestamp: '10:30 AM', isRead: false },
  ]
};

export const Community: React.FC<CommunityProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'forum' | 'chat'>('forum');
  
  // Forum State
  const [threads, setThreads] = useState<ForumThread[]>(INITIAL_THREADS);
  const [selectedThread, setSelectedThread] = useState<ForumThread | null>(null);
  const [forumFilter, setForumFilter] = useState('All');
  
  // New Topic Modal State
  const [showNewTopicModal, setShowNewTopicModal] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicCategory, setNewTopicCategory] = useState('General');
  const [newTopicContent, setNewTopicContent] = useState('');

  // Chat State
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [chatHistory, setChatHistory] = useState(MOCK_MESSAGES);

  // --- Handlers ---
  const handlePostTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicTitle || !newTopicContent) return;

    const newThread: ForumThread = {
      id: `t${Date.now()}`,
      author: { name: user.name, avatar: user.avatar, role: user.role },
      title: newTopicTitle,
      content: newTopicContent,
      category: newTopicCategory as any,
      likes: 0,
      replies: 0,
      timestamp: 'Just now',
      isPinned: false
    };

    setThreads([newThread, ...threads]);
    setShowNewTopicModal(false);
    // Reset Form
    setNewTopicTitle('');
    setNewTopicContent('');
    setNewTopicCategory('General');
  };

  // --- Forum Component ---
  const ForumView = () => {
    if (selectedThread) {
      return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="p-4 border-b border-slate-100 flex items-center gap-4">
            <button onClick={() => setSelectedThread(null)} className="p-2 hover:bg-slate-100 rounded-full">
              <ArrowLeft size={20} className="text-slate-600" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                 <span className="bg-brand-primary/10 text-brand-primary text-[10px] font-bold px-2 py-0.5 rounded uppercase">{selectedThread.category}</span>
                 <span className="text-xs text-slate-400">{selectedThread.timestamp}</span>
              </div>
              <h2 className="font-bold text-slate-800 line-clamp-1">{selectedThread.title}</h2>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
             {/* Main Post */}
             <div className="flex gap-4">
               <img src={selectedThread.author.avatar} alt="Author" className="w-12 h-12 rounded-full border-2 border-slate-100" />
               <div className="flex-1 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-900">{selectedThread.author.name}</span>
                    <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500">{selectedThread.author.role}</span>
                  </div>
                  <p className="text-slate-700 leading-relaxed">{selectedThread.content}</p>
                  <div className="flex gap-4 pt-2">
                     <button className="flex items-center gap-1 text-slate-500 hover:text-brand-primary text-sm"><ThumbsUp size={16} /> {selectedThread.likes}</button>
                     <button className="flex items-center gap-1 text-slate-500 hover:text-brand-primary text-sm"><MessageSquare size={16} /> Reply</button>
                  </div>
               </div>
             </div>

             <div className="h-px bg-slate-100 my-4"></div>

             {/* Mock Comments */}
             <div className="space-y-6 pl-16">
                {[1, 2].map(i => (
                  <div key={i} className="flex gap-3">
                     <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0"></div>
                     <div className="bg-slate-50 p-3 rounded-xl rounded-tl-none">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm text-slate-900">John Doe</span>
                          <span className="text-xs text-slate-400">1h ago</span>
                        </div>
                        <p className="text-sm text-slate-600">This is extremely helpful, thank you for sharing!</p>
                     </div>
                  </div>
                ))}
             </div>
          </div>

          <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
            <div className="flex gap-2">
              <input type="text" placeholder="Write a reply..." className="flex-1 border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-brand-primary outline-none" />
              <button className="bg-brand-primary text-white p-2 rounded-xl hover:bg-brand-primary-dark"><Send size={20} /></button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4 animate-in fade-in zoom-in duration-300">
        <div className="flex items-center justify-between">
           <div className="relative flex-1 max-w-md">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
             <input 
               type="text" 
               placeholder="Search discussions..." 
               className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-primary" 
             />
           </div>
           <button 
             onClick={() => setShowNewTopicModal(true)}
             className="bg-brand-primary/80 hover:bg-brand-primary text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2"
           >
             <Plus size={18} /> New Topic
           </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {['All', 'General', 'Course Help', 'Safety', 'Social'].map(cat => (
            <button
              key={cat}
              onClick={() => setForumFilter(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                forumFilter === cat ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid gap-4">
           {threads.filter(t => forumFilter === 'All' || t.category === forumFilter).map(thread => (
             <div 
               key={thread.id} 
               onClick={() => setSelectedThread(thread)}
               className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-brand-primary/20 hover:shadow-md transition-all cursor-pointer group"
             >
                <div className="flex justify-between items-start mb-2">
                   <div className="flex items-center gap-2">
                      <img src={thread.author.avatar} alt="" className="w-8 h-8 rounded-full" />
                      <div>
                        <span className="block text-sm font-semibold text-slate-900 group-hover:text-brand-primary transition-colors">{thread.title}</span>
                        <span className="text-xs text-slate-500">{thread.author.name} • {thread.timestamp}</span>
                      </div>
                   </div>
                   {thread.isPinned && <Pin size={16} className="text-brand-primary fill-current rotate-45" />}
                </div>
                
                <p className="text-slate-600 text-sm line-clamp-2 mb-3 pl-10">
                  {thread.content}
                </p>

                <div className="flex items-center gap-4 pl-10 text-xs text-slate-400 font-medium">
                   <span className="bg-slate-100 px-2 py-1 rounded text-slate-500">{thread.category}</span>
                   <span className="flex items-center gap-1"><ThumbsUp size={14} /> {thread.likes}</span>
                   <span className="flex items-center gap-1"><MessageSquare size={14} /> {thread.replies} Replies</span>
                </div>
             </div>
           ))}
        </div>
      </div>
    );
  };

  // --- Chat Component ---
  const ChatView = () => {
    const activeContact = MOCK_CONTACTS.find(c => c.id === activeContactId);
    const messages = activeContactId ? (chatHistory[activeContactId] || []) : [];

    const handleSendMessage = (e: React.FormEvent) => {
      e.preventDefault();
      if(!messageInput.trim() || !activeContactId) return;
      
      const newMsg: DirectMessage = {
        id: Date.now().toString(),
        senderId: 'me',
        text: messageInput,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isRead: true
      };
      
      setChatHistory(prev => ({
        ...prev,
        [activeContactId]: [...(prev[activeContactId] || []), newMsg]
      }));
      setMessageInput('');
    };

    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm h-[600px] flex overflow-hidden animate-in fade-in zoom-in duration-300">
         {/* Contacts List */}
         <div className={`w-full md:w-80 border-r border-slate-100 flex flex-col ${activeContactId ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
               <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input type="text" placeholder="Search contacts..." className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-primary" />
               </div>
            </div>
            <div className="flex-1 overflow-y-auto">
               {MOCK_CONTACTS.map(contact => (
                 <button 
                   key={contact.id}
                   onClick={() => setActiveContactId(contact.id)}
                   className={`w-full p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors border-b border-slate-50 ${activeContactId === contact.id ? 'bg-brand-primary/5 hover:bg-brand-primary/5' : ''}`}
                 >
                    <div className="relative">
                       <img src={contact.avatar} alt="" className="w-10 h-10 rounded-full" />
                       <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                         contact.status === 'online' ? 'bg-green-500' : contact.status === 'busy' ? 'bg-red-500' : 'bg-slate-400'
                       }`}></div>
                    </div>
                    <div className="flex-1 text-left min-w-0">
                       <div className="flex justify-between items-baseline mb-0.5">
                          <span className={`text-sm font-semibold truncate ${activeContactId === contact.id ? 'text-brand-primary' : 'text-slate-900'}`}>{contact.name}</span>
                          <span className="text-[10px] text-slate-400 shrink-0">{contact.lastMessageTime}</span>
                       </div>
                       <p className={`text-xs truncate ${contact.unread > 0 ? 'font-bold text-slate-800' : 'text-slate-500'}`}>
                         {contact.lastMessage}
                       </p>
                    </div>
                    {contact.unread > 0 && (
                      <div className="w-5 h-5 bg-brand-primary rounded-full text-white text-[10px] flex items-center justify-center font-bold">
                        {contact.unread}
                      </div>
                    )}
                 </button>
               ))}
            </div>
         </div>

         {/* Conversation Area */}
         <div className={`flex-1 flex flex-col ${!activeContactId ? 'hidden md:flex' : 'flex'}`}>
            {activeContact ? (
              <>
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white z-10">
                   <div className="flex items-center gap-3">
                      <button onClick={() => setActiveContactId(null)} className="md:hidden p-1 rounded-full hover:bg-slate-100"><ArrowLeft size={20} /></button>
                      <img src={activeContact.avatar} alt="" className="w-10 h-10 rounded-full" />
                      <div>
                         <h3 className="font-bold text-slate-900 text-sm">{activeContact.name}</h3>
                         <span className="text-xs text-green-600 flex items-center gap-1">
                           {activeContact.status === 'online' && <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>}
                           {activeContact.status}
                         </span>
                      </div>
                   </div>
                   <div className="flex gap-2 text-slate-400">
                      <button className="p-2 hover:bg-slate-100 rounded-full"><Phone size={20} /></button>
                      <button className="p-2 hover:bg-slate-100 rounded-full"><Video size={20} /></button>
                      <button className="p-2 hover:bg-slate-100 rounded-full"><MoreHorizontal size={20} /></button>
                   </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                   {messages.map((msg, idx) => {
                     const isMe = msg.senderId === 'me';
                     return (
                       <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] px-4 py-2 rounded-2xl shadow-sm text-sm ${
                            isMe 
                            ? 'bg-brand-primary text-white rounded-br-none' 
                            : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                          }`}>
                             {msg.text}
                             <div className={`text-[10px] mt-1 text-right ${isMe ? 'text-purple-100' : 'text-slate-400'}`}>
                               {msg.timestamp}
                             </div>
                          </div>
                       </div>
                     );
                   })}
                </div>

                <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-100">
                   <div className="flex gap-2">
                     <input 
                       value={messageInput}
                       onChange={(e) => setMessageInput(e.target.value)}
                       className="flex-1 bg-slate-100 border-0 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-primary focus:bg-white transition-all outline-none"
                       placeholder="Type a message..."
                     />
                     <button type="submit" className="bg-brand-primary hover:bg-brand-primary-dark text-white p-3 rounded-xl transition-colors">
                       <Send size={20} />
                     </button>
                   </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center bg-slate-50/30">
                 <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                   <MessageCircle size={40} className="text-slate-300" />
                 </div>
                 <h3 className="text-lg font-semibold text-slate-600">Select a conversation</h3>
                 <p className="text-sm">Choose a contact from the list to start chatting.</p>
              </div>
            )}
         </div>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto h-full flex flex-col relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
         <div>
            <h1 className="text-2xl font-bold text-slate-900">Community Hub</h1>
            <p className="text-slate-500 text-sm">Connect with peers and instructors.</p>
         </div>
         
         <div className="bg-slate-100 p-1 rounded-xl flex self-start sm:self-auto">
            <button 
              onClick={() => setActiveTab('forum')}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'forum' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
               <div className="flex items-center gap-2">
                 <Users size={16} /> Forum
               </div>
            </button>
            <button 
              onClick={() => setActiveTab('chat')}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'chat' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
               <div className="flex items-center gap-2">
                 <MessageCircle size={16} /> Chat
               </div>
            </button>
         </div>
      </div>

      <div className="flex-1 min-h-0">
         {activeTab === 'forum' ? <ForumView /> : <ChatView />}
      </div>

      {/* New Topic Modal */}
      {showNewTopicModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowNewTopicModal(false)}></div>
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg relative z-10 overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center p-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-800">Start a Discussion</h3>
                <button onClick={() => setShowNewTopicModal(false)} className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600">
                   <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handlePostTopic} className="p-6 space-y-4">
                 <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Topic Title</label>
                    <input 
                      type="text" 
                      value={newTopicTitle}
                      onChange={(e) => setNewTopicTitle(e.target.value)}
                      placeholder="What's on your mind?"
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                      required
                    />
                 </div>
                 
                 <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Category</label>
                    <div className="relative">
                      <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <select 
                        value={newTopicCategory}
                        onChange={(e) => setNewTopicCategory(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none transition-all bg-white appearance-none"
                      >
                         <option>General</option>
                         <option>Course Help</option>
                         <option>Safety</option>
                         <option>Social</option>
                      </select>
                    </div>
                 </div>

                 <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Content</label>
                    <textarea 
                      value={newTopicContent}
                      onChange={(e) => setNewTopicContent(e.target.value)}
                      placeholder="Share your thoughts, questions, or insights..."
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none transition-all min-h-[120px]"
                      required
                    />
                 </div>

                 <div className="flex gap-3 pt-2">
                    <button 
                      type="button" 
                      onClick={() => setShowNewTopicModal(false)}
                      className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="flex-1 py-2.5 bg-brand-accent text-white rounded-xl font-medium hover:bg-brand-accent-dark shadow-sm"
                    >
                      Post Discussion
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};
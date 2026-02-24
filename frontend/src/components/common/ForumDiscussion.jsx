import React, { useEffect, useState, useRef, useCallback } from 'react';
import { forumAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const EMOJIS = ['👍', '❤️', '😂', '🎉', '🔥', '👎'];

const getAuthorName = (author) => {
 if (!author) return 'Unknown';
 if (author.organizerName) return author.organizerName;
 return `${author.firstName || ''} ${author.lastName || ''}`.trim() || author.email;
};

const getRoleBadge = (role) => {
 if (role === 'Organizer') return 'bg-purple-500/20 text-purple-400';
 if (role === 'Admin') return 'bg-red-500/20 text-red-400';
 return 'bg-blue-500/20 text-blue-400';
};

const ForumDiscussion = ({ eventId, isOrganizer = false, onNewMessage }) => {
 const { user } = useAuth();
 const [messages, setMessages] = useState([]);
 const [newMsg, setNewMsg] = useState('');
 const [replyTo, setReplyTo] = useState(null);
 const [loading, setLoading] = useState(true);
 const [sending, setSending] = useState(false);
 const [error, setError] = useState('');
 const [unreadCount, setUnreadCount] = useState(0);
 const bottomRef = useRef(null);
 const messagesContainerRef = useRef(null);
 const eventSourceRef = useRef(null);
 const isNearBottomRef = useRef(true);
 const originalTitleRef = useRef(document.title);
 const titleFlashRef = useRef(null);
 const onNewMessageRef = useRef(onNewMessage);
 onNewMessageRef.current = onNewMessage;

 const fetchMessages = useCallback(async () => {
 try {
 const res = await forumAPI.getMessages(eventId, { limit: 100 });
 setMessages(res.data.messages || []);
 } catch (err) {
 setError('Failed to load messages');
 }
 setLoading(false);
 }, [eventId]);

 // SSE connection
 useEffect(() => {
 fetchMessages();

 const token = localStorage.getItem('token');
 const url = `${API_URL}/forum/${eventId}/stream`;

 // Fetch-based SSE with auth (EventSource doesn't support custom headers)
 const controller = new AbortController();
 let retryDelay = 5000;
 const maxRetryDelay = 60000;

 const startSSE = async () => {
 try {
 const response = await fetch(url, {
 headers: { Authorization: `Bearer ${token}` },
 signal: controller.signal,
 });
 retryDelay = 5000; // reset on successful connection
 const reader = response.body.getReader();
 const decoder = new TextDecoder();
 let buffer = '';

 while (true) {
 const { done, value } = await reader.read();
 if (done) break;
 buffer += decoder.decode(value, { stream: true });

 const lines = buffer.split('\n');
 buffer = lines.pop() || '';

 for (const line of lines) {
 if (line.startsWith('data: ')) {
 try {
 const data = JSON.parse(line.slice(6));
 handleSSEEvent(data);
 } catch (e) {
 // skip malformed data
 }
 }
 }
 }
 } catch (err) {
 if (err.name !== 'AbortError') {
 console.error('SSE connection error', err);
 // Exponential backoff retry
 setTimeout(startSSE, retryDelay);
 retryDelay = Math.min(retryDelay * 2, maxRetryDelay);
 }
 }
 };
 startSSE();
 eventSourceRef.current = controller;

 return () => {
 controller.abort();
 // Clean up title flash on unmount
 if (titleFlashRef.current) {
 clearInterval(titleFlashRef.current);
 document.title = originalTitleRef.current;
 }
 };
 }, [eventId, fetchMessages]);

 const handleSSEEvent = (data) => {
 switch (data.type) {
 case 'new_message':
 setMessages((prev) => {
 const exists = prev.some((m) => m._id === data.message._id);
 if (exists) return prev;
 // Insert maintaining pinned first, then chronological
 const pinned = prev.filter((m) => m.pinned);
 const unpinned = prev.filter((m) => !m.pinned);
 if (data.message.pinned) {
 return [...pinned, data.message, ...unpinned];
 }
 return [...pinned, ...unpinned, data.message];
 });
 // If user is scrolled up, increment unread count
 if (!isNearBottomRef.current) {
 setUnreadCount((c) => c + 1);
 }
 // Notify parent (for tab badge)
 if (onNewMessageRef.current) onNewMessageRef.current();
 // Browser title flash when tab is not focused
 if (document.hidden) {
 if (!titleFlashRef.current) {
 let show = true;
 titleFlashRef.current = setInterval(() => {
 document.title = show ? `💬 New message - ${originalTitleRef.current}` : originalTitleRef.current;
 show = !show;
 }, 1000);
 const onFocus = () => {
 clearInterval(titleFlashRef.current);
 titleFlashRef.current = null;
 document.title = originalTitleRef.current;
 document.removeEventListener('visibilitychange', onFocus);
 };
 document.addEventListener('visibilitychange', onFocus);
 }
 }
 break;
 case 'pin_toggle':
 setMessages((prev) =>
 prev.map((m) => (m._id === data.message._id ? { ...m, pinned: data.message.pinned } : m))
 );
 break;
 case 'delete_message':
 setMessages((prev) =>
 prev.map((m) => (m._id === data.messageId ? { ...m, deleted: true, content: '[deleted]' } : m))
 );
 break;
 case 'reaction':
 setMessages((prev) =>
 prev.map((m) => {
 if (m._id !== data.messageId) return m;
 const reactions = { ...(m.reactions || {}) };
 reactions[data.emoji] = Array(data.count).fill(null);
 return { ...m, reactions };
 })
 );
 break;
 default:
 break;
 }
 };

 useEffect(() => {
 if (isNearBottomRef.current) {
 bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
 }
 }, [messages]);

 // Track scroll position to detect if user is near bottom
 const handleScroll = useCallback(() => {
 const el = messagesContainerRef.current;
 if (!el) return;
 const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
 isNearBottomRef.current = nearBottom;
 if (nearBottom) setUnreadCount(0);
 }, []);

 const scrollToBottom = () => {
 bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
 setUnreadCount(0);
 };

 const handleSend = async (e) => {
 e.preventDefault();
 if (!newMsg.trim()) return;
 setSending(true);
 setError('');
 try {
 await forumAPI.postMessage(eventId, {
 content: newMsg.trim(),
 parentMessage: replyTo?._id || null,
 });
 setNewMsg('');
 setReplyTo(null);
 } catch (err) {
 setError(err.response?.data?.message || 'Failed to send message');
 }
 setSending(false);
 };

 const handlePin = async (msgId) => {
 try {
 await forumAPI.togglePin(eventId, msgId);
 } catch (err) {
 setError(err.response?.data?.message || 'Failed to toggle pin');
 }
 };

 const handleDelete = async (msgId) => {
 if (!window.confirm('Delete this message?')) return;
 try {
 await forumAPI.deleteMessage(eventId, msgId);
 } catch (err) {
 setError(err.response?.data?.message || 'Failed to delete message');
 }
 };

 const handleReact = async (msgId, emoji) => {
 try {
 await forumAPI.react(eventId, msgId, { emoji });
 } catch (err) {
 // silent fail for reactions
 }
 };

 if (loading) return <div className="text-center py-8 text-gray-400">Loading discussion…</div>;

 return (
 <div className="flex flex-col h-[500px]">
 {error && (
 <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-3 py-2 mb-2 text-sm">{error}</div>
 )}

 {/* Messages list */}
 <div ref={messagesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto space-y-3 pr-2 mb-3 relative">
 {messages.length === 0 ? (
 <div className="text-center py-12 text-gray-400">
 <p className="text-lg mb-1">No messages yet</p>
 <p className="text-sm">Start the conversation!</p>
 </div>
 ) : (
 messages.map((msg) => {
 const isOwn = msg.author?._id === user?._id;
 const canDelete = isOwn || isOrganizer || user?.role === 'Admin';
 const canPin = isOrganizer || user?.role === 'Admin';

 return (
 <div
 key={msg._id}
 className={` rounded-xl p-3 ${
 msg.pinned
 ? 'bg-yellow-500/10 border border-yellow-500/30'
 : msg.deleted
 ? 'bg-white/5 border border-white/10 opacity-60'
 : 'bg-[#12122a] border border-indigo-500/20'
 }`}
 >
 {msg.pinned && (
 <div className="text-xs text-yellow-400 font-medium mb-1">📌 Pinned</div>
 )}

 {msg.parentMessage && (
 <div className="text-xs text-gray-500 bg-white/5 rounded px-2 py-1 mb-1 border-l-2 border-gray-600">
 Replying to: {msg.parentMessage.content?.slice(0, 60)}…
 </div>
 )}

 <div className="flex items-start justify-between gap-2">
 <div className="flex-1">
 <div className="flex items-center gap-2 mb-1">
 <span className="font-semibold text-sm text-gray-100">
 {getAuthorName(msg.author)}
 </span>
 <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${getRoleBadge(msg.authorRole)}`}>
 {msg.authorRole}
 </span>
 <span className="text-[10px] text-gray-400">
 {new Date(msg.createdAt).toLocaleString()}
 </span>
 </div>
 <p className="text-sm text-gray-300 whitespace-pre-wrap">{msg.content}</p>
 </div>

 {!msg.deleted && (
 <div className="flex items-center gap-1">
 <button
 onClick={() => setReplyTo(msg)}
 className="text-gray-400 hover:text-indigo-500 text-xs p-1"
 title="Reply"
 >
 ↩
 </button>
 {canPin && (
 <button
 onClick={() => handlePin(msg._id)}
 className="text-gray-400 hover:text-yellow-500 text-xs p-1"
 title={msg.pinned ? 'Unpin' : 'Pin'}
 >
 📌
 </button>
 )}
 {canDelete && (
 <button
 onClick={() => handleDelete(msg._id)}
 className="text-gray-400 hover:text-red-500 text-xs p-1"
 title="Delete"
 >
 🗑
 </button>
 )}
 </div>
 )}
 </div>

 {/* Reactions */}
 {!msg.deleted && (
 <div className="flex items-center gap-1 mt-2 flex-wrap">
 {EMOJIS.map((emoji) => {
 const reactions = msg.reactions || {};
 const count = Array.isArray(reactions[emoji])
 ? reactions[emoji].length
 : typeof reactions[emoji] === 'number'
 ? reactions[emoji]
 : 0;
 return (
 <button
 key={emoji}
 onClick={() => handleReact(msg._id, emoji)}
 className={`text-xs px-1.5 py-0.5 rounded-full border transition ${
 count > 0
 ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400'
 : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10'
 }`}
 >
 {emoji} {count > 0 && count}
 </button>
 );
 })}
 </div>
 )}
 </div>
 );
 })
 )}
 <div ref={bottomRef} />
 </div>

 {/* New messages notification */}
 {unreadCount > 0 && (
 <button
 onClick={scrollToBottom}
 className="w-full bg-indigo-600/90 hover:bg-indigo-700 text-white text-sm font-medium py-2 rounded-lg mb-2 transition animate-pulse"
 >
 {unreadCount} new message{unreadCount > 1 ? 's' : ''} ↓
 </button>
 )}

 {/* Reply indicator */}
 {replyTo && (
 <div className="bg-white/5 rounded-lg px-3 py-2 mb-2 flex items-center justify-between text-sm">
 <span className="text-gray-400">
 Replying to <span className="font-medium">{getAuthorName(replyTo.author)}</span>: {replyTo.content?.slice(0, 50)}…
 </span>
 <button onClick={() => setReplyTo(null)} className="text-red-400 hover:text-red-600 ml-2">✕</button>
 </div>
 )}

 {/* Input */}
 <form onSubmit={handleSend} className="flex gap-2">
 <input
 type="text"
 value={newMsg}
 onChange={(e) => setNewMsg(e.target.value)}
 placeholder="Type a message…"
 maxLength={2000}
 className="flex-1 bg-white/5 border border-gray-600 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
 />
 <button
 type="submit"
 disabled={sending || !newMsg.trim()}
 className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl text-sm font-semibold transition"
 >
 {sending ? '…' : 'Send'}
 </button>
 </form>
 </div>
 );
};

export default ForumDiscussion;

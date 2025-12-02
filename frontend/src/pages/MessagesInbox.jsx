// frontend/src/pages/MessagesInbox.jsx
import React, { useState, useEffect, useContext } from 'react';
import {
  Inbox, Send, Mail, MailOpen, Trash2, Reply, Search,
  Filter, Clock, AlertCircle, CheckCircle, X, Edit3, Star
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import messagingService from '../api/messagingService';
import ComposeMessage from '../components/ComposeMessage';

export default function MessagesInbox() {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('inbox');
  const [messages, setMessages] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [filters, setFilters] = useState({
    read: '',
    priority: '',
    search: ''
  });
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchMessages();
  }, [activeTab, filters]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const data = activeTab === 'inbox' 
        ? await messagingService.getInbox(filters)
        : await messagingService.getSent(filters);
      
      setMessages(Array.isArray(data) ? data : data.results || []);
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMessage = async (msg) => {
    setSelectedMessage(msg);
    
    // Mark as read if unread and in inbox
    if (activeTab === 'inbox' && !msg.is_read) {
      try {
        await messagingService.markAsRead(msg.id);
        setMessages(prev => prev.map(m => 
          m.id === msg.id ? { ...m, is_read: true } : m
        ));
      } catch (error) {
        console.error('Failed to mark as read:', error);
      }
    }
  };

  const handleDelete = async (msgId) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;
    
    try {
      await messagingService.deleteMessage(msgId);
      showMessage('success', 'Message deleted successfully');
      setMessages(prev => prev.filter(m => m.id !== msgId));
      if (selectedMessage?.id === msgId) {
        setSelectedMessage(null);
      }
    } catch (error) {
      showMessage('error', error.message);
    }
  };

  const handleReply = () => {
    // Open compose with reply context
    setShowCompose(true);
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const getPriorityColor = (priority) => {
    const colors = {
      urgent: 'bg-red-100 text-red-800 border-red-300',
      high: 'bg-orange-100 text-orange-800 border-orange-300',
      normal: 'bg-blue-100 text-blue-800 border-blue-300',
      low: 'bg-gray-100 text-gray-800 border-gray-300'
    };
    return colors[priority] || colors.normal;
  };

  const getPriorityIcon = (priority) => {
    if (priority === 'urgent' || priority === 'high') {
      return <AlertCircle className="w-4 h-4" />;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Mail className="text-blue-600 w-8 h-8" />
          Messages
        </h1>
        <p className="text-gray-600">Communication hub for teachers, parents, and students</p>
      </div>

      {/* Message Banner */}
      {message.text && (
        <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 animate-fadeIn ${
          message.type === 'success' 
            ? 'bg-green-100 text-green-800 border border-green-200'
            : 'bg-red-100 text-red-800 border border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Sidebar - Message List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            {/* Actions */}
            <div className="p-4 border-b">
              <button
                onClick={() => setShowCompose(true)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg flex items-center justify-center gap-2 font-semibold"
              >
                <Edit3 className="w-5 h-5" />
                Compose
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab('inbox')}
                className={`flex-1 py-3 px-4 font-semibold flex items-center justify-center gap-2 ${
                  activeTab === 'inbox'
                    ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Inbox className="w-4 h-4" />
                Inbox
              </button>
              <button
                onClick={() => setActiveTab('sent')}
                className={`flex-1 py-3 px-4 font-semibold flex items-center justify-center gap-2 ${
                  activeTab === 'sent'
                    ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Send className="w-4 h-4" />
                Sent
              </button>
            </div>

            {/* Filters */}
            <div className="p-4 border-b bg-gray-50">
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Search messages..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full p-2 border rounded-lg text-sm"
                />
                <div className="flex gap-2">
                  {activeTab === 'inbox' && (
                    <select
                      value={filters.read}
                      onChange={(e) => setFilters(prev => ({ ...prev, read: e.target.value }))}
                      className="flex-1 p-2 border rounded-lg text-sm"
                    >
                      <option value="">All</option>
                      <option value="false">Unread</option>
                      <option value="true">Read</option>
                    </select>
                  )}
                  <select
                    value={filters.priority}
                    onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                    className="flex-1 p-2 border rounded-lg text-sm"
                  >
                    <option value="">All Priority</option>
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="normal">Normal</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Message List */}
            <div className="max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Mail className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No messages found</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    onClick={() => handleSelectMessage(msg)}
                    className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition ${
                      selectedMessage?.id === msg.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                    } ${!msg.is_read && activeTab === 'inbox' ? 'bg-blue-50/30' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        {activeTab === 'inbox' ? (
                          msg.is_read ? <MailOpen className="w-5 h-5 text-blue-600" /> : <Mail className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Send className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className={`text-sm truncate ${!msg.is_read && activeTab === 'inbox' ? 'font-bold' : 'font-semibold'}`}>
                            {activeTab === 'inbox' ? msg.sender_details.full_name : msg.recipient_details.full_name}
                          </p>
                          {getPriorityIcon(msg.priority)}
                        </div>
                        <p className={`text-sm truncate ${!msg.is_read && activeTab === 'inbox' ? 'font-semibold' : ''}`}>
                          {msg.subject}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(msg.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Message Detail */}
        <div className="lg:col-span-2">
          {selectedMessage ? (
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              {/* Message Header */}
              <div className="p-6 border-b">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">{selectedMessage.subject}</h2>
                    <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(selectedMessage.priority)}`}>
                      {selectedMessage.priority.toUpperCase()}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {activeTab === 'inbox' && (
                      <button
                        onClick={handleReply}
                        className="p-2 hover:bg-blue-50 rounded-lg text-blue-600"
                        title="Reply"
                      >
                        <Reply className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(selectedMessage.id)}
                      className="p-2 hover:bg-red-50 rounded-lg text-red-600"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Sender/Recipient Info */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">From:</span>
                    <span>{selectedMessage.sender_details.full_name} ({selectedMessage.sender_details.email})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">To:</span>
                    <span>{selectedMessage.recipient_details.full_name} ({selectedMessage.recipient_details.email})</span>
                  </div>
                  {selectedMessage.related_student_details && (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Regarding:</span>
                      <span>{selectedMessage.related_student_details.full_name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>{new Date(selectedMessage.created_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Message Body */}
              <div className="p-6">
                <div className="prose max-w-none">
                  <p className="whitespace-pre-wrap">{selectedMessage.body}</p>
                </div>

                {/* Reply Count */}
                {selectedMessage.reply_count > 0 && (
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      💬 This message has {selectedMessage.reply_count} {selectedMessage.reply_count === 1 ? 'reply' : 'replies'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-md p-12 text-center">
              <Mail className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">Select a message to view its content</p>
            </div>
          )}
        </div>
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <ComposeMessage
          onClose={() => setShowCompose(false)}
          onSuccess={() => {
            setShowCompose(false);
            fetchMessages();
            showMessage('success', 'Message sent successfully!');
          }}
          replyTo={activeTab === 'inbox' && selectedMessage ? selectedMessage : null}
        />
      )}
    </div>
  );
}
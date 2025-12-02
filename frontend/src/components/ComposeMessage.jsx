// frontend/src/components/ComposeMessage.jsx
import React, { useState, useEffect } from 'react';
import { X, Send, AlertCircle, Loader } from 'lucide-react';
import messagingService from '../api/messagingService';

export default function ComposeMessage({ onClose, onSuccess, replyTo = null }) {
  const [recipients, setRecipients] = useState([]);
  const [formData, setFormData] = useState({
    recipient: replyTo?.sender.id || '',
    related_student: replyTo?.related_student?.id || '',
    subject: replyTo ? `Re: ${replyTo.subject}` : '',
    body: '',
    priority: 'normal'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRecipients();
  }, []);

  const fetchRecipients = async () => {
    try {
      const data = await messagingService.getRecipients();
      setRecipients(data);
    } catch (error) {
      setError('Failed to load recipients');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (replyTo) {
        await messagingService.replyToMessage(replyTo.id, formData);
      } else {
        await messagingService.sendMessage(formData);
      }
      onSuccess();
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold">
            {replyTo ? 'Reply to Message' : 'Compose Message'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mt-6 p-4 bg-red-100 text-red-800 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Recipient */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              To: <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.recipient}
              onChange={(e) => handleChange('recipient', e.target.value)}
              required
              disabled={!!replyTo}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select recipient --</option>
              {recipients.map(recipient => (
                <option key={recipient.id} value={recipient.id}>
                  {recipient.full_name} ({recipient.role}) - {recipient.email}
                </option>
              ))}
            </select>
          </div>

          {/* Related Student (optional) */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Regarding Student (Optional)
            </label>
            <select
              value={formData.related_student}
              onChange={(e) => handleChange('related_student', e.target.value)}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- None --</option>
              {recipients
                .filter(r => r.related_student)
                .map(recipient => (
                  <option key={recipient.related_student.id} value={recipient.related_student.id}>
                    {recipient.related_student.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-semibold mb-2">Priority</label>
            <select
              value={formData.priority}
              onChange={(e) => handleChange('priority', e.target.value)}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Subject: <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => handleChange('subject', e.target.value)}
              required
              placeholder="Message subject"
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Message: <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.body}
              onChange={(e) => handleChange('body', e.target.value)}
              required
              rows="8"
              placeholder="Write your message here..."
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Send Message
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


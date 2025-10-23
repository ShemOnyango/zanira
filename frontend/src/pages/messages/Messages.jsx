// frontend/src/pages/messages/Messages.jsx
import { useState, useEffect, useRef } from 'react'
import { 
  Search, 
  MoreVertical, 
  Paperclip, 
  Smile, 
  Send,
  Phone,
  Video,
  Info,
  Check,
  CheckCheck,
  Clock
} from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { chatAPI } from '../../lib/api'
import { userAPI } from '../../lib/api'
import { useSocket } from '../../contexts/SocketContext'
import { useAuthStore } from '../../store/authStore'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ErrorMessage from '../../components/common/ErrorMessage'
import { formatRelativeTime, truncateText } from '../../lib/utils'

export default function Messages() {
  const { user } = useAuthStore()
  const socket = useSocket()
  const [chats, setChats] = useState([])
  const [selectedChat, setSelectedChat] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sending, setSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const messagesEndRef = useRef(null)
  const [showAdminModal, setShowAdminModal] = useState(false)

  // API hooks
  const { execute: fetchChats } = useApi(chatAPI.getChats, { showToast: false })
  const { execute: fetchMessages } = useApi(chatAPI.getMessages, { showToast: false })
  const { execute: sendMessageApi } = useApi(chatAPI.sendMessage)
  const { execute: markAsRead } = useApi(chatAPI.markAsRead, { showToast: false })
  const { execute: createChatApi } = useApi(chatAPI.createChat, { showToast: true })
  const { execute: searchUsersApi } = useApi(userAPI.getAllUsers, { showToast: false })

  // Load chats
  useEffect(() => {
    loadChats()
  }, [])

  const loadChats = async () => {
    try {
      setLoading(true)
      const data = await fetchChats()
      // Normalize various possible API shapes to an array of chats
      let list = []
      if (data) {
        if (Array.isArray(data)) {
          list = data
        } else if (Array.isArray(data.chats)) {
          list = data.chats
        } else if (Array.isArray(data.data)) {
          list = data.data
        } else if (Array.isArray(data.data?.chats)) {
          list = data.data.chats
        } else if (Array.isArray(data.data?.data)) {
          list = data.data.data
        }
      }

      setChats(list)
      if (list.length > 0 && !selectedChat) {
        setSelectedChat(list[0])
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load chats')
    } finally {
      setLoading(false)
    }
  }

  // Load messages when chat is selected
  useEffect(() => {
    if (selectedChat) {
      loadMessages(selectedChat._id)
      markChatAsRead(selectedChat._id)
    }
  }, [selectedChat])

  const loadMessages = async (chatId) => {
    try {
      const data = await fetchMessages(chatId)
      // Normalize different possible API shapes into an array of message objects
      const normalizeMessages = (d) => {
        if (!d) return []
        if (Array.isArray(d)) return d
        if (Array.isArray(d.data)) return d.data
        if (Array.isArray(d.messages)) return d.messages
        if (Array.isArray(d.data?.messages)) return d.data.messages
        if (Array.isArray(d.data?.data)) return d.data.data
        if (Array.isArray(d.data?.data?.messages)) return d.data.data.messages
        // If controller returns wrapped shape { success: true, data: { messages: [...] } }
        if (Array.isArray(d.data?.data?.data)) return d.data.data.data
        return []
      }

      const msgs = normalizeMessages(data)
      setMessages(msgs)
    } catch (error) {
      console.error('Failed to load messages:', error)
    }
  }

  const markChatAsRead = async (chatId) => {
    try {
      await markAsRead(chatId)
      // Update chat in list to mark as read
      setChats(prev => prev.map(chat => 
        chat._id === chatId ? { ...chat, unreadCount: 0 } : chat
      ))
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  // Socket.io for real-time messages
  useEffect(() => {
    if (socket) {
      // Listen for new messages
      socket.on('new_message', (payload) => {
        // server emits { chatId, message, chat } or message directly
        const raw = payload?.message || payload
        const chatId = payload?.chatId || raw?.chatId
        const items = Array.isArray(raw) ? raw : [raw]

        if (chatId === selectedChat?._id) {
          setMessages(prev => {
            const prevArr = Array.isArray(prev) ? prev : []
            return [...prevArr, ...items]
          })
        }

        // Update chat list with new message; compute unreadCount defensively
        setChats(prev => prev.map(chat => {
          if (chat._id !== chatId) return chat
          const last = items[items.length - 1]
          // derive previous numeric unread count
          let prevCount = 0
          if (typeof chat.unreadCount === 'number') prevCount = chat.unreadCount
          else if (chat.unreadCount && typeof chat.unreadCount === 'object') {
            prevCount = (chat.unreadCount[user._id] ?? Object.values(chat.unreadCount)[0] ?? 0)
          }
          const unread = chat._id === selectedChat?._id ? 0 : (prevCount + items.length)

          return {
            ...chat,
            lastMessage: last?.content || '',
            lastMessageAt: last?.timestamp || last?.createdAt || new Date(),
            unreadCount: unread
          }
        }))
      })

      // Listen for typing indicators
      socket.on('user_typing', (data) => {
        // Handle typing indicators
        console.log('User typing:', data)
      })

      // Listen for message read receipts
      socket.on('message_read', (data) => {
        // Update message read status
        setMessages(prev => prev.map(msg => 
          msg._id === data.messageId ? { ...msg, read: true } : msg
        ))
      })

      return () => {
        socket.off('new_message')
        socket.off('user_typing')
        socket.off('message_read')
      }
    }
  }, [socket, selectedChat])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedChat) return

    setSending(true)
    try {
      await sendMessageApi(selectedChat._id, { 
        content: newMessage,
        type: 'text'
      })
      setNewMessage('')
      
      // Emit typing stop
      if (socket) {
        socket.emit('stop_typing', { chatId: selectedChat._id })
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setSending(false)
    }
  }

  // Admin modal: create chat/send initial message
  const AdminMessageModal = ({ isOpen, onClose }) => {
    const [mode, setMode] = useState('chat') // chat or email (email not implemented here)
    const [chatType, setChatType] = useState('group')
    const [participants, setParticipants] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [searchResults, setSearchResults] = useState([])
    const [selectedParticipants, setSelectedParticipants] = useState([]) // array of user objects
    const searchTimer = useRef(null)
    const [initialMessageAdmin, setInitialMessageAdmin] = useState('')
    const [sendingAdmin, setSendingAdmin] = useState(false)

    const handleCreate = async () => {
      try {
        setSendingAdmin(true)
        // Build participants list from selectedParticipants (ids). Exclude current user if present
        const parts = selectedParticipants.map(u => String(u._id)).filter(id => id !== String(user._id))

        const payload = {
          chatType,
          participants: parts.length > 0 ? parts : undefined,
          initialMessage: initialMessageAdmin
        }

        const resp = await createChatApi(payload)
        // normalize response to extract created chat
        let created = null
        if (!resp) created = null
        else if (resp.data && resp.data.data) created = resp.data.data
        else if (resp.data) created = resp.data
        else created = resp

        // If API returned the created chat, open it in UI
        if (created && created._id) {
          setSelectedChat(created)
          // load messages for the new chat
          try { await loadMessages(created._id) } catch (e) { console.warn('Failed to load messages for new chat', e) }
        }

        onClose()
      } catch (err) {
        console.error('Failed to create chat/send email', err)
      } finally {
        setSendingAdmin(false)
      }
    }

    // Search users for typeahead (debounced)
    const handleSearchChange = (val) => {
      setSearchTerm(val)
      if (searchTimer.current) clearTimeout(searchTimer.current)
      if (!val || val.trim().length < 2) {
        setSearchResults([])
        return
      }
      searchTimer.current = setTimeout(async () => {
        try {
          const res = await searchUsersApi({ search: val, limit: 10 })
          // normalize returned shapes
          let list = []
          if (!res) list = []
          else if (Array.isArray(res)) list = res
          else if (Array.isArray(res.data)) list = res.data
          else if (Array.isArray(res.data?.data)) list = res.data.data
          else list = res.data || []

          // exclude current user and already selected
          const filtered = (list || []).filter(u => String(u._id) !== String(user._id) && !selectedParticipants.find(p => String(p._id) === String(u._id)))
          setSearchResults(filtered)
        } catch (e) {
          console.error('User search failed', e)
          setSearchResults([])
        }
      }, 300)
    }

    const addParticipant = (u) => {
      setSelectedParticipants(prev => [...prev, u])
      setSearchTerm('')
      setSearchResults([])
    }

    const removeParticipant = (id) => {
      setSelectedParticipants(prev => prev.filter(p => String(p._id) !== String(id)))
    }

    if (!isOpen) return null

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg w-[520px]">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="text-lg font-semibold">New Message</h3>
            <button onClick={onClose} className="text-gray-500">✕</button>
          </div>
          <div className="p-4">
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700">Chat Type</label>
              <select value={chatType} onChange={(e) => setChatType(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300">
                <option value="group">Group</option>
                <option value="direct">Direct</option>
              </select>
            </div>

            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700">Participants</label>
              <div className="mt-1">
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedParticipants.map(p => (
                    <span key={p._id} className="inline-flex items-center px-2 py-1 bg-gray-100 rounded text-sm">
                      <img src={p.profilePhoto || '/default-avatar.png'} alt={p.firstName} className="w-4 h-4 rounded-full mr-1" />
                      <span className="mr-2">{p.firstName} {p.lastName}</span>
                      <button onClick={() => removeParticipant(p._id)} className="text-xs text-gray-500">✕</button>
                    </span>
                  ))}
                </div>
                <input
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full rounded-md border-gray-300 px-3 py-2"
                  placeholder="Search users by name or email..."
                />
                {searchResults.length > 0 && (
                  <div className="mt-2 bg-white border rounded shadow max-h-44 overflow-auto">
                    {searchResults.map(u => (
                      <div key={u._id} className="p-2 hover:bg-gray-50 cursor-pointer flex items-center justify-between" onClick={() => addParticipant(u)}>
                        <div className="flex items-center space-x-2">
                          <img src={u.profilePhoto || '/default-avatar.png'} alt={u.firstName} className="w-8 h-8 rounded-full" />
                          <div>
                            <div className="font-medium text-sm">{u.firstName} {u.lastName}</div>
                            <div className="text-xs text-gray-500">{u.email} • {u.role}</div>
                          </div>
                        </div>
                        <div className="text-sm text-teal-600">Add</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700">Initial Message</label>
              <textarea value={initialMessageAdmin} onChange={(e) => setInitialMessageAdmin(e.target.value)} rows={4} className="mt-1 block w-full rounded-md border-gray-300" />
            </div>

            <div className="flex justify-end space-x-3">
              <button onClick={onClose} className="px-4 py-2 bg-white border rounded">Cancel</button>
              <button onClick={handleCreate} disabled={sendingAdmin} className="px-4 py-2 bg-indigo-600 text-white rounded">{sendingAdmin ? 'Sending...' : 'Create Chat'}</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Handle typing
  const handleTyping = () => {
    if (socket && selectedChat) {
      socket.emit('typing', { chatId: selectedChat._id })
    }
  }

  // Get other participant in chat
  const getOtherParticipant = (chat) => {
    return chat.participants.find(p => p._id !== user._id)
  }

  // Safely coerce various possible values (string, object message, etc.) to a short string
  const safeText = (v) => {
    if (v == null) return ''
    if (typeof v === 'string') return v
    if (typeof v === 'object') {
      if (typeof v.content === 'string') return v.content
      if (typeof v.text === 'string') return v.text
      if (typeof v.message === 'string') return v.message
      // If v is a message object with nested content
      if (typeof v?.body === 'string') return v.body
      try {
        // Fallback: stringify but keep it short
        const s = JSON.stringify(v)
        return s.length > 200 ? s.substring(0, 200) + '...' : s
      } catch (e) {
        return ''
      }
    }
    return String(v)
  }

  // Filter chats based on search
  const safeChats = Array.isArray(chats) ? chats : []
  const filteredChats = safeChats.filter(chat => {
    const otherParticipant = getOtherParticipant(chat)
    const searchLower = searchQuery.toLowerCase()

    const firstName = (otherParticipant?.firstName || '').toString().toLowerCase()
    const lastName = (otherParticipant?.lastName || '').toString().toLowerCase()
    // chat.lastMessage may be a string, an object (e.g., message), or null - coerce safely
    const lastMessageRaw = typeof chat.lastMessage === 'string'
      ? chat.lastMessage
      : (chat.lastMessage?.content ?? chat.lastMessage ?? '')
    const lastMessage = lastMessageRaw.toString().toLowerCase()

    return (
      firstName.includes(searchLower) ||
      lastName.includes(searchLower) ||
      lastMessage.includes(searchLower)
    )
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 pt-20 flex items-center justify-center">
        <LoadingSpinner size="xl" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ErrorMessage message={error} onRetry={loadChats} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-[calc(100vh-80px)]">
        <div className="bg-white rounded-2xl shadow-soft h-full flex">
          {/* Sidebar - Chat List */}
          <div className="w-96 border-r border-gray-200 flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <h1 className="text-2xl font-bold text-gray-900 font-heading">Messages</h1>
              
              {/* Search */}
              <div className="mt-4 relative">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              {/* Admin New Message button */}
              {user && (user.role === 'admin' || user.role === 'super_admin') && (
                <div className="mt-4">
                  <button onClick={() => setShowAdminModal(true)} className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg">New Message</button>
                </div>
              )}
            </div>

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto">
              {filteredChats.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500">No conversations found</p>
                  <p className="text-gray-400 text-sm mt-1">
                    {searchQuery ? 'Try adjusting your search' : 'Start a new conversation'}
                  </p>
                </div>
              ) : (
                filteredChats.map((chat) => {
                  const otherParticipant = getOtherParticipant(chat)
                  const isSelected = selectedChat?._id === chat._id
                  
                  return (
                    <div
                      key={chat._id}
                      onClick={() => setSelectedChat(chat)}
                      className={`p-4 border-b border-gray-100 cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-teal-50 border-teal-200' 
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        {/* Avatar */}
                        <div className="relative">
                          <img
                            src={otherParticipant?.profilePhoto || '/default-avatar.png'}
                            alt={otherParticipant?.firstName}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                          {otherParticipant?.isOnline && (
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                          )}
                        </div>

                        {/* Chat Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-semibold text-gray-900 truncate">
                              {otherParticipant?.firstName} {otherParticipant?.lastName}
                            </h3>
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                              {formatRelativeTime(chat.lastMessageAt)}
                            </span>
                          </div>

                          <p className="text-sm text-gray-600 truncate mb-1">
                            {truncateText(safeText(chat.lastMessage), 50)}
                          </p>

                          <div className="flex items-center justify-between">
                            <span className={`text-xs ${
                              chat.unreadCount > 0 ? 'text-teal-600 font-semibold' : 'text-gray-500'
                            }`}>
                              {chat.booking?.service?.name || 'Direct Message'}
                            </span>
                            
                            {chat.unreadCount > 0 && (
                              <span className="bg-teal-500 text-white text-xs rounded-full px-2 py-1 min-w-5 text-center">
                                {chat.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

      {/* Admin New Message Modal */}
      <AdminMessageModal isOpen={showAdminModal} onClose={() => setShowAdminModal(false)} />

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col">
            {selectedChat ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <img
                      src={getOtherParticipant(selectedChat)?.profilePhoto || '/default-avatar.png'}
                      alt={getOtherParticipant(selectedChat)?.firstName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <h2 className="font-semibold text-gray-900">
                        {getOtherParticipant(selectedChat)?.firstName} {getOtherParticipant(selectedChat)?.lastName}
                      </h2>
                      <p className="text-sm text-gray-600">
                        {getOtherParticipant(selectedChat)?.isOnline ? 'Online' : 'Offline'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button className="p-2 text-gray-600 hover:text-teal-600 transition-colors">
                      <Phone className="w-5 h-5" />
                    </button>
                    <button className="p-2 text-gray-600 hover:text-teal-600 transition-colors">
                      <Video className="w-5 h-5" />
                    </button>
                    <button className="p-2 text-gray-600 hover:text-teal-600 transition-colors">
                      <Info className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                  {(!Array.isArray(messages) || messages.length === 0) ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Send className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-500">No messages yet</p>
                      <p className="text-gray-400 text-sm mt-1">Start the conversation</p>
                    </div>
                    ) : (
                    (Array.isArray(messages) ? messages : []).map((message) => {
                      // Guard sender id lookup and coerce content to a string so React doesn't try to render objects
                      const senderId = message?.sender?._id ?? message?.sender
                      const isOwn = String(senderId) === String(user._id)

                      let contentStr = ''
                      if (typeof message?.content === 'string') contentStr = message.content
                      else if (typeof message?.content?.content === 'string') contentStr = message.content.content
                      else if (typeof message?.content?.text === 'string') contentStr = message.content.text
                      else if (typeof message?.body === 'string') contentStr = message.body
                      else if (message?.messageType && typeof message.messageType === 'string') contentStr = `[${message.messageType}] ${JSON.stringify(message.content ?? '')}`
                      else contentStr = JSON.stringify(message?.content ?? message ?? '')

                      const key = message?._id || message?.id || `${selectedChat?._id || 'chat'}-${message?.timestamp || Math.random()}`

                      return (
                        <div
                          key={key}
                          className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md rounded-lg p-3 ${
                              isOwn
                                ? 'bg-teal-500 text-white'
                                : 'bg-white text-gray-900 border border-gray-200'
                            }`}
                          >
                            <p className="text-sm">{contentStr}</p>
                            <div className={`flex items-center space-x-1 mt-1 text-xs ${
                              isOwn ? 'text-teal-100' : 'text-gray-500'
                            }`}>
                              <span>{formatRelativeTime(message.createdAt || message.timestamp)}</span>
                              {isOwn && (
                                <>
                                  {message.read ? (
                                    <CheckCheck className="w-3 h-3" />
                                  ) : message.delivered ? (
                                    <Check className="w-3 h-3" />
                                  ) : (
                                    <Clock className="w-3 h-3" />
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-gray-200">
                  <form onSubmit={handleSendMessage} className="flex space-x-4">
                    <button
                      type="button"
                      className="p-2 text-gray-600 hover:text-teal-600 transition-colors"
                    >
                      <Paperclip className="w-5 h-5" />
                    </button>
                    
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => {
                          setNewMessage(e.target.value)
                          handleTyping()
                        }}
                        placeholder="Type your message..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        disabled={sending}
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-teal-600 transition-colors"
                      >
                        <Smile className="w-5 h-5" />
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={!newMessage.trim() || sending}
                      className="bg-teal-500 text-white p-2 rounded-lg hover:bg-teal-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                    >
                      {sending ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Send className="w-12 h-12 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No chat selected</h3>
                  <p className="text-gray-600">Choose a conversation from the list to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
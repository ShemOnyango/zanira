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

  // API hooks
  const { execute: fetchChats } = useApi(chatAPI.getChats, { showToast: false })
  const { execute: fetchMessages } = useApi(chatAPI.getMessages, { showToast: false })
  const { execute: sendMessageApi } = useApi(chatAPI.sendMessage)
  const { execute: markAsRead } = useApi(chatAPI.markAsRead, { showToast: false })

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
      if (data) {
        setMessages(data)
      }
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
      socket.on('new_message', (message) => {
        if (message.chatId === selectedChat?._id) {
          setMessages(prev => [...prev, message])
        }
        
        // Update chat list with new message
        setChats(prev => prev.map(chat => 
          chat._id === message.chatId 
            ? { 
                ...chat, 
                lastMessage: message.content,
                lastMessageAt: message.createdAt,
                unreadCount: chat._id === selectedChat?._id ? 0 : (chat.unreadCount || 0) + 1
              }
            : chat
        ))
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

  // Filter chats based on search
  const safeChats = Array.isArray(chats) ? chats : []
  const filteredChats = safeChats.filter(chat => {
    const otherParticipant = getOtherParticipant(chat)
    const searchLower = searchQuery.toLowerCase()
    
    return (
      otherParticipant?.firstName?.toLowerCase().includes(searchLower) ||
      otherParticipant?.lastName?.toLowerCase().includes(searchLower) ||
      chat.lastMessage?.toLowerCase().includes(searchLower)
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
                            {truncateText(chat.lastMessage, 50)}
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
                  {messages.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Send className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-500">No messages yet</p>
                      <p className="text-gray-400 text-sm mt-1">Start the conversation</p>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message._id}
                        className={`flex ${message.sender._id === user._id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md rounded-lg p-3 ${
                            message.sender._id === user._id
                              ? 'bg-teal-500 text-white'
                              : 'bg-white text-gray-900 border border-gray-200'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <div className={`flex items-center space-x-1 mt-1 text-xs ${
                            message.sender._id === user._id ? 'text-teal-100' : 'text-gray-500'
                          }`}>
                            <span>{formatRelativeTime(message.createdAt)}</span>
                            {message.sender._id === user._id && (
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
                    ))
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
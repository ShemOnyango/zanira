// frontend/src/pages/admin/ChatManagement.jsx
import { useState, useEffect, useRef } from 'react'
import { Send, Search, Filter, Download } from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { chatAPI } from '../../lib/api'
import { useSocket } from '../../contexts/SocketContext'
import LoadingSpinner from '../../components/common/LoadingSpinner'

const ChatManagement = () => {
  const [chats, setChats] = useState([])
  const [selectedChat, setSelectedChat] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef(null)
  const socket = useSocket()

  const { execute: fetchChats } = useApi(chatAPI.getAdminChats, { showToast: false })
  const { execute: fetchMessages } = useApi(chatAPI.getMessages, { showToast: false })
  const { execute: sendMessage } = useApi(chatAPI.sendMessage, { showToast: false })

  useEffect(() => {
    loadChats()
  }, [])

  useEffect(() => {
    if (socket) {
      socket.on('new_message', handleNewMessage)
      return () => {
        socket.off('new_message', handleNewMessage)
      }
    }
  }, [socket, selectedChat])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadChats = async () => {
    try {
      setLoading(true)
      const chatsData = await fetchChats()
      if (chatsData) setChats(chatsData.data || [])
    } catch (error) {
      console.error('Failed to load chats:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleNewMessage = (data) => {
    if (selectedChat && data.chatId === selectedChat._id) {
      setMessages(prev => [...prev, data.message])
    }
  }

  const handleSelectChat = async (chat) => {
    setSelectedChat(chat)
    try {
      const messagesData = await fetchMessages(chat._id)
      if (messagesData) setMessages(messagesData.data || [])
    } catch (error) {
      console.error('Failed to load messages:', error)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return

    try {
      await sendMessage(selectedChat._id, { content: newMessage })
      setNewMessage('')
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  if (loading) {
    return <LoadingSpinner size="xl" />
  }

  return (
    <div className="bg-white rounded-lg shadow-sm h-[calc(100vh-12rem)] flex">
      {/* Chat List */}
      <div className="w-1/3 border-r">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Chat Management</h2>
            <button className="p-2 hover:bg-gray-100 rounded">
              <Download size={18} />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="overflow-y-auto h-full">
          {chats.map(chat => (
            <div
              key={chat._id}
              className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                selectedChat?._id === chat._id ? 'bg-blue-50 border-blue-200' : ''
              }`}
              onClick={() => handleSelectChat(chat)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <img
                    src={chat.participants?.[0]?.user?.profilePhoto || '/default-avatar.png'}
                    alt="User"
                    className="w-10 h-10 rounded-full"
                  />
                  <div>
                    <p className="font-medium text-gray-900">
                      {chat.participants?.[0]?.user?.firstName} {chat.participants?.[0]?.user?.lastName}
                    </p>
                    <p className="text-sm text-gray-500 capitalize">{chat.participants?.[0]?.user?.role}</p>
                  </div>
                </div>
                {chat.unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                    {chat.unreadCount}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-2 truncate">
                {chat.lastMessage?.content || 'No messages yet'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <img
                    src={selectedChat.participants?.[0]?.user?.profilePhoto || '/default-avatar.png'}
                    alt="User"
                    className="w-8 h-8 rounded-full"
                  />
                  <div>
                    <p className="font-medium">
                      {selectedChat.participants?.[0]?.user?.firstName} {selectedChat.participants?.[0]?.user?.lastName}
                    </p>
                    <p className="text-sm text-gray-500">Online</p>
                  </div>
                </div>
                <button className="p-2 hover:bg-gray-100 rounded">
                  <Filter size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(message => (
                <div
                  key={message._id}
                  className={`flex ${message.sender === 'admin' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.sender === 'admin'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <button
                  onClick={handleSendMessage}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a conversation to start messaging
          </div>
        )}
      </div>
    </div>
  )
}

export default ChatManagement
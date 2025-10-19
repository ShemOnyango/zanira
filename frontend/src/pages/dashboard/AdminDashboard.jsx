// frontend/src/pages/dashboard/AdminDashboard.jsx
import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { 
  Users, 
  Briefcase, 
  DollarSign, 
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Shield,
  BarChart3,
  Download,
  Clock,
  Settings,
  ShoppingCart,
  FileText,
  Star,
  UserCheck,
  Zap,
  Filter,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Send,
  Eye
} from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { analyticsAPI, adminAPI, chatAPI, shopAPI, bookingAPI, bulkAPI } from '../../lib/api'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ErrorMessage from '../../components/common/ErrorMessage'
import { formatCurrency, formatDate, formatRelativeTime } from '../../lib/utils'

// Chart components (you can use Recharts or Chart.js)
const RevenueChart = ({ data }) => (
  <div className="bg-white p-4 rounded-lg border">
    <div className="flex justify-between items-center mb-4">
      <h3 className="font-semibold">Revenue Trend</h3>
      <select className="text-sm border rounded px-2 py-1">
        <option>Last 7 days</option>
        <option>Last 30 days</option>
        <option>Last 90 days</option>
      </select>
    </div>
    <div className="h-48 flex items-center justify-center text-gray-500">
      Revenue chart will be implemented with chart library
    </div>
  </div>
);

const UserGrowthChart = ({ data }) => (
  <div className="bg-white p-4 rounded-lg border">
    <h3 className="font-semibold mb-4">User Growth</h3>
    <div className="h-48 flex items-center justify-center text-gray-500">
      User growth chart will be implemented with chart library
    </div>
  </div>
);

// Real-time Chat Component
const ChatManagement = ({ chats, onSelectChat, selectedChat, messages, onSendMessage, newMessage, setNewMessage }) => {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="bg-white rounded-lg border h-96 flex">
      {/* Chat List */}
      <div className="w-1/3 border-r">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Active Chats</h3>
        </div>
        <div className="overflow-y-auto h-80">
          {chats.map(chat => (
            <div
              key={chat._id}
              className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${
                selectedChat?._id === chat._id ? 'bg-blue-50' : ''
              }`}
              onClick={() => onSelectChat(chat)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-sm">{chat.user?.name || 'Unknown User'}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {chat.lastMessage || 'No messages yet'}
                  </p>
                </div>
                {chat.unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                    {chat.unreadCount}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Message Area */}
      <div className="w-2/3 flex flex-col">
        {selectedChat ? (
          <>
            <div className="p-4 border-b">
              <h3 className="font-semibold">{selectedChat.user?.name}</h3>
              <p className="text-sm text-gray-500">{selectedChat.user?.role}</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map(message => (
                <div
                  key={message._id}
                  className={`flex ${message.sender === 'admin' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs px-4 py-2 rounded-lg ${
                      message.sender === 'admin'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {formatRelativeTime(message.timestamp)}
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
                  className="flex-1 border rounded-lg px-3 py-2 text-sm"
                  onKeyPress={(e) => e.key === 'Enter' && onSendMessage()}
                />
                <button
                  onClick={onSendMessage}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a chat to start messaging
          </div>
        )}
      </div>
    </div>
  );
};

// Shop Verification Component
const ShopVerification = ({ shops, onVerify, onSetCommission }) => {
  const [commissionRates, setCommissionRates] = useState({});

  const handleCommissionChange = (shopId, rate) => {
    setCommissionRates(prev => ({ ...prev, [shopId]: rate }));
  };

  return (
    <div className="bg-white rounded-lg border">
      <div className="p-4 border-b">
        <h3 className="font-semibold">Shop Verification Queue</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-2 text-left text-sm font-medium">Shop Name</th>
              <th className="px-4 py-2 text-left text-sm font-medium">Owner</th>
              <th className="px-4 py-2 text-left text-sm font-medium">Location</th>
              <th className="px-4 py-2 text-left text-sm font-medium">Commission %</th>
              <th className="px-4 py-2 text-left text-sm font-medium">Status</th>
              <th className="px-4 py-2 text-left text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {shops.map(shop => (
              <tr key={shop._id} className="border-b">
                <td className="px-4 py-3">
                  <div className="flex items-center space-x-3">
                    <img
                      src={shop.logo || '/default-shop.png'}
                      alt={shop.shopName}
                      className="w-8 h-8 rounded-lg object-cover"
                    />
                    <div>
                      <p className="font-medium text-sm">{shop.shopName}</p>
                      <p className="text-xs text-gray-500">{shop.shopType}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm">
                  {shop.owner?.firstName} {shop.owner?.lastName}
                </td>
                <td className="px-4 py-3 text-sm">
                  {shop.town}, {shop.county}
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min="1"
                    max="30"
                    step="0.5"
                    value={commissionRates[shop._id] || shop.commissionRate || 10}
                    onChange={(e) => handleCommissionChange(shop._id, parseFloat(e.target.value))}
                    className="w-20 border rounded px-2 py-1 text-sm"
                  />
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    shop.verified 
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {shop.verified ? 'Verified' : 'Pending'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex space-x-2">
                    {!shop.verified && (
                      <>
                        <button
                          onClick={() => onVerify(shop._id, commissionRates[shop._id])}
                          className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                        >
                          Verify
                        </button>
                        <button className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600">
                          Reject
                        </button>
                      </>
                    )}
                    <button className="text-gray-500 hover:text-gray-700">
                      <Eye size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Booking Management Component
const BookingManagement = ({ bookings, onUpdateStatus }) => {
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredBookings = bookings.filter(booking => 
    statusFilter === 'all' || booking.status === statusFilter
  );

  const statusOptions = [
    { value: 'all', label: 'All Bookings' },
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="bg-white rounded-lg border">
      <div className="p-4 border-b flex justify-between items-center">
        <h3 className="font-semibold">Booking Management</h3>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded px-3 py-1 text-sm"
        >
          {statusOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-2 text-left text-sm font-medium">Booking ID</th>
              <th className="px-4 py-2 text-left text-sm font-medium">Client</th>
              <th className="px-4 py-2 text-left text-sm font-medium">Service</th>
              <th className="px-4 py-2 text-left text-sm font-medium">Fundi</th>
              <th className="px-4 py-2 text-left text-sm font-medium">Amount</th>
              <th className="px-4 py-2 text-left text-sm font-medium">Status</th>
              <th className="px-4 py-2 text-left text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredBookings.map(booking => (
              <tr key={booking._id} className="border-b">
                <td className="px-4 py-3 text-sm font-mono">#{booking._id.slice(-6)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center space-x-2">
                    <img
                      src={booking.client?.profilePhoto || '/default-avatar.png'}
                      alt={booking.client?.name}
                      className="w-6 h-6 rounded-full"
                    />
                    <span className="text-sm">
                      {booking.client?.firstName} {booking.client?.lastName}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm">{booking.service?.name}</td>
                <td className="px-4 py-3">
                  {booking.fundi ? (
                    <div className="flex items-center space-x-2">
                      <img
                        src={booking.fundi.profilePhoto || '/default-avatar.png'}
                        alt={booking.fundi.name}
                        className="w-6 h-6 rounded-full"
                      />
                      <span className="text-sm">
                        {booking.fundi.firstName} {booking.fundi.lastName}
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-500 text-sm">Not assigned</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm">{formatCurrency(booking.totalAmount)}</td>
                <td className="px-4 py-3">
                  <select
                    value={booking.status}
                    onChange={(e) => onUpdateStatus(booking._id, e.target.value)}
                    className={`text-xs font-medium rounded-full px-2 py-1 border-0 ${getStatusColor(booking.status)}`}
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <div className="flex space-x-1">
                    <button className="text-blue-500 hover:text-blue-700">
                      <Eye size={16} />
                    </button>
                    <button className="text-green-500 hover:text-green-700">
                      <Edit size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Bulk Operations Component
const BulkOperations = ({ onBulkAction }) => {
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);

  const bulkActions = [
    { value: 'verify_users', label: 'Verify Selected Users' },
    { value: 'suspend_users', label: 'Suspend Selected Users' },
    { value: 'activate_users', label: 'Activate Selected Users' },
    { value: 'send_notification', label: 'Send Bulk Notification' },
    { value: 'export_data', label: 'Export Selected Data' }
  ];

  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="font-semibold mb-4">Bulk Operations</h3>
      <div className="space-y-4">
        <div className="flex space-x-4">
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="flex-1 border rounded px-3 py-2"
          >
            <option value="">Select bulk action...</option>
            {bulkActions.map(action => (
              <option key={action.value} value={action.value}>
                {action.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => onBulkAction(selectedAction, selectedUsers)}
            disabled={!selectedAction}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-300"
          >
            Execute
          </button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => onBulkAction('quick_verify_fundis')}
            className="bg-green-500 text-white p-3 rounded-lg hover:bg-green-600 text-sm"
          >
            <UserCheck className="w-5 h-5 mx-auto mb-1" />
            Verify All Fundis
          </button>
          
          <button
            onClick={() => onBulkAction('quick_approve_testimonials')}
            className="bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 text-sm"
          >
            <Star className="w-5 h-5 mx-auto mb-1" />
            Approve Testimonials
          </button>
          
          <button
            onClick={() => onBulkAction('quick_export_reports')}
            className="bg-purple-500 text-white p-3 rounded-lg hover:bg-purple-600 text-sm"
          >
            <Download className="w-5 h-5 mx-auto mb-1" />
            Export Reports
          </button>
          
          <button
            onClick={() => onBulkAction('quick_system_cleanup')}
            className="bg-orange-500 text-white p-3 rounded-lg hover:bg-orange-600 text-sm"
          >
            <Zap className="w-5 h-5 mx-auto mb-1" />
            System Cleanup
          </button>
        </div>
      </div>
    </div>
  );
};

export default function EnhancedAdminDashboard() {
  const [stats, setStats] = useState(null);
  const [pendingVerifications, setPendingVerifications] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [shops, setShops] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // API hooks
  const { execute: fetchStats } = useApi(analyticsAPI.getDashboard, { showToast: false });
  const { execute: fetchPendingVerifications } = useApi(adminAPI.getPendingVerifications, { showToast: false });
  const { execute: fetchRecentActivities } = useApi(adminAPI.getRecentActivities, { showToast: false });
  const { execute: fetchShops } = useApi(shopAPI.getAll, { showToast: false });
  const { execute: fetchBookings } = useApi(bookingAPI.getAll, { showToast: false });
  const { execute: fetchChats } = useApi(chatAPI.getChats, { showToast: false });

  // Load dashboard data
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [statsData, verificationsData, activitiesData, shopsData, bookingsData, chatsData] = await Promise.all([
        fetchStats(),
        fetchPendingVerifications(),
        fetchRecentActivities({ limit: 10 }),
        fetchShops({ status: 'pending' }),
        fetchBookings({ limit: 20 }),
        fetchChats()
      ]);

      if (statsData) setStats(statsData);
      if (verificationsData) setPendingVerifications(verificationsData.data?.verifications || []);
      if (activitiesData) setRecentActivities(activitiesData.data || []);
      if (shopsData) setShops(shopsData.data || []);
      if (bookingsData) setBookings(bookingsData.data || []);
      if (chatsData) setChats(chatsData.data || []);

    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyShop = async (shopId, commissionRate) => {
    try {
      await shopAPI.verify(shopId);
      if (commissionRate) {
        await shopAPI.update(shopId, { commissionRate });
      }
      // Refresh shops list
      const shopsData = await fetchShops({ status: 'pending' });
      if (shopsData) setShops(shopsData.data || []);
    } catch (err) {
      setError('Failed to verify shop');
    }
  };

  const handleUpdateBookingStatus = async (bookingId, status) => {
    try {
      await bookingAPI.updateStatus(bookingId, status);
      // Refresh bookings list
      const bookingsData = await fetchBookings({ limit: 20 });
      if (bookingsData) setBookings(bookingsData.data || []);
    } catch (err) {
      setError('Failed to update booking status');
    }
  };

  const handleSelectChat = async (chat) => {
    setSelectedChat(chat);
    try {
      const messagesData = await chatAPI.getMessages(chat._id);
      if (messagesData) setChatMessages(messagesData.data || []);
    } catch (err) {
      setError('Failed to load messages');
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;

    try {
      await chatAPI.sendMessage(selectedChat._id, { content: newMessage });
      setNewMessage('');
      // Refresh messages
      const messagesData = await chatAPI.getMessages(selectedChat._id);
      if (messagesData) setChatMessages(messagesData.data || []);
    } catch (err) {
      setError('Failed to send message');
    }
  };

  const handleBulkAction = async (action, data) => {
    try {
      switch (action) {
        case 'quick_verify_fundis':
          await bulkAPI.verifyFundis({ action: 'verify_all' });
          break;
        case 'quick_approve_testimonials':
          // Implementation for testimonial approval
          break;
        case 'quick_export_reports':
          await bulkAPI.exportData({ dataType: 'all', format: 'json' });
          break;
        default:
          console.log('Bulk action:', action);
      }
      // Refresh data
      loadDashboardData();
    } catch (err) {
      setError(`Failed to execute bulk action: ${action}`);
    }
  };

  // Platform stats cards
  const platformStats = [
    {
      label: 'Total Users',
      value: stats?.totalUsers || 0,
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      change: '+124 this month',
      trend: 'up'
    },
    {
      label: 'Active Bookings',
      value: stats?.activeBookings || 0,
      icon: Briefcase,
      color: 'from-teal-500 to-teal-600',
      change: '+45 today',
      trend: 'up'
    },
    {
      label: 'Platform Revenue',
      value: formatCurrency(stats?.platformRevenue || 0),
      icon: DollarSign,
      color: 'from-amber-500 to-amber-600',
      change: 'KES 2.5M this month',
      trend: 'up'
    },
    {
      label: 'Pending Actions',
      value: pendingVerifications.length + (stats?.activeDisputes || 0),
      icon: AlertCircle,
      color: 'from-red-500 to-red-600',
      change: `${pendingVerifications.length} verifications`,
      trend: 'warning'
    }
  ];

  // Normalize collections to arrays to avoid runtime errors when the API
  // returns objects (pagination wrappers) instead of raw arrays.
  const ensureArray = (val) => {
    if (Array.isArray(val)) return val;
    if (!val) return [];
    if (Array.isArray(val.data)) return val.data;
    if (Array.isArray(val.results)) return val.results;
    if (Array.isArray(val.rows)) return val.rows;
    return [];
  };

  const bookingsList = ensureArray(bookings);
  const shopsList = ensureArray(shops);
  const chatsList = ensureArray(chats);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 pt-20 flex items-center justify-center">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <ErrorMessage message={error} onRetry={loadDashboardData} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
              <p className="text-gray-600">Complete platform management and monitoring</p>
            </div>
            <div className="flex space-x-3">
              <button className="bg-white border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center space-x-2">
                <Settings size={18} />
                <span>Settings</span>
              </button>
              <button 
                onClick={loadDashboardData}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center space-x-2"
              >
                <Zap size={18} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Platform Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {platformStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-white rounded-2xl p-6 shadow-lg border">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-4`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
                <div className="text-sm text-gray-600 mb-2">{stat.label}</div>
                <div className="text-xs text-gray-500 flex items-center space-x-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>{stat.change}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
          {/* Left Column - Analytics */}
          <div className="xl:col-span-2 space-y-8">
            <RevenueChart data={stats} />
            <UserGrowthChart data={stats} />
          </div>

          {/* Right Column - Quick Actions */}
          <div className="space-y-8">
            {/* Quick Metrics */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Metrics</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 mb-1">
                      {shopsList.length}
                    </div>
                  <div className="text-sm text-blue-700">Shops Pending</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 mb-1">
                      {bookingsList.filter(b => b.status === 'completed').length}
                    </div>
                  <div className="text-sm text-green-700">Completed Jobs</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600 mb-1">
                      {chatsList.length}
                    </div>
                  <div className="text-sm text-purple-700">Active Chats</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600 mb-1">
                    {stats?.activeDisputes || 0}
                  </div>
                  <div className="text-sm text-orange-700">Open Disputes</div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <Link
                  to="/admin/verifications"
                  className="flex items-center space-x-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors"
                >
                  <Shield className="w-5 h-5 text-yellow-600" />
                  <span className="font-medium text-gray-900">Manage Verifications</span>
                </Link>

                <Link
                  to="/admin/shops"
                  className="flex items-center space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <ShoppingCart className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-gray-900">Shop Management</span>
                </Link>

                <Link
                  to="/admin/bookings"
                  className="flex items-center space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <Briefcase className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-gray-900">Booking Oversight</span>
                </Link>

                <Link
                  to="/admin/reports"
                  className="flex items-center space-x-3 p-3 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                  <span className="font-medium text-gray-900">Advanced Reports</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Management Sections */}
        <div className="space-y-8">
          {/* Chat Management */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Real-time Chat Management</h2>
              <span className="text-sm text-gray-500">{chats.length} active conversations</span>
            </div>
            <ChatManagement
              chats={chatsList}
              onSelectChat={handleSelectChat}
              selectedChat={selectedChat}
              messages={chatMessages}
              onSendMessage={handleSendMessage}
              newMessage={newMessage}
              setNewMessage={setNewMessage}
            />
          </div>

          {/* Shop Verification */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Shop Verification & Commission</h2>
        <span className="text-sm text-gray-500">{shopsList.length} shops pending verification</span>
            </div>
            <ShopVerification
              shops={shopsList}
              onVerify={handleVerifyShop}
              onSetCommission={handleVerifyShop}
            />
          </div>

          {/* Booking Management */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Booking Status Management</h2>
              <span className="text-sm text-gray-500">{bookingsList.length} total bookings</span>
            </div>
            <BookingManagement
              bookings={bookingsList}
              onUpdateStatus={handleUpdateBookingStatus}
            />
          </div>

          {/* Bulk Operations */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Bulk Operations</h2>
            <BulkOperations onBulkAction={handleBulkAction} />
          </div>
        </div>
      </div>
    </div>
  );
}
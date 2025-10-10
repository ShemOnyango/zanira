// frontend/src/pages/wallet/Wallet.jsx
import { useState, useEffect } from 'react'
import { 
  DollarSign, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  History,
  Shield,
  TrendingUp,
  Download,
  Filter,
  Search,
  Plus,
  Minus
} from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { walletAPI } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ErrorMessage from '../../components/common/ErrorMessage'
import Modal from '../../components/common/Modal'
import { formatCurrency, formatDate, formatRelativeTime } from '../../lib/utils'

// --- Simple modal components used by Wallet ---
function TopUpModal({ isOpen, onClose, onTopUp, wallet }) {
  const [amount, setAmount] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!amount) return
    await onTopUp({ amount: parseFloat(amount) })
    setAmount('')
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Funds">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Amount (KES)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md p-2"
            min="1"
            step="1"
            required
          />
        </div>

        <div className="flex justify-end space-x-3">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
          <button type="submit" className="px-4 py-2 bg-teal-500 text-white rounded">Top Up</button>
        </div>
      </form>
    </Modal>
  )
}

function WithdrawalModal({ isOpen, onClose, onWithdraw, wallet }) {
  const [amount, setAmount] = useState('')
  const [account, setAccount] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!amount || !account) return
    await onWithdraw({ amount: parseFloat(amount), account })
    setAmount('')
    setAccount('')
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Withdraw Funds">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Amount (KES)</label>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md p-2" min="1" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Account / Phone</label>
          <input type="text" value={account} onChange={(e) => setAccount(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md p-2" required />
        </div>
        <div className="flex justify-end space-x-3">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
          <button type="submit" className="px-4 py-2 bg-teal-500 text-white rounded">Withdraw</button>
        </div>
      </form>
    </Modal>
  )
}

function TransferModal({ isOpen, onClose, onTransfer, wallet }) {
  const [amount, setAmount] = useState('')
  const [recipient, setRecipient] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!amount || !recipient) return
    await onTransfer({ amount: parseFloat(amount), recipientId: recipient })
    setAmount('')
    setRecipient('')
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Transfer Funds">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Recipient User ID</label>
          <input type="text" value={recipient} onChange={(e) => setRecipient(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md p-2" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Amount (KES)</label>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md p-2" min="1" required />
        </div>
        <div className="flex justify-end space-x-3">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
          <button type="submit" className="px-4 py-2 bg-teal-500 text-white rounded">Transfer</button>
        </div>
      </form>
    </Modal>
  )
}

function PinSetupModal({ isOpen, onClose, onSetPin, hasPin }) {
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!pin || pin !== confirm) return
    await onSetPin(pin)
    setPin('')
    setConfirm('')
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={hasPin ? 'Change PIN' : 'Set PIN'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Enter PIN</label>
          <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md p-2" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Confirm PIN</label>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md p-2" required />
        </div>
        <div className="flex justify-end space-x-3">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
          <button type="submit" className="px-4 py-2 bg-teal-500 text-white rounded">Save PIN</button>
        </div>
      </form>
    </Modal>
  )
}

export default function Wallet() {
  const { user } = useAuthStore()
  const [wallet, setWallet] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [filteredTransactions, setFilteredTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [filters, setFilters] = useState({
    type: '',
    search: '',
    dateFrom: '',
    dateTo: ''
  })
  const [showTopUpModal, setShowTopUpModal] = useState(false)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [showPinModal, setShowPinModal] = useState(false)

  // API hooks
  const { execute: fetchWallet } = useApi(walletAPI.getWallet, { showToast: false })
  const { execute: fetchTransactions } = useApi(walletAPI.getTransactions, { showToast: false })
  const { execute: topUpWallet } = useApi(walletAPI.topUp, { successMessage: 'Top-up initiated successfully!' })
  const { execute: withdrawFunds } = useApi(walletAPI.withdraw, { successMessage: 'Withdrawal request submitted!' })
  const { execute: transferFunds } = useApi(walletAPI.transfer, { successMessage: 'Transfer completed successfully!' })
  const { execute: setWalletPin } = useApi(walletAPI.setPin, { successMessage: 'PIN set successfully!' })

  // Load wallet data
  useEffect(() => {
    loadWalletData()
  }, [])

  const loadWalletData = async () => {
    try {
      setLoading(true)
      
      const [walletResponse, transactionsResponse] = await Promise.all([
        fetchWallet(),
        fetchTransactions({ limit: 50 })
      ])

      // Handle wallet response
      let walletData = walletResponse
      if (walletResponse && walletResponse.data) {
        walletData = walletResponse.data
      }
      if (walletData) setWallet(walletData)

      // Handle transactions response - ensure it's always an array
      let transactionsData = []
      if (transactionsResponse) {
        if (Array.isArray(transactionsResponse)) {
          transactionsData = transactionsResponse
        } else if (transactionsResponse.data && Array.isArray(transactionsResponse.data)) {
          transactionsData = transactionsResponse.data
        } else if (transactionsResponse.data && Array.isArray(transactionsResponse.data.transactions)) {
          transactionsData = transactionsResponse.data.transactions
        } else if (Array.isArray(transactionsResponse.transactions)) {
          transactionsData = transactionsResponse.transactions
        } else {
          // If we can't find an array, try to extract one from the response
          const possibleArray = Object.values(transactionsResponse).find(val => Array.isArray(val))
          if (Array.isArray(possibleArray)) {
            transactionsData = possibleArray
          }
        }
      }

      setTransactions(transactionsData)
      setFilteredTransactions(transactionsData)

    } catch (err) {
      console.error('Wallet load error:', err)
      setError(err.response?.data?.error || 'Failed to load wallet data')
    } finally {
      setLoading(false)
    }
  }

  // Apply filters
  useEffect(() => {
    let filtered = transactions

    // Type filter
    if (filters.type) {
      filtered = filtered.filter(transaction => transaction.type === filters.type)
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(transaction =>
        transaction.description?.toLowerCase().includes(searchLower) ||
        transaction.reference?.toLowerCase().includes(searchLower) ||
        transaction.recipient?.name?.toLowerCase().includes(searchLower)
      )
    }

    // Date range filter
    if (filters.dateFrom) {
      filtered = filtered.filter(transaction => 
        new Date(transaction.createdAt) >= new Date(filters.dateFrom)
      )
    }
    if (filters.dateTo) {
      filtered = filtered.filter(transaction => 
        new Date(transaction.createdAt) <= new Date(filters.dateTo + 'T23:59:59')
      )
    }

    setFilteredTransactions(filtered)
  }, [filters, transactions])

  // Handle top-up
  const handleTopUp = async (data) => {
    try {
      const result = await topUpWallet(data)
      if (result) {
        setShowTopUpModal(false)
        loadWalletData() // Refresh data
      }
    } catch (error) {
      console.error('Top-up failed:', error)
    }
  }

  // Handle withdrawal
  const handleWithdraw = async (data) => {
    try {
      const result = await withdrawFunds(data)
      if (result) {
        setShowWithdrawModal(false)
        loadWalletData() // Refresh data
      }
    } catch (error) {
      console.error('Withdrawal failed:', error)
    }
  }

  // Handle transfer
  const handleTransfer = async (data) => {
    try {
      const result = await transferFunds(data)
      if (result) {
        setShowTransferModal(false)
        loadWalletData() // Refresh data
      }
    } catch (error) {
      console.error('Transfer failed:', error)
    }
  }

  // Handle PIN setup
  const handleSetPin = async (pin) => {
    try {
      const result = await setWalletPin({ pin })
      if (result) {
        setShowPinModal(false)
      }
    } catch (error) {
      console.error('PIN setup failed:', error)
    }
  }

  // Get transaction type color
  const getTransactionTypeColor = (type) => {
    const colors = {
      topup: 'text-green-600 bg-green-100',
      withdrawal: 'text-red-600 bg-red-100',
      transfer_out: 'text-orange-600 bg-orange-100',
      transfer_in: 'text-blue-600 bg-blue-100',
      payment: 'text-purple-600 bg-purple-100',
      commission: 'text-gray-600 bg-gray-100'
    }
    return colors[type] || 'text-gray-600 bg-gray-100'
  }

  // Get transaction icon
  const getTransactionIcon = (type) => {
    const icons = {
      topup: Plus,
      withdrawal: Minus,
      transfer_out: ArrowUpCircle,
      transfer_in: ArrowDownCircle,
      payment: DollarSign,
      commission: TrendingUp
    }
    return icons[type] || History
  }

  // Format transaction amount
  const formatTransactionAmount = (transaction) => {
    const isNegative = ['withdrawal', 'transfer_out', 'payment', 'commission'].includes(transaction.type)
    const sign = isNegative ? '-' : '+'
    return `${sign} ${formatCurrency(transaction.amount)}`
  }

  // Safe array access for recent transactions
  const getRecentTransactions = () => {
    if (!Array.isArray(transactions)) return []
    return transactions.slice(0, 5)
  }

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
          <ErrorMessage message={error} onRetry={loadWalletData} />
        </div>
      </div>
    )
  }

  const recentTransactions = getRecentTransactions()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 font-heading">My Wallet</h1>
            <p className="text-gray-600 mt-2">Manage your funds and transactions</p>
          </div>

          <div className="flex items-center space-x-4 mt-4 lg:mt-0">
            <button
              onClick={() => setShowPinModal(true)}
              className="bg-white text-gray-700 px-4 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors flex items-center space-x-2"
            >
              <Shield className="w-5 h-5" />
              <span>{wallet?.hasPin ? 'Change PIN' : 'Set PIN'}</span>
            </button>
            
            <button
              onClick={() => {
                // Export transactions logic
                console.log('Export transactions')
              }}
              className="bg-white text-gray-700 px-4 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors flex items-center space-x-2"
            >
              <Download className="w-5 h-5" />
              <span>Export</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Balance & Actions */}
          <div className="space-y-6">
            {/* Wallet Balance Card */}
            <div className="bg-white rounded-2xl shadow-soft p-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 font-heading">Total Balance</h2>
                <div className="text-4xl font-bold text-gray-900 mt-2">
                  {formatCurrency(wallet?.available || 0)}
                </div>
                <p className="text-gray-600 mt-2">Available for use</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="font-semibold text-gray-900">
                    {formatCurrency(wallet?.pending || 0)}
                  </div>
                  <div className="text-gray-600">Pending</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="font-semibold text-gray-900">
                    {formatCurrency(wallet?.locked || 0)}
                  </div>
                  <div className="text-gray-600">Locked</div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-3">
                <button
                  onClick={() => setShowTopUpModal(true)}
                  className="w-full bg-teal-500 text-white py-3 px-4 rounded-lg hover:bg-teal-600 transition-colors flex items-center justify-center space-x-2"
                >
                  <ArrowDownCircle className="w-5 h-5" />
                  <span>Add Funds</span>
                </button>

                <button
                  onClick={() => setShowWithdrawModal(true)}
                  disabled={!wallet?.available || wallet.available < 100}
                  className="w-full bg-white text-gray-700 py-3 px-4 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                >
                  <ArrowUpCircle className="w-5 h-5" />
                  <span>Withdraw Funds</span>
                </button>

                <button
                  onClick={() => setShowTransferModal(true)}
                  disabled={!wallet?.available || wallet.available < 10}
                  className="w-full bg-white text-gray-700 py-3 px-4 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                >
                  <ArrowUpCircle className="w-5 h-5" />
                  <span>Transfer to User</span>
                </button>
              </div>

              {/* Wallet Limits */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Wallet Limits</h3>
                <div className="space-y-2 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span>Min. Withdrawal</span>
                    <span className="font-medium">KES 100</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Daily Withdrawal Limit</span>
                    <span className="font-medium">KES 100,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Daily Transfer Limit</span>
                    <span className="font-medium">KES 50,000</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Status */}
            <div className="bg-white rounded-2xl shadow-soft p-8">
              <h2 className="text-xl font-bold text-gray-900 font-heading mb-4">Security Status</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Wallet PIN</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    wallet?.hasPin 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {wallet?.hasPin ? 'Set' : 'Not Set'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600">2FA Enabled</span>
                  <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-medium">
                    Optional
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Last Login</span>
                  <span className="text-gray-900 text-sm">
                    {formatRelativeTime(user?.lastLogin)}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setShowPinModal(true)}
                className="w-full mt-4 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors text-sm"
              >
                {wallet?.hasPin ? 'Change Security Settings' : 'Set Up Security'}
              </button>
            </div>
          </div>

          {/* Right Column - Transactions */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-soft">
              {/* Tabs */}
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6">
                  {['overview', 'transactions'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                        activeTab === tab
                          ? 'border-teal-500 text-teal-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {tab === 'transactions' ? `Transactions (${filteredTransactions.length})` : tab}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="p-6">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Monthly Summary */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">This Month</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">
                            {formatCurrency(wallet?.monthlyIncome || 0)}
                          </div>
                          <div className="text-green-700 text-sm">Income</div>
                        </div>
                        <div className="text-center p-4 bg-red-50 rounded-lg">
                          <div className="text-2xl font-bold text-red-600">
                            {formatCurrency(wallet?.monthlyExpenses || 0)}
                          </div>
                          <div className="text-red-700 text-sm">Expenses</div>
                        </div>
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">
                            {wallet?.monthlyTransactions || 0}
                          </div>
                          <div className="text-blue-700 text-sm">Transactions</div>
                        </div>
                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                          <div className="text-2xl font-bold text-purple-600">
                            {formatCurrency(wallet?.netFlow || 0)}
                          </div>
                          <div className="text-purple-700 text-sm">Net Flow</div>
                        </div>
                      </div>
                    </div>

                    {/* Recent Activity */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                      {recentTransactions.length === 0 ? (
                        <div className="text-center py-8">
                          <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-500">No recent transactions</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {recentTransactions.map((transaction) => {
                            const Icon = getTransactionIcon(transaction.type)
                            return (
                              <div key={transaction._id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                                <div className="flex items-center space-x-3">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getTransactionTypeColor(transaction.type)}`}>
                                    <Icon className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-900">{transaction.description}</p>
                                    <p className="text-gray-500 text-sm">
                                      {formatRelativeTime(transaction.createdAt)}
                                    </p>
                                  </div>
                                </div>
                                <div className={`font-semibold ${
                                  ['topup', 'transfer_in'].includes(transaction.type) 
                                    ? 'text-green-600' 
                                    : 'text-red-600'
                                }`}>
                                  {formatTransactionAmount(transaction)}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Transactions Tab */}
                {activeTab === 'transactions' && (
                  <div>
                    {/* Filters */}
                    <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4 mb-6">
                      <div className="flex-1 relative">
                        <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search transactions..."
                          value={filters.search}
                          onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        />
                      </div>

                      <select
                        value={filters.type}
                        onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      >
                        <option value="">All Types</option>
                        <option value="topup">Top-up</option>
                        <option value="withdrawal">Withdrawal</option>
                        <option value="transfer_in">Transfer In</option>
                        <option value="transfer_out">Transfer Out</option>
                        <option value="payment">Payment</option>
                        <option value="commission">Commission</option>
                      </select>

                      <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2">
                        <Filter className="w-5 h-5" />
                        <span>More Filters</span>
                      </button>
                    </div>

                    {/* Transactions List */}
                    {filteredTransactions.length === 0 ? (
                      <div className="text-center py-12">
                        <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 mb-2">No transactions found</p>
                        <p className="text-gray-400 text-sm">
                          {transactions.length === 0 
                            ? "You haven't made any transactions yet." 
                            : "No transactions match your current filters."
                          }
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filteredTransactions.map((transaction) => {
                          const Icon = getTransactionIcon(transaction.type)
                          return (
                            <div key={transaction._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-teal-300 transition-colors">
                              <div className="flex items-center space-x-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getTransactionTypeColor(transaction.type)}`}>
                                  <Icon className="w-6 h-6" />
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-900">{transaction.description}</p>
                                  <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                                    <span>{transaction.reference}</span>
                                    <span>•</span>
                                    <span>{formatDate(transaction.createdAt)}</span>
                                    {transaction.recipient && (
                                      <>
                                        <span>•</span>
                                        <span>To: {transaction.recipient.name}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="text-right">
                                <div className={`text-lg font-semibold ${
                                  ['topup', 'transfer_in'].includes(transaction.type) 
                                    ? 'text-green-600' 
                                    : 'text-red-600'
                                }`}>
                                  {formatTransactionAmount(transaction)}
                                </div>
                                <div className="text-sm text-gray-500">
                                  Balance: {formatCurrency(transaction.balanceAfter)}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Pagination */}
                    {filteredTransactions.length > 0 && (
                      <div className="mt-6 flex justify-center">
                        <nav className="flex items-center space-x-2">
                          <button className="px-3 py-2 text-gray-500 hover:text-gray-700 disabled:opacity-50">
                            Previous
                          </button>
                          <button className="px-3 py-2 bg-teal-500 text-white rounded">1</button>
                          <button className="px-3 py-2 text-gray-500 hover:text-gray-700">2</button>
                          <button className="px-3 py-2 text-gray-500 hover:text-gray-700">3</button>
                          <button className="px-3 py-2 text-gray-500 hover:text-gray-700">
                            Next
                          </button>
                        </nav>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top-up Modal */}
      <TopUpModal
        isOpen={showTopUpModal}
        onClose={() => setShowTopUpModal(false)}
        onTopUp={handleTopUp}
        wallet={wallet}
      />

      {/* Withdrawal Modal */}
      <WithdrawalModal
        isOpen={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
        onWithdraw={handleWithdraw}
        wallet={wallet}
      />

      {/* Transfer Modal */}
      <TransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        onTransfer={handleTransfer}
        wallet={wallet}
      />

      {/* PIN Setup Modal */}
      <PinSetupModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSetPin={handleSetPin}
        hasPin={wallet?.hasPin}
      />
    </div>
  )
}
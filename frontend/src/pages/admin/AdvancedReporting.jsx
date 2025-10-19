// frontend/src/pages/admin/AdvancedReporting.jsx
import { useState, useEffect } from 'react'
import { Download, Filter, Calendar, BarChart3, Users, DollarSign, Briefcase, Star } from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { reportingAPI, analyticsAPI } from '../../lib/api'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { formatCurrency, formatDate } from '../../lib/utils'

const AdvancedReporting = () => {
  const [reports, setReports] = useState([])
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    reportType: 'revenue',
    format: 'pdf'
  })

  const { execute: fetchReports } = useApi(reportingAPI.getReportTemplates, { showToast: false })
  const { execute: generateReport } = useApi(reportingAPI.generateReport, { showToast: true })
  const { execute: downloadReport } = useApi(reportingAPI.downloadReport, { showToast: true })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [templatesData] = await Promise.all([
        fetchReports()
      ])
      if (templatesData) setTemplates(templatesData.data || [])
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateReport = async () => {
    setGenerating(true)
    try {
      const report = await generateReport(filters)
      if (report?.data?._id) {
        // Download the generated report
        await handleDownloadReport(report.data._id, filters.format)
      }
    } catch (error) {
      console.error('Failed to generate report:', error)
    } finally {
      setGenerating(false)
    }
  }

  const handleDownloadReport = async (reportId, format) => {
    try {
      const response = await downloadReport(reportId, format)
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `report-${reportId}.${format}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download report:', error)
    }
  }

  const reportTemplates = [
    {
      id: 'revenue',
      title: 'Revenue Report',
      description: 'Detailed revenue analysis and trends',
      icon: DollarSign,
      color: 'green',
      metrics: ['Total Revenue', 'Revenue Growth', 'Top Services', 'Payment Methods']
    },
    {
      id: 'users',
      title: 'User Analytics',
      description: 'User growth and engagement metrics',
      icon: Users,
      color: 'blue',
      metrics: ['New Users', 'Active Users', 'User Retention', 'Demographics']
    },
    {
      id: 'bookings',
      title: 'Booking Analysis',
      description: 'Booking patterns and performance',
      icon: Briefcase,
      color: 'purple',
      metrics: ['Total Bookings', 'Completion Rate', 'Cancellation Rate', 'Peak Hours']
    },
    {
      id: 'performance',
      title: 'Platform Performance',
      description: 'System performance and uptime',
      icon: BarChart3,
      color: 'orange',
      metrics: ['Uptime', 'Response Time', 'Error Rate', 'User Satisfaction']
    },
    {
      id: 'fundi',
      title: 'Fundi Performance',
      description: 'Fundi ratings and job completion',
      icon: Star,
      color: 'yellow',
      metrics: ['Top Fundis', 'Average Rating', 'Job Completion', 'Earnings']
    },
    {
      id: 'financial',
      title: 'Financial Summary',
      description: 'Complete financial overview',
      icon: DollarSign,
      color: 'red',
      metrics: ['Revenue', 'Expenses', 'Profit', 'Commission']
    }
  ]

  const formatOptions = [
    { value: 'pdf', label: 'PDF Document' },
    { value: 'excel', label: 'Excel Spreadsheet' },
    { value: 'csv', label: 'CSV File' },
    { value: 'json', label: 'JSON Data' }
  ]

  if (loading) {
    return <LoadingSpinner size="xl" />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Advanced Reporting</h1>
          <p className="text-gray-600">Generate comprehensive platform reports</p>
        </div>
        <div className="flex items-center space-x-4">
          <button className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2">
            <Download size={18} />
            <span>Quick Export</span>
          </button>
        </div>
      </div>

      {/* Report Generator */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Generate New Report</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Report Type
            </label>
            <select
              value={filters.reportType}
              onChange={(e) => setFilters({ ...filters, reportType: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {reportTemplates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Format
            </label>
            <select
              value={filters.format}
              onChange={(e) => setFilters({ ...filters, format: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {formatOptions.map(format => (
                <option key={format.value} value={format.value}>
                  {format.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleGenerateReport}
          disabled={generating || !filters.startDate || !filters.endDate}
          className="mt-4 bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          <Download size={18} />
          <span>{generating ? 'Generating...' : 'Generate Report'}</span>
        </button>
      </div>

      {/* Report Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reportTemplates.map((template) => {
          const Icon = template.icon
          const colorClasses = {
            green: 'text-green-600 bg-green-50 border-green-200',
            blue: 'text-blue-600 bg-blue-50 border-blue-200',
            purple: 'text-purple-600 bg-purple-50 border-purple-200',
            orange: 'text-orange-600 bg-orange-50 border-orange-200',
            yellow: 'text-yellow-600 bg-yellow-50 border-yellow-200',
            red: 'text-red-600 bg-red-50 border-red-200'
          }

          return (
            <div
              key={template.id}
              className={`border rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer ${colorClasses[template.color]}`}
              onClick={() => setFilters({ ...filters, reportType: template.id })}
            >
              <div className="flex items-center space-x-3 mb-4">
                <Icon size={24} />
                <h3 className="font-semibold text-current">{template.title}</h3>
              </div>
              
              <p className="text-sm opacity-75 mb-4">{template.description}</p>
              
              <div className="space-y-2">
                <p className="text-xs font-medium opacity-75">Includes:</p>
                <ul className="text-xs space-y-1">
                  {template.metrics.map((metric, index) => (
                    <li key={index} className="flex items-center space-x-2">
                      <div className="w-1 h-1 bg-current rounded-full opacity-50" />
                      <span>{metric}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button className="w-full mt-4 bg-white bg-opacity-50 text-current py-2 rounded-lg hover:bg-opacity-75 transition-colors border border-current border-opacity-25">
                Select Template
              </button>
            </div>
          )
        })}
      </div>

      {/* Recent Reports */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recently Generated Reports</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Report Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date Range
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Generated
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reports.slice(0, 5).map((report) => (
                <tr key={report._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">{report.name}</p>
                    <p className="text-sm text-gray-500">{report.description}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {report.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {formatDate(report.startDate)} - {formatDate(report.endDate)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatDate(report.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {(report.size / 1024 / 1024).toFixed(2)} MB
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleDownloadReport(report._id, 'pdf')}
                        className="text-blue-500 hover:text-blue-700"
                        title="Download PDF"
                      >
                        <Download size={16} />
                      </button>
                      <button
                        onClick={() => handleDownloadReport(report._id, 'excel')}
                        className="text-green-500 hover:text-green-700"
                        title="Download Excel"
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {reports.length === 0 && (
          <div className="text-center py-8">
            <BarChart3 size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">No reports generated yet</p>
            <p className="text-gray-400">Generate your first report using the templates above</p>
          </div>
        )}
      </div>

      {/* Quick Export Options */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Export</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-center">
            <Users className="mx-auto mb-2 text-blue-600" size={24} />
            <span className="font-medium text-blue-900">User Report</span>
          </button>
          <button className="p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors text-center">
            <DollarSign className="mx-auto mb-2 text-green-600" size={24} />
            <span className="font-medium text-green-900">Revenue Report</span>
          </button>
          <button className="p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors text-center">
            <Briefcase className="mx-auto mb-2 text-purple-600" size={24} />
            <span className="font-medium text-purple-900">Booking Report</span>
          </button>
          <button className="p-4 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors text-center">
            <BarChart3 className="mx-auto mb-2 text-orange-600" size={24} />
            <span className="font-medium text-orange-900">Analytics Report</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdvancedReporting
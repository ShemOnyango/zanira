// frontend/src/components/forms/FormTextarea.jsx
export default function FormTextarea({
  label,
  value,
  onChange,
  error,
  required = false,
  placeholder,
  disabled = false,
  rows = 3,
  className = '',
  icon: Icon,
  ...props
}) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-3 text-gray-400">
            <Icon className="w-5 h-5" />
          </div>
        )}
        <textarea
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors ${
            error ? 'border-red-500' : 'border-gray-300'
          } ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'} ${
            Icon ? 'pl-11' : ''
          }`}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}
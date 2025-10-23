import { useEffect, useState } from 'react'
import { productAPI } from '../../lib/api'
import { useApi } from '../../hooks/useApi'
import LoadingSpinner from '../../components/common/LoadingSpinner'

export default function ProductManagement() {
  const [products, setProducts] = useState([])
  const { execute: fetchProducts, loading: loadingList } = useApi(productAPI.list)
  const { execute: createProduct, loading: creating } = useApi(productAPI.create)
  const { execute: deleteProduct, loading: deleting } = useApi(productAPI.remove)
  const [form, setForm] = useState({ name: '', price: 0, sku: '', shop: '' })

  useEffect(() => {
    load()
  }, [])

  async function load() {
    try {
      // useApi returns response.data (or axios response). Accept both shapes for robustness
      const res = await fetchProducts()
      // res might be axios response.data or the server payload
      const productsList = res?.data?.products || res?.products || res?.data || []
      setProducts(Array.isArray(productsList) ? productsList : [])
    } catch (err) {
      console.error('Failed to load products', err)
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    try {
      // build payload and omit empty shop to avoid server ObjectId cast errors
      const payload = {
        name: form.name,
        description: form.description,
        price: Number(form.price) || 0,
        sku: form.sku
      }
      if (form.shop && form.shop !== '') payload.shop = form.shop

      const { data } = await createProduct(payload)
      setProducts(prev => [data?.data?.product, ...prev])
      setForm({ name: '', price: 0, sku: '', shop: '' })
    } catch (err) {
      console.error('Failed to create product', err)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this product?')) return
    try {
      await deleteProduct(id)
      setProducts(prev => prev.filter(p => p._id !== id))
    } catch (err) {
      console.error('Failed to delete', err)
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Product Management</h2>

      <form onSubmit={handleCreate} className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-3">
        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Name" className="p-2 border rounded" />
        <input value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} placeholder="Price" type="number" className="p-2 border rounded" />
        <input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} placeholder="SKU" className="p-2 border rounded" />
        <div className="flex gap-2">
          <button type="submit" disabled={creating} className="px-4 py-2 bg-green-600 text-white rounded">{creating ? 'Creating...' : 'Create'}</button>
          <button type="button" onClick={() => setForm({ name: '', price: 0, sku: '', shop: '' })} className="px-4 py-2 border rounded">Clear</button>
        </div>
      </form>

      {loadingList ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-3">
          {products.filter(Boolean).map((p) => (
            <div key={p._id || p.id} className="p-3 border rounded flex items-center justify-between">
              <div>
                <div className="font-medium">{p?.name || '(no name)'}</div>
                <div className="text-sm text-gray-500">Price: KES {p?.price ?? '-'} — SKU: {p?.sku || '-'}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleDelete(p._id || p.id)} disabled={deleting} className="px-3 py-1 bg-red-500 text-white rounded">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Package, XCircle } from 'lucide-react';
import { api } from './services/api.ts';
import { Product } from './types.ts';
import { Card } from './UI.tsx';

interface InventoryViewProps {
  storeId: number;
}

export const InventoryView = ({ storeId }: InventoryViewProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', stock_quantity: '', price: '' });

  const fetchProducts = useCallback(async () => {
    try {
      const data = await api.getProducts(storeId);
      setProducts(data);
    } catch (error) {
      console.error("Failed to fetch products:", error);
    }
  }, [storeId]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleAdd = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.addProduct({
        name: newProduct.name,
        stock_quantity: parseInt(newProduct.stock_quantity, 10) || 0,
        price: parseFloat(newProduct.price) || 0,
        storeId
      });
      setIsAdding(false);
      setNewProduct({ name: '', stock_quantity: '', price: '' });
      await fetchProducts();
    } catch (error) {
      console.error("Failed to add product:", error);
      alert("Erro ao adicionar produto.");
    }
  }, [newProduct, storeId, fetchProducts]);

  const updateStock = useCallback(async (id: number, currentStock: number, delta: number) => {
    const product = products.find(p => p.id === id);
    if (product) {
      try {
        await api.updateProduct(id, { 
          stock_quantity: Math.max(0, currentStock + delta),
          price: product.price
        });
        await fetchProducts();
      } catch (error) {
        console.error("Failed to update stock:", error);
        alert("Erro ao atualizar estoque.");
      }
    }
  }, [products, fetchProducts]);

  const handleDelete = useCallback(async (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir este produto?')) {
      try {
        await api.deleteProduct(id);
        await fetchProducts();
      } catch (error) {
        console.error("Failed to delete product:", error);
        alert("Erro ao excluir produto.");
      }
    }
  }, [fetchProducts]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Controle de Estoque</h2>
        <button onClick={() => setIsAdding(true)} className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl hover:bg-zinc-800 transition-colors">
          <Plus size={18} />
          <span>Adicionar Produto</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {products.map(product => (
          <Card key={product.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${product.stock_quantity < 10 ? 'bg-amber-50 text-amber-600' : 'bg-zinc-100 text-zinc-600'}`}><Package size={20} /></div>
              <div>
                <h4 className="font-bold text-zinc-900">{product.name}</h4>
                <p className="text-sm text-zinc-500">Preço: R${product.price.toFixed(2)}</p>
              </div>
            </div>
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <button onClick={() => updateStock(product.id, product.stock_quantity, -1)} className="w-8 h-8 flex items-center justify-center border border-zinc-200 rounded-lg hover:bg-zinc-50">-</button>
                <div className="text-center min-w-[60px]"><p className={`font-bold ${product.stock_quantity < 10 ? 'text-amber-600' : 'text-zinc-900'}`}>{product.stock_quantity}</p><p className="text-[10px] text-zinc-400 uppercase font-bold">Unidades</p></div>
                <button onClick={() => updateStock(product.id, product.stock_quantity, 1)} className="w-8 h-8 flex items-center justify-center border border-zinc-200 rounded-lg hover:bg-zinc-50">+</button>
              </div>
              <button onClick={() => handleDelete(product.id)} className="p-2 text-zinc-400 hover:text-rose-500 transition-colors"><XCircle size={20} /></button>
            </div>
          </Card>
        ))}
        {products.length === 0 && <div className="text-center py-12 text-zinc-400">Nenhum produto no estoque.</div>}
      </div>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
              <h3 className="text-xl font-bold mb-6">Novo Produto</h3>
              <form onSubmit={handleAdd} className="space-y-4">
                <div><label className="block text-sm font-medium text-zinc-700 mb-1">Nome do Produto</label><input required className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-zinc-700 mb-1">Qtd. Inicial</label><input required type="number" className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none" value={newProduct.stock_quantity} onChange={e => setNewProduct({...newProduct, stock_quantity: e.target.value})} /></div>
                  <div><label className="block text-sm font-medium text-zinc-700 mb-1">Preço (R$)</label><input required type="number" step="0.01" className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} /></div>
                </div>
                <div className="flex gap-3 pt-4"><button type="button" onClick={() => setIsAdding(false)} className="flex-1 px-4 py-2 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors">Cancelar</button><button type="submit" className="flex-1 px-4 py-2 bg-black text-white rounded-xl hover:bg-zinc-800 transition-colors">Salvar Produto</button></div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
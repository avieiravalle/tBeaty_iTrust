import React, { useState, useEffect, useCallback } from 'react';
import { api } from './services/api.ts';
import { Client, Store } from './types.ts';
import { Card } from './UI.tsx';
import { Star, Loader } from 'lucide-react';

interface SalonsViewProps {
  client: Client;
  onViewServices: (storeId: number) => void;
}

export const SalonsView = ({ client, onViewServices }: SalonsViewProps) => {
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStores = useCallback(async () => {
    setIsLoading(true);
    try {
      // Passa o ID do cliente para obter o status de favorito de cada salão
      const data = await api.getStores(client.id);
      setStores(data);
    } catch (error) {
      console.error("Failed to fetch stores:", error);
    } finally {
      setIsLoading(false);
    }
  }, [client.id]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  const handleToggleFavorite = async (store: Store) => {
    try {
      if (store.is_favorite) {
        await api.removeFavoriteStore(client.id, store.id);
      } else {
        await api.addFavoriteStore(client.id, store.id);
      }
      // Recarrega a lista para atualizar a ordenação (favoritos no topo)
      await fetchStores();
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
      alert('Falha ao atualizar favorito.');
    }
  };

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="text-center p-12"><Loader className="animate-spin inline-block" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stores.map(store => (
            <Card key={store.id} className="flex flex-col justify-between group">
              <div>
                <h3 className="font-bold text-lg mb-4">{store.name}</h3>
              </div>
              <div className="flex items-center justify-between mt-4">
                <button onClick={() => onViewServices(store.id)} className="w-full bg-rose-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-rose-600 transition-colors mr-3">
                  Ver Serviços
                </button>
                <button onClick={() => handleToggleFavorite(store)} className="p-3 rounded-xl bg-zinc-100 hover:bg-rose-100 transition-colors" title={store.is_favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}>
                  <Star size={20} className={`transition-all ${store.is_favorite ? 'text-rose-500 fill-rose-500' : 'text-zinc-400 group-hover:text-rose-400'}`} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
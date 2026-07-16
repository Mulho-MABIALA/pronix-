import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export function useFavorites(type) {
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ['favorites', type],
    queryFn: () => api.get(`/favorites${type ? `?type=${type}` : ''}`).then((r) => r.data.data),
    enabled: !!user,
    staleTime: 60_000,
  });

  const favorites = data || [];

  const isFavorite = (externalId) => favorites.some((f) => f.externalId === externalId);

  return { favorites, isFavorite };
}

export function useFavoriteToggle() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: (payload) => api.post('/favorites', payload).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['favorites'] }),
  });

  const removeMutation = useMutation({
    mutationFn: ({ type, externalId }) =>
      api.delete('/favorites/by-ref', { data: { type, externalId } }).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['favorites'] }),
  });

  const toggle = async ({ type, externalId, name, logo, currentlyFavorite }) => {
    if (!user) return; // Redirect to login handled by UI
    if (currentlyFavorite) {
      await removeMutation.mutateAsync({ type, externalId });
    } else {
      await addMutation.mutateAsync({ type, externalId, name, logo });
    }
  };

  return {
    toggle,
    isLoading: addMutation.isPending || removeMutation.isPending,
  };
}

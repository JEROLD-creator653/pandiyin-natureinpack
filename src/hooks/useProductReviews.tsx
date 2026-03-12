import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from './use-toast';
import { clearAllCache } from '@/lib/cacheService';

interface Review {
  id: string;
  user_id: string;
  product_id: string;
  rating: number;
  description: string;
  created_at: string;
  user_name?: string;
  user_email?: string;
}

interface ReviewStats {
  total_reviews: number;
  average_rating: number;
  five_star: number;
  four_star: number;
  three_star: number;
  two_star: number;
  one_star: number;
}

interface UseProductReviewsOptions {
  productId: string;
  userId?: string;
  limit?: number;
  sortBy?: 'recent' | 'rating_high' | 'rating_low';
  filterByRating?: number | null;
}

const countCharacters = (value: string) => Array.from(value).length;

export function useProductReviews({
  productId,
  userId,
  limit = 10,
  sortBy = 'recent',
  filterByRating
}: UseProductReviewsOptions) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);

  // Fetch review statistics
  const fetchStats = useCallback(async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('product_review_stats')
        .select('*')
        .eq('product_id', productId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching review stats:', error);
        return;
      }

      setStats(data || {
        total_reviews: 0,
        average_rating: 0,
        five_star: 0,
        four_star: 0,
        three_star: 0,
        two_star: 0,
        one_star: 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [productId]);

  // Fetch reviews
  const fetchReviews = useCallback(async (pageNum: number = 0, append: boolean = false) => {
    try {
      setLoading(true);
      
      let query = (supabase as any)
        .from('product_reviews')
        .select(`
          id,
          user_id,
          product_id,
          rating,
          description,
          user_name,
          created_at
        `, { count: 'exact' })
        .eq('product_id', productId)
        .range(pageNum * limit, (pageNum + 1) * limit - 1);

      // Apply rating filter
      if (filterByRating) {
        query = query.eq('rating', filterByRating);
      }

      // Apply sorting
      switch (sortBy) {
        case 'rating_high':
          query = query.order('rating', { ascending: false });
          break;
        case 'rating_low':
          query = query.order('rating', { ascending: true });
          break;
        case 'recent':
        default:
          query = query.order('created_at', { ascending: false });
          break;
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching reviews:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        toast({
          title: 'Error',
          description: `Failed to load reviews: ${error.message || 'Unknown error'}`,
          variant: 'destructive'
        });
        setReviews([]);
        setLoading(false);
        return;
      }

      // Use user_name directly from product_reviews table (populated on submit)
      const reviewsWithUser = (data || []).map((review: any) => ({
        ...review,
        user_name: review.user_name?.trim() || 'Customer',
        user_email: ''
      }));

      if (append) {
        setReviews(prev => [...prev, ...reviewsWithUser]);
      } else {
        setReviews(reviewsWithUser);
      }

      setHasMore((count || 0) > (pageNum + 1) * limit);
    } catch (error: any) {
      console.error('Fetch reviews error:', error);
      toast({
        title: 'Error',
        description: `Failed to load reviews: ${error?.message || 'Unknown error'}`,
        variant: 'destructive'
      });
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [productId, userId, limit, sortBy, filterByRating]);

  // Initial load
  useEffect(() => {
    fetchStats();
    fetchReviews(0, false);
    setPage(0);
  }, [fetchStats, fetchReviews]);

  // Load more reviews
  const loadMore = useCallback(() => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchReviews(nextPage, true);
  }, [page, fetchReviews]);

  // Submit or update review
  const submitReview = useCallback(async (reviewData: {
    rating: number;
    description: string;
    reviewId?: string;
  }) => {
    if (!userId) {
      toast({
        title: 'Error',
        description: 'You must be logged in to submit a review',
        variant: 'destructive'
      });
      return;
    }

    const trimmedDescription = reviewData.description.trim();
    if (!trimmedDescription || countCharacters(trimmedDescription) < 20) {
      toast({
        title: 'Error',
        description: 'Review must be at least 20 characters',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Fetch the user's profile name to store with the review
      let userName = 'Customer';
      const { data: profileData } = await (supabase as any)
        .from('profiles')
        .select('full_name')
        .eq('user_id', userId)
        .maybeSingle();
      if (profileData?.full_name) {
        userName = profileData.full_name;
      }

      const payload = {
        user_id: userId,
        product_id: productId,
        rating: reviewData.rating,
        description: trimmedDescription,
        user_name: userName
      };

      let error;

      if (reviewData.reviewId) {
        // Update existing review
        ({ error } = await (supabase as any)
          .from('product_reviews')
          .update(payload)
          .eq('id', reviewData.reviewId)
          .eq('user_id', userId));
      } else {
        // Insert new review
        ({ error } = await (supabase as any)
          .from('product_reviews')
          .insert(payload));
      }

      if (error) {
        console.error('Error submitting review:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to submit review',
          variant: 'destructive'
        });
        return;
      }

      toast({
        title: 'Success',
        description: reviewData.reviewId ? 'Review updated successfully' : 'Review submitted successfully'
      });

      // Manually update product's average_rating and review_count
      // (in case DB trigger is missing or not firing)
      const { data: reviewAgg } = await (supabase as any)
        .from('product_reviews')
        .select('rating')
        .eq('product_id', productId);

      if (reviewAgg && reviewAgg.length > 0) {
        const avg = reviewAgg.reduce((sum: number, r: any) => sum + r.rating, 0) / reviewAgg.length;
        await (supabase as any)
          .from('products')
          .update({
            average_rating: Math.round(avg * 100) / 100,
            review_count: reviewAgg.length
          })
          .eq('id', productId);
      }

      // Invalidate product cache so rating badges update on product cards
      await clearAllCache();

      // Refresh reviews and stats
      await fetchStats();
      await fetchReviews(0, false);
      setPage(0);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive'
      });
    }
  }, [userId, productId, fetchStats, fetchReviews]);

  // Delete review
  const deleteReview = useCallback(async (reviewId: string) => {
    if (!userId) return;

    try {
      const { error } = await (supabase as any)
        .from('product_reviews')
        .delete()
        .eq('id', reviewId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting review:', error);
        toast({
          title: 'Error',
          description: 'Failed to delete review',
          variant: 'destructive'
        });
        return;
      }

      toast({
        title: 'Success',
        description: 'Review deleted successfully'
      });

      // Manually update product's average_rating and review_count
      const { data: reviewAgg } = await (supabase as any)
        .from('product_reviews')
        .select('rating')
        .eq('product_id', productId);

      if (reviewAgg) {
        const avg = reviewAgg.length > 0
          ? reviewAgg.reduce((sum: number, r: any) => sum + r.rating, 0) / reviewAgg.length
          : 0;
        await (supabase as any)
          .from('products')
          .update({
            average_rating: Math.round(avg * 100) / 100,
            review_count: reviewAgg.length
          })
          .eq('id', productId);
      }

      // Invalidate product cache so rating badges update on product cards
      await clearAllCache();

      // Refresh reviews and stats
      await fetchStats();
      await fetchReviews(0, false);
      setPage(0);
    } catch (error) {
      console.error('Error:', error);
    }
  }, [userId, fetchStats, fetchReviews]);

  // Check if user has already reviewed
  const getUserReview = useCallback(async () => {
    if (!userId) return null;

    try {
      const { data, error } = await (supabase as any)
        .from('product_reviews')
        .select('*')
        .eq('product_id', productId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user review:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error:', error);
      return null;
    }
  }, [userId, productId]);

  return {
    reviews,
    stats,
    loading,
    hasMore,
    loadMore,
    submitReview,
    deleteReview,
    getUserReview,
    refresh: () => {
      fetchStats();
      fetchReviews(0, false);
      setPage(0);
    }
  };
}

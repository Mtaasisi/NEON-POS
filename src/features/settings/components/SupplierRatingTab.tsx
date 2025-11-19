import React, { useState, useEffect } from 'react';
import { Star, ThumbsUp, ThumbsDown, Plus, X, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';
import GlassCard from '../../shared/components/ui/GlassCard';
import GlassButton from '../../shared/components/ui/GlassButton';
import {
  getSupplierRatings,
  getSupplierRatingSummary,
  createSupplierRating,
  type SupplierRating
} from '../../../lib/supplierRatingsApi';

interface SupplierRatingTabProps {
  supplierId: string;
  supplierName: string;
}

const SupplierRatingTab: React.FC<SupplierRatingTabProps> = ({
  supplierId,
  supplierName
}) => {
  const [ratings, setRatings] = useState<SupplierRating[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [overallRating, setOverallRating] = useState(5);
  const [qualityRating, setQualityRating] = useState(5);
  const [deliveryRating, setDeliveryRating] = useState(5);
  const [communicationRating, setCommunicationRating] = useState(5);
  const [priceRating, setPriceRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [pros, setPros] = useState('');
  const [cons, setCons] = useState('');
  const [wouldRecommend, setWouldRecommend] = useState(true);

  useEffect(() => {
    loadRatingsAndSummary();
  }, [supplierId]);

  const loadRatingsAndSummary = async () => {
    try {
      setLoading(true);
      const [ratingsData, summaryData] = await Promise.all([
        getSupplierRatings(supplierId),
        getSupplierRatingSummary(supplierId)
      ]);
      setRatings(ratingsData);
      setSummary(summaryData);
    } catch (error) {
      console.error('Error loading ratings:', error);
      toast.error('Failed to load ratings');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      await createSupplierRating({
        supplier_id: supplierId,
        overall_rating: overallRating,
        quality_rating: qualityRating,
        delivery_rating: deliveryRating,
        communication_rating: communicationRating,
        price_rating: priceRating,
        review_text: reviewText || undefined,
        pros: pros || undefined,
        cons: cons || undefined,
        would_recommend: wouldRecommend
      });

      toast.success('Rating submitted successfully');
      setShowAddModal(false);
      resetForm();
      loadRatingsAndSummary();
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast.error('Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setOverallRating(5);
    setQualityRating(5);
    setDeliveryRating(5);
    setCommunicationRating(5);
    setPriceRating(5);
    setReviewText('');
    setPros('');
    setCons('');
    setWouldRecommend(true);
  };

  const renderStars = (rating: number, interactive: boolean = false, onChange?: (rating: number) => void) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={20}
            className={`${
              star <= rating 
                ? 'text-yellow-500 fill-current' 
                : 'text-gray-300'
            } ${interactive ? 'cursor-pointer hover:text-yellow-400' : ''}`}
            onClick={() => interactive && onChange?.(star)}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
        <span className="ml-3 text-gray-600">Loading ratings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-semibold text-gray-700">Ratings & Reviews</h4>
          <p className="text-xs text-gray-500">Performance ratings for {supplierName}</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700 transition-colors inline-flex items-center gap-2 text-sm"
        >
          <Plus size={16} />
          Add Rating
        </button>
      </div>

      {/* Rating Summary */}
      {summary && summary.totalRatings > 0 && (
        <GlassCard className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Overall Rating */}
            <div className="text-center">
              <div className="text-5xl font-bold text-gray-900 mb-2">
                {summary.averageRating.toFixed(1)}
              </div>
              <div className="flex items-center justify-center mb-2">
                {renderStars(Math.round(summary.averageRating))}
              </div>
              <p className="text-sm text-gray-600">{summary.totalRatings} reviews</p>
              <p className="text-sm text-green-600 mt-2">
                {summary.recommendationRate.toFixed(0)}% would recommend
              </p>
            </div>

            {/* Detailed Ratings */}
            <div className="space-y-3">
              {[
                { label: 'Quality', value: summary.qualityAvg },
                { label: 'Delivery', value: summary.deliveryAvg },
                { label: 'Communication', value: summary.communicationAvg },
                { label: 'Price', value: summary.priceAvg }
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 w-32">{item.label}:</span>
                  <div className="flex-1 mx-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-yellow-500 h-2 rounded-full"
                        style={{ width: `${(item.value / 5) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 w-12 text-right">
                    {item.value.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Rating Distribution */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="font-medium text-gray-900 mb-3">Rating Distribution</h4>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((stars) => (
                <div key={stars} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-8">{stars}★</span>
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-yellow-500 h-2 rounded-full"
                        style={{ 
                          width: `${(summary.ratingDistribution[stars] / summary.totalRatings) * 100}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                  <span className="text-sm text-gray-600 w-12 text-right">
                    {summary.ratingDistribution[stars]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>
      )}

      {/* Individual Ratings */}
      {ratings.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-12 text-center border-2 border-dashed border-gray-300">
          <Star className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">No Ratings Yet</h4>
          <p className="text-gray-600 mb-6">Be the first to rate this supplier</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-3 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700 transition-colors inline-flex items-center gap-2"
          >
            <Plus size={18} />
            Add Rating
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {ratings.map((rating) => (
            <GlassCard key={rating.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {renderStars(rating.overall_rating)}
                    <span className="text-sm text-gray-600">
                      {new Date(rating.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {rating.would_recommend && (
                    <span className="inline-flex items-center gap-1 text-xs text-green-600">
                      <ThumbsUp size={12} />
                      Would Recommend
                    </span>
                  )}
                </div>
              </div>

              {rating.review_text && (
                <p className="text-gray-700 mb-3">{rating.review_text}</p>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                {rating.quality_rating && (
                  <div>
                    <span className="text-gray-600">Quality:</span>
                    <div className="flex items-center gap-1">
                      <Star size={14} className="text-yellow-500 fill-current" />
                      <span className="font-medium">{rating.quality_rating}</span>
                    </div>
                  </div>
                )}
                {rating.delivery_rating && (
                  <div>
                    <span className="text-gray-600">Delivery:</span>
                    <div className="flex items-center gap-1">
                      <Star size={14} className="text-yellow-500 fill-current" />
                      <span className="font-medium">{rating.delivery_rating}</span>
                    </div>
                  </div>
                )}
                {rating.communication_rating && (
                  <div>
                    <span className="text-gray-600">Communication:</span>
                    <div className="flex items-center gap-1">
                      <Star size={14} className="text-yellow-500 fill-current" />
                      <span className="font-medium">{rating.communication_rating}</span>
                    </div>
                  </div>
                )}
                {rating.price_rating && (
                  <div>
                    <span className="text-gray-600">Price:</span>
                    <div className="flex items-center gap-1">
                      <Star size={14} className="text-yellow-500 fill-current" />
                      <span className="font-medium">{rating.price_rating}</span>
                    </div>
                  </div>
                )}
              </div>

              {(rating.pros || rating.cons) && (
                <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  {rating.pros && (
                    <div>
                      <span className="font-medium text-green-700 flex items-center gap-1 mb-1">
                        <ThumbsUp size={14} />
                        Pros:
                      </span>
                      <p className="text-gray-600">{rating.pros}</p>
                    </div>
                  )}
                  {rating.cons && (
                    <div>
                      <span className="font-medium text-red-700 flex items-center gap-1 mb-1">
                        <ThumbsDown size={14} />
                        Cons:
                      </span>
                      <p className="text-gray-600">{rating.cons}</p>
                    </div>
                  )}
                </div>
              )}
            </GlassCard>
          ))}
        </div>
      )}

      {/* Add Rating Modal */}
      {showAddModal && (
        <>
          <div 
            className="fixed bg-black/50"
            onClick={() => {
              if (!submitting) {
                setShowAddModal(false);
                resetForm();
              }
            }}
            style={{
              left: 'var(--sidebar-width, 0px)',
              top: 'var(--topbar-height, 64px)',
              right: 0,
              bottom: 0,
              zIndex: 55
            }}
          />
          
          <div 
            className="fixed flex items-center justify-center p-4"
            style={{
              left: 'var(--sidebar-width, 0px)',
              top: 'var(--topbar-height, 64px)',
              right: 0,
              bottom: 0,
              zIndex: 60,
              pointerEvents: 'none'
            }}
          >
            <div 
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              style={{ pointerEvents: 'auto' }}
            >
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Rate Supplier</h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                disabled={submitting}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Overall Rating */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Overall Rating *
                </label>
                {renderStars(overallRating, true, setOverallRating)}
              </div>

              {/* Detailed Ratings */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quality</label>
                  {renderStars(qualityRating, true, setQualityRating)}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Delivery</label>
                  {renderStars(deliveryRating, true, setDeliveryRating)}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Communication</label>
                  {renderStars(communicationRating, true, setCommunicationRating)}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Price</label>
                  {renderStars(priceRating, true, setPriceRating)}
                </div>
              </div>

              {/* Review Text */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Review (Optional)
                </label>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  disabled={submitting}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  placeholder="Share your experience with this supplier..."
                />
              </div>

              {/* Pros & Cons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pros (Optional)
                  </label>
                  <textarea
                    value={pros}
                    onChange={(e) => setPros(e.target.value)}
                    disabled={submitting}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    placeholder="What did you like?"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cons (Optional)
                  </label>
                  <textarea
                    value={cons}
                    onChange={(e) => setCons(e.target.value)}
                    disabled={submitting}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    placeholder="What could be improved?"
                  />
                </div>
              </div>

              {/* Recommendation */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={wouldRecommend}
                    onChange={(e) => setWouldRecommend(e.target.checked)}
                    disabled={submitting}
                    className="w-4 h-4 text-yellow-600 rounded focus:ring-yellow-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    I would recommend this supplier
                  </span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                disabled={submitting}
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 px-4 py-3 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Submit Rating
                  </>
                )}
              </button>
            </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SupplierRatingTab;


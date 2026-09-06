"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, MessageSquareQuote, Loader2, User } from "lucide-react";

type Review = {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: any;
};

export default function ReviewsPage() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState("");

  const fetchReviews = async () => {
    try {
      const q = query(collection(db, "reviews"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
      setReviews(fetched);
    } catch (error) {
      console.error("Failed to fetch reviews", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert("You must be logged in to submit a review.");
    if (!newComment.trim()) return alert("Review comment cannot be empty.");

    setSubmitting(true);
    try {
      await addDoc(collection(db, "reviews"), {
        userId: user.uid,
        userName: user.name || user.email?.split("@")[0] || "Student",
        rating: newRating,
        comment: newComment.trim(),
        createdAt: serverTimestamp(),
      });
      setNewComment("");
      setNewRating(5);
      fetchReviews();
    } catch (error) {
      console.error("Failed to submit review", error);
      alert("Failed to submit review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight text-primary flex items-center justify-center gap-3">
          <MessageSquareQuote className="w-10 h-10" /> Student Reviews
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          See what our students have to say about their learning experience at Brilliant Academy.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Submit Review Section */}
        <div className="md:col-span-1">
          <Card className="sticky top-24 border-primary/20 bg-secondary/10 shadow-lg">
            <CardHeader>
              <CardTitle>Write a Review</CardTitle>
              <CardDescription>Share your experience with others.</CardDescription>
            </CardHeader>
            <CardContent>
              {user ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Rating</label>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          onClick={() => setNewRating(star)}
                          className={`w-6 h-6 cursor-pointer transition-colors ${
                            star <= newRating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Your Review</label>
                    <Textarea
                      placeholder="Tell us what you think about the courses, teachers, and platform..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="min-h-[120px] resize-none"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Submit Review
                  </Button>
                </form>
              ) : (
                <div className="text-center p-6 bg-background rounded-lg border border-dashed">
                  <User className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground mb-4">You need to log in to submit a review.</p>
                  <Button variant="outline" className="w-full" asChild>
                    <a href="/login">Log In</a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Reviews List Section */}
        <div className="md:col-span-2 space-y-6">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center p-12 bg-secondary/5 rounded-xl border border-dashed">
              <MessageSquareQuote className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
              <h3 className="text-xl font-bold mb-2">No reviews yet</h3>
              <p className="text-muted-foreground">Be the first to share your experience!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {reviews.map((review) => (
                <Card key={review.id} className="border-border/50 hover:border-primary/30 transition-colors shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-xs uppercase">
                          {review.userName.charAt(0)}
                        </div>
                        <div>
                          <CardTitle className="text-base">{review.userName}</CardTitle>
                          <p className="text-xs text-muted-foreground">
                            {review.createdAt?.toDate ? review.createdAt.toDate().toLocaleDateString() : "Just now"}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3.5 h-3.5 ${
                              star <= review.rating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap">{review.comment}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

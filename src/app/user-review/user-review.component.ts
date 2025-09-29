import { Component, OnInit, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReviewService, UserReview, User, CommentResponse } from '../services/review.service';
import { UserService } from '../services/user.service';
import { RatingService } from '../services/rating.service';


interface UserReviewWithRating extends UserReview {
  userRating?: number; 
  hasRated: boolean;   
}

interface UserRatingInfo {
  userId: number;
  productId: number;
  rating: number;
  ratedAt: Date;
}

@Component({
  selector: 'app-user-review',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-review.component.html',
  styleUrls: ['./user-review.component.css'],
  providers: [DatePipe]
})
export class UserReviewComponent implements OnInit, OnChanges {
  @Input() productId!: string | number;

  currentUser: User | null = null;
  productSpecificReviews: UserReviewWithRating[] = [];
  userRatings: Map<number, number> = new Map(); 
  isLoading = false;
  errorMessage = '';

  newCommentText: string = '';
  newRating: number = 0; 
  isRatingSelected: boolean = false;

  constructor(
    private reviewService: ReviewService,
    private userService: UserService,
    private ratingService: RatingService
  ) {}

  ngOnInit(): void {
    this.loadCurrentUser();
    console.log('UserReviewComponent ngOnInit:', {
      productId: this.productId,
      currentUser: this.currentUser,
      isLoggedIn: this.isLoggedIn()
    });
    if (this.productId) {
      this.fetchUserRatings();
      this.fetchReviews();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log('UserReviewComponent ngOnChanges:', changes);
    if (changes['productId']) {
      console.log('ProductId changed:', {
        previousValue: changes['productId'].previousValue,
        currentValue: changes['productId'].currentValue,
        firstChange: changes['productId'].firstChange
      });
      if (!changes['productId'].firstChange) {
        this.fetchUserRatings();
        this.fetchReviews();
      }
    }
  }

  loadCurrentUser(): void {
    const userInfo = this.userService.getUserInfo();
    
    console.log('Loading user info:', userInfo);

    if (userInfo.userId && userInfo.name && userInfo.name !== 'User') {
      this.currentUser = {
        id: userInfo.userId,
        name: userInfo.name,
        lastName: userInfo.lastName
      };
      console.log('Current user loaded from localStorage:', this.currentUser);
    } else if (userInfo.userId) {
      console.log('Fetching user details from backend...');
      this.userService.getCurrentUserDetails().subscribe({
        next: (userDetails) => {
          if (userDetails) {
            this.currentUser = {
              id: userDetails.id,
              name: userDetails.name || 'User',
              lastName: userDetails.lastName || ''
            };
            
            this.userService.updateUserInfo(userDetails.name || 'User', userDetails.lastName || '');
            console.log('User details fetched and updated:', this.currentUser);
          }
        },
        error: (error) => {
          console.error('Error fetching user details:', error);
          this.currentUser = {
            id: userInfo.userId!,
            name: 'User',
            lastName: ''
          };
        }
      });
    } else {
      this.currentUser = null;
      console.warn('No valid user data found.');
    }
  }

  isLoggedIn(): boolean {
    return this.userService.isLoggedIn();
  }

 
  private storeRatingLocally(productId: number, userId: number, rating: number): void {
    const key = `ratings_${productId}`;
    const existingRatings = localStorage.getItem(key);
    let ratings: {[userId: number]: number} = {};
    
    if (existingRatings) {
      try {
        ratings = JSON.parse(existingRatings);
      } catch (error) {
        console.error('Error parsing existing ratings:', error);
      }
    }
    
    ratings[userId] = rating;
    localStorage.setItem(key, JSON.stringify(ratings));
    console.log(`Stored rating locally: Product ${productId}, User ${userId}, Rating ${rating}`);
  }

  
  private loadRatingsLocally(productId: number): void {
    const key = `ratings_${productId}`;
    const storedRatings = localStorage.getItem(key);
    
    if (storedRatings) {
      try {
        const ratings: {[userId: number]: number} = JSON.parse(storedRatings);
        Object.entries(ratings).forEach(([userId, rating]) => {
          this.userRatings.set(parseInt(userId), rating);
        });
        console.log('Loaded ratings from localStorage:', Array.from(this.userRatings.entries()));
      } catch (error) {
        console.error('Error parsing stored ratings:', error);
      }
    }
  }

  
  fetchUserRatings(): void {
    if (!this.productId) return;

    const productIdNum = typeof this.productId === 'string' ? parseInt(this.productId) : this.productId;
    console.log('Loading ratings for product:', productIdNum);
    
    
    this.loadRatingsLocally(productIdNum);
    
    
    this.ratingService.getProductRatings(productIdNum).subscribe({
      next: (ratings: UserRatingInfo[]) => {
        console.log('Fetched product ratings from API:', ratings);
        
        
        this.userRatings.clear();
        
        
        ratings.forEach(ratingInfo => {
          this.userRatings.set(ratingInfo.userId, ratingInfo.rating);
          console.log(`Added rating from API: UserId ${ratingInfo.userId} -> Rating ${ratingInfo.rating}`);
        });
        
        console.log('Updated userRatings map from API:', Array.from(this.userRatings.entries()));
        
        
        if (this.productSpecificReviews.length > 0) {
          this.updateReviewsWithRatings();
        }
      },
      error: (error) => {
        console.error('Error fetching user ratings from API, using localStorage:', error);
       
        if (this.productSpecificReviews.length > 0) {
          this.updateReviewsWithRatings();
        }
      }
    });
  }

  
  private updateReviewsWithRatings(): void {
    console.log('Updating reviews with ratings...');
    this.productSpecificReviews = this.productSpecificReviews.map(review => {
      const userRating = this.userRatings.get(review.userId);
      console.log(`Updating review ${review.id}: UserId ${review.userId}, Rating: ${userRating}`);
      
      const updatedReview = {
        ...review,
        userRating: userRating,
        hasRated: userRating !== undefined && userRating > 0,
        rating: userRating || 0
      };
      
      console.log('Updated review:', updatedReview);
      return updatedReview;
    });
    
    console.log('All reviews updated:', this.productSpecificReviews);
  }

  fetchReviews(): void {
  console.log('fetchReviews called with productId:', this.productId);
  
  if (!this.productId) {
    console.log('No productId provided, skipping fetch');
    return;
  }

  this.isLoading = true;
  this.errorMessage = '';

  const productIdNum = typeof this.productId === 'string' ? parseInt(this.productId) : this.productId;
  console.log('Converted productId to number:', productIdNum);

  this.reviewService.getAllComments().subscribe({
    next: (comments: CommentResponse[]) => {
      console.log('Received comments from backend:', comments);
      
      const filteredComments = comments.filter(comment => comment.productId === productIdNum);
      console.log('Filtered comments for product:', filteredComments);
      
      this.productSpecificReviews = filteredComments.map(comment => {
        const userRating = this.userRatings.get(comment.userId);
        console.log(`Comment ${comment.id} - UserId: ${comment.userId}, Rating: ${userRating}`);
        
        return {
          id: comment.id,
          userId: comment.userId,
          userName: comment.userFullName || 'Unknown User', 
          timestamp: new Date(comment.addedAt),
          rating: userRating || 0,
          commentText: comment.content,
          productId: comment.productId,
          userRating: userRating,
          hasRated: userRating !== undefined && userRating > 0
        };
      });

      console.log('Final reviews with ratings:', this.productSpecificReviews);
      this.isLoading = false;
    },
    error: (error) => {
      console.error('Error fetching reviews:', error);
      this.errorMessage = 'Failed to load reviews. Please try again later.';
      this.isLoading = false;
    }
  });
}

  
  selectRating(rating: number): void {
    this.newRating = rating;
    this.isRatingSelected = true;
  }

  
  submitRating(): void {
    if (!this.currentUser || !this.isRatingSelected || this.newRating < 1 || this.newRating > 5) {
      return;
    }

    const productIdNum = typeof this.productId === 'string' ? parseInt(this.productId) : this.productId;

    this.ratingService.rateProduct(productIdNum, this.newRating).subscribe({
      next: (response) => {
        console.log('Rating submitted successfully:', response);
        
       
        this.userRatings.set(this.currentUser!.id!, this.newRating);
        
        
        this.storeRatingLocally(productIdNum, this.currentUser!.id!, this.newRating);
        
        
        this.fetchReviews();
        
       
        this.newRating = 0;
        this.isRatingSelected = false;
      },
      error: (error) => {
        console.error('Error submitting rating:', error);
        alert('Failed to submit rating. Please try again.');
      }
    });
  }

  postReview(): void {
    if (!this.currentUser) {
      alert('You must be logged in to post a review.');
      return;
    }
    if (!this.newCommentText.trim()) {
      alert('Comment cannot be empty.');
      return;
    }
    if (!this.productId) {
      alert('Cannot post review: Product context is missing.');
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const productIdNum = typeof this.productId === 'string' ? parseInt(this.productId) : this.productId;

    const newReviewDto = {
      userId: this.currentUser.id,
      productId: productIdNum,
      content: this.newCommentText.trim()
    };

    this.reviewService.postComment(newReviewDto).subscribe({
      next: (response: CommentResponse) => {
        
        const userRating = this.userRatings.get(this.currentUser!.id!);
        
        const newReview: UserReviewWithRating = {
          id: response.id,
          userId: response.userId,
          userName: `${this.currentUser!.name} ${this.currentUser!.lastName}`,
          timestamp: new Date(response.addedAt),
          rating: userRating || 0,
          commentText: response.content,
          productId: response.productId,
          userRating: userRating,
          hasRated: userRating !== undefined && userRating > 0
        };

        this.productSpecificReviews.unshift(newReview);
        
        
        this.newCommentText = '';
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error posting review:', error);
        this.errorMessage = 'Failed to post review. Please try again.';
        this.isLoading = false;
        
        if (error.status === 401) {
          alert('You are not authorized. Please log in again.');
        } else if (error.status === 400) {
          alert('Invalid review data. Please check your input.');
        } else {
          alert('Failed to post review. Please try again later.');
        }
      }
    });
  }

  deleteReview(reviewId: number): void {
    if (!confirm('Are you sure you want to delete this review?')) {
      return;
    }

    this.reviewService.deleteComment(reviewId).subscribe({
      next: () => {
        this.productSpecificReviews = this.productSpecificReviews.filter(
          review => review.id !== reviewId
        );
      },
      error: (error) => {
        console.error('Error deleting review:', error);
        alert('Failed to delete review. Please try again.');
      }
    });
  }

 
  getCurrentUserRating(): number {
    if (!this.currentUser) return 0;
    return this.userRatings.get(this.currentUser.id!) || 0;
  }

  
  hasCurrentUserRated(): boolean {
    if (!this.currentUser) return false;
    return this.userRatings.has(this.currentUser.id!) && this.userRatings.get(this.currentUser.id!)! > 0;
  }
}
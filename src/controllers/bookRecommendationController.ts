import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

/**
 * Calculate book recommendation score based on user's evaluation results
 * Returns books with their match percentage based on evaluation scores
 */
export const getRecommendedBooks = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    console.log('📚 Getting recommended books for user:', userId);

    // Get recommendation threshold from settings (default: 70)
    const thresholdSetting = await prisma.setting.findUnique({
      where: { key: 'recommendation_threshold' },
    });
    const recommendationThreshold = thresholdSetting 
      ? parseFloat(thresholdSetting.value) || 70 
      : 70;
    
    // Get discount percentage for recommended books from settings (default: 0)
    const discountSetting = await prisma.setting.findUnique({
      where: { key: 'recommended_book_discount' },
    });
    const discountPercentage = discountSetting 
      ? parseFloat(discountSetting.value) || 0 
      : 0;
    
    console.log('📊 [RECOMMENDATION] Using threshold:', recommendationThreshold, '%');
    console.log('💰 [RECOMMENDATION] Using discount:', discountPercentage, '%');

    // Get all books with their linked evaluations
    // Evaluations can be linked by bookId OR bookType
    const books = await prisma.book.findMany({
      where: {
        status: 'ACTIVE',
      },
      include: {
        // Direct book evaluations (bookId)
        evaluations: {
          where: {
            bookId: { not: null }, // Only direct book links
          },
          include: {
            evaluation: {
              include: {
                criteria: true,
              },
            },
          },
        },
        bookCategory: true,
        reviews: {
          where: { isApproved: true },
          select: {
            rating: true,
          },
        },
        _count: {
          select: {
            payments: true,
            reviews: true,
          },
        },
      },
    });

    // Get all BookEvaluation records linked by bookType
    // We'll merge these with direct book evaluations later
    const bookTypeEvaluations = await prisma.bookEvaluation.findMany({
      where: {
        bookType: { not: null },
        bookId: null, // Only bookType links
      },
      include: {
        evaluation: {
          include: {
            criteria: true,
          },
        },
      },
    });

    console.log('📊 [RECOMMENDATION] BookType evaluations found:', bookTypeEvaluations.length);
    bookTypeEvaluations.forEach((be) => {
      console.log(`  📝 [RECOMMENDATION] BookType ${be.bookType} -> Evaluation ${be.evaluationId} (${be.evaluation.title || be.evaluation.titleAr})`);
    });

    // Get all user's submitted ratings
    const userRatings = await prisma.rating.findMany({
      where: {
        userId,
        status: 'SUBMITTED',
      },
      include: {
        evaluation: {
          include: {
            criteria: true,
          },
        },
        items: {
          include: {
            criterion: true,
          },
        },
      },
    });

    console.log('📊 [RECOMMENDATION] User ratings found:', userRatings.length);
    if (userRatings.length === 0) {
      console.warn('⚠️ [RECOMMENDATION] WARNING: No submitted ratings found for user!');
      console.warn('⚠️ [RECOMMENDATION] This means the user has not completed any evaluations yet.');
    }
    userRatings.forEach((rating) => {
      console.log(`  📝 [RECOMMENDATION] Rating ${rating.id}:`, {
        evaluationId: rating.evaluationId,
        evaluationTitle: rating.evaluation.title || rating.evaluation.titleAr,
        totalScore: rating.totalScore,
        itemsCount: rating.items?.length || 0,
        status: rating.status,
        submittedAt: rating.submittedAt
      });
    });

    // Create a map of evaluationId -> totalScore for quick lookup
    // Calculate percentage based on questionPercentage and answerPercentages
    const evaluationScores = new Map<number, number>();
    userRatings.forEach((rating) => {
      if (rating.totalScore !== null && rating.items && rating.items.length > 0) {
        // Calculate percentage using questionPercentage and answerPercentages
        // Each question has a questionPercentage (weight in the evaluation)
        // Each answer (1-5) has a percentage that determines the score for that answer
        
        let totalQuestionPercentage = 0;
        let totalScorePercentage = 0;
        
        rating.items.forEach((item: any) => {
          const criterion = item.criterion;
          if (criterion) {
            // Get question percentage (weight of this question in the evaluation)
            const questionPercentage = criterion.questionPercentage || 0;
            totalQuestionPercentage += questionPercentage;
            
            // Get answer percentage based on the score (1-5)
            let answerPercentage = 0;
            if (item.score === 1 && criterion.answer1Percentage) {
              answerPercentage = criterion.answer1Percentage;
            } else if (item.score === 2 && criterion.answer2Percentage) {
              answerPercentage = criterion.answer2Percentage;
            } else if (item.score === 3 && criterion.answer3Percentage) {
              answerPercentage = criterion.answer3Percentage;
            } else if (item.score === 4 && criterion.answer4Percentage) {
              answerPercentage = criterion.answer4Percentage;
            } else if (item.score === 5 && criterion.answer5Percentage) {
              answerPercentage = criterion.answer5Percentage;
            }
            
            // Calculate score for this question: questionPercentage * (answerPercentage / 100)
            const questionScore = questionPercentage * (answerPercentage / 100);
            totalScorePercentage += questionScore;
          }
        });
        
        // Calculate final percentage: (totalScorePercentage / totalQuestionPercentage) * 100
        const percentage = totalQuestionPercentage > 0 
          ? (totalScorePercentage / totalQuestionPercentage) * 100 
          : 0;
        
        evaluationScores.set(rating.evaluationId, percentage);
        console.log(`  ✅ [RECOMMENDATION] Evaluation ${rating.evaluationId} (${rating.evaluation.title || rating.evaluation.titleAr}): percentage=${percentage.toFixed(2)}% (using questionPercentage and answerPercentages)`);
      } else if (rating.totalScore !== null) {
        // Fallback: use old calculation method if questionPercentage/answerPercentages are not available
        const maxPossibleScore = rating.evaluation.criteria.reduce((sum: number, criterion: any) => {
          return sum + (criterion.weight || 1);
        }, 0);
        
        const percentage = maxPossibleScore > 0 
          ? (rating.totalScore / maxPossibleScore) * 100 
          : 0;
        
        evaluationScores.set(rating.evaluationId, percentage);
        console.log(`  ⚠️ [RECOMMENDATION] Evaluation ${rating.evaluationId}: Using fallback calculation (percentage=${percentage.toFixed(2)}%)`);
      }
    });

    console.log('📖 [RECOMMENDATION] Processing books:', books.length);
    if (books.length === 0) {
      console.warn('⚠️ [RECOMMENDATION] WARNING: No active books found!');
    }
    
    // Merge bookType evaluations with direct book evaluations
    books.forEach((book) => {
      // Get evaluations linked by bookType
      const typeEvaluations = bookTypeEvaluations
        .filter(be => be.bookType === book.bookType)
        .map(be => ({
          ...be,
          evaluation: be.evaluation,
        }));
      
      // Count direct evaluations before merging
      const directEvaluationsCount = book.evaluations.length;
      
      // Merge direct evaluations with bookType evaluations
      book.evaluations = [...book.evaluations, ...typeEvaluations];
      
      const linkedEvaluationIds = book.evaluations.map(be => be.evaluationId);
      console.log(`  📚 [RECOMMENDATION] Book ${book.id} (${book.titleAr || book.title}):`, {
        bookType: book.bookType || 'N/A',
        directEvaluations: directEvaluationsCount,
        typeEvaluations: typeEvaluations.length,
        totalEvaluations: book.evaluations.length,
        evaluationIds: linkedEvaluationIds,
        category: book.bookCategory?.nameAr || book.bookCategory?.name || 'No category'
      });
      
      if (book.evaluations.length === 0) {
        console.warn(`    ⚠️ [RECOMMENDATION] Book ${book.id} has NO evaluations linked (neither by bookId nor by bookType)! It will not be recommended.`);
      }
    });

    // Calculate recommendation scores for each book
    const recommendedBooks = books.map((book) => {
      // Calculate average rating from reviews
      const averageRating = book.reviews.length > 0
        ? book.reviews.reduce((sum: number, review: any) => sum + review.rating, 0) / book.reviews.length
        : 0;

      if (book.evaluations.length === 0) {
        // Book has no evaluations, return with 0 match
        return {
          ...book,
          matchPercentage: 0,
          isRecommended: false,
          evaluationResults: [],
          averageRating: Math.round(averageRating * 10) / 10,
          reviewsCount: book._count.reviews,
        };
      }

      const evaluationResults = book.evaluations.map((bookEval) => {
        const userScore = evaluationScores.get(bookEval.evaluationId) || 0;
        const minRequired = bookEval.minScorePercentage || 70.0;
        const isPassed = userScore >= minRequired;

        // Log evaluation result for debugging
        if (userScore > 0) {
          console.log(`    📊 [RECOMMENDATION] Book ${book.id} - Evaluation ${bookEval.evaluationId} (${bookEval.evaluation.title || bookEval.evaluation.titleAr}):`, {
            userScore: `${userScore.toFixed(2)}%`,
            minRequired: `${minRequired}%`,
            isPassed,
            isRequired: bookEval.isRequired
          });
        } else {
          console.warn(`    ⚠️ [RECOMMENDATION] Book ${book.id} - Evaluation ${bookEval.evaluationId} (${bookEval.evaluation.title || bookEval.evaluation.titleAr}): No user score found!`);
          console.warn(`    ⚠️ [RECOMMENDATION] This means the user has not completed this evaluation yet.`);
        }

        return {
          evaluationId: bookEval.evaluationId,
          evaluationTitle: bookEval.evaluation.title,
          evaluationTitleAr: bookEval.evaluation.titleAr,
          userScore,
          minRequired,
          isPassed,
          isRequired: bookEval.isRequired,
        };
      });

      // Calculate overall match percentage
      // If book has required evaluations, all must pass
      const requiredEvaluations = evaluationResults.filter((er) => er.isRequired);
      const hasAllRequiredPassed = requiredEvaluations.length === 0 || 
        requiredEvaluations.every((er) => er.isPassed);

      // Calculate average score of all evaluations
      const totalScore = evaluationResults.reduce((sum, er) => sum + er.userScore, 0);
      const avgScore = evaluationResults.length > 0 ? totalScore / evaluationResults.length : 0;

      // Book is recommended if:
      // 1. All required evaluations are passed (if any required)
      // 2. At least one evaluation is passed (if no required evaluations)
      // 3. Average score meets the minimum threshold
      const overallMinScore = Math.min(
        ...book.evaluations.map((be) => be.minScorePercentage || 70.0)
      );
      
      // If no required evaluations, recommend if any evaluation passed
      // If has required evaluations, all must pass AND avg score must meet threshold
      let isRecommended = false;
      if (requiredEvaluations.length === 0) {
        // No required evaluations - recommend if:
        // 1. At least one evaluation passed (userScore >= minRequired)
        // 2. OR if user has completed at least one evaluation and score is reasonable (>= 5% for very flexible recommendations)
        const hasAnyPassed = evaluationResults.some((er) => er.isPassed);
        const hasAnyCompleted = evaluationResults.some((er) => er.userScore > 0);
        
        // Very flexible: recommend if any passed OR if completed with any score > 0
        // This ensures that if user completes an evaluation, they get recommendations
        isRecommended = hasAnyPassed || hasAnyCompleted;
        
        if (!isRecommended) {
          console.log(`  ❌ [RECOMMENDATION] Book ${book.id} (${book.titleAr || book.title}) NOT recommended:`, {
            hasAnyPassed,
            hasAnyCompleted,
            avgScore: `${avgScore.toFixed(2)}%`,
            reason: 'No evaluations completed or passed'
          });
        }
      } else {
        // Has required evaluations - all must pass AND avg score must meet threshold
        // But be more flexible: if avgScore is close to threshold (within 20%), still recommend
        const thresholdFlex = overallMinScore * 0.8; // 80% of minimum threshold (more flexible)
        isRecommended = hasAllRequiredPassed && (avgScore >= overallMinScore || avgScore >= thresholdFlex);
        
        if (!isRecommended) {
          console.log(`  ❌ [RECOMMENDATION] Book ${book.id} (${book.titleAr || book.title}) NOT recommended:`, {
            hasAllRequiredPassed,
            avgScore: `${avgScore.toFixed(2)}%`,
            minRequired: `${overallMinScore}%`,
            thresholdFlex: `${thresholdFlex.toFixed(2)}%`,
            reason: !hasAllRequiredPassed 
              ? 'Not all required evaluations passed'
              : avgScore < thresholdFlex
              ? `Average score (${avgScore.toFixed(2)}%) is below flexible threshold (${thresholdFlex.toFixed(2)}%)`
              : 'Unknown reason'
          });
        }
      }

      if (isRecommended) {
        console.log(`  ✅ [RECOMMENDATION] Book ${book.id} (${book.titleAr || book.title}) IS RECOMMENDED:`, {
          avgScore: `${avgScore.toFixed(2)}%`,
          minRequired: `${overallMinScore}%`,
          hasAllRequiredPassed,
          totalEvaluations: book.evaluations.length,
          completedEvaluations: evaluationResults.filter((er) => er.userScore > 0).length
        });
      }

      // Calculate discount and discounted price for recommended books only
      const originalPrice = Number(book.price) || 0;
      let discountAmount = 0;
      let discountedPrice = originalPrice;
      let hasDiscount = false;

      if (isRecommended && discountPercentage > 0) {
        discountAmount = (originalPrice * discountPercentage) / 100;
        discountedPrice = originalPrice - discountAmount;
        hasDiscount = true;
      }

      return {
        ...book,
        matchPercentage: Math.round(avgScore * 100) / 100,
        isRecommended,
        meetsThreshold: avgScore >= recommendationThreshold, // Flag for 70%+ match
        evaluationResults,
        requiredEvaluationsPassed: requiredEvaluations.every((er) => er.isPassed),
        totalEvaluations: book.evaluations.length,
        completedEvaluations: evaluationResults.filter((er) => er.userScore > 0).length,
        averageRating: Math.round(averageRating * 10) / 10,
        reviewsCount: book._count.reviews,
        // Discount information (only for recommended books)
        hasDiscount,
        discountPercentage: hasDiscount ? discountPercentage : 0,
        originalPrice: hasDiscount ? originalPrice : undefined,
        discountedPrice: hasDiscount ? Math.round(discountedPrice * 100) / 100 : undefined,
        discountAmount: hasDiscount ? Math.round(discountAmount * 100) / 100 : undefined,
      };
    });

    // Sort all books by match percentage (descending) - highest match first
    recommendedBooks.sort((a, b) => {
      return b.matchPercentage - a.matchPercentage;
    });

    // Show ALL recommended books regardless of match percentage
    // This ensures users see all books that are linked to their completed evaluations
    const hasCompletedEvaluations = userRatings.length > 0;
    
    // Filter to show all books that have evaluations linked (even if matchPercentage is 0)
    // Only show books that are recommended (isRecommended = true) OR have any match percentage
    const allRecommendedBooks = recommendedBooks.filter((book) => {
      // Show book if:
      // 1. It's marked as recommended (isRecommended = true)
      // 2. OR it has matchPercentage > 0 (user completed at least one evaluation)
      // 3. OR user has completed evaluations and book has evaluations linked
      return book.isRecommended || book.matchPercentage > 0 || (hasCompletedEvaluations && book.evaluations.length > 0);
    });
    
    const highMatchBooks = allRecommendedBooks.filter((book) => {
      return book.matchPercentage >= 70;
    });

    const mediumMatchBooks = allRecommendedBooks.filter((book) => {
      return book.matchPercentage >= 50 && book.matchPercentage < 70;
    });

    const lowMatchBooks = allRecommendedBooks.filter((book) => {
      return book.matchPercentage > 0 && book.matchPercentage < 50;
    });

    // Books with 0% match but linked to evaluations (user hasn't completed those evaluations yet)
    const zeroMatchBooks = allRecommendedBooks.filter((book) => {
      return book.matchPercentage === 0 && book.evaluations.length > 0;
    });

    // Combine all books: high match first, then medium match, then low match, then zero match
    // This ensures all recommended books are shown, sorted by match percentage
    let finalBooks = [...highMatchBooks, ...mediumMatchBooks, ...lowMatchBooks, ...zeroMatchBooks];
    
    // Limit to top 6 books based on match percentage (highest first)
    // This ensures users see only the best matching books
    finalBooks = finalBooks.slice(0, 6);

    const recommendedCount = finalBooks.filter((b) => b.isRecommended).length;
    const highMatchCount = finalBooks.filter((b) => b.matchPercentage >= 70).length;
    const books50to70 = finalBooks.filter((b) => b.matchPercentage >= 50 && b.matchPercentage < 70).length;
    const booksBelow50 = finalBooks.filter((b) => b.matchPercentage > 0 && b.matchPercentage < 50).length;
    const booksZeroMatch = finalBooks.filter((b) => b.matchPercentage === 0).length;
    
    console.log(`📊 [RECOMMENDATION] Final results:`, {
      totalBooks: recommendedBooks.length,
      allRecommendedBooks: allRecommendedBooks.length,
      highMatchBooks: highMatchBooks.length,
      mediumMatchBooks: mediumMatchBooks.length,
      lowMatchBooks: lowMatchBooks.length,
      zeroMatchBooks: zeroMatchBooks.length,
      books50to70: books50to70,
      booksBelow50: booksBelow50,
      booksZeroMatch: booksZeroMatch,
      finalBooks: finalBooks.length,
      recommendedCount,
      highMatchCount,
      hasCompletedEvaluations,
      recommendationRate: finalBooks.length > 0 ? `${((recommendedCount / finalBooks.length) * 100).toFixed(2)}%` : '0%'
    });
    
    if (finalBooks.length === 0) {
      console.error('❌ [RECOMMENDATION] ERROR: No books were recommended!');
      console.error('❌ [RECOMMENDATION] Possible reasons:');
      console.error('  1. User has not completed any evaluations');
      console.error('  2. Books are not linked to evaluations');
      console.error('  3. All books have 0% match percentage');
      console.error('  4. All required evaluations are not passed');
      console.error(`  5. User ratings count: ${userRatings.length}`);
      console.error(`  6. Total books in database: ${books.length}`);
    }

    res.json({
      books: finalBooks,
      total: finalBooks.length,
      recommended: recommendedCount,
      highMatch: highMatchCount, // Books with 70%+ match
    });
  } catch (error: any) {
    console.error('❌ [RECOMMENDATION] Error getting recommended books:', error);
    console.error('❌ [RECOMMENDATION] Error stack:', error.stack);
    console.error('❌ [RECOMMENDATION] Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta
    });
    res.status(500).json({ 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Get book recommendation details for a specific book
 */
export const getBookRecommendationDetails = async (req: AuthRequest, res: Response) => {
  try {
    const { bookId } = req.params;
    const userId = req.user!.userId;

    const book = await prisma.book.findUnique({
      where: { id: parseInt(bookId) },
      include: {
        evaluations: {
          include: {
            evaluation: {
              include: {
                criteria: true,
              },
            },
          },
        },
        bookCategory: true,
      },
    });

    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Get user's ratings for evaluations linked to this book
    const evaluationIds = book.evaluations.map((be) => be.evaluationId);
    const userRatings = await prisma.rating.findMany({
      where: {
        userId,
        evaluationId: { in: evaluationIds },
        status: 'SUBMITTED',
      },
      include: {
        evaluation: {
          include: {
            criteria: true,
          },
        },
        items: {
          include: {
            criterion: true,
          },
        },
      },
    });

    // Calculate scores for each evaluation
    const evaluationResults = book.evaluations.map((bookEval) => {
      const rating = userRatings.find((r) => r.evaluationId === bookEval.evaluationId);
      
      let userScore = 0;
      if (rating && rating.totalScore !== null && rating.items && rating.items.length > 0) {
        // Calculate from items for accuracy
        const maxPossibleWeightedScore = rating.evaluation.criteria.reduce((sum: number, criterion: any) => {
          return sum + (criterion.weight || 1);
        }, 0);
        
        let actualWeightedScore = 0;
        rating.items.forEach((item: any) => {
          const criterion = item.criterion;
          if (criterion) {
            const normalizedScore = (item.score / (criterion.maxScore || 10)) * (criterion.weight || 1);
            actualWeightedScore += normalizedScore;
          }
        });
        
        userScore = maxPossibleWeightedScore > 0 
          ? (actualWeightedScore / maxPossibleWeightedScore) * 100 
          : 0;
      } else if (rating && rating.totalScore !== null) {
        // Fallback: use totalScore
        const maxPossibleWeightedScore = rating.evaluation.criteria.reduce((sum: number, criterion: any) => {
          return sum + (criterion.weight || 1);
        }, 0);
        
        userScore = maxPossibleWeightedScore > 0 
          ? (rating.totalScore / maxPossibleWeightedScore) * 100 
          : 0;
      }

      const minRequired = bookEval.minScorePercentage || 70.0;
      const isPassed = userScore >= minRequired;

      return {
        evaluationId: bookEval.evaluationId,
        evaluationTitle: bookEval.evaluation.title,
        evaluationTitleAr: bookEval.evaluation.titleAr,
        userScore: Math.round(userScore * 100) / 100,
        minRequired,
        isPassed,
        isRequired: bookEval.isRequired,
        hasCompleted: !!rating,
        ratingId: rating?.id,
      };
    });

    // Calculate overall match
    const requiredEvaluations = evaluationResults.filter((er) => er.isRequired);
    const hasAllRequiredPassed = requiredEvaluations.length === 0 || 
      requiredEvaluations.every((er) => er.isPassed);

    const totalScore = evaluationResults.reduce((sum, er) => sum + er.userScore, 0);
    const avgScore = evaluationResults.length > 0 ? totalScore / evaluationResults.length : 0;

    const overallMinScore = Math.min(
      ...book.evaluations.map((be) => be.minScorePercentage || 70.0)
    );
    const isRecommended = hasAllRequiredPassed && avgScore >= overallMinScore;

    res.json({
      book,
      matchPercentage: Math.round(avgScore * 100) / 100,
      isRecommended,
      evaluationResults,
      requiredEvaluationsPassed: requiredEvaluations.every((er) => er.isPassed),
      totalEvaluations: book.evaluations.length,
      completedEvaluations: evaluationResults.filter((er) => er.hasCompleted).length,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};




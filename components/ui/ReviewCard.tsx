import { CalendarDays, UserCheck } from "lucide-react";
import type { Movie, Review, User } from "@/types";
import { formatDate } from "@/lib/utils";
import { Avatar } from "./Avatar";
import { StarRating } from "./StarRating";

interface ReviewCardProps {
    review: Review;
    movie: Movie;
    user1: User;
    user2: User;
    recommender: User;
}

export function ReviewCard({ review, movie, user1, user2, recommender }: ReviewCardProps) {
    return (
        <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200 transition-colors hover:ring-indigo-300 dark:bg-card-dark dark:ring-gray-800 dark:hover:ring-indigo-500/50 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                        {movie.title}
                    </h3>
                    <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <span className="inline-flex items-center gap-1">
                            <CalendarDays size={14} />
                            Assistido em {formatDate(review.dateWatched)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                            <UserCheck size={14} />
                            Recomendado por {recommender.name}
                        </span>
                    </div>
                </div>
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                    {movie.genres.join(" · ")}
                </span>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                {review.textReview}
            </p>

            <div className="mt-5 flex flex-col gap-3 border-t border-gray-100 pt-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <Avatar src={user1.avatar} name={user1.name} size="sm" />
                    <div>
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-200">{user1.name}</p>
                        <StarRating rating={review.ratingUser1} />
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-200">{user2.name}</p>
                        <StarRating rating={review.ratingUser2} className="justify-end" />
                    </div>
                    <Avatar src={user2.avatar} name={user2.name} size="sm" />
                </div>
            </div>
        </article>
    );
}
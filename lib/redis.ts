import { Redis } from "@upstash/redis"

if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  throw new Error("Redis environment variables are not set")
}

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

// Cache keys
export const CACHE_KEYS = {
  QUIZ: (id: string) => `quiz:${id}`,
  USER_QUIZZES: (userId: string) => `user:${userId}:quizzes`,
  PUBLIC_QUIZZES: "public:quizzes",
  QUIZ_ATTEMPTS: (userId: string, quizId: string) => `attempts:${userId}:${quizId}`,
  LEADERBOARD: (quizId: string) => `leaderboard:${quizId}`,
} as const

// Cache TTL (in seconds)
export const CACHE_TTL = {
  QUIZ: 60 * 15, // 15 minutes
  USER_QUIZZES: 60 * 5, // 5 minutes
  PUBLIC_QUIZZES: 60 * 10, // 10 minutes
  QUIZ_ATTEMPTS: 60 * 30, // 30 minutes
  LEADERBOARD: 60 * 5, // 5 minutes
} as const

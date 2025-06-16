import { pgTable, text, timestamp, integer, boolean, jsonb, uuid, pgEnum } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"

// Enums
export const quizStatusEnum = pgEnum("quiz_status", ["draft", "published", "archived"])
export const questionTypeEnum = pgEnum("question_type", ["multiple_choice", "true_false", "short_answer", "essay"])
export const quizSourceEnum = pgEnum("quiz_source", ["manual", "text_paste", "pdf_upload"])

// Users table (synced with Clerk)
export const users = pgTable("users", {
  id: text("id").primaryKey(), // Clerk user ID
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  avatar: text("avatar"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Quizzes table
export const quizzes = pgTable("quizzes", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  creatorId: text("creator_id")
    .references(() => users.id)
    .notNull(),
  status: quizStatusEnum("status").default("draft").notNull(),
  source: quizSourceEnum("source").default("manual").notNull(),
  isPublic: boolean("is_public").default(false).notNull(),
  timeLimit: integer("time_limit"), // in minutes
  passingScore: integer("passing_score"), // percentage
  allowRetake: boolean("allow_retake").default(true).notNull(),
  showCorrectAnswers: boolean("show_correct_answers").default(true).notNull(),
  randomizeQuestions: boolean("randomize_questions").default(false).notNull(),
  tags: text("tags").array(),
  metadata: jsonb("metadata"), // for storing additional data like PDF info, processing status
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Questions table
export const questions = pgTable("questions", {
  id: uuid("id").defaultRandom().primaryKey(),
  quizId: uuid("quiz_id")
    .references(() => quizzes.id, { onDelete: "cascade" })
    .notNull(),
  type: questionTypeEnum("type").notNull(),
  question: text("question").notNull(),
  explanation: text("explanation"),
  points: integer("points").default(1).notNull(),
  order: integer("order").notNull(),
  options: jsonb("options"), // for multiple choice options
  correctAnswer: text("correct_answer").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Quiz attempts table
export const quizAttempts = pgTable("quiz_attempts", {
  id: uuid("id").defaultRandom().primaryKey(),
  quizId: uuid("quiz_id")
    .references(() => quizzes.id)
    .notNull(),
  userId: text("user_id")
    .references(() => users.id)
    .notNull(),
  score: integer("score"),
  totalQuestions: integer("total_questions").notNull(),
  correctAnswers: integer("correct_answers"),
  timeSpent: integer("time_spent"), // in seconds
  completed: boolean("completed").default(false).notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
})

// User answers table
export const userAnswers = pgTable("user_answers", {
  id: uuid("id").defaultRandom().primaryKey(),
  attemptId: uuid("attempt_id")
    .references(() => quizAttempts.id, { onDelete: "cascade" })
    .notNull(),
  questionId: uuid("question_id")
    .references(() => questions.id)
    .notNull(),
  answer: text("answer").notNull(),
  isCorrect: boolean("is_correct"),
  timeSpent: integer("time_spent"), // in seconds
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Quiz favorites/bookmarks
export const quizFavorites = pgTable("quiz_favorites", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .references(() => users.id)
    .notNull(),
  quizId: uuid("quiz_id")
    .references(() => quizzes.id, { onDelete: "cascade" })
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  quizzes: many(quizzes),
  attempts: many(quizAttempts),
  favorites: many(quizFavorites),
}))

export const quizzesRelations = relations(quizzes, ({ one, many }) => ({
  creator: one(users, {
    fields: [quizzes.creatorId],
    references: [users.id],
  }),
  questions: many(questions),
  attempts: many(quizAttempts),
  favorites: many(quizFavorites),
}))

export const questionsRelations = relations(questions, ({ one, many }) => ({
  quiz: one(quizzes, {
    fields: [questions.quizId],
    references: [quizzes.id],
  }),
  answers: many(userAnswers),
}))

export const quizAttemptsRelations = relations(quizAttempts, ({ one, many }) => ({
  quiz: one(quizzes, {
    fields: [quizAttempts.quizId],
    references: [quizzes.id],
  }),
  user: one(users, {
    fields: [quizAttempts.userId],
    references: [users.id],
  }),
  answers: many(userAnswers),
}))

export const userAnswersRelations = relations(userAnswers, ({ one }) => ({
  attempt: one(quizAttempts, {
    fields: [userAnswers.attemptId],
    references: [quizAttempts.id],
  }),
  question: one(questions, {
    fields: [userAnswers.questionId],
    references: [questions.id],
  }),
}))

export const quizFavoritesRelations = relations(quizFavorites, ({ one }) => ({
  user: one(users, {
    fields: [quizFavorites.userId],
    references: [users.id],
  }),
  quiz: one(quizzes, {
    fields: [quizFavorites.quizId],
    references: [quizzes.id],
  }),
}))

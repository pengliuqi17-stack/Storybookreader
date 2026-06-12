/**
 * Shared Type Definitions for AI Story Group Reading Hub
 */

export interface Quiz {
  id: string; // chapterId or separate ID
  question: string;
  options: string[];
  answerIndex: number; // Index in options (0-3)
  explanation: string;
  points: number;
}

export interface Chapter {
  id: string;
  order: number;
  title: string;
  content: string; // Supports markdown or rich paragraphs
  aiConcept: {
    title: string;
    description: string;
    funFact: string;
  };
  quiz?: Quiz;
}

export interface Story {
  id: string;
  title: string;
  description: string;
  coverEmoji: string;
  chapters: Chapter[];
}

export interface AssistantConfig {
  name: string;
  avatarEmoji: string;
  personalityPrompt: string; // The systemInstruction for Gemini
  welcomeMessage: string;
  hints: string[]; // Standard suggestions student can click
}

export interface Group {
  id: string;
  name: string;
  inviteCode: string;
  storyId: string;
  currentChapterId: string;
  assistantConfig: AssistantConfig;
  createdAt: number;
}

export interface User {
  id: string;
  name: string;
  groupId: string;
  points: number;
  badges: string[];
  completedQuizzes: string[]; // Chapter IDs or Quiz IDs completed
  role: 'student' | 'teacher';
}

export interface Message {
  id: string;
  groupId: string;
  senderId: string;
  senderName: string;
  senderRole: 'student' | 'teacher' | 'assistant';
  senderAvatar: string; // emoji or image
  text: string;
  timestamp: number;
  isAiMention: boolean;
  isSystem: boolean;
}

export interface LeaderboardEntry {
  userId: string;
  userName: string;
  points: number;
  badgesCount: number;
  completedCount: number;
}

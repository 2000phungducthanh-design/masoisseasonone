import { Timestamp } from 'firebase/firestore';

export type GameStatus = 'waiting' | 'active' | 'finished';
export type GamePhase = 'day' | 'night';
export type MessageType = 'global' | 'werewolf' | 'system';
export type Team = 'village' | 'werewolves' | 'solo';

export interface Game {
  id: string;
  code: string;
  status: GameStatus;
  phase: GamePhase;
  round: number;
  hostId: string;
  winner: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Player {
  uid: string;
  displayName: string;
  role: string;
  team: Team;
  isAlive: boolean;
  voteTargetId: string | null;
  joinedAt: Timestamp;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  type: MessageType;
  createdAt: Timestamp;
}

export const ROLES = {
  WEREWOLF: { name: 'Werewolf', team: 'werewolves', description: 'At night, choose a player to kill.' },
  SEER: { name: 'Seer', team: 'village', description: 'At night, choose a player to reveal their role.' },
  BODYGUARD: { name: 'Bodyguard', team: 'village', description: 'At night, choose a player to protect from death.' },
  VILLAGER: { name: 'Villager', team: 'village', description: 'Survive and find the werewolves during the day.' },
  MEDIUM: { name: 'Medium', team: 'village', description: 'Speak with the dead during the day.' },
} as const;

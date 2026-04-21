import { doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError } from '../../lib/firebase';
import { Player, Game, ROLES } from '../../types';
import { Skull, Target, Heart, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PlayerGridProps {
  players: Player[];
  currentPlayer: Player | null;
  game: Game;
}

export default function PlayerGrid({ players, currentPlayer, game }: PlayerGridProps) {
  const handleVote = async (targetId: string) => {
    if (!currentPlayer || !currentPlayer.isAlive || game.status !== 'active') return;
    if (targetId === currentPlayer.uid) return;

    try {
      await updateDoc(doc(db, 'games', game.id, 'players', currentPlayer.uid), {
        voteTargetId: currentPlayer.voteTargetId === targetId ? null : targetId
      });
    } catch (e) {
      handleFirestoreError(e, 'update', `games/${game.id}/players/${currentPlayer.uid}`);
    }
  };

  const getVoteCount = (pid: string) => {
    return players.filter(p => p.voteTargetId === pid).length;
  };

  return (
    <div className="grid grid-cols-4 gap-2">
      {players.map((p, i) => {
        const votes = getVoteCount(p.uid);
        const isSelf = p.uid === currentPlayer?.uid;
        const isTargeted = currentPlayer?.voteTargetId === p.uid;

        return (
          <motion.div
            key={p.uid}
            layout
            onClick={() => p.isAlive && handleVote(p.uid)}
            className={`player-card ${
              !p.isAlive ? 'opacity-30 grayscale' : ''
            } ${isSelf ? 'border-2 border-yellow-500' : ''}`}
          >
            <span className="absolute top-1 left-1.5 text-[8px] font-bold text-slate-500">
               {(i + 1).toString().padStart(2, '0')}
            </span>
            
            <div className={`h-8 w-8 rounded-full bg-slate-700/50 flex items-center justify-center overflow-hidden mb-1 ${isSelf ? 'bg-yellow-600/20' : ''}`}>
               <img 
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p.uid}`} 
                alt="avatar" 
                className="h-full w-full opacity-80"
              />
            </div>
            
            <p className="text-[9px] font-medium text-slate-300 truncate w-full text-center px-1">
               {isSelf ? 'You' : p.displayName}
            </p>

            {votes > 0 && p.isAlive && (
                <div className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-red-500 border-2 border-[#0f172a]" />
            )}

            {isTargeted && (
                <div className="absolute inset-0 rounded-xl ring-2 ring-yellow-500/50" />
            )}
          </motion.div>
        );
      })}
    </div>
  );
}


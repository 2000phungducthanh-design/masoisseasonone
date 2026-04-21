import { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot, updateDoc, collection, query, orderBy, limit, addDoc, serverTimestamp, setDoc, getDocs, where, QueryConstraint, deleteDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError } from '../../lib/firebase';
import { User } from 'firebase/auth';
import { Game, Player, Message, ROLES, GameStatus, GamePhase } from '../../types';
import { Users, MessageSquare, Shield, Moon, Sun, X, Send, Play, Gavel, LogOut, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Chat from './Chat';
import PlayerGrid from './PlayerGrid';

interface GameBoardProps {
  gameId: string;
  onLeave: () => void;
  user: User;
}

export default function GameBoard({ gameId, onLeave, user }: GameBoardProps) {
  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [activeTab, setActiveTab] = useState<'players' | 'chat'>('players');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Load Game Data
  useEffect(() => {
    const unsubGame = onSnapshot(doc(db, 'games', gameId), {
      next: (snapshot) => {
        if (snapshot.exists()) {
          setGame({ id: snapshot.id, ...snapshot.data() } as Game);
        } else {
          onLeave();
        }
      },
      error: (err) => handleFirestoreError(err, 'get', `games/${gameId}`)
    });

    const unsubPlayers = onSnapshot(collection(db, 'games', gameId, 'players'), {
      next: (snapshot) => {
        const p = snapshot.docs.map(d => d.data() as Player);
        setPlayers(p);
        const me = p.find(player => player.uid === user.uid);
        setCurrentPlayer(me || null);
      },
      error: (err) => handleFirestoreError(err, 'list', `games/${gameId}/players`)
    });

    return () => {
      unsubGame();
      unsubPlayers();
    };
  }, [gameId, user.uid]);

  // Load Messages (Filtered by permissions)
  useEffect(() => {
    const allowedTypes = ['global', 'system'];
    if (currentPlayer?.team === 'werewolves') {
      allowedTypes.push('werewolf');
    }

    const qMessages = query(
      collection(db, 'games', gameId, 'messages'),
      where('type', 'in', allowedTypes),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubMessages = onSnapshot(qMessages, {
      next: (snapshot) => {
        const m = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Message)).reverse();
        setMessages(m);
      },
      error: (err) => handleFirestoreError(err, 'list', `games/${gameId}/messages`)
    });

    return () => unsubMessages();
  }, [gameId, currentPlayer?.team]);

  // Join game if not in
  useEffect(() => {
    if (game && game.status === 'waiting' && !currentPlayer && players.length < 16) {
      const joinGame = async () => {
        try {
          await setDoc(doc(db, 'games', gameId, 'players', user.uid), {
            uid: user.uid,
            displayName: user.displayName || 'Player',
            role: 'Villager',
            team: 'village',
            isAlive: true,
            voteTargetId: null,
            joinedAt: serverTimestamp()
          });
        } catch (e) {
          handleFirestoreError(e, 'create', `games/${gameId}/players/${user.uid}`);
        }
      };
      joinGame();
    }
  }, [game, currentPlayer]);

  const startGame = async () => {
    if (!game || game.hostId !== user.uid) return;

    try {
      // Assignment Logic (Simplified for brevity)
      const playerDocs = await getDocs(collection(db, 'games', gameId, 'players'));
      const pIds = playerDocs.docs.map(d => d.id);
      
      // Shuffle and assign roles
      const shuffled = [...pIds].sort(() => Math.random() - 0.5);
      const werewolfCount = Math.ceil(pIds.length / 4);
      
      for (let i = 0; i < pIds.length; i++) {
          let role = 'Villager';
          let team: any = 'village';
          
          if (i < werewolfCount) {
              role = 'Werewolf';
              team = 'werewolves';
          } else if (i === werewolfCount) {
              role = 'Seer';
          } else if (i === werewolfCount + 1 && pIds.length > 5) {
              role = 'Bodyguard';
          }

          await updateDoc(doc(db, 'games', gameId, 'players', shuffled[i]), {
              role,
              team
          });
      }

      await updateDoc(doc(db, 'games', gameId), {
        status: 'active',
        phase: 'day',
        round: 1,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, 'write', `games/${gameId}`);
    }
  };

  const nextPhase = async () => {
    if (!game || game.hostId !== user.uid) return;
    const newPhase: GamePhase = game.phase === 'day' ? 'night' : 'day';
    const newRound = newPhase === 'day' ? game.round + 1 : game.round;

    try {
      await updateDoc(doc(db, 'games', gameId), {
        phase: newPhase,
        round: newRound,
        updatedAt: serverTimestamp()
      });
      
      // Reset votes
      for(const p of players) {
          await updateDoc(doc(db, 'games', gameId, 'players', p.uid), {
              voteTargetId: null
          });
      }
    } catch (e) {
      handleFirestoreError(e, 'write', `games/${gameId}`);
    }
  };

  const leaveGame = async () => {
    try {
      await deleteDoc(doc(db, 'games', gameId, 'players', user.uid));
      onLeave();
    } catch (e) {
      handleFirestoreError(e, 'delete', `games/${gameId}/players/${user.uid}`);
    }
  };

  const deleteGame = async () => {
    if (!game || game.hostId !== user.uid) return;
    
    try {
      await deleteDoc(doc(db, 'games', gameId));
      onLeave();
    } catch (e) {
      handleFirestoreError(e, 'delete', `games/${gameId}`);
    }
  };

  if (!game) return null;

  return (
    <div className="flex h-full flex-col bg-slate-900/40">
      {/* Header */}
      <header className="relative flex flex-col border-b border-slate-800 bg-slate-900/50 p-6 pt-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {!showDeleteConfirm ? (
              <>
                <button onClick={leaveGame} className="flex h-8 items-center gap-2 rounded-full bg-slate-800 px-3 text-[10px] font-bold text-slate-400 hover:text-white">
                  <LogOut className="h-3 w-3" /> EXIT
                </button>
                {game.hostId === user.uid && (
                    <button onClick={() => setShowDeleteConfirm(true)} className="flex h-8 items-center gap-2 rounded-full bg-red-500/10 px-3 text-[10px] font-bold text-red-500 hover:bg-red-500/20">
                      <Trash2 className="h-3 w-3" /> DELETE
                    </button>
                )}
              </>
            ) : (
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                   <p className="text-[10px] font-bold text-red-500 mr-1">CONFIRM DELETE?</p>
                   <button onClick={deleteGame} className="h-8 rounded-full bg-red-600 px-3 text-[10px] font-bold text-white">YES</button>
                   <button onClick={() => setShowDeleteConfirm(false)} className="h-8 rounded-full bg-slate-700 px-3 text-[10px] font-bold text-white">NO</button>
                </div>
            )}
          </div>
          <div className="text-right">
             <p className="text-[10px] uppercase font-bold text-slate-500">Players</p>
             <p className="text-xl font-mono text-yellow-500">{players.length}/16</p>
          </div>
        </div>
        
        <div className="mt-6">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
               {game.status === 'waiting' ? 'Lobby' : `${game.phase} Phase`}
            </p>
            <h2 className="text-2xl font-light text-white">
               {game.status === 'waiting' ? `CODE: ${game.code}` : `Day ${game.round.toString().padStart(2, '0')}`}
            </h2>
        </div>
      </header>

      {/* Main Area */}
      <main className="relative flex-1 overflow-hidden p-3 pt-4">
        <AnimatePresence mode="wait">
          {activeTab === 'players' ? (
            <motion.div
              key="players"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full overflow-y-auto scroll-mask pb-20"
            >
              <PlayerGrid 
                players={players} 
                currentPlayer={currentPlayer} 
                game={game} 
              />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full"
            >
              <Chat 
                messages={messages} 
                game={game} 
                user={user} 
                currentPlayer={currentPlayer} 
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Controls */}
        <div className="absolute top-2 right-4 flex gap-2">
           {game.hostId === user.uid && game.status === 'waiting' && players.length >= 4 && (
               <button onClick={startGame} className="h-8 rounded-full bg-yellow-600 px-4 text-[10px] font-bold">START</button>
           )}
           {game.hostId === user.uid && game.status === 'active' && (
               <button onClick={nextPhase} className="h-8 rounded-full bg-slate-800 px-4 text-[10px] font-bold">NEXT</button>
           )}
        </div>
      </main>

      {/* Footer / Ability Button */}
      <div className="flex h-24 items-center justify-between gap-4 border-t border-slate-800 bg-slate-900/80 px-6 backdrop-blur-md">
        <button 
          onClick={() => setActiveTab('chat')}
          className={`group flex h-12 w-12 items-center justify-center rounded-full transition-colors ${activeTab === 'chat' ? 'bg-yellow-600 text-white' : 'bg-slate-800 text-slate-400'}`}
        >
          <MessageSquare className="h-5 w-5" />
        </button>
        
        <button className="flex-1 h-12 rounded-2xl bg-yellow-600 text-sm font-bold tracking-wide text-white shadow-lg active:scale-95 transition-all">
           USE ABILITY
        </button>

        <button 
          onClick={() => setActiveTab('players')}
          className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${activeTab === 'players' ? 'bg-yellow-600 text-white' : 'bg-slate-800 text-slate-400'}`}
        >
          <Users className="h-5 w-5" />
        </button>
      </div>
      
      {/* Home bar shim */}
      <div className="mx-auto mb-2 h-1.5 w-24 rounded-full bg-slate-800/50"></div>
    </div>
  );
}

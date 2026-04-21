import { useState, useEffect, MouseEvent, FormEvent } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, orderBy, limit, getDocs } from 'firebase/firestore';
import { db, auth, handleFirestoreError } from '../../lib/firebase';
import { User, signOut } from 'firebase/auth';
import { Game } from '../../types';
import { Plus, Users, LogOut, ArrowRight, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { deleteDoc, doc } from 'firebase/firestore';

interface LobbyProps {
  onJoin: (id: string) => void;
  user: User;
}

export default function Lobby({ onJoin, user }: LobbyProps) {
  const [games, setGames] = useState<Game[]>([]);
  const [creating, setCreating] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'games'),
      where('status', '==', 'waiting'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    return onSnapshot(q, {
      next: (snapshot) => {
        const g = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Game));
        setGames(g);
      },
      error: (err) => handleFirestoreError(err, 'list', 'games')
    });
  }, []);

  const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const createGame = async () => {
    setCreating(true);
    try {
      const docRef = await addDoc(collection(db, 'games'), {
        code: generateRoomCode(),
        status: 'waiting',
        phase: 'day',
        round: 0,
        hostId: user.uid,
        winner: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      onJoin(docRef.id);
    } catch (e) {
      handleFirestoreError(e, 'create', 'games');
    } finally {
      setCreating(false);
    }
  };

  const joinByCode = async (e: FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim() || joining) return;
    
    setJoining(true);
    try {
      const q = query(collection(db, 'games'), where('code', '==', joinCode.trim().toUpperCase()), limit(1));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        onJoin(querySnapshot.docs[0].id);
      } else {
        alert('Village code not found.');
      }
    } catch (err) {
      handleFirestoreError(err, 'get', 'games');
    } finally {
      setJoining(false);
    }
  };

  const deleteGameFromLobby = async (e: MouseEvent, gId: string) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, 'games', gId));
    } catch (err) {
      handleFirestoreError(err, 'delete', `games/${gId}`);
    }
  };

  return (
    <div className="flex h-full flex-col px-6 py-4">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 overflow-hidden rounded-full border border-slate-700 bg-slate-800">
            <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} alt="avatar" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Profile</p>
            <p className="text-sm font-medium text-slate-200">{user.displayName || 'Player'}</p>
          </div>
        </div>
        <button onClick={() => signOut(auth)} className="rounded-full bg-slate-800/50 p-2 text-slate-500 hover:text-slate-300">
          <LogOut className="h-4 w-4" />
        </button>
      </header>

      <section className="mb-8">
        <button
          onClick={createGame}
          disabled={creating}
          className="btn-primary mb-4"
        >
          {creating ? 'Creating...' : 'CREATE NEW VILLAGE'}
        </button>

        <form onSubmit={joinByCode} className="relative">
          <input
            type="text"
            maxLength={6}
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="ENTER VILLAGE CODE..."
            className="w-full rounded-2xl bg-slate-800/40 py-3 pl-5 pr-20 text-xs font-bold tracking-widest border border-white/5 focus:outline-none focus:border-yellow-500/50 transition-all text-slate-200"
          />
          <button
            type="submit"
            disabled={joining || joinCode.length !== 6}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 rounded-xl bg-slate-700 px-4 text-[10px] font-bold text-white transition-opacity disabled:opacity-20 hover:bg-slate-600"
          >
            {joining ? 'JOINING...' : 'JOIN'}
          </button>
        </form>
      </section>

      <section className="flex-1 overflow-auto">
        <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-2">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Live Sessions</h2>
          <span className="text-[10px] text-slate-600">{games.length} Active</span>
        </div>

        <div className="space-y-2">
          {games.map((game, i) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => onJoin(game.id)}
              className="flex items-center justify-between rounded-xl bg-slate-800/20 p-4 transition-all hover:bg-slate-800/40 active:scale-95 cursor-pointer border border-white/5"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center">
                  <Users className="h-4 w-4 text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-300">Village #{game.code}</p>
                  <p className="text-[10px] text-slate-500">Waiting for players</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {game.hostId === user.uid && (
                  <button 
                    onClick={(e) => deleteGameFromLobby(e, game.id)}
                    className="p-2 text-slate-600 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <ArrowRight className="h-4 w-4 text-slate-600" />
              </div>
            </motion.div>
          ))}


          {games.length === 0 && (
            <div className="rounded-2xl border-2 border-dashed border-white/5 p-12 text-center text-white/20">
              <Plus className="mx-auto mb-2 h-10 w-10 opacity-20" />
              <p>No active villages. Create one!</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

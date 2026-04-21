import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, signInWithGoogle } from './lib/firebase';
import { Game } from './types';
import Lobby from './components/game/Lobby';
import GameBoard from './components/game/GameBoard';
import { Moon, Sun, Shield, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0502]">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Moon className="h-12 w-12 text-[#ff4e00]" />
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="atmosphere" />
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="w-full max-w-sm rounded-[40px] bg-slate-900/80 p-10 text-center shadow-2xl backdrop-blur-xl border border-white/5"
        >
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-yellow-500/10 text-yellow-500">
             <Shield className="h-10 w-10" />
          </div>
          <h1 className="mb-2 text-3xl font-light tracking-tight text-white">WOLVESVILLE</h1>
          <p className="mb-10 text-xs uppercase tracking-[0.2em] text-slate-400">Clean Edition</p>
          <button
            onClick={signInWithGoogle}
            className="btn-primary"
          >
            Sign in with Google
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center overflow-hidden bg-[#020617] p-0 md:p-4">
      <div className="atmosphere" />
      <div className="phone-frame relative">
        <div className="absolute top-0 left-1/2 z-50 h-6 w-32 -translate-x-1/2 rounded-b-2xl bg-slate-800/50"></div>
        <AnimatePresence mode="wait">
          {!gameId ? (
            <motion.div
              key="lobby"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 overflow-auto pt-8"
            >
              <Lobby onJoin={setGameId} user={user} />
            </motion.div>
          ) : (
            <motion.div
              key="game"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 overflow-hidden pt-8"
            >
              <GameBoard gameId={gameId} onLeave={() => setGameId(null)} user={user} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}



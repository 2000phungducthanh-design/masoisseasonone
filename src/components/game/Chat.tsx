import { useState, useEffect, useRef, FormEvent } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError } from '../../lib/firebase';
import { Game, Message, Player } from '../../types';
import { Send, Lock, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from 'firebase/auth';

interface ChatProps {
  messages: Message[];
  game: Game;
  user: User;
  currentPlayer: Player | null;
}

export default function Chat({ messages, game, user, currentPlayer }: ChatProps) {
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !currentPlayer) return;

    let type: 'global' | 'werewolf' = 'global';
    if (game.phase === 'night' && currentPlayer.team === 'werewolves') {
        type = 'werewolf';
    }

    try {
      await addDoc(collection(db, 'games', game.id, 'messages'), {
        senderId: user.uid,
        senderName: currentPlayer.displayName,
        text: inputText.trim(),
        type,
        createdAt: serverTimestamp()
      });
      setInputText('');
    } catch (err) {
      handleFirestoreError(err, 'create', `games/${game.id}/messages`);
    }
  };

  const isNight = game.phase === 'night';
  const canChat = currentPlayer?.isAlive;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 scroll-mask">
        {messages.map((m) => {
          const isMe = m.senderId === user.uid;
          const isSystem = m.type === 'system';

          if (isSystem) {
             return (
                 <p key={m.id} className="text-center text-[9px] uppercase font-bold text-slate-500 tracking-widest py-2">
                    {m.text}
                 </p>
             );
          }

          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
            >
              <div className={`chat-bubble ${
                isMe 
                  ? 'bg-yellow-600/20 text-yellow-100 border border-yellow-500/10' 
                  : 'bg-slate-800/30 text-slate-300 border border-white/5'
              }`}>
                {!isMe && (
                   <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                     {m.senderName}
                   </span>
                )}
                {m.text}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="p-4 bg-slate-900/40">
        <form onSubmit={sendMessage} className="relative">
          <input
            type="text"
            disabled={!canChat}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={canChat ? "Your message..." : "Spectating..."}
            className="w-full rounded-2xl bg-slate-800/40 py-3 pl-5 pr-12 text-[13px] border border-white/5 focus:outline-none focus:border-yellow-500/50 transition-all text-slate-200"
          />
          <button
            type="submit"
            disabled={!canChat || !inputText.trim()}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-xl bg-yellow-600 p-2 text-white transition-opacity disabled:opacity-20"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

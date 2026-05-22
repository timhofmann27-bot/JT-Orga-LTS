import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle, Repeat } from 'lucide-react';

interface InvitePollsProps {
  polls: any[];
  invitee: any;
  onRefresh: () => void;
  handleVote: (pollId: number, optionId: number) => void;
}

export default function InvitePolls({ polls, invitee, onRefresh, handleVote }: InvitePollsProps) {
  if (polls.length === 0) return null;

  return (
    <div className="space-y-12">
      <div className="flex justify-between items-center px-10">
        <h2 className="text-4xl font-serif font-bold text-white tracking-tighter">Abstimmungen</h2>
        <button 
          onClick={onRefresh}
          className="w-10 h-10 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-white/20 hover:text-white transition-all active:rotate-180 duration-500"
          title="Aktualisieren"
        >
          <Repeat className="w-4 h-4" />
        </button>
      </div>
      <div className="grid gap-6">
        {polls.map(poll => (
          <motion.div 
            key={poll.id}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-surface-muted rounded-[3rem] border border-white/5 p-10 relative overflow-hidden"
          >
            <h3 className="text-2xl font-serif font-bold text-white mb-8 tracking-tighter">{poll.question}</h3>
            <div className="space-y-4">
              {poll.options.map((opt: any) => {
                const hasVoted = opt.votes.some((v: any) => v.id === invitee.person_id);
                const totalVotes = poll.options.reduce((a: any, b: any) => a + b.vote_count, 0);
                const percent = totalVotes > 0 ? (opt.vote_count / totalVotes) * 100 : 0;
                
                return (
                  <button 
                    key={opt.id}
                    onClick={() => handleVote(poll.id, opt.id)}
                    className={`w-full relative h-16 rounded-2xl overflow-hidden border transition-all text-left ${hasVoted ? 'border-white/20 bg-white/5' : 'border-white/5 bg-black/40 hover:bg-black/60'}`}
                  >
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${percent}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="absolute inset-y-0 left-0 bg-white/[0.03]"
                    />
                    <div className="relative h-full flex items-center justify-between px-6">
                      <span className={`text-sm font-bold tracking-widest uppercase transition-colors ${hasVoted ? 'text-white' : 'text-white/40'}`}>{opt.option_text}</span>
                      <div className="flex items-center gap-4">
                        {hasVoted && <CheckCircle className="w-4 h-4 text-white" />}
                        <span className="text-[10px] font-black text-white/20">{opt.vote_count}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

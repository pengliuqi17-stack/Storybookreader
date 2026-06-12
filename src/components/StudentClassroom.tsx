import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, Send, Sparkles, Trophy, Users, Star, Brain, ArrowLeft, ArrowRight,
  HelpCircle, MessageSquare, Compass, Award, RefreshCw, Layers
} from 'lucide-react';
import { Group, Story, User, Message, LeaderboardEntry, Chapter } from '../types';

interface StudentClassroomProps {
  initialUser: User;
  initialGroup: Group;
  initialStory: Story;
  onLeave: () => void;
}

export default function StudentClassroom({ initialUser, initialGroup, initialStory, onLeave }: StudentClassroomProps) {
  const [user, setUser] = useState<User>(initialUser);
  const [group, setGroup] = useState<Group>(initialGroup);
  const [story, setStory] = useState<Story>(initialStory);
  
  // Current chapter selected in the book view (defaults to group's current active chapter)
  const [activeChapterId, setActiveChapterId] = useState<string>(initialGroup.currentChapterId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  
  // Quiz states
  const [selectedQuizIndex, setSelectedQuizIndex] = useState<number | null>(null);
  const [quizFeedback, setQuizFeedback] = useState<{ isCorrect: boolean; explanation: string } | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizSuccessCelebration, setQuizSuccessCelebration] = useState(false);

  // Connection & Poll statuses
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const [showInviteCopied, setShowInviteCopied] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Sync state with group chapter update
  useEffect(() => {
    setActiveChapterId(group.currentChapterId);
  }, [group.currentChapterId]);

  // Load group detail, messages, and leaderboard
  const fetchGroupData = async () => {
    try {
      // 1. Fetch newer messages
      const url = `/api/groups/${group.id}/messages${lastFetchTime ? `?since=${lastFetchTime}` : ''}`;
      const mRes = await fetch(url);
      if (mRes.ok) {
        const newMsgs: Message[] = await mRes.json();
        if (newMsgs.length > 0) {
          setMessages(prev => {
            const merged = [...prev];
            newMsgs.forEach(m => {
              if (!merged.find(existing => existing.id === m.id)) {
                merged.push(m);
              }
            });
            return merged.sort((a, b) => a.timestamp - b.timestamp);
          });
          const highestTimestamp = Math.max(...newMsgs.map(m => m.timestamp));
          setLastFetchTime(highestTimestamp);
        }
      }

      // 2. Fetch Leaderboard
      const lRes = await fetch(`/api/groups/${group.id}/leaderboard`);
      if (lRes.ok) {
        const lData = await lRes.json();
        setLeaderboard(lData);
      }

      // 3. Keep User self-profile updated (in case of point/badge changes from server events)
      const cachedSelf = leaderboard.find(l => l.userId === user.id);
      if (cachedSelf) {
        setUser(prev => ({
          ...prev,
          points: cachedSelf.points,
        }));
      }

      // 4. Fetch Group to sync current chapter
      const gRes = await fetch(`/api/groups/${group.id}`);
      if (gRes.ok) {
        const refreshedGroup: Group = await gRes.json();
        if (refreshedGroup.currentChapterId !== group.currentChapterId) {
          setGroup(refreshedGroup);
        }
      }
    } catch (err) {
      console.error("Polling group data failed:", err);
    }
  };

  // Initial load & Polling Loop (every 2.5 seconds)
  useEffect(() => {
    fetchGroupData();
    const interval = setInterval(fetchGroupData, 2500);
    return () => clearInterval(interval);
  }, [group.id, lastFetchTime]);

  // Scroll to chat bottom on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Helper for Quiz Answer submit
  const handleQuizSubmit = async () => {
    if (selectedQuizIndex === null) return;
    setQuizLoading(true);
    setQuizFeedback(null);
    try {
      const res = await fetch(`/api/users/${user.id}/quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapterId: activeChapterId,
          selectedIndex: selectedQuizIndex
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '答题异常');
      }

      setQuizFeedback({
        isCorrect: data.isCorrect,
        explanation: data.explanation
      });

      if (data.isCorrect) {
        setQuizSuccessCelebration(true);
        setTimeout(() => setQuizSuccessCelebration(false), 4400);
        // Refresh local user entity
        if (data.user) {
          setUser(data.user);
        }
        // Force manual poll to fetch system announcement immediately
        fetchGroupData();
      }
    } catch (err: any) {
      alert(err.message || "提交答案遇到了点挫折！");
    } finally {
      setQuizLoading(false);
    }
  };

  // Send message
  const handleSendMessage = async (textToSend: string = inputText) => {
    const trimmed = textToSend.trim();
    if (!trimmed) return;
    setIsSending(true);
    try {
      const res = await fetch(`/api/groups/${group.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: user.id,
          text: trimmed
        })
      });
      if (!res.ok) throw new Error("Send failed");
      
      setInputText('');
      // Refresh messages instantly
      fetchGroupData();
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setIsSending(false);
    }
  };

  // Trigger quick prompt template
  const handleTriggerHintPrompt = (hintText: string) => {
    setInputText(`@${group.assistantConfig.name} ${hintText}`);
  };

  const handleCopyInviteCode = () => {
    navigator.clipboard.writeText(group.inviteCode);
    setShowInviteCopied(true);
    setTimeout(() => setShowInviteCopied(false), 2000);
  };

  // Find active chapter details
  const activeChapter = story.chapters.find(c => c.id === activeChapterId) || story.chapters[0];
  const isCompletedQuiz = user.completedQuizzes.includes(activeChapterId);

  // Simple rich text regex custom parser for displaying mini graphics (e.g. bold or base64 illustrations) in chat bubbles
  const renderMessageText = (text: string) => {
    // Check if contains markdown style image: ![Image](data:image/...)
    const imgRegex = /!\[.*?\]\((data:image\/.*?;base64,.*?)\)/;
    const match = text.match(imgRegex);

    if (match) {
      const parts = text.split(match[0]);
      return (
        <div className="space-y-2">
          {parts[0] && <p className="whitespace-pre-line leading-relaxed text-sm">{parts[0]}</p>}
          <div className="flex justify-center my-2 p-1 bg-amber-50 rounded-xl border border-amber-200 shadow-sm max-w-[280px] mx-auto">
            <img 
              src={match[1]} 
              alt="AI illustration" 
              referrerPolicy="no-referrer"
              className="rounded-lg w-full h-auto shadow-inner object-cover max-h-52" 
            />
          </div>
          {parts[1] && <p className="whitespace-pre-line leading-relaxed text-sm">{parts[1]}</p>}
        </div>
      );
    }

    // Default bold parsing e.g. **text**
    const boldRegex = /\*\*(.*?)\*\*/g;
    if (boldRegex.test(text)) {
      const formatted = text.split(/\*\*(.*?)\*\*/g).map((chunk, index) => {
        return index % 2 === 1 ? <strong key={index} className="font-bold text-[#78350f]">{chunk}</strong> : chunk;
      });
      return <p className="whitespace-pre-line leading-relaxed text-sm">{formatted}</p>;
    }

    return <p className="whitespace-pre-line leading-relaxed text-sm">{text}</p>;
  };

  return (
    <div className="min-h-screen bg-[#f7f3e8] text-gray-800 flex flex-col font-sans relative">
      
      {/* 1. Firework Particle Overlay for Correct Answers */}
      <AnimatePresence>
        {quizSuccessCelebration && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center bg-amber-900/10"
          >
            <div className="text-center bg-white/95 border-2 border-yellow-400 p-8 rounded-3xl shadow-2xl relative">
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 text-5xl">✨🎉🏅</div>
              <h2 className="text-2xl font-serif font-black text-[#b45309] animate-bounce">
                太棒了！答对啦！
              </h2>
              <p className="text-sm font-medium text-[#78350f] mt-2">
                探险积分 +50 ⭐ 恭喜获得荣耀星光
              </p>
              <div className="mt-4 text-xs text-[#78350f]/60 font-mono">
                解锁智慧成就 · 同伴们正在群聊里为你欢呼！
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Platform Bar Header */}
      <header className="bg-white border-b border-[#ebdcb9] px-4 py-3 flex items-center justify-between shadow-sm sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={onLeave}
            className="p-1.5 hover:bg-[#faf6eb] text-[#78350f] rounded-lg transition"
            title="退出课室"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">📖</span>
              <h1 className="text-base font-serif font-bold text-[#451a03]">
                《{story.title}》
              </h1>
              <span className="text-xs bg-[#fef3c7] text-[#b45309] font-semibold px-2 py-0.5 rounded-full border border-[#fde68a]">
                学生课室
              </span>
            </div>
            <p className="text-xs text-[#b45309]/80 hidden sm:block">
              群组: <span className="font-semibold">{group.name}</span>
            </p>
          </div>
        </div>

        {/* Student Stats HUD */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Points Bubble */}
          <div className="flex items-center gap-1.5 bg-[#fef3c7] border border-[#fcd34d] px-3 py-1.5 rounded-full shadow-inner">
            <span className="text-lg">🪙</span>
            <div className="text-left leading-none">
              <div className="text-[10px] text-[#b45309] font-medium">我的探险分</div>
              <div className="text-xs font-bold font-mono text-[#d97706]">{user.points}</div>
            </div>
          </div>

          {/* Badges Preview */}
          <div className="hidden md:flex items-center gap-1 bg-[#edf2f7] border border-gray-200 px-3 py-1.5 rounded-full">
            <Award className="w-4 h-4 text-indigo-600" />
            <div className="text-left leading-none">
              <div className="text-[10px] text-gray-500 font-medium">勋章数</div>
              <div className="text-xs font-bold text-gray-700">{user.badges.length}个</div>
            </div>
          </div>

          {/* Invitation code button */}
          <button
            type="button"
            onClick={handleCopyInviteCode}
            className="relative flex items-center gap-1 text-xs font-bold text-white bg-[#d97706] hover:bg-[#b45309] px-3.5 py-2 rounded-xl transition shadow-sm cursor-pointer"
          >
            <Users className="w-3.5 h-3.5" />
            邀请码: {group.inviteCode}
            {showInviteCopied && (
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-0.5 rounded shadow">
                已复制！
              </span>
            )}
          </button>
        </div>
      </header>

      {/* 3. Main Split View Layout */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        
        {/* Left Column: Story Book & Quiz (55% width) */}
        <section className="flex-1 lg:w-7/12 p-4 sm:p-6 overflow-y-auto custom-scrollbar border-r border-[#ebdcb9] flex flex-col gap-6 max-h-[calc(100vh-65px)]">
          
          {/* Chapter selection subheader */}
          <div className="flex items-center justify-between border-b border-[#f3e1b6] pb-3">
            <div className="flex items-center gap-2">
              <Compass className="w-4.5 h-4.5 text-[#b45309]" />
              <span className="text-sm font-semibold text-[#78350f]">故事关卡目录</span>
            </div>
            <div className="flex items-center gap-1.5">
              {story.chapters.map(c => {
                const isCurrent = c.id === group.currentChapterId;
                const isSelected = c.id === activeChapterId;
                const isAnswered = user.completedQuizzes.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setActiveChapterId(c.id);
                      setSelectedQuizIndex(null);
                      setQuizFeedback(null);
                    }}
                    className={`px-3 py-1 text-xs font-medium rounded-lg transition-all flex items-center gap-1 ${
                      isSelected 
                        ? 'bg-[#b45309] text-white shadow-sm font-bold'
                        : isCurrent
                          ? 'bg-[#fef3c7] text-[#b45309] border border-[#fde68a]'
                          : 'bg-white hover:bg-[#faf6eb] text-[#78350f]'
                    }`}
                  >
                    第 {c.order} 关
                    {isAnswered && <span className="text-[10px]" title="已解密">⭐</span>}
                    {isCurrent && <span className="text-[9px] bg-red-500 text-white rounded-full px-1 scale-90">LIVE</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Paper Book Container */}
          <div className="book-paper rounded-2xl p-6 md:p-8 flex-1 flex flex-col gap-6 relative border border-[#e8dac1]">
            {/* Soft shadow book spine effect on the left side */}
            <div className="absolute top-0 bottom-0 left-0 w-4 bg-gradient-to-r from-amber-500/5 to-transparent pointer-events-none rounded-l-2xl" />

            {/* Chapter header */}
            <div className="text-center">
              <span className="text-xs uppercase tracking-widest text-[#b45309] font-bold font-mono">
                - 第 {activeChapter.order} 关卡 -
              </span>
              <h2 className="text-2xl font-serif font-black text-[#451a03] mt-1">
                {activeChapter.title}
              </h2>
              {activeChapterId === group.currentChapterId && (
                <div className="inline-flex items-center gap-1 text-[10px] bg-red-100/80 text-red-700 px-2.5 py-0.5 rounded-full border border-red-200 mt-2 font-bold animate-pulse">
                  📍 老师当前带读这里
                </div>
              )}
            </div>

            {/* Chapter Story Body Content */}
            <article className="prose prose-amber font-serif text-[#3e2716] leading-loose text-base md:text-lg whitespace-pre-line text-justify max-w-none flex-1 pb-4">
              {activeChapter.content}
            </article>

            {/* Specialized AI Concept Block */}
            <div className="bg-[#f0ece1]/80 rounded-xl p-4 border border-[#e2d8c3] flex flex-col md:flex-row gap-4 items-start shadow-inner">
              <div className="p-3 bg-[#e4ddcc] text-[#78350f] rounded-2xl shrink-0">
                <Brain className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-[#451a03] flex items-center gap-1.5 font-sans">
                  🧠 AI知识新视野: {activeChapter.aiConcept.title}
                </h4>
                <p className="text-xs text-[#5c402b] leading-relaxed font-sans">
                  {activeChapter.aiConcept.description}
                </p>
                <div className="text-xs text-[#b45309] italic leading-normal font-sans pt-1 mt-1 border-t border-[#dfd7c5] flex items-start gap-1">
                  <span>💡 <strong>奇妙小秘密:</strong></span>
                  <span>{activeChapter.aiConcept.funFact}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quiz Checkpoint Station */}
          <div className="bg-white rounded-2xl p-5 border border-[#ebdcb9] shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-gray-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-[#fdf2e9] text-[#ea580c] rounded-lg">
                  <Star className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#451a03]">本关智力答题挑战</h3>
                  <p className="text-[11px] text-[#78350f]/60 font-medium">答对直接获得 50 ⭐ 探索积分，荣登榜首！</p>
                </div>
              </div>
              <div className="text-xs text-[#d97706] font-bold font-mono">
                +{activeChapter.quiz?.points} XP
              </div>
            </div>

            {activeChapter.quiz ? (
              <div className="space-y-4">
                <p className="text-sm font-bold text-[#451a03] font-serif leading-relaxed">
                  ❓ {activeChapter.quiz.question}
                </p>

                {isCompletedQuiz ? (
                  /* Completed State */
                  <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200 space-y-2">
                    <div className="text-emerald-700 text-sm font-bold flex items-center gap-1.5">
                      ✅ 挑战成功！你已经拿到了这关的 50 探险分。
                    </div>
                    <p className="text-xs text-emerald-800 leading-relaxed font-serif">
                      <strong>林克老师指点：</strong>{activeChapter.quiz.explanation}
                    </p>
                  </div>
                ) : (
                  /* Form to complete */
                  <div className="space-y-2">
                    {activeChapter.quiz.options.map((option, idx) => {
                      const isSelected = selectedQuizIndex === idx;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            if (quizFeedback?.isCorrect) return; // locked
                            setSelectedQuizIndex(idx);
                          }}
                          className={`w-full text-left px-4 py-3 rounded-xl border text-xs font-semibold leading-relaxed transition-all flex items-center gap-3 ${
                            isSelected
                              ? 'bg-[#fef3c7] border-[#d97706] text-[#78350f]'
                              : 'bg-[#fafaf9] hover:bg-[#faf5e6] border-gray-200 text-[#451a03]/80'
                          }`}
                        >
                          <span className={`w-6 h-6 rounded-lg font-bold flex items-center justify-center text-xs shrink-0 ${
                            isSelected ? 'bg-[#d97706] text-white' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {String.fromCharCode(65 + idx)}
                          </span>
                          {option}
                        </button>
                      );
                    })}

                    <div className="pt-2 flex items-center justify-between">
                      <p className="text-xs text-[#b45309] font-medium italic">
                        💡 答不上来？可以在右侧聊天群里 @{group.assistantConfig.name} 寻求线索！
                      </p>
                      <button
                        type="button"
                        disabled={selectedQuizIndex === null || quizLoading}
                        onClick={handleQuizSubmit}
                        className="bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-bold px-5 py-2.5 rounded-xl disabled:opacity-40 transition-all shadow-sm"
                      >
                        {quizLoading ? '正在验证谜底...' : '开启宝箱答题'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Wrong answer feedback */}
                {quizFeedback && !quizFeedback.isCorrect && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-3.5 bg-rose-50 border border-rose-100 text-[#711a1a] rounded-xl text-xs space-y-1 font-serif leading-relaxed"
                  >
                    <span className="font-bold">❌ 哎呀，宝箱还没有打开呢！</span>
                    <p>{quizFeedback.explanation}</p>
                  </motion.div>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">本章节暂未配置智力谜题。</p>
            )}
          </div>
        </section>

        {/* Right Column: Interactive Chat & Leaderboard (45% width) */}
        <section className="flex-1 lg:w-5/12 bg-white flex flex-col max-h-[calc(100vh-65px)]">
          
          {/* Tabs: Chat vs Leaderboard */}
          <div className="bg-[#fafafa] border-b border-[#ebdcb9] grid grid-cols-2 text-center text-sm font-semibold select-none shadow-sm">
            <div className="py-3 border-r border-[#f0e6cf] flex items-center justify-center gap-2 text-[#78350f] border-b-2 border-[#b45309]">
              <MessageSquare className="w-4 h-4 text-[#b45309]" />
              学生故事共读群聊
            </div>
            
            <div className="py-3 text-slate-600 flex items-center justify-center gap-2">
              <Trophy className="w-4 h-4 text-[#d97706]" />
              黄金排行榜
            </div>
          </div>

          <div className="flex-1 flex flex-col lg:flex-row min-h-0 min-w-0">
            {/* Group Chat Section (Mainly left inside column) */}
            <div className="flex-1 flex flex-col min-h-0">
              
              {/* Tutor assistant bar status info */}
              <div className="px-4 py-2 bg-[#fdfbf6] border-b border-[#ebdcb9] flex items-center justify-between text-xs font-medium">
                <div className="flex items-center gap-2">
                  <span className="text-base animate-pulse">🟢</span>
                  <p className="text-[#78350f]">
                    AI导师「<strong>{group.assistantConfig.name}</strong>」在群里，提问特他
                  </p>
                </div>
                <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded">
                  在线答疑 🔋
                </span>
              </div>

              {/* Chat Message window scroll container */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#fcfbfa]">
                {messages.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-xs">
                    🎈 还没有人发言。在下方框里打字和同伴交流，或者@AI 提问吧！
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isSelf = msg.senderId === user.id;
                    const isAssistant = msg.senderRole === 'assistant';
                    const isSys = msg.isSystem;

                    if (isSys) {
                      return (
                        <div key={msg.id} className="flex justify-center my-2">
                          <span className="bg-[#f3efdf] text-[#78350f] text-[10px] sm:text-xs px-3 py-1 rounded-xl font-medium border border-[#ebdcb9] flex items-center gap-1.5 shadow-inner">
                            <span>{msg.senderAvatar}</span>
                            <span>{msg.text}</span>
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div 
                        key={msg.id}
                        className={`flex items-start gap-2 max-w-[90%] ${isSelf ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                      >
                        {/* Avatar */}
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-sm text-sm shrink-0 ${
                          isAssistant ? 'bg-amber-100 border border-amber-300' : 'bg-orange-50 border border-orange-200'
                        }`}>
                          {msg.senderAvatar || "🎒"}
                        </div>

                        {/* Name + Text Box */}
                        <div className="space-y-0.5">
                          <div className={`text-[10px] text-gray-500 font-medium px-1 flex items-center gap-1.5 ${isSelf ? 'justify-end' : ''}`}>
                            <span className="font-bold">{msg.senderName}</span>
                            {msg.senderRole === 'teacher' && <span className="bg-amber-100 text-[#b45309] text-[9px] px-1 rounded">老师</span>}
                            {isAssistant && <span className="bg-red-100 text-red-700 text-[9px] px-1 rounded font-bold">AI导师</span>}
                          </div>

                          <div className={`p-3 rounded-2xl text-[13px] border leading-normal ${
                            isSelf
                              ? 'bg-[#d97706] text-white border-[#d97706] rounded-tr-none'
                              : isAssistant
                                ? 'bg-white text-gray-800 border-amber-200 rounded-tl-none font-serif shadow-sm'
                                : 'bg-[#f4efe4] text-gray-800 border-[#f0e8d5] rounded-tl-none'
                          }`}>
                            {renderMessageText(msg.text)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Bot Prompt Suggestion Pills drawer */}
              <div className="px-4 py-2 border-t border-[#f0e6cf] bg-[#fdfbf6]">
                <div className="flex items-center gap-1 text-[10px] text-[#b45309]/60 font-medium mb-1.5">
                  <Sparkles className="w-3 h-3" />
                  AI助教魔法快捷问答:
                </div>
                <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar w-full whitespace-nowrap">
                  {group.assistantConfig.hints.map((hint, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleTriggerHintPrompt(hint)}
                      className="inline-block bg-white hover:bg-amber-50 text-[#b45309] text-[10px] px-2.5 py-1.5 rounded-lg border border-amber-100 cursor-pointer shadow-inner shrink-0"
                    >
                      💡 {hint}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Send Form Text Area */}
              <div className="p-3 border-t border-[#ebdcb9] bg-white flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setInputText(`@${group.assistantConfig.name} `)}
                  className="bg-amber-50 border border-amber-200 px-2 py-1.5 rounded-lg text-[10px] font-bold text-amber-800 hover:bg-amber-100 shrink-0 select-none transition"
                  title="Mention AI"
                >
                  @{group.assistantConfig.name}
                </button>
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendMessage();
                  }}
                  placeholder={`发消息和同班同学讨论，或者艾特 @${group.assistantConfig.name} 问AI知识...`}
                  className="flex-1 border border-gray-200 bg-gray-50 focus:bg-white text-xs px-3 py-2.5 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#d97706]"
                />
                <button
                  type="button"
                  disabled={isSending || !inputText.trim()}
                  onClick={() => handleSendMessage()}
                  className="p-2.5 bg-[#d97706] hover:bg-[#b45309] text-white rounded-xl disabled:opacity-40 transition-all shadow-sm shrink-0 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Live Leaderboard Sidebar (Width: 35%-ish on lg screens, collapsed to pop or tab) */}
            <div className="w-full lg:w-44 bg-[#faf6ec] border-t lg:border-t-0 lg:border-l border-[#f0e6cf] p-3 flex flex-col min-h-[160px] lg:min-h-0">
              <div className="flex items-center gap-1 text-[11px] font-bold text-[#b45309] border-b border-[#ebdcb9] pb-1.5 mb-2 shrink-0">
                <Trophy className="w-3.5 h-3.5 text-[#d97706]" />
                班级探索进度榜
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 text-xs">
                {leaderboard.length === 0 ? (
                  <div className="text-gray-400 italic text-[10px] text-center py-4">
                    正在拼装积分板...
                  </div>
                ) : (
                  leaderboard.slice(0, 8).map((entry, idx) => {
                    const isSelf = entry.userId === user.id;
                    return (
                      <div 
                        key={entry.userId}
                        className={`flex items-center justify-between p-1.5 rounded-lg border leading-tight ${
                          isSelf 
                            ? 'bg-[#fdf3c7] border-amber-300 text-amber-900 shadow-sm font-bold' 
                            : 'bg-white border-transparent text-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-mono text-[10px] text-[#b45309]/60 w-3 font-semibold">
                            {idx + 1}
                          </span>
                          <span className="truncate" title={entry.userName}>
                            {entry.userName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 font-semibold text-[#b45309] shrink-0 font-mono text-[11px]">
                          ⭐ {entry.points}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              
              {/* Leaderboard user feedback self */}
              <div className="mt-2 pt-2 border-t border-[#ebdcb9] text-[10px] text-[#78350f]/60 font-medium leading-normal italic text-center shrink-0">
                答题或@AI参与提问/讨论都会获得源源不断的探险分喔！
              </div>
            </div>

          </div>

        </section>

      </div>
    </div>
  );
}

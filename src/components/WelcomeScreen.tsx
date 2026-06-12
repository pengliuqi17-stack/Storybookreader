import React, { useState } from 'react';
import { motion } from 'motion/react';
import { BookOpen, Sparkles, User, Key, ArrowRight, GraduationCap } from 'lucide-react';
import { Group, Story, User as UserType } from '../types';

interface WelcomeScreenProps {
  onSuccess: (data: { user: UserType; group?: Group; story?: Story }) => void;
  onSelectTeacherMode: (teacherName: string) => void;
}

export default function WelcomeScreen({ onSuccess, onSelectTeacherMode }: WelcomeScreenProps) {
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!name.trim()) {
      setError('请输入你的姓名或昵称！');
      return;
    }

    if (role === 'student' && !inviteCode.trim()) {
      setError('请输入老师给你的5位英文邀请码！');
      return;
    }

    setLoading(true);

    try {
      if (role === 'student') {
        const res = await fetch('/api/users/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            inviteCode: inviteCode.trim().toUpperCase(),
            role: 'student'
          })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || '加入失败，请检查邀请码！');
        }

        onSuccess({
          user: data.user,
          group: data.group,
          story: data.story
        });
      } else {
        // Teacher mode fast join
        const res = await fetch('/api/users/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            role: 'teacher'
          })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || '创建/进入办公室失败！');
        }

        onSelectTeacherMode(data.user.name);
      }
    } catch (err: any) {
      setError(err.message || '连接服务器出错啦，请稍后重试！');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoTeacher = () => {
    setRole('teacher');
    setName('林老师');
  };

  return (
    <div className="min-h-screen bg-[#fcf9f2] bg-[radial-gradient(#e5d8b8_1px,transparent_1px)] [background-size:16px_16px] flex flex-col items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-[#efe6d0] p-8 relative overflow-hidden"
      >
        {/* Decorative corner tag */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-[#fbf5e6] rounded-bl-full flex items-center justify-center pt-2 pr-2">
          <motion.div 
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 4 }}
          >
            <Sparkles className="w-8 h-8 text-[#d97706]" />
          </motion.div>
        </div>

        {/* Title */}
        <div className="text-center mb-8 pr-12">
          <div className="inline-flex items-center justify-center p-3 bg-[#fdf8eb] rounded-2xl mb-3 text-[#b45309]">
            <BookOpen className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-[#451a03] tracking-wide">
            AI 奇幻故事课堂
          </h1>
          <p className="text-sm text-[#78350f] mt-1 italic font-medium">
            群组共读 · 解密AI常识 · 赢取荣誉勋章
          </p>
        </div>

        {/* Role Segment Toggle */}
        <div className="grid grid-cols-2 bg-[#fdfbf7] p-1.5 rounded-xl border border-[#efe6d0] mb-6">
          <button
            type="button"
            onClick={() => { setRole('student'); setError(''); }}
            className={`py-2 rounded-lg text-sm font-medium transition-all ${
              role === 'student'
                ? 'bg-[#d97706] text-white shadow-sm'
                : 'text-[#78350f] hover:bg-[#faf5e6]'
            }`}
          >
            🎒 学生进入课室
          </button>
          <button
            type="button"
            onClick={() => { setRole('teacher'); setError(''); }}
            className={`py-2 rounded-lg text-sm font-medium transition-all ${
              role === 'teacher'
                ? 'bg-[#b45309] text-white shadow-sm'
                : 'text-[#78350f] hover:bg-[#faf5e6]'
            }`}
          >
            👩‍🏫 老师/开发者办公室
          </button>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-4 p-3 bg-red-50 rounded-xl text-xs text-red-600 border border-red-100 font-medium"
          >
            🛑 {error}
          </motion.div>
        )}

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#78350f] mb-1.5 flex items-center gap-1">
              <User className="w-3.5 h-3.5" /> 姓名 / 昵称
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={role === 'student' ? "例如：奇奇同学 或 小熊贝贝" : "你的教工名字，例如：林老师"}
              className="w-full px-4 py-2.5 rounded-xl border border-[#efe6d0] bg-[#fdfcf9] text-[#451a03] placeholder-[#b45309]/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#d97706]"
            />
          </div>

          {role === 'student' && (
            <div>
              <label className="block text-xs font-semibold text-[#78350f] mb-1.5 flex items-center gap-1">
                <Key className="w-3.5 h-3.5" /> 5位字母邀请码
              </label>
              <input
                type="text"
                required
                maxLength={5}
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="老师给的专属邀请码"
                className="w-full px-4 py-2.5 rounded-xl border border-[#efe6d0] bg-[#fdfcf9] text-[#451a03] placeholder-[#b45309]/40 text-sm tracking-widest uppercase text-center font-bold focus:outline-none focus:ring-2 focus:ring-[#d97706]"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-xl font-medium text-sm text-white flex items-center justify-center gap-2 transition-all ${
              role === 'student' 
                ? 'bg-[#d97706] hover:bg-[#b45309]' 
                : 'bg-[#b45309] hover:bg-[#78350f]'
            } disabled:opacity-50`}
          >
            {loading ? '法阵正在连接中...' : role === 'student' ? '进入魔法故事课室' : '进入控制办公室'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Demo Hint */}
        <div className="mt-8 border-t border-[#f5ebe0] pt-4 text-center">
          <p className="text-xs text-[#78350f]/60 leading-relaxed">
            💡<strong>体验小贴士：</strong> 第一次操作？可以先点击下方扮演“老师”，自定义设定故事AI机器人，并组建群聊获得邀请码。然后开排双屏，加入刚才的邀请码作为“学生”群读交流！
          </p>
          <button
            type="button"
            onClick={handleQuickDemoTeacher}
            className="mt-3.5 inline-flex items-center gap-1.5 text-xs text-[#b45309] hover:text-[#78350f] font-semibold underline decoration-dotted decoration-2"
          >
            <GraduationCap className="w-3.5 h-3.5" />
            我是新用户，一键扮演林老师
          </button>
        </div>
      </motion.div>
    </div>
  );
}

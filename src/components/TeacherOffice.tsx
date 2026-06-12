import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, Users, BookOpen, Plus, Save, Server, Sparkles, Trophy, 
  HelpCircle, CheckCircle, ArrowLeft, Trash2, Award, Calendar, Lightbulb
} from 'lucide-react';
import { Story, Group, AssistantConfig, Chapter, Quiz } from '../types';

interface TeacherOfficeProps {
  teacherName: string;
  onLeave: () => void;
}

export default function TeacherOffice({ teacherName, onLeave }: TeacherOfficeProps) {
  const [stories, setStories] = useState<Story[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupIdForEdit, setSelectedGroupIdForEdit] = useState<string>('');
  
  // AI assistant states
  const [aiName, setAiName] = useState('');
  const [aiAvatar, setAiAvatar] = useState('🤖');
  const [aiSystemPrompt, setAiSystemPrompt] = useState('');
  const [aiWelcomeMsg, setAiWelcomeMsg] = useState('');
  const [aiHints, setAiHints] = useState<string[]>([]);
  const [newHintText, setNewHintText] = useState('');

  // Group creation states
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupStoryId, setNewGroupStoryId] = useState('');

  // Story Creation/Edit states
  const [showStoryCreator, setShowStoryCreator] = useState(false);
  const [newStoryTitle, setNewStoryTitle] = useState('');
  const [newStoryDesc, setNewStoryDesc] = useState('');
  const [newStoryEmoji, setNewStoryEmoji] = useState('📚');
  const [customChapters, setCustomChapters] = useState<Chapter[]>([]);

  // Monitoring
  const [activeTab, setActiveTab] = useState<'groups' | 'stories' | 'ai-tutor'>('groups');
  const [monitoredLeaderboard, setMonitoredLeaderboard] = useState<any[]>([]);
  const [actionSuccessText, setActionSuccessText] = useState('');

  // Initial load
  const loadInitialOfficeData = async () => {
    try {
      const sRes = await fetch('/api/stories');
      if (sRes.ok) {
        const sData = await sRes.json();
        setStories(sData);
        if (sData.length > 0 && !newGroupStoryId) {
          setNewGroupStoryId(sData[0].id);
        }
      }

      // We don't have a direct "getAllGroups" endpoint, but we can search inside our data if needed,
      // or for simplicity, let's list groups in active memory. Wait, in server.ts we has dbState.groups. Let's make sure
      // the server returns the groups list! Ah, wait, we can create a temporary or simple endpoint GET /api/admin/groups
      // or just fetch by group info. Let's edit server.ts to add a GET /api/groups list endpoint so the teacher can monitor all groups!
      const gRes = await fetch('/api/admin/groups-list');
      if (gRes.ok) {
        const gData = await gRes.json();
        setGroups(gData);
        if (gData.length > 0 && !selectedGroupIdForEdit) {
          setSelectedGroupIdForEdit(gData[0].id);
        }
      }
    } catch (err) {
      console.error("Load initial office data error:", err);
    }
  };

  useEffect(() => {
    // Let's call loadInitialOfficeData on mount
    loadInitialOfficeData();
  }, [selectedGroupIdForEdit]);

  // Sync AI state when selectedGroupIdForEdit changes
  useEffect(() => {
    if (!selectedGroupIdForEdit) return;
    const currentGroup = groups.find(g => g.id === selectedGroupIdForEdit);
    if (currentGroup) {
      setAiName(currentGroup.assistantConfig.name);
      setAiAvatar(currentGroup.assistantConfig.avatarEmoji);
      setAiSystemPrompt(currentGroup.assistantConfig.personalityPrompt);
      setAiWelcomeMsg(currentGroup.assistantConfig.welcomeMessage);
      setAiHints(currentGroup.assistantConfig.hints);
      
      // Load this group's student leaderboard
      fetch(`/api/groups/${currentGroup.id}/leaderboard`)
        .then(res => res.json())
        .then(data => setMonitoredLeaderboard(data))
        .catch(err => console.error("Leaderboard load failed:", err));
    }
  }, [selectedGroupIdForEdit, groups]);

  const showTemporarySuccess = (text: string) => {
    setActionSuccessText(text);
    setTimeout(() => setActionSuccessText(''), 3000);
  };

  // Group creation submit
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !newGroupStoryId) return;

    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newGroupName.trim(),
          storyId: newGroupStoryId
        })
      });

      if (!res.ok) throw new Error("创建群组失败");
      
      const data = await res.json();
      showTemporarySuccess(`✨ 成功创建课堂群组「${data.group.name}」！邀请码为: ${data.group.inviteCode}`);
      setNewGroupName('');
      
      // Reload office data
      loadInitialOfficeData();
      if (data.group) {
        setSelectedGroupIdForEdit(data.group.id);
      }
    } catch (err: any) {
      alert(err.message || "组建群组失败");
    }
  };

  // AI config save
  const handleSaveAssistant = async () => {
    if (!selectedGroupIdForEdit) {
      alert("请先选中一个带读群聊组！");
      return;
    }

    try {
      const res = await fetch(`/api/groups/${selectedGroupIdForEdit}/update-assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: aiName,
          avatarEmoji: aiAvatar,
          personalityPrompt: aiSystemPrompt,
          welcomeMessage: aiWelcomeMsg,
          hints: aiHints
        })
      });

      if (!res.ok) throw new Error("Save failing");

      showTemporarySuccess("⚙️ AI助手定制数据蓄能成功！新欢迎消息已打入群聊。");
      loadInitialOfficeData();
    } catch (err: any) {
      alert("更新AI助教参数失败");
    }
  };

  // Chapter reading sync submit
  const handleSyncGroupChapter = async (chapterId: string) => {
    if (!selectedGroupIdForEdit) return;
    try {
      const res = await fetch(`/api/groups/${selectedGroupIdForEdit}/update-chapter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapterId })
      });
      if (res.ok) {
        showTemporarySuccess(`📖 已成功将该群阅读进度锁定同步至所选章节！`);
        loadInitialOfficeData();
      }
    } catch (err) {
      alert("同步进度失败");
    }
  };

  // Add hint
  const handleAddHint = () => {
    if (!newHintText.trim()) return;
    if (aiHints.length >= 5) {
      alert("AI魔法盘快捷问答建议最多配置5条哦！");
      return;
    }
    setAiHints([...aiHints, newHintText.trim()]);
    setNewHintText('');
  };

  // Remove hint
  const handleRemoveHint = (idx: number) => {
    setAiHints(aiHints.filter((_, i) => i !== idx));
  };

  // Story Creation Custom Submit
  const handlePublishCustomStory = async () => {
    if (!newStoryTitle.trim() || !newStoryDesc.trim()) {
      alert("请填写故事书标题和故事简述！");
      return;
    }

    if (customChapters.length === 0) {
      alert("请至少为你的定制绘本添加一个故事章节关卡哦！");
      return;
    }

    try {
      const res = await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newStoryTitle,
          description: newStoryDesc,
          coverEmoji: newStoryEmoji,
          chapters: customChapters
        })
      });

      if (res.ok) {
        showTemporarySuccess(`🎨 恭喜！你的定制故事书「${newStoryTitle}」已出版到AI图书馆！`);
        setNewStoryTitle('');
        setNewStoryDesc('');
        setNewStoryEmoji('📚');
        setCustomChapters([]);
        setShowStoryCreator(false);
        loadInitialOfficeData();
      }
    } catch (err) {
      alert("出版绘本失败");
    }
  };

  const handleAddDraftChapter = () => {
    const defaultDraft: Chapter = {
      id: `chap_${Date.now()}`,
      order: customChapters.length + 1,
      title: `新章节: 漫游AI城堡`,
      content: `正文写在这里，可以写松鼠奇奇在AI城堡如何闯关...`,
      aiConcept: {
        title: "大语言模型生成原理 (LLM)",
        description: "AI通过概率猜测下一个字词，最终流利地组合起来。",
        funFact: "AI本身不生产真理，它只是网络数据的超级复述专家！"
      },
      quiz: {
        id: `quiz_${Date.now()}`,
        question: "太空彩虹恐龙真的能吐泡泡跳舞吗？",
        options: ["当然是真的，我在镜子里看见了", "假的，这是AI凭借特征无序拼接的‘幻觉’，需要核实查证", "不知道", "这就是事实"],
        answerIndex: 1,
        explanation: "判断AI生成内容一定要带有批判性查证思维！",
        points: 50
      }
    };
    setCustomChapters([...customChapters, defaultDraft]);
  };

  const selectedGroup = groups.find(g => g.id === selectedGroupIdForEdit);
  const matchedStoryOfSelectedGroup = selectedGroup ? stories.find(s => s.id === selectedGroup.storyId) : null;

  return (
    <div className="min-h-screen bg-[#f3eee0] text-gray-800 flex flex-col font-sans">
      
      {/* 1. Header office desk bar */}
      <header className="bg-[#4d321d] text-[#f7f5ef] border-b border-[#3b2413] px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onLeave}
            className="p-1.5 hover:bg-[#63452f] text-[#efebe0] rounded-xl transition"
            title="返回前台登录"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-serif font-bold tracking-wide flex items-center gap-2">
              👨‍🏫 AI 魔法故事课堂 · 开发者办公室
            </h1>
            <p className="text-xs text-[#ebd8c8]">
              当前管理员: <span className="underline font-semibold">{teacherName}</span> | 自定义设置、发布AI助教、同步班级进度
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onLeave}
          className="bg-[#faf6ec] hover:bg-white text-[#78350f] font-bold text-xs px-4 py-2.5 rounded-xl block border border-[#ecdcb9] transition"
        >
          🎒 切换到学生入口
        </button>
      </header>

      {/* Action successes toast alert */}
      <AnimatePresence>
        {actionSuccessText && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-emerald-600 text-white text-xs font-semibold px-6 py-3.5 shadow-lg border-b border-emerald-700 text-center flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            {actionSuccessText}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col xl:flex-row min-h-0 min-w-0">
        
        {/* Left Hand: Dashboard Desk Operations (Sidebar controls) */}
        <section className="w-full xl:w-5/12 bg-[#fffcf5] p-6 overflow-y-auto border-r border-[#ebdcb9] flex flex-col gap-6 max-h-[calc(100vh-68px)]">
          
          {/* Section Selection Segment */}
          <div className="grid grid-cols-3 bg-[#fdfaf2] border border-[#e2d8c3] p-1 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('groups')}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                activeTab === 'groups' ? 'bg-[#b45309] text-white shadow-sm' : 'text-[#78350f] hover:bg-[#faf5e6]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              组建群聊/班级
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ai-tutor')}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                activeTab === 'ai-tutor' ? 'bg-[#b45309] text-white shadow-sm' : 'text-[#78350f] hover:bg-[#faf5e6]'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              自定义AI助教
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('stories')}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                activeTab === 'stories' ? 'bg-[#b45309] text-white shadow-sm' : 'text-[#78350f] hover:bg-[#faf5e6]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              我的故事书架
            </button>
          </div>

          {/* TAB 1: Groups creation and select chapter panel */}
          {activeTab === 'groups' && (
            <div className="space-y-6">
              
              {/* Form 1: Build a new group chat */}
              <div className="bg-white p-5 rounded-2xl border border-[#ebdcb9] shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-[#451a03] flex items-center gap-1.5 border-b pb-2 border-amber-50">
                  <Plus className="w-4 h-4 text-[#d97706]" />
                  第一步：组建新共读班群
                </h3>
                
                <form onSubmit={handleCreateGroup} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#78350f] mb-1">班级 / 共读小组名称</label>
                    <input
                      type="text"
                      required
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="如：五年级二班共读汇 / 奇奇AI课后组"
                      className="w-full text-xs px-3 py-2 border border-[#efe6d0] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#d97706]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#78350f] mb-1">选择配套故事绘本</label>
                    <select
                      value={newGroupStoryId}
                      onChange={(e) => setNewGroupStoryId(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-[#efe6d0] rounded-xl bg-white text-[#451a03] focus:outline-none focus:ring-1 focus:ring-[#d97706]"
                    >
                      {stories.map(s => (
                        <option key={s.id} value={s.id}>{s.coverEmoji} {s.title}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[#d97706] hover:bg-[#b45309] text-white text-xs font-bold py-2.5 rounded-xl transition shadow-sm cursor-pointer"
                  >
                    🚀 发布创设群组，生产进入邀请码
                  </button>
                </form>
              </div>

              {/* Selector & syncing of active reading progress */}
              <div className="bg-white p-5 rounded-2xl border border-[#ebdcb9] shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-[#451a03] flex items-center gap-1.5 border-b pb-2 border-amber-50">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  第二步：监控课堂与锁定阅读关卡进度
                </h3>

                {groups.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">请先在上方创建一个课堂。</p>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold text-[#78350f] mb-1">选中带读班群进行排布</label>
                      <select
                        value={selectedGroupIdForEdit}
                        onChange={(e) => setSelectedGroupIdForEdit(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-[#efe6d0] font-semibold bg-amber-50/50 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#d97706]"
                      >
                        {groups.map(g => (
                          <option key={g.id} value={g.id}>🏫 {g.name} (邀请码: {g.inviteCode})</option>
                        ))}
                      </select>
                    </div>

                    {selectedGroup && (
                      <div className="space-y-3.5 bg-[#fdfbf7] p-4 rounded-xl border border-[#efe6d0]">
                        <div className="text-xs font-bold text-[#78350f] flex items-center justify-between">
                          <span>锁定绘本:《{matchedStoryOfSelectedGroup?.title}》</span>
                          <span className="text-[10px] bg-amber-100 text-[#b45309] px-2 py-0.5 rounded-full font-mono font-bold">
                            邀请码: {selectedGroup.inviteCode}
                          </span>
                        </div>
                        
                        <p className="text-[10px] text-[#78350f]/60 leading-normal">
                          💡 <strong>教师同步控制面板：</strong> 点击下方任意关卡，“学生课室”里学生的界面和题目会跟随你点击的阅读进度进行<strong>无缝同步实时跃迁</strong>！你可以引导全班聚焦同一章研讨。
                        </p>

                        <div className="grid grid-cols-3 gap-2 pt-1">
                          {matchedStoryOfSelectedGroup?.chapters.map(chap => {
                            const isActive = selectedGroup.currentChapterId === chap.id;
                            return (
                              <button
                                key={chap.id}
                                type="button"
                                onClick={() => handleSyncGroupChapter(chap.id)}
                                className={`py-2 text-[11px] rounded-lg border font-bold transition-all ${
                                  isActive
                                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                                    : 'bg-white hover:bg-amber-50 border-gray-200 text-[#78350f]'
                                }`}
                              >
                                第 {chap.order} 章
                                {isActive && <span className="block text-[9px] font-mono">当前带学中</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: Customise AI Parameters and Prompts */}
          {activeTab === 'ai-tutor' && (
            <div className="space-y-6">
              
              <div className="bg-white p-5 rounded-2xl border border-[#ebdcb9] shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b pb-2 border-amber-5">
                  <h3 className="text-sm font-bold text-[#451a03] flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#d97706]" />
                    定制AI助教的核心智能
                  </h3>
                  {selectedGroup && (
                    <span className="text-[10px] bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full text-[#b45309] font-bold">
                      正在修改: {selectedGroup.name}
                    </span>
                  )}
                </div>

                {!selectedGroupIdForEdit ? (
                  <p className="text-xs text-gray-400 italic">请选中或创建一个带读班群进行配置。</p>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-[#78350f] mb-1">助教专属姓名</label>
                        <input
                          type="text"
                          required
                          value={aiName}
                          onChange={(e) => setAiName(e.target.value)}
                          placeholder="例如：林克老师 / AI松果向导"
                          className="w-full text-xs px-3 py-2 border border-[#efe6d0] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#d97706]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-[#78350f] mb-1">助教外观 (Emoji)</label>
                        <input
                          type="text"
                          required
                          value={aiAvatar}
                          onChange={(e) => setAiAvatar(e.target.value)}
                          placeholder="例如：🤖"
                          className="w-full text-xs px-3 py-2 border border-[#efe6d0] rounded-xl text-center focus:outline-none focus:ring-1 focus:ring-[#d97706]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#78350f] mb-1 flex items-center gap-1">
                        AI的核心“灵魂常识人格指令” (System Prompt)
                        <span className="text-[9px] text-[#b45309]/60 font-normal">支持定义角色/语调/范围</span>
                      </label>
                      <textarea
                        rows={4}
                        required
                        value={aiSystemPrompt}
                        onChange={(e) => setAiSystemPrompt(e.target.value)}
                        placeholder="让AI助教以何种角色和知识风格解答同学提问。例：你是一个专门帮小学生阅读故事书、传授AI大模型常识的AI助教。请多用充满想象力的对话、童话比喻、夸奖..."
                        className="w-full text-xs p-3 border border-[#efe6d0] rounded-xl bg-[#faf9f6]/40 focus:outline-none focus:ring-1 focus:ring-[#d97706] font-mono leading-relaxed"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#78350f] mb-1">入群自爆欢迎语 (Welcome Message)</label>
                      <textarea
                        rows={2}
                        value={aiWelcomeMsg}
                        onChange={(e) => setAiWelcomeMsg(e.target.value)}
                        className="w-full text-xs p-3 border border-[#efe6d0] rounded-xl bg-[#faf9f6]/40 focus:outline-none focus:ring-1 focus:ring-[#d97706]"
                      />
                    </div>

                    {/* Hints controller */}
                    <div className="space-y-2">
                      <label className="block text-[11px] font-bold text-[#78350f] mb-1">快捷灵感提问卡 (最多5条)</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newHintText}
                          onChange={(e) => setNewHintText(e.target.value)}
                          placeholder="输入一条灵感问题卡，例如：AI是怎么‘画画’的？"
                          className="flex-1 text-xs px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#d97706]"
                        />
                        <button
                          type="button"
                          onClick={handleAddHint}
                          className="bg-[#b45309] hover:bg-[#78350f] text-white text-xs font-bold px-4 py-2 rounded-xl"
                        >
                          添加卡
                        </button>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        {aiHints.map((hint, index) => (
                          <div key={index} className="flex items-center justify-between text-xs bg-gray-50 px-3 py-2 rounded-xl border border-gray-100">
                            <span className="truncate pr-4 text-gray-700">💡 {hint}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveHint(index)}
                              className="text-gray-400 hover:text-red-500 transition shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveAssistant}
                      className="w-full bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Save className="w-4 h-4" />
                      保存并重新灌输AI助教魔法！
                    </button>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 3: Publish customized story books */}
          {activeTab === 'stories' && (
            <div className="space-y-6">
              
              <div className="bg-white p-5 rounded-2xl border border-[#ebdcb9] shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b pb-2 border-amber-5">
                  <h3 className="text-sm font-bold text-[#451a03] flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-amber-700" />
                    我的核心故事绘本书架
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setShowStoryCreator(!showStoryCreator);
                      setCustomChapters([]);
                    }}
                    className="p-1.5 bg-amber-50 hover:bg-amber-100 text-[#b45309] rounded-lg transition text-xs font-bold flex items-center gap-1 border border-amber-200 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    定制故事书
                  </button>
                </div>

                <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar">
                  {stories.map(storybook => (
                    <div key={storybook.id} className="p-3 bg-[#fdfbf7] rounded-xl border border-[#efe6d0] flex items-start gap-3">
                      <div className="text-2xl pt-1">{storybook.coverEmoji}</div>
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-bold text-[#451a03]">{storybook.title}</h4>
                        <p className="text-[10px] text-[#78350f]/60 leading-relaxed font-sans line-clamp-2">
                          {storybook.description}
                        </p>
                        <div className="text-[9px] text-[#b45309] font-semibold pt-1 font-sans">
                          共 {storybook.chapters.length} 章节关卡 | 内含AI知识模块 + 智力卡答题
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Advanced UI: Story Book Drawer publisher */}
              {showStoryCreator && (
                <div className="bg-white p-5 rounded-2xl border-2 border-amber-400 shadow-md space-y-4">
                  <div className="flex items-center justify-between border-b pb-1.5 border-gray-100">
                    <h3 className="text-sm font-bold text-[#b45309]">🎨 定制并出版故事书关卡</h3>
                    <span className="text-[9px] bg-red-100 px-2 py-0.5 rounded text-red-700 font-bold">新绘本草稿袋</span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <label className="block text-[10px] text-gray-500 font-bold mb-1">故事书名</label>
                        <input
                          type="text"
                          value={newStoryTitle}
                          onChange={(e) => setNewStoryTitle(e.target.value)}
                          placeholder="例：AI城堡一日游"
                          className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-none text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 font-bold mb-1">封面Emoji</label>
                        <input
                          type="text"
                          value={newStoryEmoji}
                          onChange={(e) => setNewStoryEmoji(e.target.value)}
                          placeholder="例：🏰"
                          className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-none text-center text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-gray-500 font-bold mb-1">故事背景简述</label>
                      <textarea
                        rows={2}
                        value={newStoryDesc}
                        onChange={(e) => setNewStoryDesc(e.target.value)}
                        placeholder="小熊雷雷是如何进入AI城堡探险...适合4年级同学..."
                        className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none text-xs"
                      />
                    </div>

                    {/* Chapter editing draft logs */}
                    <div className="border border-amber-100 rounded-xl p-3 bg-amber-50/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[#b45309]">章节关卡列表 (共 {customChapters.length} 章)</span>
                        <button
                          type="button"
                          onClick={handleAddDraftChapter}
                          className="text-[10px] font-bold underline text-amber-700 hover:text-amber-900 cursor-pointer"
                        >
                          + 添加新章节
                        </button>
                      </div>

                      {customChapters.length === 0 ? (
                        <p className="text-[10px] text-gray-400 italic text-center py-2">请点击右上角为您添加第一个故事章节！</p>
                      ) : (
                        <div className="space-y-2 max-h-[160px] overflow-y-auto custom-scrollbar">
                          {customChapters.map((chap, idx) => (
                            <div key={chap.id} className="p-2 border border-gray-200 rounded-lg bg-white space-y-2 text-left">
                              <div className="flex items-center justify-between text-[11px] font-bold border-b pb-1 mb-1">
                                <span>第 {chap.order} 章 标题：</span>
                                <input
                                  type="text"
                                  value={chap.title}
                                  onChange={(e) => {
                                    const updated = [...customChapters];
                                    updated[idx].title = e.target.value;
                                    setCustomChapters(updated);
                                  }}
                                  className="border-b focus:border-amber-500 border-gray-200 font-sans text-right text-[10px] w-48 focus:outline-none"
                                />
                              </div>
                              <div>
                                <textarea
                                  rows={2}
                                  value={chap.content}
                                  onChange={(e) => {
                                    const updated = [...customChapters];
                                    updated[idx].content = e.target.value;
                                    setCustomChapters(updated);
                                  }}
                                  placeholder="在此输入正文..."
                                  className="w-full p-1.5 border border-gray-100 rounded text-[10px] focus:outline-none font-serif"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handlePublishCustomStory}
                      className="w-full bg-[#b45309] hover:bg-[#78350f] text-white text-xs font-bold py-2.5 rounded-xl transition shadow"
                    >
                      🔮 印刷并出版我的定制AI绘本故事书
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}

        </section>

        {/* Right Hand: Interactive Monitoring Deck (Class leaderboards, logs, live view mockup) */}
        <section className="flex-1 bg-[#fdfcf9] p-6 overflow-y-auto custom-scrollbar max-h-[calc(100vh-68px)]">
          <div className="bg-white rounded-3xl p-6 border border-[#ebdcb9] shadow-sm space-y-6">
            
            {/* Header monitoring info details */}
            <div className="flex items-center justify-between border-b pb-3 border-gray-100">
              <div className="flex items-center gap-2">
                <Trophy className="w-5.5 h-5.5 text-yellow-500 fill-yellow-500" />
                <div>
                  <h3 className="text-base font-bold text-[#451a03]">班级探索站 · 同步监控大厅</h3>
                  <p className="text-[11px] text-gray-500">
                    实时查看当前带读课堂的学生积分排行、勋章收集、谜题通关状态
                  </p>
                </div>
              </div>
              {selectedGroup && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-1 text-right">
                  <div className="text-[10px] text-gray-500">正在监控班群</div>
                  <div className="text-xs font-bold text-[#b45309]">{selectedGroup.name}</div>
                </div>
              )}
            </div>

            {/* If no group selected indicator */}
            {!selectedGroupIdForEdit ? (
              <div className="text-center py-20 bg-amber-50/20 border border-dashed border-[#efe6d0] rounded-2xl">
                <Users className="w-12 h-12 text-[#b45309]/30 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-gray-500">暂无正在带读的活跃课堂群组</h4>
                <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto leading-relaxed">
                  请在左侧的【组建群聊/班级】中新建一个，或在下方选择之前发布的共读群，生成专属邀请码供多名学生加入测试！
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Stats recap row */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100 text-center space-y-1">
                    <span className="text-2xl">🎒</span>
                    <div className="text-[10px] text-gray-500 font-medium">在群学生人数</div>
                    <div className="text-lg font-bold font-mono text-[#d97706]">{monitoredLeaderboard.length} 名</div>
                  </div>
                  <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 text-center space-y-1">
                    <span className="text-2xl">🏅</span>
                    <div className="text-[10px] text-gray-500 font-medium">班级总勋章累积</div>
                    <div className="text-lg font-bold font-mono text-indigo-700">
                      {monitoredLeaderboard.reduce((acc, c) => acc + c.badgesCount, 0)} 枚
                    </div>
                  </div>
                  <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 text-center space-y-1">
                    <span className="text-2xl">🔥</span>
                    <div className="text-[10px] text-gray-500 font-medium">谜题解锁通过率</div>
                    <div className="text-lg font-bold font-mono text-emerald-700">
                      {matchedStoryOfSelectedGroup?.chapters.length 
                        ? `${Math.round((monitoredLeaderboard.reduce((acc, c) => acc + c.completedCount, 0) / (monitoredLeaderboard.length * matchedStoryOfSelectedGroup.chapters.length || 1)) * 100)}%`
                        : "0%"}
                    </div>
                  </div>
                </div>

                {/* Main student tracking table */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-[#78350f] mb-2 flex items-center gap-1">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    学生学习统计报表 (实时自动刷新)
                  </div>

                  <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-xs text-left border-collapse bg-[#fafafa]">
                      <thead>
                        <tr className="bg-[#f0ece1] text-[#78350f] font-bold">
                          <th className="p-3">学号/排行</th>
                          <th className="p-3">学生姓名</th>
                          <th className="p-3 text-center">累积探险积分</th>
                          <th className="p-3 text-center">解锁关卡数</th>
                          <th className="p-3">获得荣誉勋章奖励</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white text-gray-700">
                        {monitoredLeaderboard.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-gray-400 italic font-medium">
                              🕵️‍♀️ 暂时还没有小同学敲入这组邀请码加入群聊。快把上方邀请码「{selectedGroup?.inviteCode || ''}」复制给学生登录，或者你也可以开个新小窗口以此码加入共学测试！
                            </td>
                          </tr>
                        ) : (
                          monitoredLeaderboard.map((student, idx) => (
                            <tr key={student.userId} className="hover:bg-amber-50/30 transition">
                              <td className="p-3 font-mono font-bold text-gray-500">#{idx + 1}</td>
                              <td className="p-3 font-bold text-gray-800 flex items-center gap-2">
                                <span>🎒</span>
                                {student.userName}
                              </td>
                              <td className="p-3 text-center font-bold text-[#b45309] font-mono text-[13px]">
                                ⭐ {student.points}
                              </td>
                              <td className="p-3 text-center">
                                <span className="bg-emerald-50 text-emerald-800 border border-emerald-100 px-2 py-0.5 rounded font-mono font-bold">
                                  {student.completedCount} / {matchedStoryOfSelectedGroup?.chapters.length || 0}
                                </span>
                              </td>
                              <td className="p-3">
                                <div className="flex flex-wrap gap-1">
                                  {student.badgesCount > 0 ? (
                                    Array.from({ length: student.badgesCount }).map((_, bIdx) => (
                                      <span key={bIdx} className="bg-amber-100 text-[#78350f] text-[9px] font-bold px-1.5 py-0.5 rounded border border-amber-200">
                                        {bIdx === 0 ? "初试锋芒 🌱" : bIdx === 1 ? "提问先锋 🔍" : bIdx === 2 ? "智慧启航 ⛵" : "全能冒险王 👑"}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-gray-400 italic">暂无勋章奖励</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Helpful instructions for classrooms */}
                <div className="bg-[#fcfbf9] border border-[#ebdcb9] rounded-2xl p-4 text-xs leading-relaxed text-[#78350f]">
                  <h4 className="font-bold flex items-center gap-1.5 mb-1.5">
                    📖 智慧课堂教学指南
                  </h4>
                  <ul className="list-disc pl-5 space-y-1.5">
                    <li>学生可以通过发出带有任何文字的群聊信息赚得微量积分，以培养表达与沟通技巧。</li>
                    <li>
                      当学生在共读大门遇到瓶颈时，鼓励他们直接使用 <strong>@林克老师</strong>，AI会根据特定章节的AI原理正文和少儿认知度设计并生成极其暖心易读的比喻教程。
                    </li>
                    <li>
                      <strong>AI魔法画笔特技：</strong> 只要教导学生在提问中包含如“画一张”、“生成图”等动作命令，AI会自动识别并调用底层图像画图大模型变出高细节度绘本，支持多伙伴创意共享！
                    </li>
                  </ul>
                </div>

              </div>
            )}

          </div>
        </section>

      </div>
    </div>
  );
}

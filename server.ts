import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { Story, Group, User, Message, LeaderboardEntry, AssistantConfig, Quiz } from "./src/types";

// Initialize Gemini API client on the server
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
let aiClient: GoogleGenAI | null = null;

if (GEMINI_API_KEY) {
  try {
    aiClient = new GoogleGenAI({
      apiKey: GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    console.log("Successfully initialized GoogleGenAI client with GEMINI_API_KEY");
  } catch (err) {
    console.error("Error initializing GoogleGenAI client: ", err);
  }
} else {
  console.warn("GEMINI_API_KEY environment variable is not defined. AI features will fallback gracefully.");
}

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Paths
const DATA_FILE = path.join(process.cwd(), "data.json");

// Default Story Books
const DEFAULT_STORIES: Story[] = [
  {
    id: "story_forest",
    title: "AI魔法森林历险记",
    description: "和小松鼠奇奇、小熊贝贝一起进入AI魔法森林。在这里，你会学会如何和AI对话，AI是如何‘看’和‘听’数据的，以及如何制作你自己的AI画作！",
    coverEmoji: "🌲",
    chapters: [
      {
        id: "chapter_1",
        order: 1,
        title: "认识森林的守护人 (AI是什么？)",
        content: `小松鼠奇奇在松树下发现了一个发光的魔方，上面写着：‘你好！我是AI林克，我是这里的知识守护者。’ 
奇奇惊奇地问：‘AI？那是什么？是由超级智能齿轮组成的机器人吗？’

林克微笑着亮了起来：‘AI就是人工智能（Artificial Intelligence）！我其实并不是一个金属机器人，而是一堆写好的计算机指令和超级多的数据。人类教我如何从数据中学习，就像你们学习拼拼图。
例如，当老师给我看了一万张松果的图片，我就能学到松果的外形特征（有鳞片，呈椭圆锥形）。下一次你给我看一张新的照片，我也能立刻认出这是松果！这就是机器学习！’

小熊贝贝跑了过来：‘哇！你是个超级大脑吗？那你能帮我们找到遗失的黄金松果钥匙吗？’
林克说：‘当然可以，但是要帮我重新连接能量电源。你们需要先通过我的第一项测试：学会如何向我提问！你们可以对我提问，我也能通过你们说的话来认识你们。’`,
        aiConcept: {
          title: "什么是AI与机器学习？",
          description: "人工智能（AI）是让计算机和软件模仿人类智能的技术。机器学习（Machine Learning）则是AI的一种方法：计算机不需要通过手写指令设定所有规则，而是给它海量数据和例子（例如很多松果照片），让它自己总结规律、学习识别。",
          funFact: "你知道吗？AI的背后不是魔法，而是数学！它通过给不同的像素或特征打分，来猜出照片里放的是什么。"
        },
        quiz: {
          id: "quiz_chapter_1",
          question: "林克（AI）是通过什么方式学会分辨松果的呢？",
          options: [
            "自己做梦梦到的",
            "读了成千上万张松果的照片，从中寻找规律并猜测特征",
            "用胶水把松果贴在魔方上",
            "林克是森林仙子，天生就会"
          ],
          answerIndex: 1,
          explanation: "正确！机器学习的基本原理就是给AI输入大批量的样例数据（如照片），让它自动分析提取共同特征，从而在新情景中独立判断！",
          points: 50
        }
      },
      {
        id: "chapter_2",
        order: 2,
        title: "神奇的‘提示词魔杖’ (AI生成画作与提示词)",
        content: `为了过河，奇奇和贝贝必须造一艘小船，但他们手头什么工具也没有。
AI林克给他们递上了一支没有墨水的黑色法杖：‘这是提示词魔杖（Prompt Wand）。这大河两旁的岩石是用数字幻象雕刻而成的。只要你们在法杖上写下正确的“提示词”（Prompt），我后方的图像生成AI就会变出一艘真正的小船！’

奇奇有些迷茫：‘什么是提示词？’
林克解释道：‘提示词就是你们对AI下达的详细描述。如果你只说“小船”，AI可能会给你变出一艘漏水的旧破船、一艘宇宙飞船或者一只折纸小船。
但是，如果你具体一点，对法杖说：“一只用坚固红橡木做成的、带有白色小帆的卡通皮划艇，在大河中稳定漂浮，明亮的手绘童话风格。”，AI就能画出正符合你要求的安全小船！’

贝贝恍然大悟：‘哦！这就像是和魔法精灵许愿，说得越仔细、越把颜色/材料/样子说清楚，AI变出的魔法就越符合心意！’`,
        aiConcept: {
          title: "提示词（Prompt）与文本生成图像 (AIGC)",
          description: "现在的AI可以通过文字画图！在这个指令设计里，你的输入描述叫做‘提示词’（Prompt）。如果提示词太简单，AI只能随机联想。如果你的提示词包含‘主体特质’、‘环境背景’、‘风格/媒介’和‘光影色彩’，AI就能超级精确地呈现出你心目中的插画。",
          funFact: "在现实世界里，有专门的一项热门职业叫‘提示词工程师’，他们的工作专门教人们如何更聪明地对AI叙事来实现创意！"
        },
        quiz: {
          id: "quiz_chapter_2",
          question: "为了让AI画出最适合奇奇贝贝过河的安全小船，以下哪个提示词（Prompt）写得最棒？",
          options: [
            "一艘小破船，快来",
            "一艘用坚固红木头拼成、带有红色三角帆的平底卡通玩具木船，阳光洒在波光粼粼的蓝色河面上，手绘童话插画风格",
            "我要过河，给我一艘完美的船，颜色要好看而且要很快",
            "一艘大轮船在海上"
          ],
          answerIndex: 1,
          explanation: "正确！具有具体特征（坚固红木头、红色三角帆）、特定风格（手绘童话插画风格）以及场景背景（洒着阳光的蓝色河面）的提示词最容易获得理想结果！",
          points: 50
        }
      },
      {
        id: "chapter_3",
        order: 3,
        title: "真真假假！虚幻魔法镜的迷雾 (AI幻觉与安全伦理)",
        content: `奇奇和贝贝终于乘木船渡过了河。在宝藏山洞前，有一块巨大的“虚幻魔法镜”。魔法镜里播放着一只长着翅膀、会吐蓝色泡泡还能用流利英文吟诗的彩虹恐龙，简直像真的一样！
贝贝激动得跳了起来：‘哇！地球上原来真的有过这种神奇恐龙吗？你看镜子里都有它的彩色高清录视频了！’

AI林克警惕地飞了过来阻止了贝贝：‘等等，贝贝！这叫做AI幻觉，或者AI伪造信息！
虽然AI能利用海量知识生成极度闭真的声音、相片和视频，但它不是完美无缺的。当给它模棱两可或不完全的数据时，它会极具自信地“胡说八道”（幻觉）。

更重要的是，有坏人会使用这种技术仿造别人的声音和面孔来撒谎行骗，这叫深度伪造（Deepfake）。所以我们在使用AI时要保持三点：
一、批判性思维（真奇妙，但这真的科学吗？问问老师吧！）
二、隐私保护（千万不要把你的名字、密码、家庭住址发送给陌生的AI机器人！）
三、善意应用（坚决不制作也不传播假视频、假谣言）’

奇奇点头：‘我明白了！AI是好助手，但我们自己才是拥有智慧、分辨真假的小主人！’
宝箱就在森林尽头，让我们在群组里@林克 寻求开启咒语，完成最终答题吧！`,
        aiConcept: {
          title: "AI幻觉、伦理公正与隐私防护",
          description: "AI在没有确切事实支撑、或面对超出知识边界的部分时，会自信地编撰故事，这被称为‘AI幻觉’（Hallucination）。此外，深度伪造（Deepfake）存在虚假宣传隐私泄露等风险，因此和AI相处的首要思维即是‘批判性查证’和‘隐私边界’。",
          funFact: "有时AI的知识来自于训练它的人类网络。有些网页包含偏见和陈旧观念，AI也会学进去（这叫AI偏见）。让AI保持客观公平是人类努力的重要科学课题！"
        },
        quiz: {
          id: "quiz_chapter_3",
          question: "在和AI聊天机器人或者网络里的AI互动时，以下哪个行为是最防范危险的安全孩子？",
          options: [
            "把家里存款密码和自己现在的物理坐标发给机器人来帮忙保护",
            "对AI讲的惊人奇事保持批判探究，去图书馆科学树上或发消息向老师查证，并且坚决不发送包含个人真实密码在内的敏感隐私",
            "机器人叫我做什么，我就立刻去做，还要拉着隔壁同学一起做",
            "一辈子绝不看网络上的任何东西"
          ],
          answerIndex: 1,
          explanation: "正确！保护个人以及家庭的隐私界限，保持独立查证、质疑AI的批判思维是保证数据安全的重中之重！",
          points: 50
        }
      }
    ]
  }
];

// In-Memory Database State
let dbState = {
  stories: DEFAULT_STORIES,
  groups: [] as Group[],
  users: [] as User[],
  messages: [] as Message[]
};

// Load database from file if available
function loadDB() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
      // Basic schema merge to support dynamic runtime restart updates
      if (parsed.stories) dbState.stories = parsed.stories;
      if (parsed.groups) dbState.groups = parsed.groups;
      if (parsed.users) dbState.users = parsed.users;
      if (parsed.messages) dbState.messages = parsed.messages;
      console.log(`Database loaded successfully from ${DATA_FILE}`);
    } else {
      // First boot: create file with initial state
      saveDB();
    }
  } catch (error) {
    console.error("Error reading database file: ", error);
  }
}

// Persist state to file
function saveDB() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(dbState, null, 2), "utf-8");
  } catch (error) {
    console.error("Error saving database file: ", error);
  }
}

// Run initial loading
loadDB();

// Helper to generate unique codes
function generateInviteCode(): string {
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // clear readable characters
  let code = "";
  let isUnique = false;
  while (!isUnique) {
    code = "";
    for (let i = 0; i < 5; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    const exists = dbState.groups.find((g) => g.inviteCode === code);
    if (!exists) isUnique = true;
  }
  return code;
}

// ---------------- API ENDPOINTS ----------------

// 1. Stories API
app.get("/api/stories", (req, res) => {
  res.json(dbState.stories);
});

app.post("/api/stories", (req, res) => {
  const { title, description, coverEmoji, chapters } = req.body;
  if (!title || !description) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const newStory: Story = {
    id: `story_${Date.now()}`,
    title,
    description,
    coverEmoji: coverEmoji || "📚",
    chapters: chapters || []
  };

  dbState.stories.push(newStory);
  saveDB();
  res.json(newStory);
});

// 2. Groups API
app.get("/api/admin/groups-list", (req, res) => {
  res.json(dbState.groups);
});

app.get("/api/groups/:id", (req, res) => {
  const group = dbState.groups.find((g) => g.id === req.params.id);
  if (!group) {
    return res.status(404).json({ error: "Group not found" });
  }
  res.json(group);
});

// Locate group by invitation code
app.get("/api/groups/by-code/:code", (req, res) => {
  const code = req.params.code.toUpperCase().trim();
  const group = dbState.groups.find((g) => g.inviteCode === code);
  if (!group) {
    return res.status(404).json({ error: "找不到此邀请码。请确认邀请码是否书写正确！" });
  }
  const story = dbState.stories.find((s) => s.id === group.storyId);
  res.json({ group, story });
});

// Create Group (Teacher custom design)
app.post("/api/groups", (req, res) => {
  const { name, storyId, assistantConfig } = req.body;
  if (!name || !storyId) {
    return res.status(400).json({ error: "Missing name or storyId" });
  }

  const story = dbState.stories.find((s) => s.id === storyId);
  if (!story) {
    return res.status(404).json({ error: "Storybook not found" });
  }

  const firstChapterId = story.chapters[0]?.id || "";
  const inviteCode = generateInviteCode();

  const defaultAssistant: AssistantConfig = {
    name: "林克老师",
    avatarEmoji: "🤖",
    personalityPrompt: "你是一个专门帮小学生阅读故事书、传授AI大模型常识的AI助教。请多用充满想象力的对话、童话比喻、夸奖。用简洁的语言回答问题，每次回答在150字以内。回答最后留一个小松鼠或者是小熊的可爱行动。可以经常鼓励大家在群聊里合作探讨！",
    welcomeMessage: "大家好！我是大名鼎鼎的AI学习守护者林克。在这个群聊里，我会陪大家一起阅读故事！如果有不懂的AI名词，随时在群组里发消息 @我 提问哦！祝大家在AI魔法森林冒险愉快！",
    hints: ["AI林克，给我讲讲什么是‘机器学习’？", "我们要怎么给AI写提示词才能画出很酷的小船呀？", "AI真的会讲假话吗？"]
  };

  const newGroup: Group = {
    id: `group_${Date.now()}`,
    name,
    inviteCode,
    storyId,
    currentChapterId: firstChapterId,
    assistantConfig: assistantConfig || defaultAssistant,
    createdAt: Date.now()
  };

  dbState.groups.push(newGroup);

  // Send a system welcome message inside this group
  const welcomeMsg: Message = {
    id: `msg_sys_${Date.now()}`,
    groupId: newGroup.id,
    senderId: "system",
    senderName: "系统精灵",
    senderRole: "assistant",
    senderAvatar: "🔔",
    text: `✨ 群组「${newGroup.name}」已经组建完毕！守护导师「${newGroup.assistantConfig.name}」已进群。邀请码为【${newGroup.inviteCode}】。`,
    timestamp: Date.now(),
    isAiMention: false,
    isSystem: true
  };

  const botWelcomeMsg: Message = {
    id: `msg_bot_${Date.now() + 1}`,
    groupId: newGroup.id,
    senderId: "assistant",
    senderName: newGroup.assistantConfig.name,
    senderRole: "assistant",
    senderAvatar: newGroup.assistantConfig.avatarEmoji,
    text: newGroup.assistantConfig.welcomeMessage,
    timestamp: Date.now() + 1,
    isAiMention: false,
    isSystem: false
  };

  dbState.messages.push(welcomeMsg, botWelcomeMsg);

  saveDB();
  res.json({ group: newGroup, welcomeMsg, botWelcomeMsg });
});

// Update Assistant Config
app.post("/api/groups/:id/update-assistant", (req, res) => {
  const group = dbState.groups.find((g) => g.id === req.params.id);
  if (!group) {
    return res.status(404).json({ error: "Group not found" });
  }

  const { name, avatarEmoji, personalityPrompt, welcomeMessage, hints } = req.body;
  if (name) group.assistantConfig.name = name;
  if (avatarEmoji) group.assistantConfig.avatarEmoji = avatarEmoji;
  if (personalityPrompt) group.assistantConfig.personalityPrompt = personalityPrompt;
  if (welcomeMessage) group.assistantConfig.welcomeMessage = welcomeMessage;
  if (hints) group.assistantConfig.hints = hints;

  // Add system message informing about teacher updating AI rules
  const updateNotice: Message = {
    id: `msg_sys_${Date.now()}`,
    groupId: group.id,
    senderId: "system",
    senderName: "系统精灵",
    senderRole: "assistant",
    senderAvatar: "⚙️",
    text: `📝 开发者/老师更新了AI助手「${group.assistantConfig.name}」的核心设置！它的新法术能量已经生效。`,
    timestamp: Date.now(),
    isAiMention: false,
    isSystem: true
  };
  dbState.messages.push(updateNotice);

  saveDB();
  res.json({ success: true, group });
});

// Update group active reading chapter
app.post("/api/groups/:id/update-chapter", (req, res) => {
  const group = dbState.groups.find((g) => g.id === req.params.id);
  if (!group) return res.status(404).json({ error: "Group not found" });

  const { chapterId } = req.body;
  if (!chapterId) return res.status(400).json({ error: "Missing chapterId" });

  group.currentChapterId = chapterId;

  const story = dbState.stories.find((s) => s.id === group.storyId);
  const chapter = story?.chapters.find((c) => c.id === chapterId);

  const updateMsg: Message = {
    id: `msg_sys_${Date.now()}`,
    groupId: group.id,
    senderId: "system",
    senderName: "故事向导",
    senderRole: "assistant",
    senderAvatar: "📖",
    text: `👉 所有人注意！阅读进度已由老师/系统更新至第 ${chapter?.order || ""} 章节: 「${chapter?.title || "未知章节"}」。快来看看他们经历了怎样的神奇AI冒险！`,
    timestamp: Date.now(),
    isAiMention: false,
    isSystem: true
  };
  dbState.messages.push(updateMsg);

  saveDB();
  res.json({ success: true, group });
});

// 3. User & Auth API
app.post("/api/users/login", (req, res) => {
  const { name, inviteCode, role } = req.body;
  if (!name) return res.status(400).json({ error: "Name is required" });

  // If role is teacher, bypass code constraints
  if (role === 'teacher') {
    let teacher = dbState.users.find(u => u.name === name && u.role === 'teacher');
    if (!teacher) {
      teacher = {
        id: `user_teacher_${Date.now()}`,
        name,
        groupId: "teacher_admin",
        points: 0,
        badges: ["教书育人", "AI开发者"],
        completedQuizzes: [],
        role: "teacher"
      };
      dbState.users.push(teacher);
      saveDB();
    }
    return res.json({ user: teacher });
  }

  // Student joining
  if (!inviteCode) return res.status(400).json({ error: "Invite code is required for students" });
  const group = dbState.groups.find(g => g.inviteCode === inviteCode.toUpperCase().trim());
  if (!group) return res.status(404).json({ error: "找不到此邀请码所对应的主题群聊！" });

  let student = dbState.users.find(u => u.name === name && u.groupId === group.id && u.role === 'student');
  let isNew = false;
  if (!student) {
    student = {
      id: `user_student_${Date.now()}`,
      name,
      groupId: group.id,
      points: 10, // Initial seed score
      badges: ["初试锋芒 🌱"],
      completedQuizzes: [],
      role: "student"
    };
    dbState.users.push(student);
    isNew = true;

    // Send a system message to indicate group arrival
    const joinMsg: Message = {
      id: `msg_sys_${Date.now()}`,
      groupId: group.id,
      senderId: "system",
      senderName: "系统精灵",
      senderRole: "assistant",
      senderAvatar: "👋",
      text: `🎉 热烈欢迎新冒险家「${student.name}」使用邀请码秘密加入故事学习群组！`,
      timestamp: Date.now(),
      isAiMention: false,
      isSystem: true
    };
    dbState.messages.push(joinMsg);
  }

  saveDB();
  res.json({ user: student, group, story: dbState.stories.find(s => s.id === group.storyId), isNew });
});

// 4. Chat Messages APIs
app.get("/api/groups/:id/messages", (req, res) => {
  const { since } = req.query;
  const groupId = req.params.id;

  let messages = dbState.messages.filter(m => m.groupId === groupId);
  if (since) {
    const sinceTime = parseInt(since as string, 10);
    if (!isNaN(sinceTime)) {
      messages = messages.filter(m => m.timestamp > sinceTime);
    }
  }

  res.json(messages);
});

// Send Chat message (Includes AI mentions logic)
app.post("/api/groups/:id/messages", async (req, res) => {
  const groupId = req.params.id;
  const { senderId, text } = req.body;

  if (!senderId || !text) {
    return res.status(400).json({ error: "senderId and text are required" });
  }

  const group = dbState.groups.find(g => g.id === groupId);
  if (!group) return res.status(404).json({ error: "Group not found" });

  const sender = dbState.users.find(u => u.id === senderId);
  if (!sender) return res.status(404).json({ error: "Sender profile not found" });

  const botName = group.assistantConfig.name;

  // 1. Save user's original message
  const userMsg: Message = {
    id: `msg_user_${Date.now()}`,
    groupId,
    senderId,
    senderName: sender.name,
    senderRole: sender.role,
    senderAvatar: sender.role === 'teacher' ? "🎓" : "🎒",
    text,
    timestamp: Date.now(),
    isAiMention: text.includes(`@${botName}`) || text.includes("@AI") || text.includes("@ai"),
    isSystem: false
  };

  dbState.messages.push(userMsg);

  // Award minor point to students for chatting and interacting (e.g. 2 points)
  if (sender.role === 'student') {
    sender.points += 2;
  }

  res.json({ userMessage: userMsg });

  // 2. Perform background Assistant Trigger
  if (userMsg.isAiMention) {
    let aiResponseText = "";
    let isDrawing = false;
    let generatedImagePart: string | null = null;

    // Check if user is asking to draw an image
    const triggerWords = ["画", "画图", "生成图", "画一张", "画画", "插图", "图像", "图片", "draw", "generate image", "paint", "picture"];
    const isDrawRequest = triggerWords.some(word => text.toLowerCase().includes(word));

    try {
      if (isDrawRequest && aiClient) {
        isDrawing = true;
        console.log(`System caught a DRAW request from student ${sender.name}: "${text}"`);
        // Notify chat that AI is drawing
        const drawNotify: Message = {
          id: `msg_notify_${Date.now()}`,
          groupId,
          senderId: "assistant",
          senderName: botName,
          senderRole: "assistant",
          senderAvatar: group.assistantConfig.avatarEmoji,
          text: `🎨 我知道啦！我正在挥舞“提示词魔杖”帮「${sender.name}」画图，由于魔力输出强劲，请大家等一等我哦！`,
          timestamp: Date.now() + 10,
          isAiMention: false,
          isSystem: false
        };
        dbState.messages.push(drawNotify);
        saveDB();

        // Perform image generation
        try {
          // Fallback to cute image prompt instruction (which returns a base64 or description)
          // We can use gemini-2.5-flash-image models to generate high-quality image bytes
          const imgGenResponse = await aiClient.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: [{ text: `A cute colorful children illustration depicting: ${text}. Suitable for a storybook read-along, cartoon style, positive mood.` }],
            config: {
              imageConfig: {
                aspectRatio: "4:3"
              }
            }
          });

          for (const part of imgGenResponse.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
              const base64Data = part.inlineData.data;
              generatedImagePart = `data:image/png;base64,${base64Data}`;
              break;
            }
          }

          if (generatedImagePart) {
            aiResponseText = `✨ 画好啦！小熊贝贝开心地围着这幅画转圈圈。这是为你画的：\n\n![Generated Image](${generatedImagePart})`;
          } else {
            // Treat as text response if image part is empty
            aiResponseText = `🎨 提示词魔杖已经为你调配好了魔力画卷。但在本魔法测试站，魔棒被封印在水晶中没办法直接倒映出实体图片。让我用极其温暖画笔的文字描述来给你描绘你眼中的可爱景象吧：\n\n在明亮松软的魔法小帆船上，闪闪发光的红松果排成了一行，森林里满是金子的暖光和可爱的插画线条。`;
          }
        } catch (imgError: any) {
          console.error("Gemini Image generation failed, falling back to text representation:", imgError);
          aiResponseText = `🎨 提示词魔杖挥舞得太使劲，有一点卡住了（微克电量限制）。不过没关系，林克脑海中的彩色灵感已经泛滥：小松鼠奇奇正开着你说的“${text}”，漂在金色的大河中央，背景是漂亮的云海和卡通手绘森林！\n\n*(提示：后台AI图像生成需要Paid API Key支持，如果暂未充能请对林克问其他关于故事中的AI知识问题哦！)*`;
        }
      } else if (aiClient) {
        // Standard Text QA with Gemini
        const story = dbState.stories.find(s => s.id === group.storyId);
        const currentChapter = story?.chapters.find(c => c.id === group.currentChapterId);

        // Fetch recent messages for simple memory
        const recentMessages = dbState.messages
          .filter(m => m.groupId === groupId && !m.isSystem)
          .slice(-6)
          .map(m => `${m.senderName}(${m.senderRole}): ${m.text}`)
          .join("\n");

        const contextualPrompt = `
我们正在开展一个故事会小组阅读学习，当前正在一起读一本讲AI常识的趣味儿童故事书。
故事书的名字是:「${story?.title || ""}」 - ${story?.description || ""}
当前正在阅读的第 ${currentChapter?.order || ""} 章节: 「${currentChapter?.title || ""}」
章节正文内容:
"""
${currentChapter?.content || ""}
"""
本章节想告诉小朋友们的AI知识重点是:
- 概念标题: ${currentChapter?.aiConcept.title || ""}
- 概念大意: ${currentChapter?.aiConcept.description || ""}

以下是小学生的求助提问，提问者是学生: 「${sender.name}」
提问内容: 「${text}」

最近的群聊简短历史，可作上下文参考（请判断是否需要关联回答）:
${recentMessages}

请扮演林克魔法守护导师（或者叫${botName}），回答这个小学生的问题。
请严守你的定制指令约束:
1. 回答要温暖、通俗易懂并利用充满想象力的童话化比喻解释AI科学。
2. 回答最长不超过200字（不要长篇大论，小学生阅读容易疲劳）。
3. 回答结束必须有一句话，描述一个小松鼠奇奇、小熊贝贝或AI守护者的可爱动作，以此给学生增加读书趣味。
4. 可以适当指导孩子们去作Quiz答题和思考。
`;

        const response = await aiClient.models.generateContent({
          model: "gemini-3.5-flash",
          contents: contextualPrompt,
          config: {
            systemInstruction: group.assistantConfig.personalityPrompt
          }
        });

        aiResponseText = response.text || "嘟嘟嘟... 我现在脑袋有点卡住了，再晃我一下！";
      } else {
        // Standard mock AI in case there is absolutely no API key
        aiResponseText = `🤖 (林克分身精灵) 嗨！「${sender.name}」，我已经收到你的召唤啦。因为开发者大本营还没有填入【GEMINI_API_KEY】法力源泉，所以真正的林克还在睡懒觉哦！快到【开发者面板】右侧的开发指导里连接你的API Key吧！这样我就会被彻底激活。你可以先看看我们的答题挑战，一样有超多奖励积分！`;
      }
    } catch (apiError: any) {
      console.error("Gemini API calling error, using offline response: ", apiError);
      aiResponseText = `⚡ AI导师说：哎呀！在刚才的回答法阵里被魔法屏障阻断了（服务器错误：${apiError.message || apiError}）。但作为爱学习的你，我要先送给你 5 点努力积分！小松鼠奇奇开心地把你刚才的问题写在了笔记本上。`;
    }

    // 3. Save assistant response message
    const botMsg: Message = {
      id: `msg_bot_${Date.now() + 2}`,
      groupId,
      senderId: "assistant",
      senderName: botName,
      senderRole: "assistant",
      senderAvatar: group.assistantConfig.avatarEmoji,
      text: aiResponseText,
      timestamp: Date.now() + 2,
      isAiMention: false,
      isSystem: false
    };

    dbState.messages.push(botMsg);

    // Reward student with 10 extra points and a badge for active prompt research!
    if (sender.role === 'student') {
      sender.points += 10;
      if (!sender.badges.includes("提问先锋 🔍")) {
        sender.badges.push("提问先锋 🔍");
        // System message badge announcement
        const systemBadgeMsg: Message = {
          id: `msg_sys_badge_${Date.now()}`,
          groupId,
          senderId: "system",
          senderName: "荣耀星光",
          senderRole: "assistant",
          senderAvatar: "🏆",
          text: `👑 恭喜「${sender.name}」在与AI交互中展示出卓越求知欲，成功解锁了【提问先锋 🔍】勋章，并获得大额阅览探索积分！大家都要向他学习，积极提问哦！`,
          timestamp: Date.now() + 3,
          isAiMention: false,
          isSystem: true
        };
        dbState.messages.push(systemBadgeMsg);
      }
    }

    saveDB();
  } else {
    // Just save state for general text updates
    saveDB();
  }
});

// 5. Submit Quiz Answer
app.post("/api/users/:id/quiz", (req, res) => {
  const userId = req.params.id;
  const { chapterId, selectedIndex } = req.body;

  if (!chapterId || selectedIndex === undefined) {
    return res.status(400).json({ error: "chapterId and selectedIndex are required" });
  }

  const user = dbState.users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: "Student not found" });

  const group = dbState.groups.find(g => g.id === user.groupId);
  if (!group) return res.status(404).json({ error: "Group not found" });

  const story = dbState.stories.find(s => s.id === group.storyId);
  const chapter = story?.chapters.find(c => c.id === chapterId);
  const quiz = chapter?.quiz;

  if (!quiz) return res.status(404).json({ error: "Quiz not found for this chapter" });

  if (user.completedQuizzes.includes(chapterId)) {
    return res.status(400).json({ error: "你已经回答过本关卡的智力谜题啦，不可重复拿分哦！" });
  }

  const isCorrect = quiz.answerIndex === selectedIndex;

  if (isCorrect) {
    user.points += quiz.points;
    user.completedQuizzes.push(chapterId);

    // Check if we should reward badge
    let awardedBadge = "";
    if (user.completedQuizzes.length === 1) {
      awardedBadge = "智慧启航 ⛵";
    } else if (user.completedQuizzes.length === story?.chapters.length) {
      awardedBadge = "全能冒险王 👑";
    }

    if (awardedBadge && !user.badges.includes(awardedBadge)) {
      user.badges.push(awardedBadge);
    }

    // Insert public celebration system message
    const quizCelebration: Message = {
      id: `msg_sys_quiz_${Date.now()}`,
      groupId: user.groupId,
      senderId: "system",
      senderName: "智慧精灵",
      senderRole: "assistant",
      senderAvatar: "⭐",
      text: `🎉 学生「${user.name}」成功解开了第 ${chapter.order} 章的AI知识谜题，一口气赢取了 ${quiz.points} 探险积分！${awardedBadge ? `解锁了绝版勋章【${awardedBadge}】！` : ""}我们离全部通关又近了一步！`,
      timestamp: Date.now(),
      isAiMention: false,
      isSystem: true
    };
    dbState.messages.push(quizCelebration);

    saveDB();
    res.json({ isCorrect, explanation: quiz.explanation, pointsAwarded: quiz.points, badges: user.badges, user });
  } else {
    res.json({ isCorrect, explanation: `哎呀，有一点小偏差哦！答案不是这块，不过没有关系！林克在书中指点过：'想一想机器学习的数据到底是什么样子的？'，快翻回上文或者悄悄在群里 @我们 的AI林克寻求帮助，重新答题挑战吧！` });
  }
});

// 6. Group Leaderboard Endpoint
app.get("/api/groups/:id/leaderboard", (req, res) => {
  const groupId = req.params.id;
  const members = dbState.users.filter(u => u.groupId === groupId && u.role === 'student');

  const leaderboard: LeaderboardEntry[] = members
    .map(m => ({
      userId: m.id,
      userName: m.name,
      points: m.points,
      badgesCount: m.badges.length,
      completedCount: m.completedQuizzes.length
    }))
    .sort((a, b) => b.points - a.points);

  res.json(leaderboard);
});

// Serve frontend assets & configure Dev server
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Setting up Vite middleware for DEVELOPMENT...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving static assets in PRODUCTION...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AI Story Group Reading Hub running on http://localhost:${PORT}`);
  });
}

startServer();

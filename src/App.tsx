/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import WelcomeScreen from './components/WelcomeScreen';
import StudentClassroom from './components/StudentClassroom';
import TeacherOffice from './components/TeacherOffice';
import { User, Group, Story } from './types';

export default function App() {
  const [activeMode, setActiveMode] = useState<'welcome' | 'student' | 'teacher'>('welcome');
  const [user, setUser] = useState<User | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [story, setStory] = useState<Story | null>(null);

  const handleStudentJoinSuccess = (data: { user: User; group?: Group; story?: Story }) => {
    setUser(data.user);
    if (data.group) setGroup(data.group);
    if (data.story) setStory(data.story);
    setActiveMode('student');
  };

  const handleTeacherJoinSuccess = (teacherName: string) => {
    // Generate placeholder user object for teacher identity tracking
    const teacherUser: User = {
      id: `teacher_${Date.now()}`,
      name: teacherName,
      groupId: 'admin_teacher',
      points: 999,
      badges: ['教书育人'],
      completedQuizzes: [],
      role: 'teacher'
    };
    setUser(teacherUser);
    setActiveMode('teacher');
  };

  const handleLeaveClassroom = () => {
    setActiveMode('welcome');
    setUser(null);
    setGroup(null);
    setStory(null);
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 selection:bg-[#fde68a]">
      {activeMode === 'welcome' && (
        <WelcomeScreen 
          onSuccess={handleStudentJoinSuccess} 
          onSelectTeacherMode={handleTeacherJoinSuccess} 
        />
      )}

      {activeMode === 'student' && user && group && story && (
        <StudentClassroom
          initialUser={user}
          initialGroup={group}
          initialStory={story}
          onLeave={handleLeaveClassroom}
        />
      )}

      {activeMode === 'teacher' && user && (
        <TeacherOffice
          teacherName={user.name}
          onLeave={handleLeaveClassroom}
        />
      )}
    </div>
  );
}


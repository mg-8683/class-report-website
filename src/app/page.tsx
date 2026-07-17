"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import * as XLSX from "xlsx";

import {
  AppData, CourseData, StudentEvaluation, LessonData,
  RATING_OPTIONS, AbilityRating, CommonRating,
  createDefaultData, createStudentEvaluation, createDefaultCourse,
  generateId, EXCEL_COLUMNS,
} from "@/lib/types";

const STORAGE_KEY = "class-report-data";

function loadData(): AppData {
  if (typeof window === "undefined") return createDefaultData();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.courses && Array.isArray(parsed.courses)) return parsed;
    }
  } catch {}
  return createDefaultData();
}

function saveData(data: AppData) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ========== 小型复用组件 ==========

function RatingSelect({ value, options, onChange }: {
  value: string; options: readonly string[]; onChange: (v: string) => void;
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="border border-gray-300 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-green-400 min-w-[100px]">
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  );
}

function StudentManager({ students, onClose, onRename, onDelete }: {
  students: { id: string; name: string }[];
  onClose: () => void; onRename: (id: string, name: string) => void; onDelete: (id: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[480px] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h3 className="font-semibold text-base">名单管理</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {students.length === 0 ? <p className="text-gray-400 text-sm text-center py-4">暂无学员</p> :
            <ul className="divide-y divide-gray-100">
              {students.map(s => (
                <li key={s.id} className="flex items-center gap-2 py-2">
                  {editingId === s.id ? <>
                    <input value={editName} onChange={e => setEditName(e.target.value)}
                      className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm" autoFocus
                      onKeyDown={e => { if (e.key === "Enter") { onRename(s.id, editName.trim()); setEditingId(null); } if (e.key === "Escape") setEditingId(null); }} />
                    <button onClick={() => { onRename(s.id, editName.trim()); setEditingId(null); }}
                      className="text-green-600 text-sm hover:underline">保存</button>
                    <button onClick={() => setEditingId(null)} className="text-gray-400 text-sm hover:underline">取消</button>
                  </> : <>
                    <span className="flex-1 text-sm">{s.name}</span>
                    <button onClick={() => { setEditingId(s.id); setEditName(s.name); }}
                      className="text-blue-500 text-sm hover:underline">改名</button>
                    <button onClick={() => { if (confirm(`确定删除学员「${s.name}」？`)) onDelete(s.id); }}
                      className="text-red-500 text-sm hover:underline">删除</button>
                  </>}
                </li>
              ))}
            </ul>}
        </div>
      </div>
    </div>
  );
}

function AddLessonModal({ onClose, onAdd }: { onClose: () => void; onAdd: (name: string) => void; }) {
  const [name, setName] = useState("");
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[400px]">
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h3 className="font-semibold text-base">新增课时</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="px-5 py-4">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="课时名称，如：第三节课"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-1 focus:ring-green-400"
            autoFocus onKeyDown={e => { if (e.key === "Enter" && name.trim()) onAdd(name.trim()); }} />
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50">取消</button>
            <button onClick={() => name.trim() && onAdd(name.trim())}
              className="px-4 py-1.5 text-sm bg-green-500 text-white rounded hover:bg-green-600">添加</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ========== 主页面组件 ==========

export default function ClassReportPage() {
  const [data, setData] = useState<AppData>(() => loadData());
  const [showStudentManager, setShowStudentManager] = useState(false);
  const [showAddLesson, setShowAddLesson] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showAddModule, setShowAddModule] = useState(false);
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [newModuleName, setNewModuleName] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { saveData(data); }, [data]);

  // 当前激活的课程
  const activeCourse = useMemo(() =>
    data.courses.find(c => c.id === data.activeCourseId) || data.courses[0],
    [data.courses, data.activeCourseId]
  );

  // 当前激活的课时
  const activeLesson = activeCourse?.lessons.find(l => l.id === activeCourse.activeLessonId)
    || activeCourse?.lessons[0];

  // 当前课时 + 补全的学员评价
  const currentLesson = (() => {
    if (!activeLesson || !activeCourse) return null;
    const evaluations: Record<string, StudentEvaluation> = {};
    for (const student of activeCourse.students) {
      evaluations[student.id] = activeLesson.evaluations[student.id] || createStudentEvaluation(student.id);
    }
    return { ...activeLesson, evaluations };
  })();

  // ---- 课程操作 ----
  const updateCourse = useCallback((courseId: string, updater: (c: CourseData) => CourseData) => {
    setData(prev => ({
      ...prev,
      courses: prev.courses.map(c => c.id === courseId ? updater(c) : c),
    }));
  }, []);

  const switchCourse = useCallback((courseId: string) => {
    setData(prev => ({ ...prev, activeCourseId: courseId }));
  }, []);

  const addCourse = useCallback((name: string) => {
    const course = createDefaultCourse();
    course.name = name;
    course.activeLessonId = course.lessons[0].id;
    setData(prev => ({
      courses: [...prev.courses, course],
      activeCourseId: course.id,
    }));
    setShowAddCourse(false);
  }, []);

  const deleteCourse = useCallback((courseId: string) => {
    if (data.courses.length <= 1) return;
    setData(prev => {
      const courses = prev.courses.filter(c => c.id !== courseId);
      return {
        courses,
        activeCourseId: prev.activeCourseId === courseId ? courses[0].id : prev.activeCourseId,
      };
    });
  }, [data.courses.length]);

  const renameCourse = useCallback((courseId: string, name: string) => {
    if (!name.trim()) return;
    updateCourse(courseId, c => ({ ...c, name: name.trim() }));
  }, [updateCourse]);

  // ---- 学员操作 ----
  const addStudent = useCallback(() => {
    const name = newStudentName.trim();
    if (!name || !activeCourse) return;
    const id = generateId();
    updateCourse(activeCourse.id, c => ({
      ...c,
      students: [...c.students, { id, name }],
      lessons: c.lessons.map(l => ({
        ...l,
        evaluations: { ...l.evaluations, [id]: createStudentEvaluation(id) },
      })),
    }));
    setNewStudentName("");
  }, [newStudentName, activeCourse, updateCourse]);

  const deleteStudent = useCallback((id: string) => {
    if (!activeCourse) return;
    updateCourse(activeCourse.id, c => ({
      ...c,
      students: c.students.filter(s => s.id !== id),
      lessons: c.lessons.map(l => {
        const evals = { ...l.evaluations };
        delete evals[id];
        return { ...l, evaluations: evals };
      }),
    }));
  }, [activeCourse, updateCourse]);

  const renameStudent = useCallback((id: string, name: string) => {
    if (!name.trim() || !activeCourse) return;
    updateCourse(activeCourse.id, c => ({
      ...c,
      students: c.students.map(s => s.id === id ? { ...s, name: name.trim() } : s),
    }));
  }, [activeCourse, updateCourse]);

  // ---- 课时操作 ----
  const switchLesson = useCallback((lessonId: string) => {
    if (!activeCourse) return;
    updateCourse(activeCourse.id, c => ({ ...c, activeLessonId: lessonId }));
  }, [activeCourse, updateCourse]);

  const addLesson = useCallback((name: string) => {
    if (!activeCourse) return;
    const id = generateId();
    updateCourse(activeCourse.id, c => ({
      ...c,
      lessons: [...c.lessons, { id, name, contentSummary: "", evaluations: {} }],
      activeLessonId: id,
    }));
    setShowAddLesson(false);
  }, [activeCourse, updateCourse]);

  const closeLesson = useCallback((id: string) => {
    if (!activeCourse || activeCourse.lessons.length <= 1) return;
    updateCourse(activeCourse.id, c => {
      const lessons = c.lessons.filter(l => l.id !== id);
      return { ...c, lessons, activeLessonId: c.activeLessonId === id ? lessons[0].id : c.activeLessonId };
    });
  }, [activeCourse, updateCourse]);

  // ---- 评价操作 ----
  const updateEvaluation = useCallback((studentId: string, field: keyof StudentEvaluation, value: string) => {
    if (!activeCourse) return;
    updateCourse(activeCourse.id, c => ({
      ...c,
      lessons: c.lessons.map(l => {
        if (l.id !== c.activeLessonId) return l;
        const existing = l.evaluations[studentId] || createStudentEvaluation(studentId);
        return { ...l, evaluations: { ...l.evaluations, [studentId]: { ...existing, [field]: value } } };
      }),
    }));
  }, [activeCourse, updateCourse]);

  const updateContentSummary = useCallback((value: string) => {
    if (!activeCourse) return;
    updateCourse(activeCourse.id, c => ({
      ...c,
      lessons: c.lessons.map(l => l.id === c.activeLessonId ? { ...l, contentSummary: value } : l),
    }));
  }, [activeCourse, updateCourse]);

  // ---- 模块操作 ----
  const addModule = useCallback(() => {
    const name = newModuleName.trim();
    if (!name || !activeCourse) return;
    updateCourse(activeCourse.id, c => ({
      ...c,
      modules: [...c.modules, { id: generateId(), name }],
    }));
    setNewModuleName("");
    setShowAddModule(false);
  }, [newModuleName, activeCourse, updateCourse]);

  // ---- 复制学员行 ----
  const copyStudentRow = useCallback((studentId: string) => {
    if (!currentLesson || !activeCourse) return;
    const eval_ = currentLesson.evaluations[studentId];
    const student = activeCourse.students.find(s => s.id === studentId);
    if (!student) return;
    const lines = [
      `${activeCourse.name} - ${currentLesson.name} 学员反馈`,
      "",
    ];
    if (currentLesson.contentSummary) {
      lines.push("【阶段教学内容概要】");
      lines.push(currentLesson.contentSummary);
      lines.push("");
    }
    lines.push(`【${student.name}】`);
    lines.push(`基础能力反馈：${eval_?.ability || "未填写"}`);
    lines.push(`笔记：${eval_?.notes || "未填写"}`);
    lines.push(`专注度：${eval_?.focus || "未填写"}`);
    lines.push(`逻辑力：${eval_?.logic || "未填写"}`);
    lines.push(`理解力：${eval_?.comprehension || "未填写"}`);
    lines.push(`上课互动答题情况：${eval_?.interaction || "暂无"}`);
    const text = lines.join("\n");
    navigator.clipboard.writeText(text).then(() => alert("已复制到剪贴板")).catch(() => {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      alert("已复制到剪贴板");
    });
  }, [currentLesson, activeCourse]);

  // ---- Excel 导出 ----
  const exportExcel = useCallback(() => {
    const rows: Record<string, string>[] = [];
    for (const course of data.courses) {
      for (const lesson of course.lessons) {
        for (const student of course.students) {
          const ev = lesson.evaluations[student.id] || createStudentEvaluation(student.id);
          rows.push({
            '课程名称': course.name,
            '课时名称': lesson.name,
            '学员姓名': student.name,
            '基础能力反馈': ev.ability,
            '笔记': ev.notes,
            '专注度': ev.focus,
            '逻辑力': ev.logic,
            '理解力': ev.comprehension,
            '上课互动答题情况': ev.interaction,
            '阶段教学内容概要': lesson.contentSummary,
          });
        }
      }
    }
    const ws = XLSX.utils.json_to_sheet(rows);
    // 设置列宽
    ws['!cols'] = [
      { wch: 30 }, { wch: 16 }, { wch: 12 }, { wch: 18 },
      { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 },
      { wch: 40 }, { wch: 50 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '班课阶段报告');
    XLSX.writeFile(wb, `班课阶段报告_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }, [data.courses]);

  // ---- Excel 导入 ----
  const importExcel = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' });
        if (rows.length === 0) { alert("Excel 文件为空"); return; }

        // 按课程名称分组
        const courseMap = new Map<string, {
          lessons: Map<string, { lesson: LessonData; students: Set<string>; rows: Record<string, string>[] }>;
          students: Map<string, string>; // id -> name
        }>();

        let studentIdCounter = 1;
        const studentIdMap = new Map<string, string>(); // 课程+姓名 -> id

        for (const row of rows) {
          const courseName = (row['课程名称'] || '').trim();
          const lessonName = (row['课时名称'] || '').trim();
          const studentName = (row['学员姓名'] || '').trim();
          if (!courseName || !lessonName || !studentName) continue;

          if (!courseMap.has(courseName)) {
            courseMap.set(courseName, { lessons: new Map(), students: new Map() });
          }
          const cData = courseMap.get(courseName)!;

          if (!cData.lessons.has(lessonName)) {
            cData.lessons.set(lessonName, { lesson: { id: generateId(), name: lessonName, contentSummary: (row['阶段教学内容概要'] || '').trim(), evaluations: {} }, students: new Set(), rows: [] });
          }
          const lData = cData.lessons.get(lessonName)!;
          if (row['阶段教学内容概要'] && !lData.lesson.contentSummary) {
            lData.lesson.contentSummary = (row['阶段教学内容概要'] || '').trim();
          }

          const sidKey = `${courseName}|${studentName}`;
          if (!studentIdMap.has(sidKey)) {
            studentIdMap.set(sidKey, `imp-${studentIdCounter++}`);
          }
          const sid = studentIdMap.get(sidKey)!;
          cData.students.set(sid, studentName);
          lData.students.add(sid);
          lData.rows.push({ ...row, _sid: sid });
        }

        // 构建 CourseData
        const courses: CourseData[] = [];
        for (const [courseName, cData] of courseMap) {
          const courseId = generateId();
          const students = Array.from(cData.students.entries()).map(([id, name]) => ({ id, name }));
          const lessons: LessonData[] = [];
          for (const [, lData] of cData.lessons) {
            const evaluations: Record<string, StudentEvaluation> = {};
            for (const row of lData.rows) {
              const sid = row._sid;
              evaluations[sid] = {
                studentId: sid,
                ability: (row['基础能力反馈'] || '一般') as AbilityRating,
                notes: (row['笔记'] || '一般') as CommonRating,
                focus: (row['专注度'] || '一般') as CommonRating,
                logic: (row['逻辑力'] || '一般') as CommonRating,
                comprehension: (row['理解力'] || '一般') as CommonRating,
                interaction: (row['上课互动答题情况'] || '').trim(),
              };
            }
            lessons.push({ ...lData.lesson, evaluations });
          }
          courses.push({ id: courseId, name: courseName, students, modules: [], lessons, activeLessonId: lessons[0]?.id || '' });
        }

        if (courses.length === 0) { alert("未识别到有效数据，请检查 Excel 列名是否正确"); return; }

        setData({ courses, activeCourseId: courses[0].id });
        alert(`成功导入 ${courses.length} 门课程！`);
      } catch {
        alert("文件解析失败，请确认是 .xlsx 格式");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  }, []);

  // ---- 清空 ----
  const clearAllData = useCallback(() => {
    setData(createDefaultData());
    setShowClearConfirm(false);
  }, []);

  // ---- 导航相邻课时 ----
  const goPrevLesson = useCallback(() => {
    if (!activeCourse) return;
    const idx = activeCourse.lessons.findIndex(l => l.id === activeCourse.activeLessonId);
    if (idx > 0) switchLesson(activeCourse.lessons[idx - 1].id);
  }, [activeCourse, switchLesson]);

  const goNextLesson = useCallback(() => {
    if (!activeCourse) return;
    const idx = activeCourse.lessons.findIndex(l => l.id === activeCourse.activeLessonId);
    if (idx < activeCourse.lessons.length - 1) switchLesson(activeCourse.lessons[idx + 1].id);
  }, [activeCourse, switchLesson]);

  if (!activeCourse) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">请先创建课程</div>;
  }

  // 切换课时时的键盘快捷键
  const lessonIdx = activeCourse.lessons.findIndex(l => l.id === activeCourse.activeLessonId);

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex">
      {/* ===== 左侧课程目录栏 ===== */}
      <div className={`${sidebarCollapsed ? "w-12" : "w-56"} bg-white border-r border-gray-200 flex flex-col shrink-0 transition-all duration-200`}>
        {/* 折叠按钮 */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
          {!sidebarCollapsed && <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">班课目录</span>}
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="text-gray-400 hover:text-gray-600 text-sm ml-auto"
            title={sidebarCollapsed ? "展开" : "收起"}>
            {sidebarCollapsed ? "☰" : "✕"}
          </button>
        </div>

        {/* 课程列表 */}
        <div className="flex-1 overflow-y-auto py-1">
          {data.courses.map(course => {
            const isActive = course.id === data.activeCourseId;
            return (
              <div key={course.id}
                className={`group flex items-center gap-1.5 px-3 py-2 cursor-pointer text-sm transition-colors
                  ${isActive ? "bg-blue-50 text-blue-700 border-r-2 border-blue-500" : "text-gray-700 hover:bg-gray-50"}`}
                onClick={() => switchCourse(course.id)}>
                <span className="text-xs opacity-60">📘</span>
                {!sidebarCollapsed && (
                  <>
                    <span className="flex-1 truncate" title={course.name}
                      onDoubleClick={() => {
                        const n = prompt("修改课程名称", course.name);
                        if (n !== null) renameCourse(course.id, n);
                      }}>
                      {course.name}
                    </span>
                    {data.courses.length > 1 && (
                      <button onClick={e => { e.stopPropagation(); if (confirm("确定删除此课程？")) deleteCourse(course.id); }}
                        className="text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        ×
                      </button>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* 添加课程按钮 */}
        <div className="border-t border-gray-100 p-2">
          <button onClick={() => setShowAddCourse(true)}
            className="w-full text-sm text-gray-500 hover:text-gray-700 py-1.5 rounded hover:bg-gray-50 flex items-center justify-center gap-1">
            <span>+</span>
            {!sidebarCollapsed && <span>添加班课</span>}
          </button>
        </div>
      </div>

      {/* ===== 右侧主内容区 ===== */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* 顶部栏 */}
        <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-3 flex-shrink-0">
          <span className="text-sm text-gray-500 whitespace-nowrap">当前班课：</span>
          <span className="text-base font-semibold text-gray-800">{activeCourse.name}</span>
          <div className="flex-1" />
          <button onClick={() => setShowClearConfirm(true)}
            className="px-3 py-1.5 text-sm bg-red-50 text-red-500 border border-red-200 rounded hover:bg-red-100">
            清空当前课程数据
          </button>
        </div>

        {/* 工具栏 */}
        <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-3 flex-wrap flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">学员管理:</span>
            <input value={newStudentName} onChange={e => setNewStudentName(e.target.value)}
              placeholder="学生姓名"
              className="border border-gray-300 rounded px-3 py-1.5 text-sm w-[120px] focus:outline-none focus:ring-1 focus:ring-green-400"
              onKeyDown={e => e.key === "Enter" && addStudent()} />
            <button onClick={addStudent}
              className="px-3 py-1.5 text-sm bg-green-500 text-white rounded hover:bg-green-600">添加学员</button>
            <button onClick={() => setShowStudentManager(true)}
              className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600">名单管理</button>
          </div>
          <div className="h-6 w-px bg-gray-300 mx-1" />
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">模块管理:</span>
            <button onClick={() => setShowAddModule(true)}
              className="px-3 py-1.5 text-sm bg-green-500 text-white rounded hover:bg-green-600">+ 增加反馈模块</button>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <button onClick={exportExcel}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50">📥 导出备份</button>
            <button onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50">📤 导入数据</button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={importExcel} className="hidden" />
          </div>
        </div>

        {/* 课时 Tabs */}
        <div className="bg-white border-b border-gray-200 px-4 pt-2 flex items-end gap-1 overflow-x-auto flex-shrink-0">
          <button onClick={goPrevLesson}
            disabled={lessonIdx <= 0}
            className="px-2 py-2 text-xs text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-default"
            title="上一课">‹</button>
          {activeCourse.lessons.map(lesson => {
            const isActive = lesson.id === activeCourse.activeLessonId;
            return (
              <div key={lesson.id}
                className={`flex items-center gap-1 px-4 py-2 rounded-t cursor-pointer text-sm whitespace-nowrap border border-b-0 transition-colors
                  ${isActive ? "bg-[#4A90D9] text-white border-[#4A90D9]" : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200"}`}
                onClick={() => switchLesson(lesson.id)}>
                <span className="font-medium">{lesson.name}</span>
                {activeCourse.lessons.length > 1 && (
                  <span onClick={e => { e.stopPropagation(); closeLesson(lesson.id); }}
                    className="ml-1 text-xs opacity-60 hover:opacity-100 cursor-pointer" title="关闭">×</span>
                )}
              </div>
            );
          })}
          <button onClick={() => setShowAddLesson(true)}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-dashed border-gray-300 rounded-t mb-px">+ 添加课时</button>
          <button onClick={goNextLesson}
            disabled={lessonIdx >= activeCourse.lessons.length - 1}
            className="px-2 py-2 text-xs text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-default"
            title="下一课">›</button>
        </div>

        {/* 主内容 */}
        {currentLesson && (
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {/* 内容概要 */}
            <div className="bg-white rounded shadow-sm border border-gray-200 p-4 mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <span>📋</span>
                <span>{currentLesson.name} - 阶段教学内容概要</span>
              </h3>
              <textarea value={currentLesson.contentSummary}
                onChange={e => updateContentSummary(e.target.value)}
                placeholder="输入本阶段的教学内容概要..."
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm resize-y min-h-[80px] focus:outline-none focus:ring-1 focus:ring-green-400"
                rows={3} />
            </div>

            {/* 反馈模块 */}
            {activeCourse.modules.length > 0 && (
              <div className="bg-white rounded shadow-sm border border-gray-200 p-4 mb-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">反馈模块</h3>
                <div className="flex flex-wrap gap-2">
                  {activeCourse.modules.map(mod => (
                    <span key={mod.id} className="px-3 py-1 text-sm bg-green-50 text-green-700 border border-green-200 rounded">
                      {mod.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 学员评价表格 */}
            <div className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-3 py-2.5 text-left font-semibold text-gray-600 w-[100px] sticky left-0 bg-gray-50 z-10">姓名</th>
                      <th className="px-3 py-2.5 text-center font-semibold text-gray-600 w-[150px]">基础能力反馈</th>
                      <th className="px-3 py-2.5 text-center font-semibold text-gray-600 w-[90px]">笔记</th>
                      <th className="px-3 py-2.5 text-center font-semibold text-gray-600 w-[90px]">专注度</th>
                      <th className="px-3 py-2.5 text-center font-semibold text-gray-600 w-[90px]">逻辑力</th>
                      <th className="px-3 py-2.5 text-center font-semibold text-gray-600 w-[90px]">理解力</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-gray-600 min-w-[280px]">上课互动答题情况</th>
                      <th className="px-3 py-2.5 text-center font-semibold text-gray-600 w-[80px]">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeCourse.students.length === 0 ? (
                      <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">暂无学员，请在上方添加学员</td></tr>
                    ) : activeCourse.students.map(student => {
                      const eval_ = currentLesson.evaluations[student.id];
                      if (!eval_) return null;
                      return (
                        <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                          <td className="px-3 py-2 font-medium text-gray-800 sticky left-0 bg-white z-10">{student.name}</td>
                          <td className="px-3 py-2 text-center">
                            <RatingSelect value={eval_.ability} options={RATING_OPTIONS.ability}
                              onChange={v => updateEvaluation(student.id, "ability", v as AbilityRating)} />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <RatingSelect value={eval_.notes} options={RATING_OPTIONS.common}
                              onChange={v => updateEvaluation(student.id, "notes", v as CommonRating)} />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <RatingSelect value={eval_.focus} options={RATING_OPTIONS.common}
                              onChange={v => updateEvaluation(student.id, "focus", v as CommonRating)} />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <RatingSelect value={eval_.logic} options={RATING_OPTIONS.common}
                              onChange={v => updateEvaluation(student.id, "logic", v as CommonRating)} />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <RatingSelect value={eval_.comprehension} options={RATING_OPTIONS.common}
                              onChange={v => updateEvaluation(student.id, "comprehension", v as CommonRating)} />
                          </td>
                          <td className="px-3 py-2">
                            <input value={eval_.interaction}
                              onChange={e => updateEvaluation(student.id, "interaction", e.target.value)}
                              placeholder="输入互动情况..."
                              className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-green-400" />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button onClick={() => copyStudentRow(student.id)}
                              className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600">复制</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 弹窗 */}
        {showStudentManager && (
          <StudentManager students={activeCourse.students} onClose={() => setShowStudentManager(false)}
            onRename={renameStudent} onDelete={deleteStudent} />
        )}
        {showAddLesson && <AddLessonModal onClose={() => setShowAddLesson(false)} onAdd={addLesson} />}
        {showClearConfirm && <ConfirmClearModal onClose={() => setShowClearConfirm(false)} onConfirm={clearAllData} />}
        {showAddCourse && <AddCourseModal onClose={() => setShowAddCourse(false)} onAdd={addCourse} />}
        {showAddModule && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-[400px]">
              <div className="flex items-center justify-between px-5 py-3 border-b">
                <h3 className="font-semibold text-base">新增反馈模块</h3>
                <button onClick={() => setShowAddModule(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
              </div>
              <div className="px-5 py-4">
                <input value={newModuleName} onChange={e => setNewModuleName(e.target.value)}
                  placeholder="模块名称" autoFocus
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-1 focus:ring-green-400"
                  onKeyDown={e => e.key === "Enter" && addModule()} />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowAddModule(false)}
                    className="px-4 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50">取消</button>
                  <button onClick={addModule}
                    className="px-4 py-1.5 text-sm bg-green-500 text-white rounded hover:bg-green-600">添加</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


function ConfirmClearModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void; }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[400px]">
        <div className="px-5 py-4">
          <p className="text-sm text-gray-700 mb-4">确定要清空当前课程的所有数据吗？此操作不可恢复。</p>
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50">取消</button>
            <button onClick={onConfirm} className="px-4 py-1.5 text-sm bg-red-500 text-white rounded hover:bg-red-600">确认清空</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddCourseModal({ onClose, onAdd }: { onClose: () => void; onAdd: (name: string) => void; }) {
  const [name, setName] = useState("");
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[400px]">
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h3 className="font-semibold text-base">新增班课</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="px-5 py-4">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="班课名称，如：经济CIE AS暑期预学班"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-1 focus:ring-green-400"
            autoFocus onKeyDown={e => { if (e.key === "Enter" && name.trim()) onAdd(name.trim()); }} />
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50">取消</button>
            <button onClick={() => name.trim() && onAdd(name.trim())}
              className="px-4 py-1.5 text-sm bg-green-500 text-white rounded hover:bg-green-600">添加</button>
          </div>
        </div>
      </div>
    </div>
  );
}

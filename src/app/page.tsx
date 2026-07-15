'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  AppData,
  StudentEvaluation,
  LessonData,
  RATING_OPTIONS,
  AbilityRating,
  CommonRating,
  createDefaultData,
  createStudentEvaluation,
  generateId,
} from '@/lib/types';

const STORAGE_KEY = 'class-report-data';

function loadData(): AppData {
  if (typeof window === 'undefined') return createDefaultData();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return createDefaultData();
}

function saveData(data: AppData) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// 下拉选择组件
function RatingSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border border-gray-300 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-green-400 min-w-[100px]"
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}

// 学员名单管理弹窗
function StudentManager({
  students,
  onClose,
  onRename,
  onDelete,
}: {
  students: { id: string; name: string }[];
  onClose: () => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[480px] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h3 className="font-semibold text-base">名单管理</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
            &times;
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {students.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">暂无学员</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {students.map((s) => (
                <li key={s.id} className="flex items-center gap-2 py-2">
                  {editingId === s.id ? (
                    <>
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            onRename(s.id, editName.trim());
                            setEditingId(null);
                          }
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                      />
                      <button
                        onClick={() => {
                          onRename(s.id, editName.trim());
                          setEditingId(null);
                        }}
                        className="text-green-600 text-sm hover:underline"
                      >
                        保存
                      </button>
                      <button onClick={() => setEditingId(null)} className="text-gray-400 text-sm hover:underline">
                        取消
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm">{s.name}</span>
                      <button
                        onClick={() => {
                          setEditingId(s.id);
                          setEditName(s.name);
                        }}
                        className="text-blue-500 text-sm hover:underline"
                      >
                        改名
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`确定删除学员「${s.name}」？`)) onDelete(s.id);
                        }}
                        className="text-red-500 text-sm hover:underline"
                      >
                        删除
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// 添加课时弹窗
function AddLessonModal({ onClose, onAdd }: { onClose: () => void; onAdd: (name: string) => void }) {
  const [name, setName] = useState('');
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[400px]">
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h3 className="font-semibold text-base">新增课时</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
            &times;
          </button>
        </div>
        <div className="px-5 py-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="课时名称，如：第三节课"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-1 focus:ring-green-400"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && name.trim()) {
                onAdd(name.trim());
              }
            }}
          />
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50">
              取消
            </button>
            <button
              onClick={() => name.trim() && onAdd(name.trim())}
              className="px-4 py-1.5 text-sm bg-green-500 text-white rounded hover:bg-green-600"
            >
              添加
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 确认清空弹窗
function ConfirmClearModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[400px]">
        <div className="px-5 py-4">
          <p className="text-sm text-gray-700 mb-4">
            ⚠️ 确定要清空所有数据吗？此操作不可恢复。
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50">
              取消
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-1.5 text-sm bg-red-500 text-white rounded hover:bg-red-600"
            >
              确认清空
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ClassReportPage() {
  const [data, setData] = useState<AppData>(() => loadData());
  const [showStudentManager, setShowStudentManager] = useState(false);
  const [showAddLesson, setShowAddLesson] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [showAddModule, setShowAddModule] = useState(false);
  const [newModuleName, setNewModuleName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 持久化
  useEffect(() => {
    saveData(data);
  }, [data]);

  const activeLesson = data.lessons.find((l) => l.id === data.activeLessonId) || data.lessons[0];

  // 确保所有学员在当前课时都有评价记录（使用 useMemo 避免每次渲染重新创建）
  const currentLesson = useMemo(() => {
    if (!activeLesson) return null;
    const evaluations: Record<string, StudentEvaluation> = {};
    for (const student of data.students) {
      evaluations[student.id] = activeLesson.evaluations[student.id] || createStudentEvaluation(student.id);
    }
    return { ...activeLesson, evaluations };
  }, [activeLesson, data.students]);

  // 更新评价
  const updateEvaluation = (studentId: string, field: keyof StudentEvaluation, value: string) => {
    setData((prev) => {
      const lessons = prev.lessons.map((l) => {
        if (l.id !== prev.activeLessonId) return l;
        const evals = { ...l.evaluations };
        const existing = evals[studentId] || createStudentEvaluation(studentId);
        evals[studentId] = { ...existing, [field]: value };
        return { ...l, evaluations: evals };
      });
      return { ...prev, lessons };
    });
  };

  // 添加学员
  const addStudent = () => {
    const name = newStudentName.trim();
    if (!name) return;
    const id = generateId();
    setData((prev) => {
      const students = [...prev.students, { id, name }];
      const lessons = prev.lessons.map((l) => ({
        ...l,
        evaluations: { ...l.evaluations, [id]: createStudentEvaluation(id) },
      }));
      return { ...prev, students, lessons };
    });
    setNewStudentName('');
  };

  // 删除学员
  const deleteStudent = (id: string) => {
    setData((prev) => {
      const students = prev.students.filter((s) => s.id !== id);
      const lessons = prev.lessons.map((l) => {
        const evaluations = { ...l.evaluations };
        delete evaluations[id];
        return { ...l, evaluations };
      });
      return { ...prev, students, lessons };
    });
  };

  // 重命名学员
  const renameStudent = (id: string, name: string) => {
    if (!name.trim()) return;
    setData((prev) => ({
      ...prev,
      students: prev.students.map((s) => (s.id === id ? { ...s, name: name.trim() } : s)),
    }));
  };

  // 切换课时
  const switchLesson = (id: string) => {
    setData((prev) => ({ ...prev, activeLessonId: id }));
  };

  // 关闭课时Tab
  const closeLesson = (id: string) => {
    if (data.lessons.length <= 1) return;
    setData((prev) => {
      const lessons = prev.lessons.filter((l) => l.id !== id);
      const activeLessonId = prev.activeLessonId === id ? lessons[0].id : prev.activeLessonId;
      return { ...prev, lessons, activeLessonId };
    });
  };

  // 添加课时
  const addLesson = (name: string) => {
    const id = generateId();
    setData((prev) => ({
      ...prev,
      lessons: [...prev.lessons, { id, name, contentSummary: '', evaluations: {} }],
      activeLessonId: id,
    }));
    setShowAddLesson(false);
  };

  // 更新课时内容概要
  const updateContentSummary = (value: string) => {
    setData((prev) => ({
      ...prev,
      lessons: prev.lessons.map((l) =>
        l.id === prev.activeLessonId ? { ...l, contentSummary: value } : l
      ),
    }));
  };

  // 更新课程名称
  const updateCourseName = (value: string) => {
    setData((prev) => ({ ...prev, courseName: value }));
  };

  // 复制学员行（复制评价到剪贴板）
  const copyStudentRow = (studentId: string) => {
    if (!currentLesson) return;
    const eval_ = currentLesson.evaluations[studentId];
    const student = data.students.find((s) => s.id === studentId);
    if (!student) return;

    // 构建完整的反馈文本，包含课时概要和所有评价字段
    const lines: string[] = [];
    lines.push(`${data.courseName} - ${currentLesson.name} 学员反馈`);
    lines.push('');

    // 阶段教学内容概要
    if (currentLesson.contentSummary) {
      lines.push('【阶段教学内容概要】');
      lines.push(currentLesson.contentSummary);
      lines.push('');
    }

    // 学员评价
    lines.push(`【${student.name}】`);
    lines.push(`基础能力反馈：${eval_?.ability || '未填写'}`);
    lines.push(`笔记：${eval_?.notes || '未填写'}`);
    lines.push(`专注度：${eval_?.focus || '未填写'}`);
    lines.push(`逻辑力：${eval_?.logic || '未填写'}`);
    lines.push(`理解力：${eval_?.comprehension || '未填写'}`);
    lines.push(`上课互动答题情况：${eval_?.interaction || '暂无'}`);

    const text = lines.join('\n');

    navigator.clipboard.writeText(text).then(() => {
      alert('已复制到剪贴板，可直接粘贴到微信发送');
    }).catch(() => {
      // 降级方案：使用 execCommand
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      alert('已复制到剪贴板，可直接粘贴到微信发送');
    });
  };

  // 导出备份
  const exportData = () => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.courseName}_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 导入数据
  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target?.result as string) as AppData;
        if (imported.courseName && Array.isArray(imported.students) && Array.isArray(imported.lessons)) {
          setData(imported);
          alert('数据导入成功！');
        } else {
          alert('数据格式不正确');
        }
      } catch {
        alert('文件解析失败');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // 清空所有数据
  const clearAllData = () => {
    setData(createDefaultData());
    setShowClearConfirm(false);
  };

  // 添加反馈模块
  const addModule = () => {
    const name = newModuleName.trim();
    if (!name) return;
    setData((prev) => ({
      ...prev,
      modules: [...prev.modules, { id: generateId(), name }],
    }));
    setNewModuleName('');
    setShowAddModule(false);
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      {/* 顶部标题栏 */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3">
        <span className="text-sm text-gray-500 whitespace-nowrap">班课全周期管理 +</span>
        <input
          value={data.courseName}
          onChange={(e) => updateCourseName(e.target.value)}
          className="text-base font-semibold border border-dashed border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:border-blue-400 min-w-[200px] max-w-[400px]"
        />
        <div className="flex-1" />
        <button
          onClick={() => setShowClearConfirm(true)}
          className="px-3 py-1.5 text-sm bg-red-50 text-red-500 border border-red-200 rounded hover:bg-red-100 flex items-center gap-1"
        >
           清空所有数据
        </button>
      </div>

      {/* 工具栏 */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600">学员管理:</span>
          <input
            value={newStudentName}
            onChange={(e) => setNewStudentName(e.target.value)}
            placeholder="学生姓名"
            className="border border-gray-300 rounded px-3 py-1.5 text-sm w-[140px] focus:outline-none focus:ring-1 focus:ring-green-400"
            onKeyDown={(e) => e.key === 'Enter' && addStudent()}
          />
          <button
            onClick={addStudent}
            className="px-3 py-1.5 text-sm bg-green-500 text-white rounded hover:bg-green-600"
          >
            添加学员
          </button>
          <button
            onClick={() => setShowStudentManager(true)}
            className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            名单管理
          </button>
        </div>

        <div className="h-6 w-px bg-gray-300 mx-1" />

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600">模块管理:</span>
          <button
            onClick={() => setShowAddModule(true)}
            className="px-3 py-1.5 text-sm bg-green-500 text-white rounded hover:bg-green-600"
          >
            + 增加反馈模块
          </button>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <button
            onClick={exportData}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
          >
            导出备份
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
          >
            导入数据
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={importData}
            className="hidden"
          />
        </div>
      </div>

      {/* 课时 Tab 栏 */}
      <div className="bg-white border-b border-gray-200 px-6 pt-2 flex items-end gap-1 overflow-x-auto">
        {data.lessons.map((lesson) => {
          const isActive = lesson.id === data.activeLessonId;
          return (
            <div
              key={lesson.id}
              className={`flex items-center gap-1 px-4 py-2 rounded-t cursor-pointer text-sm whitespace-nowrap border border-b-0 transition-colors ${
                isActive
                  ? 'bg-[#4A90D9] text-white border-[#4A90D9]'
                  : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
              }`}
              onClick={() => switchLesson(lesson.id)}
            >
              <span className="text-gray-400 text-xs mr-1 hover:text-white cursor-pointer" title="上一课">
                &lsaquo;
              </span>
              <span className="font-medium">{lesson.name}</span>
              <span className="text-gray-400 text-xs ml-1 hover:text-white cursor-pointer" title="下一课">
                &rsaquo;
              </span>
              {data.lessons.length > 1 && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    closeLesson(lesson.id);
                  }}
                  className="ml-2 text-xs opacity-70 hover:opacity-100"
                  title="关闭"
                >
                  &times;
                </span>
              )}
            </div>
          );
        })}
        <button
          onClick={() => setShowAddLesson(true)}
          className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-dashed border-gray-300 rounded-t mb-px"
        >
          + 添加课时
        </button>
      </div>

      {/* 内容区 */}
      {currentLesson && (
        <div className="px-6 py-4">
          {/* 教学内容概要 */}
          <div className="bg-white rounded shadow-sm border border-gray-200 p-4 mb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <span>📋</span>
              <span>{currentLesson.name} - 阶段教学内容概要</span>
            </h3>
            <textarea
              value={currentLesson.contentSummary}
              onChange={(e) => updateContentSummary(e.target.value)}
              placeholder="输入本阶段的教学内容概要..."
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm resize-y min-h-[80px] focus:outline-none focus:ring-1 focus:ring-green-400"
              rows={3}
            />
          </div>

          {/* 反馈模块区域 */}
          {data.modules.length > 0 && (
            <div className="bg-white rounded shadow-sm border border-gray-200 p-4 mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">反馈模块</h3>
              <div className="flex flex-wrap gap-2">
                {data.modules.map((mod) => (
                  <span
                    key={mod.id}
                    className="px-3 py-1 text-sm bg-green-50 text-green-700 border border-green-200 rounded"
                  >
                    {mod.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 学员评价表 */}
          <div className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-2.5 text-left font-semibold text-gray-600 w-[100px] sticky left-0 bg-gray-50 z-10">
                      姓名
                    </th>
                    <th className="px-3 py-2.5 text-center font-semibold text-gray-600 w-[140px]">
                      基础能力反馈
                    </th>
                    <th className="px-3 py-2.5 text-center font-semibold text-gray-600 w-[100px]">笔记</th>
                    <th className="px-3 py-2.5 text-center font-semibold text-gray-600 w-[100px]">专注度</th>
                    <th className="px-3 py-2.5 text-center font-semibold text-gray-600 w-[100px]">逻辑力</th>
                    <th className="px-3 py-2.5 text-center font-semibold text-gray-600 w-[100px]">理解力</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-gray-600 min-w-[300px]">
                      上课互动答题情况
                    </th>
                    <th className="px-3 py-2.5 text-center font-semibold text-gray-600 w-[80px]">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {data.students.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                        暂无学员，请在上方添加学员
                      </td>
                    </tr>
                  ) : (
                    data.students.map((student) => {
                      const eval_ = currentLesson.evaluations[student.id];
                      if (!eval_) return null;
                      return (
                        <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                          <td className="px-3 py-2 font-medium text-gray-800 sticky left-0 bg-white z-10">
                            {student.name}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <RatingSelect
                              value={eval_.ability}
                              options={RATING_OPTIONS.ability}
                              onChange={(v) => updateEvaluation(student.id, 'ability', v as AbilityRating)}
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <RatingSelect
                              value={eval_.notes}
                              options={RATING_OPTIONS.common}
                              onChange={(v) => updateEvaluation(student.id, 'notes', v as CommonRating)}
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <RatingSelect
                              value={eval_.focus}
                              options={RATING_OPTIONS.common}
                              onChange={(v) => updateEvaluation(student.id, 'focus', v as CommonRating)}
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <RatingSelect
                              value={eval_.logic}
                              options={RATING_OPTIONS.common}
                              onChange={(v) => updateEvaluation(student.id, 'logic', v as CommonRating)}
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <RatingSelect
                              value={eval_.comprehension}
                              options={RATING_OPTIONS.common}
                              onChange={(v) => updateEvaluation(student.id, 'comprehension', v as CommonRating)}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={eval_.interaction}
                              onChange={(e) => updateEvaluation(student.id, 'interaction', e.target.value)}
                              placeholder="输入互动情况..."
                              className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-green-400"
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              onClick={() => copyStudentRow(student.id)}
                              className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                            >
                              复制
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 弹窗 */}
      {showStudentManager && (
        <StudentManager
          students={data.students}
          onClose={() => setShowStudentManager(false)}
          onRename={renameStudent}
          onDelete={deleteStudent}
        />
      )}
      {showAddLesson && <AddLessonModal onClose={() => setShowAddLesson(false)} onAdd={addLesson} />}
      {showClearConfirm && (
        <ConfirmClearModal onClose={() => setShowClearConfirm(false)} onConfirm={clearAllData} />
      )}
      {showAddModule && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-[400px]">
            <div className="flex items-center justify-between px-5 py-3 border-b">
              <h3 className="font-semibold text-base">新增反馈模块</h3>
              <button onClick={() => setShowAddModule(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
                &times;
              </button>
            </div>
            <div className="px-5 py-4">
              <input
                value={newModuleName}
                onChange={(e) => setNewModuleName(e.target.value)}
                placeholder="模块名称"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-1 focus:ring-green-400"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && addModule()}
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowAddModule(false)} className="px-4 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50">
                  取消
                </button>
                <button onClick={addModule} className="px-4 py-1.5 text-sm bg-green-500 text-white rounded hover:bg-green-600">
                  添加
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

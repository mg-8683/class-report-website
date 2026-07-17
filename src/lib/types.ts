// 评分选项定义
export const RATING_OPTIONS = {
  ability: ['优秀-学的从容', '较好-能够吸收', '一般', '偏弱-需要投入', '较差-完全跟不上'],
  common: ['优秀', '良好', '一般', '较弱', '较差'],
} as const;

export type AbilityRating = (typeof RATING_OPTIONS.ability)[number];
export type CommonRating = (typeof RATING_OPTIONS.common)[number];

// 学员评价数据
export interface StudentEvaluation {
  studentId: string;
  ability: AbilityRating;
  notes: CommonRating;
  focus: CommonRating;
  logic: CommonRating;
  comprehension: CommonRating;
  interaction: string;
}

// 课程模块（反馈模块）
export interface FeedbackModule {
  id: string;
  name: string;
}

// 课时数据
export interface LessonData {
  id: string;
  name: string;
  contentSummary: string;
  evaluations: Record<string, StudentEvaluation>; // studentId -> evaluation
}

// 单门课程数据
export interface CourseData {
  id: string;
  name: string;
  students: { id: string; name: string }[];
  modules: FeedbackModule[];
  lessons: LessonData[];
  activeLessonId: string;
}

// 完整应用数据（多课程）
export interface AppData {
  courses: CourseData[];
  activeCourseId: string;
}

export function createStudentEvaluation(studentId: string): StudentEvaluation {
  return {
    studentId,
    ability: '一般',
    notes: '一般',
    focus: '一般',
    logic: '一般',
    comprehension: '一般',
    interaction: '',
  };
}

export function createDefaultCourse(id?: string): CourseData {
  return {
    id: id || generateId(),
    name: '新课程',
    students: [],
    modules: [],
    lessons: [
      {
        id: generateId(),
        name: '首课',
        contentSummary: '',
        evaluations: {},
      },
    ],
    activeLessonId: '',
  };
}

export function createDefaultData(): AppData {
  const course = createDefaultCourse();
  course.activeLessonId = course.lessons[0].id;
  return {
    courses: [course],
    activeCourseId: course.id,
  };
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

// Excel 导出列定义
export const EXCEL_COLUMNS = [
  { key: 'courseName', label: '课程名称' },
  { key: 'lessonName', label: '课时名称' },
  { key: 'studentName', label: '学员姓名' },
  { key: 'ability', label: '基础能力反馈' },
  { key: 'notes', label: '笔记' },
  { key: 'focus', label: '专注度' },
  { key: 'logic', label: '逻辑力' },
  { key: 'comprehension', label: '理解力' },
  { key: 'interaction', label: '上课互动答题情况' },
  { key: 'contentSummary', label: '阶段教学内容概要' },
] as const;

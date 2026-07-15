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

// 完整应用数据
export interface AppData {
  courseName: string;
  students: { id: string; name: string }[];
  modules: FeedbackModule[];
  lessons: LessonData[];
  activeLessonId: string;
}

// 默认数据
export function createDefaultData(): AppData {
  return {
    courseName: '新课程',
    students: [],
    modules: [],
    lessons: [
      {
        id: 'lesson-1',
        name: '首课',
        contentSummary: '',
        evaluations: {},
      },
    ],
    activeLessonId: 'lesson-1',
  };
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

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

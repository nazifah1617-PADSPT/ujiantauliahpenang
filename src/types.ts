export interface Question {
  id: number;
  subject?: string;
  text: string;
  options: string[];
  correctAnswer: number;
}

export interface User {
  name: string;
  icNumber: string;
  email: string;
  district: string;
  date: string;
  questionSet: string;
}

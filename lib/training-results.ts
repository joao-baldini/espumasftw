export type TrainingResult = { wins: number; losses: number };

export const emptyTrainingResult = (): TrainingResult => ({ wins: 0, losses: 0 });

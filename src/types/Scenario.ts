export interface Scenario {
  id: string;
  name: string;
  statusMode: 'individual' | 'shared';
  createdAt: number;
}

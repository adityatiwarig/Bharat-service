import { users } from '@/lib/mock-data'

export const demoCitizen = users.find((user) => user.role === 'citizen')!
export const demoWorker = users.find((user) => user.role === 'worker')!
export const demoAdmin = users.find((user) => user.role === 'admin')!
export const demoLeader = users.find((user) => user.role === 'leader')!

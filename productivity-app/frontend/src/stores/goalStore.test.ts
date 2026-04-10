import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useGoalStore } from './goalStore';
import { api } from '../utils/api';

// Mock the API and other dependencies
vi.mock('../utils/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../lib/persistence', () => ({
  saveToDB: vi.fn(),
  db: {
    table: vi.fn(() => ({
      delete: vi.fn(),
    })),
  },
}));

describe('Goal Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useGoalStore.setState({ goals: [], selectedGoalId: null, loading: false });
  });

  it('should add a goal optimistically and then sync with server', async () => {
    const mockCreatedGoal = {
      id: 'server-id-1',
      title: 'New Goal',
      frameworkId: 'fw-1',
      data: {},
      goalType: 'daily',
      parentId: null,
      isIndependent: true,
      category: 'health',
      progress: 0,
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    (api.post as any).mockResolvedValue(mockCreatedGoal);

    const promise = useGoalStore.getState().add('fw-1', {}, 'daily', null, true, 'health', 'New Goal');

    // Check optimistic update
    const state = useGoalStore.getState();
    expect(state.goals).toHaveLength(1);
    expect(state.goals[0].id).toMatch(/^local-/);
    expect(state.goals[0].title).toBe('New Goal');

    await promise;

    // Check final state after sync
    const finalState = useGoalStore.getState();
    expect(finalState.goals).toHaveLength(1);
    // The store keeps localId for 1s for stability, so we check if the goal object has the realId
    expect((finalState.goals[0] as any).realId).toBe('server-id-1');
  });

  it('should rollback on creation failure', async () => {
    (api.post as any).mockRejectedValue(new Error('API Failure'));

    try {
      await useGoalStore.getState().add('fw-1', {}, 'daily', null, true, 'health', 'New Goal');
    } catch (e) {
      // Expected
    }

    const state = useGoalStore.getState();
    expect(state.goals).toHaveLength(0);
  });
});

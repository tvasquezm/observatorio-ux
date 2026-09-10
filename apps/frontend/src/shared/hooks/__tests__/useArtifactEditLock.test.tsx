import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useArtifactEditLock } from '../useArtifactEditLock';
import * as artifactsApi from '../../api/artifacts.api';

vi.mock('../../api/artifacts.api', async () => {
  const actual = await vi.importActual<typeof import('../../api/artifacts.api')>(
    '../../api/artifacts.api',
  );
  return { ...actual, acquireLock: vi.fn(), releaseLock: vi.fn() };
});

const acquireLockMock = vi.mocked(artifactsApi.acquireLock);
const releaseLockMock = vi.mocked(artifactsApi.releaseLock);

describe('useArtifactEditLock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    acquireLockMock.mockResolvedValue({} as never);
    releaseLockMock.mockResolvedValue({} as never);
  });

  it('libera el lock activo cuando la pantalla se desmonta', async () => {
    const { result, unmount } = renderHook(() => useArtifactEditLock('project-1'));

    await act(async () => {
      await result.current.acquire('artifact-1');
    });
    unmount();

    await waitFor(() => {
      expect(releaseLockMock).toHaveBeenCalledWith('project-1', 'artifact-1');
    });
  });

  it('libera un lock que llega después de haber cancelado la edición', async () => {
    let resolveAcquire!: () => void;
    acquireLockMock.mockReturnValue(
      new Promise((resolve) => {
        resolveAcquire = () => resolve({} as never);
      }),
    );
    const { result } = renderHook(() => useArtifactEditLock('project-1'));

    let acquirePromise!: Promise<boolean>;
    act(() => {
      acquirePromise = result.current.acquire('artifact-2');
    });
    act(() => result.current.release());
    await act(async () => resolveAcquire());
    await acquirePromise;

    expect(releaseLockMock).toHaveBeenCalledWith('project-1', 'artifact-2');
  });
});

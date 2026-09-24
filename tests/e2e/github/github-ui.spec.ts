import { test, expect } from '@playwright/test';
import {
  GitHubConnectButton,
  RepoLinkerModal,
  CodeViewer,
  FileTree,
  CIStatusBadge,
  InlineCommentThread,
} from '../../../apps/web/src/features/knowledge-exchange/components/github';

test.describe('GitHub Knowledge Exchange UI Components', () => {
  test('verifies exports of all GitHub components from barrel index', () => {
    expect(GitHubConnectButton).toBeDefined();
    expect(RepoLinkerModal).toBeDefined();
    expect(CodeViewer).toBeDefined();
    expect(FileTree).toBeDefined();
    expect(CIStatusBadge).toBeDefined();
    expect(InlineCommentThread).toBeDefined();
  });
});

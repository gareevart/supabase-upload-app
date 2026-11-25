/** @jest-environment node */
import {
  createWorkspaceNode, parseWorkspaceDraft, relocateWorkspaceNode, removeWorkspaceNode, type Workspace,
} from '../workspace';

const workspace: Workspace = {
  folders: ['src', 'src/utils', 'data', 'src-other'],
  files: [{ name: 'src/utils/main.js', content: 'console.log(42)' }, { name: 'src-other/README', content: 'text' }],
  entry: 'src/utils/main.js',
};

it('creates arbitrary text files, dotfiles and empty folders without changing the existing files', () => {
  expect(createWorkspaceNode(workspace, 'src/utils', '.env.example', 'file')).toMatchObject({
    path: 'src/utils/.env.example', workspace: { entry: 'src/utils/.env.example' },
  });
  const empty = createWorkspaceNode(workspace, 'data', 'Новые файлы', 'folder');
  expect(empty).toMatchObject({ path: 'data/Новые файлы', workspace: { entry: workspace.entry } });
  if ('workspace' in empty) expect(parseWorkspaceDraft(empty.workspace)).toEqual(empty.workspace);
  expect(createWorkspaceNode(workspace, 'src', 'UTILS', 'file')).toEqual({ error: 'duplicateFilename' });
  expect(createWorkspaceNode(workspace, 'data', 'utils', 'folder')).toMatchObject({ path: 'data/utils' });
});

it('moves a complete subtree, preserving file contents, order, and the open file', () => {
  const moved = relocateWorkspaceNode(workspace, { path: 'src', kind: 'folder' }, 'data', 'Source');
  expect(moved).toEqual({ path: 'data/Source', workspace: {
    folders: ['data/Source', 'data/Source/utils', 'data', 'src-other'],
    files: [{ ...workspace.files[0], name: 'data/Source/utils/main.js' }, workspace.files[1]],
    entry: 'data/Source/utils/main.js',
  } });
});

it('rejects loops, collisions, and missing destinations without changing the workspace', () => {
  const node = { path: 'src', kind: 'folder' } as const;
  expect(relocateWorkspaceNode(workspace, node, 'src/utils', 'src')).toEqual({ error: 'invalidDestination' });
  expect(relocateWorkspaceNode(workspace, node, 'missing', 'src')).toEqual({ error: 'invalidDestination' });
  expect(relocateWorkspaceNode(workspace, node, '', 'DATA')).toEqual({ error: 'duplicateFilename' });
  expect(relocateWorkspaceNode(workspace, node, '', 'SRC')).toMatchObject({ path: 'SRC' });
});

it('removes only the selected subtree and chooses a surviving file', () => {
  expect(removeWorkspaceNode(workspace, { path: 'src', kind: 'folder' })).toEqual({
    folders: ['data', 'src-other'], files: [workspace.files[1]], entry: 'src-other/README',
  });
  expect(parseWorkspaceDraft({ folders: ['empty'], files: [], entry: '' })).toEqual({ folders: ['empty'], files: [], entry: '' });
});

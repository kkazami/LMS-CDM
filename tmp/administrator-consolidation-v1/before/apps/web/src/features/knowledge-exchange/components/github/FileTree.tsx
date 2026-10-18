'use client';

import React, { useState } from 'react';
import { Folder, FolderOpen, FileCode, FileText, ChevronRight, ChevronDown } from 'lucide-react';

export interface TreeItem {
  path?: string;
  mode?: string;
  type?: string; // 'blob' | 'tree'
  sha?: string;
  size?: number;
}

interface TreeNode {
  name: string;
  path: string;
  type: 'blob' | 'tree';
  children: TreeNode[];
}

interface FileTreeProps {
  tree: TreeItem[];
  selectedPath?: string;
  onSelectFile: (path: string) => void;
}

function buildTreeStructure(items: TreeItem[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const item of items) {
    if (!item.path) continue;
    const parts = item.path.split('/');
    let currentLevel = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1 && item.type === 'blob';
      const existing = currentLevel.find((node) => node.name === part);

      if (existing) {
        currentLevel = existing.children;
      } else {
        const newNode: TreeNode = {
          name: part,
          path: parts.slice(0, i + 1).join('/'),
          type: isFile ? 'blob' : 'tree',
          children: [],
        };
        currentLevel.push(newNode);
        currentLevel = newNode.children;
      }
    }
  }

  // Sort: directories first, then files alphabetically
  function sortNodes(nodes: TreeNode[]) {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'tree' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const node of nodes) {
      if (node.children.length > 0) sortNodes(node.children);
    }
  }

  sortNodes(root);
  return root;
}

function TreeNodeItem({
  node,
  selectedPath,
  onSelectFile,
  depth = 0,
}: {
  node: TreeNode;
  selectedPath?: string;
  onSelectFile: (path: string) => void;
  depth?: number;
}) {
  const [isOpen, setIsOpen] = useState(depth < 2);
  const isSelected = selectedPath === node.path;

  if (node.type === 'tree') {
    return (
      <div>
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded cursor-pointer select-none"
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
        >
          {isOpen ? (
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          )}
          {isOpen ? (
            <FolderOpen className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          ) : (
            <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          )}
          <span className="truncate">{node.name}</span>
        </div>
        {isOpen && (
          <div>
            {node.children.map((child) => (
              <TreeNodeItem
                key={child.path}
                node={child}
                selectedPath={selectedPath}
                onSelectFile={onSelectFile}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={() => onSelectFile(node.path)}
      className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded cursor-pointer select-none transition-colors ${
        isSelected
          ? 'bg-orange-100 text-orange-900 font-medium dark:bg-orange-950/40 dark:text-orange-300'
          : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
      }`}
      style={{ paddingLeft: `${depth * 14 + 22}px` }}
    >
      <FileCode className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
      <span className="truncate">{node.name}</span>
    </div>
  );
}

export function FileTree({ tree, selectedPath, onSelectFile }: FileTreeProps) {
  const treeStructure = React.useMemo(() => buildTreeStructure(tree), [tree]);

  if (tree.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-neutral-400">
        No files found in repository tree.
      </div>
    );
  }

  return (
    <div className="py-2 overflow-y-auto max-h-96 border-r border-neutral-200 dark:border-neutral-800">
      {treeStructure.map((node) => (
        <TreeNodeItem
          key={node.path}
          node={node}
          selectedPath={selectedPath}
          onSelectFile={onSelectFile}
        />
      ))}
    </div>
  );
}

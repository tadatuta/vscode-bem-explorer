'use strict';

import * as vscode from 'vscode';
import { TreeExplorerNodeProvider } from 'vscode';

import * as fs from 'fs';
import * as path from 'path';
import * as walk from '@bem/walk';
import * as bemConfig from 'bem-config';

export function activate(context: vscode.ExtensionContext) {
	const rootPath = vscode.workspace.rootPath;

	const config = bemConfig({ cwd: rootPath });
	const bemExplorerConfig = config.moduleSync('vscode-bem-explorer') || {};

	// The `providerId` here must be identical to `contributes.explorer.treeExplorerNodeProviderId` in package.json.
	vscode.window.registerTreeExplorerNodeProvider('bemTree', new BemNodeProvider(rootPath, bemExplorerConfig));

	// This command will be invoked using exactly the node you provided in `resolveChildren`.
	vscode.commands.registerCommand('extension.openFileInEditor', (node: BemNode) => {
		if (node.kind === 'leaf') {
			vscode.commands.executeCommand('vscode.open', vscode.Uri.parse('file://' + node.path));
		}
	});
}

class BemNodeProvider implements TreeExplorerNodeProvider<BemNode> {
	constructor(private workspaceRoot: string, private config) {
	}

	getLevels(): string[] {
		const levels = typeof this.config.getLevels === 'function' ? this.config.getLevels() : [];

		if (typeof this.config.filterLevels === 'function') return levels.filter(this.config.filterLevels);

		return levels;
	}

	getLevelCaption(levelFullPath: string): string {
		if (typeof this.config.getLevelCaption === 'function') return this.config.getLevelCaption(levelFullPath);

		return levelFullPath
			.replace('.blocks', '')
			.replace('node_modules', '');
	}

	getEntityCaption(cell): string {
		if (typeof this.config.getEntityCaption === 'function') return this.config.getEntityCaption(cell);
		return cell.entity.toString().replace(cell.entity.block, '');
	}

	getCaption(cell, levelFullPath: string): string {
		if (typeof this.config.getCaption === 'function') return this.config.getCaption(cell, levelFullPath);
		return this.getEntityCaption(cell) + '@' + this.getLevelCaption(levelFullPath) + '.' + cell.tech;
	}

	/**
	 * As root node is invisible, its label doesn't matter.
	 */
	getLabel(node: BemNode): string {
		return node.kind === 'root' ? '' : node.name;
	}

	/**
	 * Leaf is unexpandable.
	 */
	getHasChildren(node: BemNode): boolean {
		return node.kind !== 'leaf';
	}

	/**
	 * Invoke `extension.openFileInEditor` command when a Leaf node is clicked.
	 */
	getClickCommand(node: BemNode): string {
		return node.kind === 'leaf' ? 'extension.openFileInEditor' : null;
	}

	provideRootNode(): BemNode {
		return new Root();
	}

	resolveChildren(node: BemNode): Thenable<BemNode[]> {
		if (!this.workspaceRoot) {
			vscode.window.showInformationMessage('No BEM file structure in empty workspace');
			return Promise.resolve([]);
		}

		return new Promise((resolve, reject) => {
			switch (node.kind) {
				case 'root':
					this.getEntities(this.getLevels()).then(blocks => {
						let blockNames = Object.keys(blocks).sort();

						if (typeof this.config.filterEntities === 'function') {
							blockNames = blockNames.filter(this.config.filterEntities);
						}

						resolve(blockNames.map(blockName => new Node(blockName)));
					});
					break;

				case 'node':
					this.getEntities(this.getLevels()).then(blocks => {
						let entities = blocks[node.name];

						if (typeof this.config.filterEntities === 'function') {
							entities = entities.filter(this.config.filterEntities);
						}

						resolve(
							entities.map(file => new Leaf(file.name, file.path))
						);
					});
					break;
				case 'leaf':
					resolve([]);
			}
		});
	}

	private _entities: Thenable<string[]>

	private getEntities(levels: string[]): Thenable<string[]> {
		if (this._entities) return this._entities;

		const absLevels = levels
			.map(lvl => path.join(this.workspaceRoot, lvl))
			.filter(this.pathExists);

		if (!absLevels.length) return Promise.resolve([]);

		this._entities = new Promise((resolve, reject) => {
			const blocks = {};

			walk(absLevels)
				.on('data', file => {
					const cell = file.cell;
					const block = cell.entity.block;

					blocks[block] || (blocks[block] = []);

					const levelFullPath = path.relative(this.workspaceRoot, cell.layer);
					const caption = this.getCaption(cell, levelFullPath);

					blocks[block].push({
						name: caption,
						path: file.path,
						cell
					});
				})
				.on('error', reject)
				.on('end', () => resolve(blocks));
		});

		return this._entities;
	}

	private pathExists(p: string): boolean {
		try {
			fs.accessSync(p);
		} catch (err) {
			return false;
		}

		return true;
	}
}

type BemNode = Root // Root node
	| Node // A dependency installed to `node_modules`
	| Leaf // A dependency not present in `node_modules`
	;

class Root {
	kind: 'root' = 'root';
}

class Node {
	kind: 'node' = 'node';

	constructor(
		public name: string
	) {
	}
}

class Leaf {
	kind: 'leaf' = 'leaf'

	constructor(
		public name: string,
		public path: string
	) {
	}
}

import * as vscode from 'vscode';
import { begin_timer, end_timer } from './timer';
import { reg_status_bar } from './statusbar';

export function activate(context: vscode.ExtensionContext) {
	console.log('Start activate Project Timer extension...');
	// TODO: add commands:
	// - open statistics
	// - export statistics.json
	// - import statistics.json
	// TODO: add settings:
	// - sync statistics
	// - use workspace name / workspace folder / git repos as project
	begin_timer(context);
	reg_status_bar(context);
	console.log('Project Timer extension activated.');
}

export function deactivate() {
	end_timer();
}

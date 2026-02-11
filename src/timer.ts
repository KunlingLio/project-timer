import { time } from 'console';
import * as vscode from 'vscode';

interface ProjectTimeInfo {
    readonly project_name: string, // TODO: support other way to identify projects
    total_seconds: number
}

function get_project_name(): string | undefined {
    const workspace_folders = vscode.workspace.workspaceFolders;
    if (workspace_folders === undefined || workspace_folders.length === 0) {
        console.log('No workspace folders found.');
        return;
    }
    if (workspace_folders.length > 1) {
        // multi root workspace
        return vscode.workspace.name; // use workspace name as project name 
    }
    return workspace_folders?.[0].name;
}

/// Init timer storage and register callback
export function begin_timer(context: vscode.ExtensionContext) {
    const project_name = get_project_name();
    if (project_name === undefined) {
        console.log('No project name found.');
        return;
    }
    const interval = setInterval(() => {
        const time_info = context.globalState.get<ProjectTimeInfo>(`timerStorage-${project_name}`) || {
            project_name: project_name,
            total_seconds: 0
        };
        time_info.total_seconds += 1;
        context.globalState.update(`timerStorage-${project_name}`, time_info);
    }, 1000); // 1 seconds
    // TODO: improve preformance
    // TODO: avoid accumulative error from setinterval
    context.subscriptions.push({dispose: () => clearInterval(interval) });
}

/// Should only be called when exit
export function end_timer() {}

/// Get seconds for current project
export function get_seconds(context: vscode.ExtensionContext) {
    const project_name = get_project_name(); 
    const time_info = context.globalState.get<ProjectTimeInfo>(`timerStorage-${project_name}`);
    if (!time_info) {
        return 0;
    } else {
        return time_info.total_seconds;
    }
}
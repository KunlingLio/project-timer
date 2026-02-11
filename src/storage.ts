import * as vscode from 'vscode';
import { get_context } from './context';

interface ProjectTimeInfo {
    readonly project_name: string, // TODO: support other way to identify projects
    total_seconds: number
}

export function get_project_time_info(project_name: string): ProjectTimeInfo {
    const context = get_context();
    const time_info = context.globalState.get<ProjectTimeInfo>(`timerStorage-${project_name}`) || {
        project_name: project_name,
        total_seconds: 0
    };
    return time_info;
}

export function set_project_time_info(project_name: string, time_info: ProjectTimeInfo) {
    const context = get_context();
    context.globalState.update(`timerStorage-${project_name}`, time_info);
}

export function delete_all_time_info() {
    const context = get_context();
    context.globalState.keys().forEach(key => {
        context.globalState.update(key, undefined);
    });
}
import * as vscode from 'vscode';
import { get_project_name } from './utils';

export function get_menu(seconds: number) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    const formatted_time = `${hrs.toFixed(0)}h ${mins.toFixed(0)}m`;

    const tooltip = new vscode.MarkdownString();
    tooltip.appendMarkdown(`### Project Timer\n\n`);
    tooltip.appendMarkdown(`--- \n\n`);
    tooltip.appendMarkdown(`**Current Project**: \`${get_project_name()}\`  \n`);
    tooltip.appendMarkdown(`**Total Time**: \`${formatted_time}\`  \n\n`);
    tooltip.appendMarkdown(`Click to view detailed statistics`);
    return tooltip;
}
import { getFolderName, getFolderParentPath, todayDate, strictEq } from "../../../utils";

/**
 * Metadata for project matching.
 */
export interface MatchInfo {
    // Priority from high to low
    gitRemotUrl?: string;
    parentPath?: string; // allow undefined only for V1-migrated data
    folderName: string;
}

function matchInfoEq(left: MatchInfo, right: MatchInfo): boolean {
    if (left.gitRemotUrl !== right.gitRemotUrl) {
        return false;
    }
    if (left.parentPath !== right.parentPath) {
        return false;
    }
    if (left.folderName !== right.folderName) {
        return false;
    }
    return true;
}

/**
 * Check if data matched the current info in a strict way.
 * If matched, check if there are difference that need to be update.
 * Call it when you want to check if current project 'is' the old project from same device (local).
 * @returns [isMatch, needUpdate]
 */
export function matchLocal(old: MatchInfo, current: MatchInfo): [boolean, boolean] {
    // Case 1: V1 compatible
    if (old.parentPath === undefined && old.gitRemotUrl === undefined) {
        // old is V1 migrated data
        if (old.folderName === current.folderName) {
            return [true, true];
        }
        // cannot confirm if they are the same project
        return [false, false];
    }
    // Case 2: equals
    if (matchInfoEq(old, current)) {
        return [true, false];
    }
    // Case 3: only add stronger info
    if (!old.gitRemotUrl && current.gitRemotUrl &&
        strictEq(old.parentPath, current.parentPath) &&
        old.folderName === current.folderName
    ) {
        return [true, true];
    }
    // Case 4: rename or move but keep the git remote url
    if (strictEq(old.gitRemotUrl, current.gitRemotUrl)) {
        return [true, true];
    }
    // Others: keep the old data
    return [false, false];
}

/**
 * Check if data matched the current info in a loose way.
 * Call it when you want to check if data from other device (remote) can be counted as the same project.
 */
export function matchRemote(remote: MatchInfo, current: MatchInfo): boolean {
    if (strictEq(remote.gitRemotUrl, current.gitRemotUrl)) {
        return true;
    }
    // Avoid compare absolute path throught different devices
    if (remote.folderName === current.folderName) {
        return true;
    }
    return false;
}

export function getCurrentMatchInfo(): MatchInfo {
    const folderName = getFolderName();
    if (!folderName) {
        throw new Error("No folder name found.");
    }
    const parentPath = getFolderParentPath();
    if (!parentPath) {
        throw new Error("No folder parent path found.");
    }
    // TODO: support full match info
    return {
        folderName: folderName,
        parentPath: parentPath,
        gitRemotUrl: undefined
    };
}

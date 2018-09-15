'use strict';
import * as vscode from 'vscode';

import * as nls from 'vscode-nls';
import nlsConfig from '../nls';
const localize = nls.config(nlsConfig)();

export interface IDebugCommands {
  serverAddress: string;
  serverPort: string;
  project: string;
  workspace: vscode.WorkspaceFolder;
}

export async function startDebugging(commands: IDebugCommands): Promise<void> {

  const config: vscode.DebugConfiguration = {
    hostName: commands.serverAddress,
    name: 'WPILib Java Debug',
    port: commands.serverPort,
    projectName: commands.project,
    request: 'attach',
    type: 'java',
  };

  await vscode.debug.startDebugging(commands.workspace, config);
}

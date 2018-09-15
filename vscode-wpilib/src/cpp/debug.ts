'use strict';
import * as vscode from 'vscode';

import * as nls from 'vscode-nls';
import nlsConfig from '../nls';
const localize = nls.config(nlsConfig)();

export interface IDebugCommands {
  target: string;
  sysroot: string;
  executablePath: string;
  workspace: vscode.WorkspaceFolder;
  soLibPath: string;
  srcPaths: Set<string>;
  gdbPath: string;
}

export async function startDebugging(commands: IDebugCommands): Promise<void> {
  const config: vscode.DebugConfiguration = {
    MIMode: 'gdb',
    additionalSOLibSearchPath: commands.soLibPath,
    cwd: commands.workspace.uri.fsPath,
    externalConsole: true,
    miDebuggerPath: commands.gdbPath,
    miDebuggerServerAddress: commands.target,
    name: 'wpilibCppDebug',
    program: commands.executablePath,
    request: 'launch',
    setupCommands: [
      {
        description: 'Enable pretty-printing for gdb',
        ignoreFailures: true,
        text: 'enable-pretty-printing',
      },
      {
        text: 'set sysroot ' + commands.sysroot,
      },
    ],
    type: 'cppdbg',
  };

  for (const a of commands.srcPaths) {
    /* tslint:disable-next-line:no-unsafe-any */
    config.setupCommands.push({
      text: 'dir ' + a,
    });
  }

  await vscode.debug.startDebugging(commands.workspace, config);
}

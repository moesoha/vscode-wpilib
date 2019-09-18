'use strict';

// // These must be in the files to translate
// // This cannot be placed in a library.
// import * as nls from 'vscode-nls';
// const config = JSON.parse(process.env.VSCODE_NLS_CONFIG as string);
// const localize = nls.config(config as nls.Options)();

import * as path from 'path';
import * as vscode from 'vscode';
import { IExternalAPI } from 'vscode-wpilibapi';
import { BuildTestAPI } from './buildtestapi';
import { BuiltinTools } from './builtintools';
import { CommandAPI } from './commandapi';
import { activateCpp } from './cpp/cpp';
import { ApiProvider } from './cppprovider/apiprovider';
import { DeployDebugAPI } from './deploydebugapi';
import { ExecuteAPI } from './executor';
import { activateJava } from './java/java';
import { findJdkPath } from './jdkdetector';
import { localize as i18n } from './locale';
import { closeLogger, logger, setLoggerDirectory } from './logger';
import { PersistentFolderState } from './persistentState';
import { Preferences } from './preferences';
import { PreferencesAPI } from './preferencesapi';
import { ProjectInfoGatherer } from './projectinfo';
import { ExampleTemplateAPI } from './shared/exampletemplateapi';
import { UtilitiesAPI } from './shared/utilitiesapi';
import { addVendorExamples } from './shared/vendorexamples';
import { ToolAPI } from './toolapi';
import { existsAsync, mkdirpAsync, setExtensionContext, setJavaHome } from './utilities';
import { fireVendorDepsChanged, VendorLibraries } from './vendorlibraries';
import { createVsCommands } from './vscommands';
import { AlphaError } from './webviews/alphaerror';
import { EclipseImport } from './webviews/eclipseimport';
import { Help } from './webviews/help';
import { ProjectCreator } from './webviews/projectcreator';
import { WPILibUpdates } from './wpilibupdates';

i18n('ui', '233', 666);

// External API class to implement the IExternalAPI interface
class ExternalAPI implements IExternalAPI {
  // Create method is used because constructors cannot be async.
  public static async Create(resourceFolder: string): Promise<ExternalAPI> {
    const preferencesApi = await PreferencesAPI.Create();
    const deployDebugApi = await DeployDebugAPI.Create(resourceFolder, preferencesApi);
    const buildTestApi = new BuildTestAPI(preferencesApi);
    const externalApi = new ExternalAPI(preferencesApi, deployDebugApi, buildTestApi);
    return externalApi;
  }

  private readonly toolApi: ToolAPI;
  private readonly deployDebugApi: DeployDebugAPI;
  private readonly buildTestApi: BuildTestAPI;
  private readonly preferencesApi: PreferencesAPI;
  private readonly exampleTemplateApi: ExampleTemplateAPI;
  private readonly commandApi: CommandAPI;
  private readonly executeApi: ExecuteAPI;
  private readonly utilitiesApi: UtilitiesAPI;

  private constructor(preferencesApi: PreferencesAPI, deployDebugApi: DeployDebugAPI, buildTestApi: BuildTestAPI) {
    this.exampleTemplateApi = new ExampleTemplateAPI();
    this.commandApi = new CommandAPI();
    this.executeApi = new ExecuteAPI();
    this.preferencesApi = preferencesApi;
    this.deployDebugApi = deployDebugApi;
    this.buildTestApi = buildTestApi;
    this.utilitiesApi = new UtilitiesAPI();
    this.toolApi = new ToolAPI(this);
  }

  public getToolAPI(): ToolAPI {
    return this.toolApi;
  }
  public getExampleTemplateAPI(): ExampleTemplateAPI {
    return this.exampleTemplateApi;
  }
  public getDeployDebugAPI(): DeployDebugAPI {
    return this.deployDebugApi;
  }
  public getPreferencesAPI(): PreferencesAPI {
    return this.preferencesApi;
  }
  public getCommandAPI(): CommandAPI {
    return this.commandApi;
  }
  public getBuildTestAPI(): BuildTestAPI {
    return this.buildTestApi;
  }
  public getExecuteAPI(): ExecuteAPI {
    return this.executeApi;
  }
  public getUtilitiesAPI(): UtilitiesAPI {
    return this.utilitiesApi;
  }
}

let updatePromptCount = 0;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
  setExtensionContext(context);

  // Resources folder is used for gradle template along with HTML files
  const extensionResourceLocation = path.join(context.extensionPath, 'resources');

  if (vscode.extensions.getExtension('wpifirst.vscode-wpilib') !== undefined) {
    const alphaError = await AlphaError.Create(extensionResourceLocation);
    alphaError.displayPage();
    context.subscriptions.push(alphaError);
    return;
  }

  // The external API can be used by other extensions that want to use our
  // functionality. Its definition is provided in shared/externalapi.ts.
  // That file can be copied to another project.
  const externalApi = await ExternalAPI.Create(extensionResourceLocation);

  const frcHomeDir = externalApi.getUtilitiesAPI().getWPILibHomeDir();

  const logPath = path.join(frcHomeDir, 'logs');
  try {
    await mkdirpAsync(logPath);
    setLoggerDirectory(logPath);
  } catch (err) {
    logger.error('Error creating logger', err);
  }

  const jdkLoc = await findJdkPath(externalApi);

  if (jdkLoc !== undefined) {
    setJavaHome(jdkLoc);
  } else {
    // vscode.window.showErrorMessage(localize('extension.noJava',
    //                                         'Java 11 required, but not found. Might have compilation errors'));
    vscode.window.showErrorMessage('Java 11 required, but not found. Might have compilation errors');
  }

  // Activate the C++ parts of the extension
  await activateCpp(context, externalApi);
  // Active the java parts of the extension
  await activateJava(context, externalApi);

  let creationError: boolean = false;

  let help: Help | undefined;

  try {
    // Create the help window provider
    help = await Help.Create(externalApi.getPreferencesAPI(), extensionResourceLocation);
    context.subscriptions.push(help);
  } catch (err) {
    logger.error('error creating help window provider', err);
    creationError = true;
  }

  try {
    // Create the eclipse import provider
    const eclipseimport = await EclipseImport.Create(extensionResourceLocation);
    context.subscriptions.push(eclipseimport);
  } catch (err) {
    logger.error('error creating eclipse importer', err);
    creationError = true;
  }

  try {
    // Create the new project creator provider
    const projectcreator = await ProjectCreator.Create(externalApi.getExampleTemplateAPI(), extensionResourceLocation);
    context.subscriptions.push(projectcreator);
  } catch (err) {
    logger.error('error creating project creator', err);
    creationError = true;
  }

  try {
    // Add built in tools
    context.subscriptions.push(await BuiltinTools.Create(externalApi));
  } catch (err) {
    logger.error('error creating built in tool handler', err);
    creationError = true;
  }

  let vendorLibs: VendorLibraries | undefined;

  try {
    vendorLibs = new VendorLibraries(externalApi);
    context.subscriptions.push(vendorLibs);
    await addVendorExamples(extensionResourceLocation, externalApi.getExampleTemplateAPI(), externalApi.getUtilitiesAPI(), vendorLibs);
  } catch (err) {
    logger.error('error creating vendor lib utilities', err);
    creationError = true;
  }

  let wpilibUpdate: WPILibUpdates | undefined;

  try {
    wpilibUpdate = new WPILibUpdates(externalApi);
    context.subscriptions.push(wpilibUpdate);
  } catch (err) {
    logger.error('error creating wpilib updater', err);
    creationError = true;
  }

  let projectInfo: ProjectInfoGatherer | undefined;

  try {
    if (wpilibUpdate !== undefined && vendorLibs !== undefined) {
      projectInfo = new ProjectInfoGatherer(vendorLibs, wpilibUpdate, externalApi);
      context.subscriptions.push(projectInfo);
    }
  } catch (err) {
    logger.error('error creating project info gatherer', err);
    creationError = true;
  }

  // Create all of our commands that the extension runs
  createVsCommands(context, externalApi);

  // Detect if we are a new WPILib project, and if so display the WPILib help window.
  // Also check for local GradleRIO update
  const wp = vscode.workspace.workspaceFolders;
  if (wp) {
    for (const w of wp) {
      const prefs = externalApi.getPreferencesAPI().getPreferences(w);
      if (prefs.getIsWPILibProject()) {
        const vendorDepsPattern = new vscode.RelativePattern(path.join(w.uri.fsPath, 'vendordeps'), '**/*.json');
        const vendorDepsWatcher = vscode.workspace.createFileSystemWatcher(vendorDepsPattern);
        context.subscriptions.push(vendorDepsWatcher);
        const localW = w;

        const fireEvent = () => {
          fireVendorDepsChanged(localW);
        };

        vendorDepsWatcher.onDidChange(fireEvent, null, context.subscriptions);

        vendorDepsWatcher.onDidCreate(fireEvent, null, context.subscriptions);

        vendorDepsWatcher.onDidDelete(fireEvent, null, context.subscriptions);

        if (prefs.getProjectYear() !== '2019') {
          vscode.window
            .showInformationMessage('This project is not compatible with this version of the extension. Please create a new project.');
          continue;
        }

        if (prefs.getCurrentLanguage() === 'cpp' || prefs.getCurrentLanguage() === 'java') {
          let didUpdate: boolean = false;
          if (wpilibUpdate) {
            didUpdate = await wpilibUpdate.checkForInitialUpdate(w);
          }

          let runBuild: boolean = !await existsAsync(path.join(w.uri.fsPath, 'build'));

          if (didUpdate) {
            const result = await vscode.window.showInformationMessage('It is recommended to run a "Build" after a WPILib update to ensure ' +
              'dependencies are installed correctly. Would you like to do this now?', {
                modal: true,
              }, 'Yes', 'No');
            if (result !== 'Yes') {
              runBuild = false;
            }
          }

          if (runBuild) {
            updatePromptCount++;
            externalApi.getBuildTestAPI().buildCode(w, undefined).then(() => {
              updatePromptCount--;
              if (updatePromptCount === 0) {
                ApiProvider.promptForUpdates = true;
              }
            }).catch(() => {
              updatePromptCount--;
              if (updatePromptCount === 0) {
                ApiProvider.promptForUpdates = true;
              }
            });
          }
        }

        const persistentState = new PersistentFolderState('wpilib.newProjectHelp', false, w.uri.fsPath);
        if (persistentState.Value === false) {
          persistentState.Value = true;
          if (help) {
            help.displayHelp();
          }
          break;
        }
      } else {
        const persistentState = new PersistentFolderState('wpilib.invalidFolder', false, w.uri.fsPath);
        if (persistentState.Value === false) {
          // Check if wpilib project might be in a subfolder
          // Only go 1 subfolder deep
          const pattern = new vscode.RelativePattern(w, '*/' + Preferences.wpilibPreferencesFolder + '/' + Preferences.preferenceFileName);

          const wpilibFiles = await vscode.workspace.findFiles(pattern);

          if (wpilibFiles.length === 1) {
            // Only 1 subfolder found, likely it
            const openResult = await vscode.window.showInformationMessage('Incorrect folder opened for WPILib project. ' +
              'The correct folder was found in a subfolder, ' +
              'Would you like to open it? Selecting no will cause many tasks to not work.', {
                modal: true,
              }, 'Yes', 'No', 'No, Don\'t ask again for this folder');
            if (openResult === 'Yes') {
              const wpRoot = vscode.Uri.file(path.dirname(path.dirname(wpilibFiles[0].fsPath)));
              await vscode.commands.executeCommand('vscode.openFolder', wpRoot, false);
            } else if (openResult === 'No, Don\'t ask again for this folder') {
              persistentState.Value = true;
            }
          } else if (wpilibFiles.length > 1) {
            // Multiple subfolders found
            const openResult = await vscode.window.showInformationMessage('Incorrect folder opened for WPILib project. ' +
              'Multiple possible subfolders found, ' +
              'Would you like to open one? Selecting no will cause many tasks to not work.', {
                modal: true,
              }, 'Yes', 'No', 'No, Don\'t ask again for this folder');
            if (openResult === 'Yes') {
              const list = wpilibFiles.map((value) => {
                const fullRoot = path.dirname(path.dirname(value.fsPath));
                const baseFolder = path.basename(fullRoot);
                return {
                  fullFolder: vscode.Uri.file(fullRoot),
                  label: baseFolder,
                };
              });
              const picked = await vscode.window.showQuickPick(list, {
                canPickMany: false,
              });
              if (picked !== undefined) {
                await vscode.commands.executeCommand('vscode.openFolder', picked.fullFolder, false);
              }
            } else if (openResult === 'No, Don\'t ask again for this folder') {
              persistentState.Value = true;
            }
          }
        }
      }
    }
  }

  if (creationError) {
    vscode.window.showErrorMessage('A portion of WPILib failed to initialize. See log for details');
  }

  // Log our extension is active
  logger.log('Congratulations, your extension "vscode-wpilib" is now active!');

  if (updatePromptCount === 0) {
    ApiProvider.promptForUpdates = true;
  }

  return externalApi;
}

// this method is called when your extension is deactivated
export function deactivate() {
  closeLogger();
}

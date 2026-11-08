const fs = require("fs");
const path = require("path");
const vscode = require("vscode");

const projectPage = "https://github.com/goloveshin/galimatron";

function useGal(document) {
  if (document.uri.scheme !== "file") {
    return;
  }
  if (!document.fileName.toLowerCase().endsWith(".gal")) {
    return;
  }
  if (document.languageId === "gal") {
    return;
  }
  vscode.languages.setTextDocumentLanguage(document, "gal");
}

function isFile(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function executableFileName() {
  return process.platform === "win32" ? "galimatron.exe" : "galimatron";
}

function installDirectories() {
  const directories = (process.env.PATH || "").split(path.delimiter).filter(dir => dir !== "");
  if (process.platform === "win32") {
    if (process.env.ProgramFiles) {
      directories.push(path.join(process.env.ProgramFiles, "Galimatron", "bin"));
    }
    const programFilesX86 = process.env["ProgramFiles(x86)"];
    if (programFilesX86) {
      directories.push(path.join(programFilesX86, "Galimatron", "bin"));
    }
    return directories;
  }
  directories.push("/usr/bin", "/usr/local/bin");
  return directories;
}

function findInstalledGalimatron() {
  const name = executableFileName();
  for (const dir of installDirectories()) {
    const candidate = path.join(dir, name);
    if (isFile(candidate)) {
      return candidate;
    }
  }
}

async function locateGalimatron(context) {
  const config = vscode.workspace.getConfiguration("galimatron");
  const current = config.get("executable");
  if (typeof current === "string" && current !== "" && isFile(current)) {
    return;
  }

  const found = findInstalledGalimatron();
  if (found) {
    await config.update("executable", found, vscode.ConfigurationTarget.Global);
    return;
  }

  if (context.globalState.get("galimatron.installPrompted")) {
    return;
  }
  await context.globalState.update("galimatron.installPrompted", true);
  const answer = await vscode.window.showInformationMessage(
    "Galimatron not found. Would you like to install it? Restart Visual Studio Code afterward so the executable can be found.",
    "Yes"
  );
  if (answer === "Yes") {
    await vscode.env.openExternal(vscode.Uri.parse(projectPage));
  }
}

async function galConfigFromActiveEditor() {
  const document = vscode.window.activeTextEditor?.document;
  if (!document || document.uri.scheme !== "file") {
    vscode.window.showErrorMessage("Open gal.cfg, then run Galimatron: execute.");
    return;
  }
  if (path.basename(document.fileName).toLowerCase() !== "gal.cfg") {
    vscode.window.showErrorMessage("Galimatron: execute runs the open gal.cfg.");
    return;
  }
  if (document.isDirty) {
    const saved = await document.save();
    if (!saved) {
      vscode.window.showErrorMessage("Save gal.cfg before Galimatron runs.");
      return;
    }
  }
  return document.fileName;
}

async function executablePath(galConfig) {
  const config = vscode.workspace.getConfiguration("galimatron", vscode.Uri.file(galConfig));
  const current = config.get("executable");
  if (typeof current === "string" && current !== "" && isFile(current)) {
    return current;
  }

  const options = {
    canSelectFiles: true,
    canSelectMany: false,
    title: "Galimatron executable"
  };
  if (process.platform === "win32") {
    options.filters = {
      Executable: ["exe"],
      "All files": ["*"]
    };
  }
  const picked = await vscode.window.showOpenDialog(options);
  if (!picked || picked.length === 0) {
    return;
  }

  const chosen = picked[0].fsPath;
  await config.update("executable", chosen, vscode.ConfigurationTarget.Global);
  return chosen;
}

async function executeGalimatron() {
  const galConfig = await galConfigFromActiveEditor();
  if (!galConfig) {
    return;
  }

  const logConfig = path.join(path.dirname(galConfig), "log.cfg");
  if (!isFile(logConfig)) {
    vscode.window.showErrorMessage("log.cfg is missing next to gal.cfg: " + logConfig);
    return;
  }

  const executable = await executablePath(galConfig);
  if (!executable) {
    return;
  }

  const scope = vscode.workspace.workspaceFolders
    ? vscode.TaskScope.Workspace
    : vscode.TaskScope.Global;
  const task = new vscode.Task(
    { type: "galimatron", task: "execute" },
    scope,
    "execute",
    "Galimatron",
    new vscode.ProcessExecution(executable, [
      "--gal-config-file",
      galConfig,
      "--log-config-file",
      logConfig
    ], {
      cwd: path.dirname(galConfig)
    })
  );
  task.presentationOptions = {
    reveal: vscode.TaskRevealKind.Always,
    panel: vscode.TaskPanelKind.Dedicated,
    clear: true
  };
  await vscode.tasks.executeTask(task);
}

function activate(context) {
  vscode.workspace.textDocuments.forEach(useGal);
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(useGal),
    vscode.commands.registerCommand("galimatron.execute", executeGalimatron)
  );
  locateGalimatron(context);
}

function deactivate() {}

module.exports = { activate, deactivate };

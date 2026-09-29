import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { AssistantName, Theme } from "@superego/backend";
import { ExecutingBackend } from "@superego/executing-backend";
import { MultiDriverInferenceServiceFactory } from "@superego/multi-driver-inference-service";
import { TscTypescriptCompiler } from "@superego/tsc-typescript-compiler";

export default async function createBackend(
  databaseFile: string,
): Promise<ExecutingBackend> {
  // Load runtime dependencies after checking the configuration and UI build.
  const { QuickjsJavascriptSandbox } =
    await import("@superego/quickjs-javascript-sandbox/nodejs");
  const { SqliteDataRepositoriesManager } =
    await import("@superego/sqlite-data-repositories");
  mkdirSync(dirname(databaseFile), { recursive: true });
  const dataRepositoriesManager = new SqliteDataRepositoriesManager({
    fileName: databaseFile,
    defaultGlobalSettings: {
      appearance: { theme: Theme.Auto },
      inference: {
        providers: [],
        defaultInferenceOptions: {
          completion: null,
          transcription: null,
          fileInspection: null,
        },
      },
      assistants: {
        userInfo: null,
        userPreferences: null,
        developerPrompts: {
          [AssistantName.Factotum]: null,
          [AssistantName.CollectionCreator]: null,
        },
      },
    },
  });
  dataRepositoriesManager.runMigrations();
  return new ExecutingBackend(
    dataRepositoriesManager,
    new QuickjsJavascriptSandbox(),
    new TscTypescriptCompiler(),
    new MultiDriverInferenceServiceFactory(),
  );
}

import type { Backend } from "@superego/backend";
import type { ResultPromise } from "@superego/global-types";
import {
  extractErrorDetails,
  makeSuccessfulResult,
  makeUnsuccessfulResult,
} from "@superego/shared-utils";
import { parse, stringify } from "devalue";

export default class BackendHttpProxyClient implements Backend {
  collectionCategories: Backend["collectionCategories"];
  collections: Backend["collections"];
  documents: Backend["documents"];
  files: Backend["files"];
  assistants: Backend["assistants"];
  inference: Backend["inference"];
  apps: Backend["apps"];
  packs: Backend["packs"];
  boutique: Backend["boutique"];
  backgroundJobs: Backend["backgroundJobs"];
  globalSettings: Backend["globalSettings"];
  database: Backend["database"];

  constructor() {
    this.collectionCategories = {
      create: this.makeHttpCall("collectionCategories.create"),
      update: this.makeHttpCall("collectionCategories.update"),
      delete: this.makeHttpCall("collectionCategories.delete"),
      list: this.makeHttpCall("collectionCategories.list"),
    };

    this.collections = {
      create: this.makeHttpCall("collections.create"),
      createMany: this.makeHttpCall("collections.createMany"),
      updateSettings: this.makeHttpCall("collections.updateSettings"),
      createNewVersion: this.makeHttpCall("collections.createNewVersion"),
      updateLatestVersionSettings: this.makeHttpCall(
        "collections.updateLatestVersionSettings",
      ),
      delete: this.makeHttpCall("collections.delete"),
      list: this.makeHttpCall("collections.list"),
      get: this.makeHttpCall("collections.get"),
      getVersion: this.makeHttpCall("collections.getVersion"),
      getTypescriptSchema: this.makeHttpCall("collections.getTypescriptSchema"),
    };

    this.documents = {
      create: this.makeHttpCall("documents.create"),
      createMany: this.makeHttpCall("documents.createMany"),
      createNewVersion: this.makeHttpCall("documents.createNewVersion"),
      delete: this.makeHttpCall("documents.delete"),
      list: this.makeHttpCall("documents.list"),
      listVersions: this.makeHttpCall("documents.listVersions"),
      get: this.makeHttpCall("documents.get"),
      getVersion: this.makeHttpCall("documents.getVersion"),
      executeTypescriptFunction: this.makeHttpCall(
        "documents.executeTypescriptFunction",
      ),
      search: this.makeHttpCall("documents.search"),
    };

    this.files = {
      getContent: this.makeHttpCall("files.getContent"),
    };

    this.assistants = {
      startConversation: this.makeHttpCall("assistants.startConversation"),
      continueConversation: this.makeHttpCall(
        "assistants.continueConversation",
      ),
      retryLastResponse: this.makeHttpCall("assistants.retryLastResponse"),
      recoverConversation: this.makeHttpCall("assistants.recoverConversation"),
      deleteConversation: this.makeHttpCall("assistants.deleteConversation"),
      getConversation: this.makeHttpCall("assistants.getConversation"),
      getLiveConversation: this.makeHttpCall("assistants.getLiveConversation"),
      listConversations: this.makeHttpCall("assistants.listConversations"),
      searchConversations: this.makeHttpCall("assistants.searchConversations"),
      getDeveloperPrompts: this.makeHttpCall("assistants.getDeveloperPrompts"),
    };

    this.inference = {
      stt: this.makeHttpCall("inference.stt"),
      implementTypescriptModule: this.makeHttpCall(
        "inference.implementTypescriptModule",
      ),
    };

    this.apps = {
      getState: this.makeHttpCall("apps.getState"),
      updateState: this.makeHttpCall("apps.updateState"),
      create: this.makeHttpCall("apps.create"),
      updateName: this.makeHttpCall("apps.updateName"),
      updatePermissions: this.makeHttpCall("apps.updatePermissions"),
      createNewVersion: this.makeHttpCall("apps.createNewVersion"),
      delete: this.makeHttpCall("apps.delete"),
      list: this.makeHttpCall("apps.list"),
    };

    this.packs = {
      install: this.makeHttpCall("packs.install"),
    };

    this.boutique = {
      listPacks: this.makeHttpCall("boutique.listPacks"),
      getPack: this.makeHttpCall("boutique.getPack"),
    };

    this.backgroundJobs = {
      list: this.makeHttpCall("backgroundJobs.list"),
      get: this.makeHttpCall("backgroundJobs.get"),
    };

    this.globalSettings = {
      get: this.makeHttpCall("globalSettings.get"),
      update: this.makeHttpCall("globalSettings.update"),
    };

    this.database = {
      export: async () => {
        try {
          const response = await fetch("/api/database/export");
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          const url = URL.createObjectURL(await response.blob());
          const link = document.createElement("a");
          link.href = url;
          link.download = "superego.db";
          document.body.appendChild(link);
          link.click();
          link.remove();
          setTimeout(() => URL.revokeObjectURL(url), 60_000);
          return makeSuccessfulResult(null);
        } catch (error) {
          return makeUnsuccessfulResult({
            name: "UnexpectedError",
            details: { cause: extractErrorDetails(error) },
          });
        }
      },
    };
  }

  private makeHttpCall(
    channel: string,
  ): (...args: any[]) => ResultPromise<any, any> {
    return async (...args: any[]): ResultPromise<any, any> => {
      try {
        const response = await fetch(`/api/backend/${channel}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: stringify(args),
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }
        return parse(await response.text());
      } catch (error) {
        return makeUnsuccessfulResult({
          name: "UnexpectedError",
          details: {
            message: `HTTP call to ${channel} failed`,
            cause: extractErrorDetails(error),
          },
        });
      }
    };
  }
}

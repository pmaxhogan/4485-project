export {};

declare global {
  interface Window {
    electronAPI: {
      invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
      launchNeo4j: () => Promise<string>;
      onNeo4jLog: (callback: (data: string) => void) => void;
      onNeo4jError: (callback: (data: string) => void) => void;
      onNeo4jExit: (callback: (code: number) => void) => void;
      runTestQuery: () => Promise<neo4j.Record[]>;
      checkNeo4jConnection: () => Promise<string>;
    };
  }
}

import neo4j, { Record } from 'neo4j-driver';

const password = 'changethis' //replace w/ enviro vars or connect to config later, this is so insecure its funny - ZT

const driver = neo4j.driver(
    'bolt://localhost:7687', //neo4j Bolt URL
    neo4j.auth.basic('neo4j', password)
  );
  
  export const runQuery = async (query: string, params: Record<string, any> = {}): Promise<Record[]> => {
    const session = driver.session();
    try {
      console.log('Connecting to Neo4j...');
      const result = await session.run(query, params);
      console.log('Query result:', result);
      return result.records;
    } catch (error) {
      console.error('Error running query:', error);
      throw error;
    } finally {
      await session.close();
    }
  };
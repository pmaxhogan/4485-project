import neo4j from 'neo4j-driver';

const password = 'changethis' //replace w/ enviro vars or connect to config later, this is so insecure its funny - ZT

const driver = neo4j.driver(
    'bolt://localhost:7687', //neo4j Bolt URL
    neo4j.auth.basic('neo4j', password)
);

//the golden promise - zt
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

//a litte test - ZT
export const runTestQuery = async () => {
    const session = driver.session();
    try {
        console.log('Running test query against Neo4j...');

        const result = await session.run('MATCH (n) RETURN n LIMIT 5'); //adjust query as needed

        console.log('Test Query Result:', result.records);

        if (result.records.length === 0) {
            console.log('No nodes found in the database.');
        } else {
            result.records.forEach(record => {
                console.log('Node:', record.get('n')); //logs each node found
            });
        }
    } catch (error) {
        console.error('Error running test query:', error);
    } finally {
        await session.close();
    }
};

//this is just magic as far as I'm concerned - ZT
//connect to Neo4j with retries
export const connectToNeo4j = async (updateStatus: (status: string) => void) => {
    const maxRetries = 5;
    const retryDelay = 10000; // 10 seconds
    wait(5000); //flat wait (helps with flow)

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const session = driver.session();
  
      try {
        console.log(`Attempt ${attempt} to connect to Neo4j...`);
        await session.run('RETURN 1'); // Test query
        console.log('Neo4j connection successful.');
        updateStatus('Neo4j connection successful.');
        session.close();
        return; // Exit the function on success
      } catch (error) {
        console.error(`Error connecting to Neo4j (Attempt ${attempt}):`, error);
        updateStatus(`Error connecting to Neo4j (Attempt ${attempt}): ${error.message}`);
        session.close();
  
        if (attempt === maxRetries) {
          updateStatus('Failed to connect to Neo4j after maximum retries.');
          return; // Exit the function after max retries
        }
  
        console.log(`Retrying in ${retryDelay / 1000} seconds...`);
  
        // Wait for the specified delay before retrying
        await wait(retryDelay);
      }
    }
  };
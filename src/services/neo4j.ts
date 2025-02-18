import neo4j, { Record } from 'neo4j-driver';

const password = 'changethis' //replace w/ enviro vars or connect to config later, this is so insecure its funny - ZT

const driver = neo4j.driver(
    'bolt://localhost:7687', //neo4j Bolt URL
    neo4j.auth.basic('neo4j', password)
);

//a litte test - ZT
export const runTestQuery = async (): Promise<void> => {
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
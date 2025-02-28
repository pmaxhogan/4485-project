MATCH (n) DETACH DELETE n;

LOAD CSV WITH HEADERS FROM
'file:///csvs/Airline%20Data%20Copy.xlsx%20-%20Assets.csv'
AS line

CALL (line) {
  MERGE (s:Server {name: line["Server"]})
  SET s.status = line.Status
  SET s.Bold = (line["Bold Server"] = "TRUE")

  MERGE (a:ITApp {name: line["IT Application"]})
  SET a.Red = (line["Red Application"] = "TRUE")
  SET a.Bold = (line["Red Application"] = "TRUE")

  MERGE (l {name: line.Location})
  SET l:$(line["Location Type"])

  MERGE (s)-[:LOCATED_AT]->(l)
  MERGE (a)-[:RUNS_ON]->(s)

} IN TRANSACTIONS OF 200 ROWS;

LOAD CSV WITH HEADERS FROM
'file:///csvs/Airline%20Data%20Copy.xlsx%20-%20IT%20to%20Business.csv'
AS line

CALL (line) {
  MERGE (b:BusinessFunction {name: line["Business Function"]})
  MERGE (i:ITApp {name: line["IT Application"]})

  MERGE (i)-[:ACCOMPLISHES]->(b)
} IN TRANSACTIONS OF 200 ROWS
$(() => document.getElementById('bolt').focus());
document.getElementById('driver-form').onsubmit = (e) => {
  e.preventDefault();
  if (e.target.checkValidity()) {
    console.log('submit!');
    let bolt = document.getElementById('bolt').value;
    let pw = document.getElementById('pwInput').value;
    let userName = document.getElementById('user-input').value;
    if (window.driver && window.driver.close) {
      window.driver.close();
    }
    if (bolt != null && pw != null && userName != null) {
      window.driver = neo4j.v1.driver(bolt, neo4j.v1.auth.basic(userName, pw),
    {
      maxTransactionRetryTime: 60 * 1000
    }
      );
      document.getElementById('info').innerText = 'Driver ready!';
      document.getElementById('driver-form').classList.add('hidden');
      document.getElementById('addQueries').classList.remove('hidden');
      document.getElementById('queryName').focus();
    }
  }
}

loadCSVQuery = async function(session, cypher, params = {}) {
  if (!allowQueries) throw "Queries are not allowed, sorry!";
  return await session.run(cypher, params);
}

writeQuery = async function(session, cypher, params = {}) {
  if (!allowQueries) throw "Queries are not allowed, sorry!";
  return await session.writeTransaction(tx => tx.run(cypher, params));
}

readQuery = async function(session, cypher, params = {}) {
  if (!allowQueries) throw "Queries are not allowed, sorry!";
  return await session.readTransaction(tx => tx.run(cypher, params));
}

checkProcess = async function(session, label) {
  let result = await readQuery(session, `MATCH (n:${label}) RETURN count(*) AS total`);
  return result.records[0].get('total');
}

runBatchQuery = async function(session, queryData) {
  try {
    let batchKey = queryData.batchKey || 'labelsRemoved';
    let resp = await writeQuery(session, queryData.cypher, queryData.params);
    if (queryData.queryName) {
      if (cypherResponses[queryData.queryName] == null) cypherResponses[queryData.queryName] = [];
      cypherResponses[queryData.queryName].push(resp);
    }
    if (resp.summary.counters[batchKey]() > 0) {
      document.getElementById('summary').innerText = `Batch complete in ${resp.summary.resultAvailableAfter / 1000} seconds!`;
      return await runBatchQuery(session, queryData);
    }
  } catch (e) {
    window.lastError = e;
    if (allowQueries && window.errorCount < 10) {
      window.errorCount++;
      return await runBatchQuery(session, queryData);
    } else {
      throw e;
    }
  }
}

getNextProcess = async function(session) {
  let cypher = `// get next unblocked and unfinished process
    MATCH (n:AdhocProcess)
    WHERE n.status <> 'complete' OR n.status IS NULL
    WITH n, size([(op)-[:BLOCKS*]->(n) | op]) AS preReqs
    RETURN n { .batchKey,
      .processingLabel,
      .processId,
      .cypher,
      .queryName,
      .params,
      .queryType,
      preReqs
    } AS adhocProcess ORDER BY preReqs LIMIT 1
  `;
  let result = (await readQuery(session, cypher)).records[0];
  let adhocProcess = result == null ? null : result.get("adhocProcess");
  return adhocProcess;
}

runAdhocProcesses = async function(session) {
  // use one session til all processes done to ensure casual consistency
  if (session == null) session = driver.session();
  let adhocProcess = await getNextProcess(session);
  if (adhocProcess) {
    await startProcess(adhocProcess, session);
    await runProcess(adhocProcess, session);
    await endProcess(adhocProcess, session);
    runAdhocProcesses(session);
  } else {
    session.close();
    document.getElementById('run-adhoc-processes').classList.remove('disabled');
  }
}

startProcess = async function(adhocProcess, session) {
  let cypher = 'MATCH (n:AdhocProcess {processId: $processId}) SET n.status = $status, n.startTime = coalesce(n.startTime, dateTime())';
  let params = {processId: adhocProcess.processId, status: 'running'};
  if (adhocProcess.queryType === 'batch' &&
      ['complete','running','error'].indexOf(adhocProcess.status) === -1 &&
      adhocProcess.processingLabel != null &&
      /^[A-Za-z0-9_]+$/.test(adhocProcess.processingLabel)) {
    let totalToProcess = await checkProcess(session, adhocProcess.processingLabel);
    cypher += ', n.totalToProcess = $totalToProcess';
    params.totalToProcess = totalToProcess;
  }
  await writeQuery(session, cypher, params);
}

runProcess = async function(adhocProcess, session) {
  try {
    adhocProcess.params = JSON.parse(adhocProcess.params);
  } catch (err) {
    console.warn("parsing adhoc params failed", adhocProcess);
  }
  adhocProcess.isBatched = adhocProcess.queryType === 'batch';
  adhocProcess.isReadOnly = adhocProcess.queryType === 'read';
  adhocProcess.isLoadCSV = adhocProcess.queryType === 'csv';
  // hack to make sure key is unique for stats
  adhocProcess.queryName = adhocProcess.processId;
  await runQuery(adhocProcess, session);
  // reset errorCount between processes
  errorCount = 0;
}

endProcess = async function(adhocProcess, session) {
  let cypher = 'MATCH (n:AdhocProcess {processId: $processId}) SET n.status = $status, n.endTime = dateTime() SET n += $processStats';
  let processStats = getProcessStats(adhocProcess.processId);
  let params = {processId: adhocProcess.processId, status: 'complete', processStats};
  await writeQuery(session, cypher, params);
}

getProcessStats = function(process) {
  let keys = ['labelsAdded', 'labelsRemoved', 'nodesCreated', 'nodesDeleted', 'propertiesSet', 'relationshipsCreated', 'relationshipsDeleted'];
  let stats = {};
  try {
    stats.batches = cypherResponses[process].length;
    keys.map(k => stats[k] = 0);
    cypherResponses[process].forEach(resp => keys.map(k => stats[k] += resp.summary.counters[k]()));
  } catch (e) {
    console.warn('error getting process stats', e);
  }
  return stats;
}

// for running any given queryData
runQuery = async function(queryData, session) {
  if (queryData && queryData.cypher) {
    try {
      let queryName = queryData.queryName == null ? "unnamed" : queryData.queryName;
      queryHistory[queryName] = {};
      queryHistory[queryName].startTime = Date.now();
      if (queryData.isBatched) {
        await runBatchQuery(session, queryData);
      } else if (queryData.isReadOnly) {
        let resp = await readQuery(session, queryData.cypher, queryData.params);
        if (queryData.queryName) {
          if (cypherResponses[queryData.queryName] == null) cypherResponses[queryData.queryName] = [];
          cypherResponses[queryData.queryName].push(resp);
        }
      } else if (queryData.isLoadCSV) {
        let resp = await loadCSVQuery(session, queryData.cypher, queryData.params);
        if (queryData.queryName) {
          if (cypherResponses[queryData.queryName] == null) cypherResponses[queryData.queryName] = [];
          cypherResponses[queryData.queryName].push(resp);
        }
      } else {
        let resp = await writeQuery(session, queryData.cypher, queryData.params);
        if (queryData.queryName) {
          if (cypherResponses[queryData.queryName] == null) cypherResponses[queryData.queryName] = [];
          cypherResponses[queryData.queryName].push(resp);
        }
      }
      queryHistory[queryName].endTime = Date.now();
      document.getElementById('summary').innerText = `Query complete in ${(queryHistory[queryName].endTime - queryHistory[queryName].startTime) / 1000 / 60} minutes!`;
      console.log(`stats for ${queryName}:`, getStats(queryName));
      lastQuery = queryData;
    } catch (err) {
      document.getElementById('summary').innerText = err.message;
      throw err;
    }
  } else {
    throw "QueryDate is null or no cypher";
  }
}

// for running through queries array
runNextQuery = async function() {
  let queryData = queries[0];
  let session = driver.session();
  try {
    await runQuery(queryData, session);
  } finally {
    session.close();
  }
  queries.shift();
}

runAllQueries = async function() {
  if (allowQueries && queries.length > 0) {
    try {
      await runNextQuery();
      await runAllQueries();
    } catch (err) {
      console.log("error -- no longer processing", err)
    }
  }
}

addQuery = function(e) {
  let cypher = document.getElementById('cypher').value;
  let params;
  let batchKey = document.getElementById('batch-key').value;
  let queryName = document.getElementById('queryName').value;
  let queryType = $('input[name=queryType]:checked').val();
  if (queryType == null) queryType = "read";
  try {
    params = JSON.parse(document.getElementById('params').value);
  } catch (e) {
    console.warn('params not successfully parsed!');
  }
  if (cypher != null) {
    queries.push({queryName, isBatched: queryType == 'batch', isReadOnly: queryType == 'read', isLoadCSV: queryType == 'csv', batchKey, cypher, params});
    if (queries.length == 1 && allowQueries) runAllQueries();
  }
}

getStats = function(queryKey) {
  let res = {};
  try {
    res.totalTimeJS = humanReadableTime((queryHistory[queryKey].endTime == null ? Date.now() : queryHistory[queryKey].endTime) - queryHistory[queryKey].startTime);
    res.totalTimeCypher = humanReadableTime(cypherResponses[queryKey].reduce((acc, curr) => acc + curr.summary.resultAvailableAfter.toNumber(), 0));
    res.aveTime = humanReadableTime(cypherResponses[queryKey].reduce((acc, curr) => acc + curr.summary.resultAvailableAfter.toNumber(), 0) / cypherResponses[queryKey].length);
    res.batchSize = cypherResponses[queryKey][0].summary.statement.parameters.batchSize;
    res.batchs = cypherResponses[queryKey].length;
    res.minTime = humanReadableTime(Math.min(...cypherResponses[queryKey].map((curr) => curr.summary.resultAvailableAfter.toNumber())));
    res.maxTime = humanReadableTime(Math.max(...cypherResponses[queryKey].map((curr) => curr.summary.resultAvailableAfter.toNumber())));
    res.aveRel = cypherResponses[queryKey].reduce((acc, curr) => acc + curr.summary.counters.relationshipsCreated(), 0) / cypherResponses[queryKey].length;
    res.minRel = Math.min(...cypherResponses[queryKey].map((curr) => curr.summary.counters.relationshipsCreated()));
    res.maxRel = Math.max(...cypherResponses[queryKey].map((curr) => curr.summary.counters.relationshipsCreated()));
    res.aveProps = cypherResponses[queryKey].reduce((acc, curr) => acc + curr.summary.counters.propertiesSet(), 0) / cypherResponses[queryKey].length;
    res.minProps = Math.min(...cypherResponses[queryKey].map((curr) => curr.summary.counters.propertiesSet()));
    res.maxProps = Math.max(...cypherResponses[queryKey].map((curr) => curr.summary.counters.propertiesSet()));
    res.aveNodes = cypherResponses[queryKey].reduce((acc, curr) => acc + curr.summary.counters.nodesCreated(), 0) / cypherResponses[queryKey].length;
    res.minNodes = Math.min(...cypherResponses[queryKey].map((curr) => curr.summary.counters.nodesCreated()));
    res.maxNodes = Math.max(...cypherResponses[queryKey].map((curr) => curr.summary.counters.nodesCreated()));
  } catch (e) {
    console.warn("error getting stats, query still complete", e);
  }
  return res;
}

humanReadableTime = function(ms) {
  let hours = Math.floor(ms / 3600000);
  let mins = Math.floor((ms % 3600000) / 60000);
  let seconds = Math.floor((ms % 60000) / 1000);
  let millisec = ms % 1000;
  return `${hours > 0 ? `${hours}hr ` : ''}${mins > 0 ? `${mins}min ` : ''}${seconds > 0 ? `${seconds}sec ` : ''}${Math.round(millisec)}ms`;
}

document.getElementById('add-query-form').onsubmit = (e) => {
  e.preventDefault();
  let form = e.target;
  if (form.checkValidity()) {
    addQuery();
  }
}
addAdhocProcess = async function(form) {
  let data = new FormData(form);
  let cypher = data.get('cypherAdhoc');
  let params = data.get('paramsAdhoc');
  let batchKey = data.get('batchKeyAdhoc');
  let queryName = data.get('queryNameAdhoc');
  let queryType = data.get('queryTypeAdhoc');
  let processingLabel = data.get('processingLabelAdhoc');
  if (queryType == null) queryType = "read";
  if (cypher != null) {
    // TODO: run query to create :AdhocProcess node
    let processId = `${queryName}-${Date.now()}`;
    let createNode = `// create an adhoc node with data for processing
      // use create because we WANT to error if already exists with this id
      CREATE (n:AdhocProcess {processId: $processId})
      SET n += $processProps
      WITH n
      // set last node as blocking new one
      MATCH (lastP:AdhocProcess) WHERE lastP <> n AND NOT (lastP)-[:BLOCKS]->()
      MERGE (lastP)-[:BLOCKS]->(n)
    `;
    let createParams = {
      processId,
      processProps: {
        cypher, params, batchKey, queryName, queryType, processingLabel
      }
    };
    let session = driver.session();
    try {
      await runQuery({
        cypher: createNode,
        params: createParams,
        queryName: `create-${queryName}`
      }, session)
      document.getElementById('summary').innerText = 'AdhocProcess Added';
    } finally {
      session.close();
    }
  }
}
document.getElementById('add-adhoc-form').onsubmit = (e) => {
  e.preventDefault();
  let form = e.target;
  if (form.checkValidity()) {
    addAdhocProcess(form);
  }
}

document.getElementById('run-adhoc-processes').onclick = (e) => {
  if (!e.target.classList.contains('disabled')) {
    e.target.classList.add('disabled');
    runAdhocProcesses();
  }
}

document.getElementById('toggleQueries').onclick = (e) => {
  allowQueries = !allowQueries;
  e.currentTarget.innerText = `Queries Are ${allowQueries ? '' : "Not"} Allowed`;
  if (allowQueries) {
    runAllQueries();
  }
}

window.errorCount = 0;
window.cypherResponses = {}
window.queryHistory = {};
window.queries = [];
window.allowQueries = true;
window.lastQuery = "RETURN 'HELLO WORLD'";
window.lastError;

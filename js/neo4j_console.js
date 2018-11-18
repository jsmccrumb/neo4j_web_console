$(() => document.getElementById('bolt').focus());
document.getElementById('driver-form').onsubmit = (e) => {
  e.preventDefault();
  console.log('submit!');
	let bolt = document.getElementById('bolt').value;
	let pw = document.getElementById('pwInput').value;
	let userName = document.getElementById('user-input').value;
	if (window.driver && window.driver.close) {
		window.driver.close();
	}
	if (bolt != null && pw != null && userName != null) {
		window.driver = neo4j.v1.driver(bolt, neo4j.v1.auth.basic(userName, pw));
		document.getElementById('info').innerText = 'Driver ready!';
		document.getElementById('driver-form').classList.add('hidden');
		document.getElementById('addQueries').classList.remove('hidden');
    document.getElementById('queryName').focus();
	}
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
	return await readQuery(session, `MATCH (n:${label}) RETURN count(*)`);
}

runBatchQuery = async function(session, queryData) {
	try {
		let batchKey = queryData.batchKey || 'labelsRemoved';
		let resp = await writeQuery(session, queryData.cypher, queryData.params);
		if (resp.summary.counters[batchKey]() > 0) {
			document.getElementById('summary').innerText = `Batch complete in ${resp.summary.resultAvailableAfter / 1000} seconds!`;
			if (queryData.queryName) {
				if (cypherResponses[queryData.queryName] == null) cypherResponses[queryData.queryName] = [];
				cypherResponses[queryData.queryName].push(resp);
			}
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

// for running any given queryData
runQuery = async function(queryData) {
	if (queryData && queryData.cypher) {
    let session = driver.session();
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
			session.close();
		} catch (err) {
			document.getElementById('summary').innerText = err.message;
			session.close();
			throw err;
		}
	} else {
		throw "QueryDate is null or no cypher";
	}
}

// for running through queries array
runNextQuery = async function() {
	let queryData = queries[0];
  await runQuery(queryData);
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
		queries.push({queryName, isBatched: queryType == 'batch', isReadOnly: queryType == 'read', batchKey, cypher, params});
		if (queries.length == 1 && allowQueries) runAllQueries();
	}
}

getStats = function(queryKey) { 
	let res = {};
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

document.getElementById('add-adhoc-form').onsubmit = (e) => {
  e.preventDefault();
  let form = e.target;
  if (form.checkValidity()) {
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
      runQuery({
        cypher: createNode,
        params: createParams,
        queryName: `create-${queryName}`
      });
    }
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

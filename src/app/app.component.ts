import { Component } from '@angular/core';
import { Query } from './query';
import neo4j from 'neo4j-driver/lib/browser/neo4j-web';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  tableColumns: any[] = [];
  tableItems: any[] = [];
  displayTable: boolean = false;
  driver = null;
  queries: Query[] = [];
  title = 'angular-neo4j-console';
  getDriver(loginData: any) {
  console.log('get driver', loginData);
  if (this.driver && this.driver.close) {
  this.driver.close();
  }
  this.driver = neo4j.driver(loginData.bolt, neo4j.auth.basic(loginData.userName, loginData.password),
  {
  maxTransactionRetryTime: 60 * 1000
  });
  }

  showQuery(query: Query) {
    if (query.result && query.result.records && query.result.records.length > 0) {
      this.tableColumns = query.result.records[0].keys.map((k, i) => {
        return {
          headerText: k,
          dataProperty: `_fields.${i}`,
          columnClass: `column-${i}`
        };
      });
      this.tableItems = query.result.records;
      this.displayTable = true;
    }
    console.log('I should do somthing with query', query);
  }

  queueQuery(query: Query) {
  this.queries.push(query);
  this.runQuery(query);
  }
  async runQuery(query: Query) {
  if (query.queryType === 'read') {
  let session = this.driver.session();
  query.result = await session.readTransaction(tx => tx.run(query.cypher, query.params));
  query.status = 'complete';
  session.close();
  }
  
  }
}

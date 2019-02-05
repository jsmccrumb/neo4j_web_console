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
  queryToEdit: Query = new Query();
  displayTable: boolean = false;
  driver = null;
  queries: Query[] = [];
  title = 'angular-neo4j-console';
  getDriver(loginData: any) {
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
  }

  queueQuery(query: Query) {
    this.queries.push(query);
    this.runQuery(query);
  }

  editQuery(query: Query) {
    console.log('Edit!', query);
    this.queryToEdit = query;
    if (query.status == 'new') {
       this.deleteQuery(query);
    }
  }

  deleteQuery(query: Query) {
    this.queries.splice(this.queries.indexOf(query), 1);
  }

  async runQuery(query: Query) {
    if (query.queryType === 'read') {
      query.status = 'running';
      let session = this.driver.session();
      query.result = await session.readTransaction(tx => tx.run(query.cypher, query.paramsObject));

      query.status = 'complete';
      session.close();
    }

  }
}

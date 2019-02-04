import { Input, Output, EventEmitter, Component, OnInit } from '@angular/core';
import { Query } from '../query';
import { QUERY_TYPES } from '../query-types';
import { SUMMARY_COUNTERS } from '../summary-counters';

@Component({
  selector: 'app-create-query',
  templateUrl: './create-query.component.html',
  styleUrls: ['./create-query.component.css']
})

export class CreateQueryComponent implements OnInit {
  @Output() addQuery = new EventEmitter<Query>();
  query: Query = new Query();
  queryTypes = QUERY_TYPES;
  batchKeys = SUMMARY_COUNTERS.filter(x => x.validBatchKey);

  constructor() { }

  ngOnInit() {
  }

  onSubmit() {
    this.query.id = `${this.query.name}-${Date.now()}`
    this.addQuery.emit(this.query);
    this.query = new Query();
  }

}

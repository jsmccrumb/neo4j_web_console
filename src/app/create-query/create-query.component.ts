import { Input, Component, OnInit } from '@angular/core';
import { Query } from '../query';
import { QUERY_TYPES } from '../query-types';
import { SUMMARY_COUNTERS } from '../summary-counters';

@Component({
  selector: 'app-create-query',
  templateUrl: './create-query.component.html',
  styleUrls: ['./create-query.component.css']
})

export class CreateQueryComponent implements OnInit {
  @Input() formId: string;
  query: Query = new Query();
  queryTypes = QUERY_TYPES;
  batchKeys = SUMMARY_COUNTERS.filter(x => x.validBatchKey);

  constructor() { }

  ngOnInit() {
  }

  onSubmit() {
    console.log('submit!', this);
  }

}

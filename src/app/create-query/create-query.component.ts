import { Input, Component, OnInit } from '@angular/core';
import { Query } from '../query';
import { QUERY_TYPES } from '../query-types';

@Component({
  selector: 'app-create-query',
  templateUrl: './create-query.component.html',
  styleUrls: ['./create-query.component.css']
})
export class CreateQueryComponent implements OnInit {
  @Input() formId: string;
  query: Query = new Query();
  queryTypes = QUERY_TYPES;

  constructor() { }

  ngOnInit() {
  }

  onSubmit() {
    console.log('submit!', this);
  }

}

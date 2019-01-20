import { Input, Component, OnInit } from '@angular/core';
import { Query } from '../query';

@Component({
  selector: 'app-create-query',
  templateUrl: './create-query.component.html',
  styleUrls: ['./create-query.component.css']
})
export class CreateQueryComponent implements OnInit {
  @Input() formId: string;
  query: Query = new Query();

  constructor() { }

  ngOnInit() {
  }

}

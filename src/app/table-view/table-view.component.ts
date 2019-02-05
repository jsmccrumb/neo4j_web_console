import { ChangeDetectionStrategy, Input, Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-table-view',
  templateUrl: './table-view.component.html',
  styleUrls: ['./table-view.component.css']
})
export class TableViewComponent implements OnInit {
  @Input() columns: any[];
  @Input() items: any[];

  getProp(item, prop) {
    return prop.split('.').reduce((acc, curr) => { return acc[curr] }, item);
  }

  constructor() { }

  ngOnInit() {
  }

}

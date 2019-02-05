import { Input, Output, EventEmitter, Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-driver-form',
  templateUrl: './driver-form.component.html',
  styleUrls: ['./driver-form.component.css']
})
export class DriverFormComponent implements OnInit {
  @Output() login = new EventEmitter<any>();
  driver = {
    bolt: 'bolt://localhost',
    userName: '',
    password: ''
  };
  bolts: any[] = [
    {value: 'bolt://localhost', viewValue: 'LOCAL'}
  ];

  constructor() { }

  ngOnInit() {
  }

  onSubmit() {
    this.login.emit(this.driver);
  }

}

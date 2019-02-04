import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

// Angular Material modules
import { MatButtonModule } from '@angular/material';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { MatListModule } from '@angular/material/list';

import { AppComponent } from './app.component';
import { CreateQueryComponent } from './create-query/create-query.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TableViewComponent } from './table-view/table-view.component';
import { DriverFormComponent } from './driver-form/driver-form.component';

@NgModule({
  declarations: [
    AppComponent,
    CreateQueryComponent,
    TableViewComponent,
    DriverFormComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    BrowserAnimationsModule,
    MatButtonModule,
    MatGridListModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatSortModule,
    ScrollingModule,
    MatListModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
